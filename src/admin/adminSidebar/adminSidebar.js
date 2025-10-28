import React from "react";
import { Layout, Menu } from "antd";
import {
  UserOutlined,
  MessageOutlined,
  BellOutlined,
  DashboardOutlined,
} from "@ant-design/icons";
import { Link, useLocation } from "react-router-dom";
import { IoMdReturnLeft } from "react-icons/io";
import logo from "../../images/logo_quik.png";
import { useNavigate } from "react-router-dom";
import "./adminSidebar.scss";

const { Sider } = Layout;

export default function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <Sider width={220} theme="light" className="admin-sider">
      <div className="admin-logo">
        <img src={logo} alt="Quik Logo" className="admin-logo-img"/>
        <span>Quik Admin</span>
      </div>
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        style={{ borderRight: 0 }}
      >
        <Menu.Item key="/admin" icon={<DashboardOutlined />}>
          <Link to="/admin">Tổng quan</Link>
        </Menu.Item>
        <Menu.Item key="/admin/users" icon={<UserOutlined />}>
          <Link to="/admin/users">Người dùng</Link>
        </Menu.Item>
        <Menu.Item key="/admin/rooms" icon={<MessageOutlined />}>
          <Link to="/admin/rooms">Phòng chat</Link>
        </Menu.Item>
        <Menu.Item key="/admin/announcements" icon={<BellOutlined />}>
          <Link to="/admin/announcements">Tạo thông báo</Link>
        </Menu.Item>
        <Menu.Item key="/" icon={<IoMdReturnLeft />}>
          <Link to="/">Quay về</Link>
        </Menu.Item>
      </Menu>
    </Sider>
  );
}
