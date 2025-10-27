import React, { useContext } from "react";
import { Layout, Avatar, Dropdown, Space } from "antd";
import { AuthContext } from "../context/authProvider";

const { Header } = Layout;

export default function AdminHeader() {
  const { user, logout } = useContext(AuthContext);

  const items = [
    // { key: "1", label: <span onClick={logout}>Đăng xuất</span> },
  ];

  return (
    <Header className="admin-header">
      <h2>Trang quản trị hệ thống chat</h2>
      <Dropdown menu={{ items }}>
        <Space className="admin-user">
          <Avatar src={user?.photoURL} />
          <span>{user?.displayName || "Admin"}</span>
        </Space>
      </Dropdown>
    </Header>
  );
}
