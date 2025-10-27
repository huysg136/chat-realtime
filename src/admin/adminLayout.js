import React from "react";
import { Layout } from "antd";
import { Outlet } from "react-router-dom";
import AdminSidebar from "./adminSidebar";
import AdminHeader from "./adminHeader";
import "./admin.scss";

const { Content } = Layout;

export default function AdminLayout() {
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
