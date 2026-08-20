import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import app from "../../../shared/firebase/firebaseClient";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";
import { getUserDocIdByUid, updateDocument } from "../../../shared/firebase/firestore";
import { ROUTERS } from "../../../app/router/routePaths";
import { useAuthStore } from "../store/auth.store";
import { useChatStore } from "../../chat/store/chat.store";
import { useModalStore } from "../../../app/overlays/modal.store";

const auth = getAuth(app);
const db = getFirestore(app);

export function useAuthInit() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const setIsLoading = useAuthStore((state) => state.setIsLoading);
  const updateStatus = useAuthStore((state) => state.updateStatus);
  const setCurrentUserDocId = useAuthStore((state) => state.setCurrentUserDocId);
  const resetChatState = useChatStore((state) => state.resetChatState);
  const resetAllModals = useModalStore((state) => state.resetAllModals);

  const navigate = useNavigate();
  const unsubscribeUserRef = useRef(null);
  const heartbeatRef = useRef(null);

  const startHeartbeat = () => {
    stopHeartbeat();
    heartbeatRef.current = setInterval(() => {
      updateStatus(true);
    }, 10000); // Mỗi 10s
  };

  const stopHeartbeat = () => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!useAuthStore.getState().currentUserDocId) return;
      if (document.visibilityState === "hidden") {
        stopHeartbeat();
        updateStatus(false);
      } else {
        updateStatus(true);
        startHeartbeat();
      }
    };

    const handleBeforeUnload = () => {
      updateStatus(false);
    };

    const unsubscribeAuth = auth.onAuthStateChanged(async (currentUser) => {
      if (unsubscribeUserRef.current) {
        unsubscribeUserRef.current();
        unsubscribeUserRef.current = null;
      }
      stopHeartbeat();

      if (currentUser) {
        const { displayName, email, photoURL, uid } = currentUser;
        const userDocId = await getUserDocIdByUid(uid);
        setCurrentUserDocId(userDocId);

        if (userDocId) {
          await updateStatus(true);
          startHeartbeat();

          const userDocRef = doc(db, "users", userDocId);
          const unsubscribeUser = onSnapshot(userDocRef, async (userSnap) => {
            const userData = userSnap.exists() ? userSnap.data() : {};
            const currentTime = new Date();
            const premiumUntilDate = userData.premiumUntil?.toDate
              ? userData.premiumUntil.toDate()
              : userData.premiumUntil
              ? new Date(userData.premiumUntil)
              : null;

            if (
              (userData.premiumLevel === "pro" ||
                userData.premiumLevel === "max" ||
                userData.premiumLevel === "lite") &&
              premiumUntilDate &&
              premiumUntilDate < currentTime
            ) {
              try {
                await updateDocument("users", userDocId, { premiumLevel: "free" });
              } catch (error) {
                console.error("Error downgrading premium:", error);
              }
            }

            setUser({
              uid,
              email,
              displayName,
              photoURL,
              ...userData,
              premiumUntil: userData.premiumUntil?.toDate
                ? userData.premiumUntil.toDate()
                : userData.premiumUntil,
            });
            setIsLoading(false);
            if (window.location.pathname === "/login") navigate(ROUTERS.USER.HOME);
          });

          unsubscribeUserRef.current = unsubscribeUser;
        } else {
          setUser({
            displayName,
            email,
            photoURL,
            uid,
            role: "user",
            theme: "system",
            permissions: {},
          });
          setIsLoading(false);
          if (window.location.pathname === "/login") navigate(ROUTERS.USER.HOME);
        }
      } else {
        updateStatus(false);
        setCurrentUserDocId(null);
        setUser(null);
        resetChatState();
        resetAllModals();
        setIsLoading(false);
        stopHeartbeat();
        if (window.location.pathname !== "/login") navigate(ROUTERS.USER.LOGIN);
      }
    });

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeUserRef.current) unsubscribeUserRef.current();
      stopHeartbeat();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [navigate, setCurrentUserDocId, setIsLoading, setUser, updateStatus, resetChatState, resetAllModals]);

  // Kiểm tra hạn gói Premium định kỳ mỗi phút
  useEffect(() => {
    let interval;
    if (
      (user?.premiumLevel === "pro" ||
        user?.premiumLevel === "max" ||
        user?.premiumLevel === "lite") &&
      user?.premiumUntil
    ) {
      interval = setInterval(async () => {
        const now = new Date();
        const premiumUntilDate = user.premiumUntil?.toDate
          ? user.premiumUntil.toDate()
          : new Date(user.premiumUntil);
        if (!isNaN(premiumUntilDate.getTime()) && premiumUntilDate < now) {
          const userDocId = await getUserDocIdByUid(user.uid);
          if (userDocId) {
            await updateDocument("users", userDocId, { premiumLevel: "free" });
          }
        }
      }, 60000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [user]);
}

export default useAuthInit;
