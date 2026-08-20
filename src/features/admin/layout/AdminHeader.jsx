import React from "react";
import { Layout, Avatar, Space } from "antd";
import { useAuthStore } from "../../auth/store/auth.store";
import "./adminHeader.scss";
import { useUserData } from "../../profile/hooks/useUserData";

const { Header } = Layout;

export default function AdminHeader() {
  const user = useAuthStore((state) => state.user);
  const { role, photoURL, displayName, loading } = useUserData(user?.uid);
  return (
    <Header className="admin-header">
      <h2>Trang quản trị quik.id.vn</h2>
      {loading ? (
        null
      ) : (
        <Space className="admin-user">
          <Avatar src={photoURL} />
          <div className="admin-profile">
            <span>{displayName}</span>
            <span>{role}</span>
          </div>
        </Space>
      )}
    </Header>
  );
}
