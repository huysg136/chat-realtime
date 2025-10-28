import React from "react";
import { Layout } from "antd";
import { Outlet } from "react-router-dom";
import AdminSidebar from "../adminSidebar/adminSidebar";
import AdminHeader from "../adminHeader/adminHeader";
import "./adminLayout.scss";

const { Content } = Layout;

export default function AdminLayout() {
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
