import { useEffect } from "react";
import { ref, set } from "firebase/database";
import { rtdb } from "../firebase/config";
import { getUserDocIdByUid } from "../firebase/services";

export default function useUserPresence(user) {
  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    const updateStatus = async (isOnline) => {
      if (!isMounted) return;

      const userDocId = await getUserDocIdByUid(user.uid);
      if (!userDocId) return;

      const statusRef = ref(rtdb, `userStatuses/${userDocId}`);
      const now = Date.now();

      set(statusRef, {
        lastOnline: now,
        lastHeartbeat: now,
        isOnline,
      });
    };

    const handleOffline = () => updateStatus(false);
    const handleVisibilityChange = () =>
      updateStatus(document.visibilityState !== "hidden");

    window.addEventListener("beforeunload", handleOffline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    updateStatus(true);

    return () => {
      isMounted = false;
      window.removeEventListener("beforeunload", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);
}
