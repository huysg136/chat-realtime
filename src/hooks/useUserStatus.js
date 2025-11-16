import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getUserDocIdByUid } from '../firebase/services';

// Global maps to store statuses and listeners per user UID
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

    // If already have status, set it
    if (userStatusMap.has(uid)) {
      setStatus(userStatusMap.get(uid));
    } else {
      userStatusMap.set(uid, null);
      setStatus(null);
    }

    // Add this setStatus to the listeners
    if (!statusListeners.has(uid)) {
      statusListeners.set(uid, []);
    }
    statusListeners.get(uid).push(setStatus);

    // If not already listening, set up listener
    if (!listenersMap.has(uid)) {
      const setupListener = async () => {
        const docId = await getUserDocIdByUid(uid);
        if (!docId) return;

        const unsubscribe = onSnapshot(doc(db, "users", docId), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const newStatus = {
              lastOnline: data.lastOnline?.toDate ? data.lastOnline.toDate() : new Date(data.lastOnline),
            };
            userStatusMap.set(uid, newStatus);
            // Notify all listeners
            const listeners = statusListeners.get(uid) || [];
            listeners.forEach(setStat => setStat(newStatus));
          }
        });

        listenersMap.set(uid, unsubscribe);
      };
      setupListener();
    }

    return () => {
      // Remove this setStatus from listeners
      const listeners = statusListeners.get(uid) || [];
      const index = listeners.indexOf(setStatus);
      if (index > -1) {
        listeners.splice(index, 1);
      }
      if (listeners.length === 0) {
        statusListeners.delete(uid);
        // If no more listeners, unsubscribe
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

// Cleanup function to remove listeners when app unmounts or as needed
export function cleanupUserStatusListeners() {
  listenersMap.forEach(unsubscribe => unsubscribe());
  listenersMap.clear();
  userStatusMap.clear();
  statusListeners.clear();
}
