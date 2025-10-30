import React, { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/authProvider";
import { AppContext } from "../context/appProvider";
import { Spin } from "antd";

export default function PrivateRoute({ children, requireAdmin = false }) {
  const { user, isLoading: isAuthLoading } = useContext(AuthContext);
  const { isMaintenance } = useContext(AppContext);

  if (isAuthLoading) {
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

  if (requireAdmin && !["admin", "moderator"].includes(user.role)) {
    return <Navigate to="/maintenance" replace />;
  }

  if (isMaintenance && !["admin", "moderator"].includes(user.role)) {
    return <Navigate to="/maintenance" replace />;
  }

  return children;
}
