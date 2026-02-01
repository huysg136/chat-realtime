import { useState, useEffect } from 'react';
import { ref, off, onValue } from 'firebase/database';
import { rtdb } from '../firebase/config';
import { getUserDocIdByUid } from '../firebase/services';

const userStatusMap = new Map();
const rawDataMap = new Map(); // 🔥 Store raw RTDB data
const listenersMap = new Map();
const statusListeners = new Map();

export function useUserStatus(uid) {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!uid) {
      setStatus(null);
      return;
    }

    // Nếu đã có status trước đó, set ngay
    if (userStatusMap.has(uid)) {
      setStatus(userStatusMap.get(uid));
    } else {
      userStatusMap.set(uid, null);
      setStatus(null);
    }

    // Thêm setStatus vào danh sách listeners
    if (!statusListeners.has(uid)) statusListeners.set(uid, []);
    statusListeners.get(uid).push(setStatus);

    // Nếu chưa có listener, setup
    if (!listenersMap.has(uid)) {
      const setupListener = async () => {
        const userDocId = await getUserDocIdByUid(uid);
        if (!userDocId) return;

        const statusRef = ref(rtdb, `userStatuses/${userDocId}`);

        const calculateStatus = (data) => {
          const now = Date.now();
          let isOnline = false;

          if (data) {
            // 🔥 Chỉ check heartbeat - offline nếu > 60s không có heartbeat
            const lastHeartbeat = data.lastHeartbeat || data.lastOnline || 0;
            isOnline = (now - lastHeartbeat) < 60000;
          }

          return {
            lastOnline: data?.lastOnline ? new Date(data.lastOnline) : null,
            isOnline,
          };
        };

        const broadcastStatus = (newStatus) => {
          userStatusMap.set(uid, newStatus);
          const listeners = statusListeners.get(uid) || [];
          listeners.forEach(fn => fn(newStatus));
        };

        // 🔥 onValue: lắng nghe thay đổi từ RTDB
        const unsubscribeOnValue = onValue(statusRef, (snapshot) => {
          const data = snapshot.val();
          rawDataMap.set(uid, data); // 🔥 Lưu raw data
          const newStatus = calculateStatus(data);
          broadcastStatus(newStatus);
        });

        // Interval: chỉ re-check heartbeat timeout, không ghi đè raw data
        const interval = setInterval(() => {
          const rawData = rawDataMap.get(uid);
          if (rawData) {
            const newStatus = calculateStatus(rawData);
            broadcastStatus(newStatus);
          }
        }, 10000); // Check mỗi 10s

        listenersMap.set(uid, () => {
          off(statusRef);
          unsubscribeOnValue();
          clearInterval(interval);
        });
      };

      setupListener();
    }

    return () => {
      const listeners = statusListeners.get(uid) || [];
      const index = listeners.indexOf(setStatus);
      if (index > -1) listeners.splice(index, 1);

      if (listeners.length === 0) {
        statusListeners.delete(uid);
        const unsubscribe = listenersMap.get(uid);
        if (unsubscribe) {
          unsubscribe();
          listenersMap.delete(uid);
          userStatusMap.delete(uid);
          rawDataMap.delete(uid); // 🔥 Cleanup raw data
        }
      }
    };
  }, [uid]);

  return status;
}

export function cleanupUserStatusListeners() {
  listenersMap.forEach(unsubscribe => unsubscribe());
  listenersMap.clear();
  userStatusMap.clear();
  rawDataMap.clear();
  statusListeners.clear();
}

