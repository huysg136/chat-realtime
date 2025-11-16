import React from 'react';
import { useNavigate } from 'react-router-dom';
import app from "../firebase/config";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, onSnapshot, updateDoc, serverTimestamp } from "firebase/firestore";
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

  React.useEffect(() => {
    let currentUserDocId = null;

    const updatelastOnline = async () => {
      if (currentUserDocId) {
        try {
          await updateDoc(doc(db, "users", currentUserDocId), {
            lastOnline: serverTimestamp()
          });
        } catch (error) {
          console.error("Error updating last seen:", error);
        }
      }
    };

    const handleBeforeUnload = () => {
      updatelastOnline();
    };

    const unsubscribeAuth = auth.onAuthStateChanged(async (currentUser) => {
      // Unsubscribe previous user listener if exists
      if (unsubscribeUserRef.current) {
        unsubscribeUserRef.current();
        unsubscribeUserRef.current = null;
      }

      if (currentUser) {
        const { displayName, email, photoURL, uid } = currentUser;

        const userDocId = await getUserDocIdByUid(uid);
        currentUserDocId = userDocId;

        if (userDocId) {
          // Update last seen on login
          await updatelastOnline();

          const userDocRef = doc(db, "users", userDocId);
          // Set up real-time listener for user data
          const unsubscribeUser = onSnapshot(userDocRef, (userSnap) => {
            if (userSnap.exists()) {
              const userData = userSnap.data();
              setUser({
                displayName,
                email,
                photoURL,
                uid,
                role: userData.role || "user",
                theme: userData.theme || "system",
                permissions: userData.permissions || {},
              });
              setIsLoading(false);
              if (window.location.pathname === "/login") {
                navigate("/");
              }
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
              if (window.location.pathname === "/login") {
                navigate("/");
              }
            }
          });

          // Store unsubscribe function in ref
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
          if (window.location.pathname === "/login") {
            navigate("/");
          }
        }
      } else {
        // User logged out
        currentUserDocId = null;
        setUser(null);
        setIsLoading(false);
        if (window.location.pathname !== "/login") {
          navigate("/login");
        }
      }
    });

    // Add event listener for offline detection on page unload
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeUserRef.current) {
        unsubscribeUserRef.current();
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ user, setUser, isLoading }}>
      {isLoading ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
          }}
        >
          <Spin size="large" />
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}
