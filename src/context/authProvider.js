import React from 'react';
import { useNavigate } from 'react-router-dom';
import app from "../firebase/config";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";
import { ref, set } from "firebase/database";
import { rtdb } from "../firebase/config";
import { Spin } from 'antd';
import { getUserDocIdByUid } from "../firebase/services";

export const AuthContext = React.createContext();
const auth = getAuth(app);
const db = getFirestore(app);

export default function AuthProvider({ children }) {
  const [user, setUser] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const navigate = useNavigate();
  const unsubscribeUserRef = React.useRef(null);
  const heartbeatRef = React.useRef(null);
  const currentUserDocIdRef = React.useRef(null);

  const updateStatus = async (isOnline) => {
    const userDocId = currentUserDocIdRef.current;
    if (!userDocId) return;
    const statusRef = ref(rtdb, `userStatuses/${userDocId}`);
    const now = Date.now();
    try {
      await set(statusRef, {
        lastOnline: now,
        lastHeartbeat: now,
        isOnline,
      });
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const startHeartbeat = () => {
    stopHeartbeat();
    heartbeatRef.current = setInterval(() => {
      updateStatus(true);
    }, 10000); // mỗi 10s
  };

  const stopHeartbeat = () => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  };

  React.useEffect(() => {
    const handleVisibilityChange = () => {
      if (!currentUserDocIdRef.current) return;
      if (document.visibilityState === 'hidden') {
        stopHeartbeat();
        updateStatus(false);
      } else {
        updateStatus(true); // online NGAY
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
        currentUserDocIdRef.current = userDocId;

        if (userDocId) {
          await updateStatus(true); // online NGAY khi login
          startHeartbeat();

          const userDocRef = doc(db, "users", userDocId);
          const unsubscribeUser = onSnapshot(userDocRef, (userSnap) => {
            const userData = userSnap.exists() ? userSnap.data() : {};
            setUser({
              ...userData,
              displayName,
              email,
              photoURL,
              uid,
            });
            setIsLoading(false);
            if (window.location.pathname === "/login") navigate("/");
          });

          unsubscribeUserRef.current = unsubscribeUser;
        } else {
          setUser({ displayName, email, photoURL, uid, role: "user", theme: "system", permissions: {} });
          setIsLoading(false);
          if (window.location.pathname === "/login") navigate("/");
        }
      } else {
        currentUserDocIdRef.current = null;
        setUser(null);
        setIsLoading(false);
        stopHeartbeat();
        if (window.location.pathname !== "/login") navigate("/login");
      }
    });

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeUserRef.current) unsubscribeUserRef.current();
      stopHeartbeat();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ user, setUser, isLoading }}>
      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
          <Spin size="large" />
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}
