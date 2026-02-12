import React from "react";
import { Layout } from "antd";
import { Outlet, Navigate } from "react-router-dom";
import AdminSidebar from "../adminSidebar/adminSidebar";
import AdminHeader from "../adminHeader/adminHeader";
import "./adminLayout.scss";
import { useContext } from "react";
import { AuthContext } from "../../../context/authProvider";
import { ROUTERS } from "../../../constants/router";

const { Content } = Layout;

export default function AdminLayout() {
  
  const { user } = useContext(AuthContext);
  if (!user || !["admin", "moderator"].includes(user.role)) {
    return <Navigate to={ROUTERS.USER.HOME} replace />;
  }

  return (
    <Layout className="admin-layout">
      <AdminSidebar />
      <Layout className="admin-main">
        <AdminHeader/>
        <Content className="admin-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
