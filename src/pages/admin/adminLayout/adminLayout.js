import React from "react";
import { Layout } from "antd";
import { Outlet, Navigate } from "react-router-dom";
import AdminSidebar from "../adminSidebar/adminSidebar";
import AdminHeader from "../adminHeader/adminHeader";
import "./adminLayout.scss";
import { useAuthStore } from "../../../stores/useAuthStore";
import { ROUTERS } from "../../../configs/router";

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
