import React, { useContext } from "react";
import { Layout, Avatar, Space } from "antd";
import { AuthContext } from "../../../context/authProvider";
import "./adminHeader.scss";
import { useUserData } from "../../../hooks/useUserData";

const { Header } = Layout;

export default function AdminHeader() {
  const { user } = useContext(AuthContext);
  const { role, photoURL, displayName, loading } = useUserData(user.uid);
  return (
    <Header className="admin-header">
      <h2>Trang quản trị quik.id.vn</h2>
      { loading ? (
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
