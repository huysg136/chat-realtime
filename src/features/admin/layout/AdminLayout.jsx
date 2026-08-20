import React from "react";
import { Layout } from "antd";
import { Outlet, Navigate } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import "./adminLayout.scss";
import { useAuthStore } from "../../auth/store/auth.store";
import { ROUTERS } from "../../../app/router/routePaths";

const { Content } = Layout;

export default function AdminLayout() {
  const user = useAuthStore((state) => state.user);
  if (!user || !["admin", "moderator"].includes(user.role)) {
    return <Navigate to={ROUTERS.USER.DIRECT} replace />;
  }

  return (
    <Layout className="admin-layout">
      <AdminSidebar />
      <Layout className="admin-main">
        <AdminHeader />
        <Content className="admin-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
