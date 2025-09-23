import React, { useState, useEffect } from 'react';
import { getAuth, getRedirectResult, onAuthStateChanged } from "firebase/auth";
import { Spin } from 'antd';
import { useNavigate } from 'react-router-dom';
import app from "../firebase/config";

export const AuthContext = React.createContext();
const auth = getAuth(app);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Xử lý redirect Facebook mobile
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          setUser(result.user);        // set user từ redirect
          navigate("/chat");           // chuyển sang chat
        }
      })
      .catch(console.error);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {loading ? <Spin /> : children}
    </AuthContext.Provider>
  );
}
