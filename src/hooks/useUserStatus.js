import { useState, useEffect } from 'react';
import { ref, off } from 'firebase/database';
import { rtdb } from '../firebase/config';
import { getUserDocIdByUid } from '../firebase/services';

const userStatusMap = new Map();
const listenersMap = new Map();
const statusListeners = new Map(); // uid => array of setStatus functions

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

        const updateStatus = (data) => {
          const now = Date.now();
          let isOnline;

          if (!data) {
            isOnline = false;
          } else if (document.visibilityState === 'visible' && data.isOnline !== false) {
            // Tab đang focus → online NGAY
            isOnline = true;
          } else {
            const lastHeartbeat = data.lastHeartbeat || data.lastOnline || 0;
            isOnline = (now - lastHeartbeat) < 60000; // offline nếu > 60s
          }

          const newStatus = {
            lastOnline: data?.lastOnline ? new Date(data.lastOnline) : null,
            isOnline,
          };

          userStatusMap.set(uid, newStatus);
          const listeners = statusListeners.get(uid) || [];
          listeners.forEach(fn => fn(newStatus));
        };

        // Interval để check heartbeat mỗi 5s (tăng realtime)
        const interval = setInterval(() => {
          const currentData = userStatusMap.get(uid);
          if (currentData) {
            updateStatus({
              lastHeartbeat: currentData.lastOnline ? currentData.lastOnline.getTime() : 0,
              lastOnline: currentData.lastOnline ? currentData.lastOnline.getTime() : null,
              isOnline: currentData.isOnline,
            });
          }
        }, 5000);

        listenersMap.set(uid, () => {
          off(statusRef);
          clearInterval(interval);
        });
      };

      setupListener();
    }

    return () => {
      // remove setStatus khỏi listeners
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
        }
      }
    };
  }, [uid]);

  return status;
}

// Cleanup listeners khi cần
export function cleanupUserStatusListeners() {
  listenersMap.forEach(unsubscribe => unsubscribe());
  listenersMap.clear();
  userStatusMap.clear();
  statusListeners.clear();
}
