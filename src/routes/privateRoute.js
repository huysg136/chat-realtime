import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/authProvider";
import { Spin } from "antd";

export default function PrivateRoute({ children, requireAdmin = false }) {
  const { user, isLoading } = useContext(AuthContext);

  if (isLoading) {
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

  if (requireAdmin && user.role !== "admin") return <Navigate to="/" replace />;

  return children;
}
