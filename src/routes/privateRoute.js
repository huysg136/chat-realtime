import React, { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/authProvider";
import { Spin } from "antd";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";

export default function PrivateRoute({ children, requireAdmin = false }) {
  const { user, isLoading } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(true);

  useEffect(() => {
    if (!user) {
      setAllowed(false);
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(doc(db, "config", "appStatus"), (snap) => {
      try {
        const maintenance = snap.exists() ? snap.data().maintenance : false;

        // Nếu đang bảo trì và user không phải admin/moderator → không cho phép
        if (maintenance && !["admin", "moderator"].includes(user.role)) {
          setAllowed(false);
        } else if (requireAdmin && !["admin", "moderator"].includes(user.role)) {
          setAllowed(false);
        } else {
          setAllowed(true);
        }
      } catch (err) {
        console.error("Error checking maintenance:", err);
        setAllowed(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [user, requireAdmin]);

  if (isLoading || loading) {
    return (
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
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (!allowed) return <Navigate to="/maintenance" replace />;

  return children;
}
