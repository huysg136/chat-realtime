import React from 'react';
import { useNavigate } from 'react-router-dom';
import app from "../firebase/config";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { Spin } from 'antd';
import { getUserDocIdByUid } from "../firebase/services";
export const AuthContext = React.createContext();
const auth = getAuth(app);
const db = getFirestore(app);

export default function AuthProvider({ children }) {
  const [user, setUser] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const navigate = useNavigate();

  React.useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        const { displayName, email, photoURL, uid } = currentUser;

        const userDocId = await getUserDocIdByUid(uid);
        let userData = {};

        if (userDocId) {
          const userDocRef = doc(db, "users", userDocId);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            userData = userSnap.data();
          }
        }

        console.log("Current UID:", uid);
        console.log("Role:", userData.role);

        setUser({
          displayName,
          email,
          photoURL,
          uid,
          role: userData.role || "user",
        });
        if (window.location.pathname === "/login") {
          navigate("/");
        }
      } else {
        setUser(null);
        if (window.location.pathname !== "/login") {
          navigate("/login");
        }
      }

      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
