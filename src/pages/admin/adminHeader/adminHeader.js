import React, { useContext } from "react";
import { Layout, Avatar, Space } from "antd";
import { AuthContext } from "../../../context/authProvider";
import "./adminHeader.scss";

const { Header } = Layout;

export default function AdminHeader() {
  const { user } = useContext(AuthContext);

  return (
    <Header className="admin-header">
      <h2>Trang quản trị quik.id.vn</h2>
      <Space className="admin-user">
        <Avatar src={user?.photoURL} />
        <span>{user?.displayName || "Admin"}</span>
      </Space>
    </Header>
  );
}