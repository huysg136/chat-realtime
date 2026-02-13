import React, { useContext } from "react";
import { Layout, Menu } from "antd";
import {
  UserOutlined,
  MessageOutlined,
  BellOutlined,
  DashboardOutlined,
  SettingOutlined,
  SafetyCertificateOutlined
} from "@ant-design/icons";
import { Link, useLocation } from "react-router-dom";
import { IoMdReturnLeft } from "react-icons/io";
import logo from "../../../images/logo_quik.png";
import "./adminSidebar.scss";
import { AuthContext } from "../../../context/authProvider";
import { ROUTERS } from "../../../configs/router";
import { MdReportProblem } from "react-icons/md";

const { Sider } = Layout;

export default function AdminSidebar() {
  const location = useLocation();
  const { user: currentUser } = useContext(AuthContext);

  return (
    <Sider width={220} className="admin-sider">
      <div className="admin-logo">
        <img src={logo} alt="Quik Logo" className="admin-logo-img" />
        <span>Quik Admin</span>
      </div>
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        style={{ borderRight: 0 }}
        items={[
          {
            key: ROUTERS.ADMIN.DASHBOARD,
            icon: <DashboardOutlined />,
            label: <Link to={ROUTERS.ADMIN.DASHBOARD}>Tổng quan</Link>,
          },
          {
            key: ROUTERS.ADMIN.USERS,
            icon: <UserOutlined />,
            label: <Link to={ROUTERS.ADMIN.USERS}>Người dùng</Link>,
          },
          {
            key: ROUTERS.ADMIN.ROOMS,
            icon: <MessageOutlined />,
            label: <Link to={ROUTERS.ADMIN.ROOMS}>Phòng chat</Link>,
          },
          {
            key: ROUTERS.ADMIN.REPORTS,
            icon: <MdReportProblem />,
            label: <Link to={ROUTERS.ADMIN.REPORTS}>Quản lý báo cáo</Link>,
          },
          {
            key: ROUTERS.ADMIN.ANNOUNCEMENTS,
            icon: <BellOutlined />,
            label: <Link to={ROUTERS.ADMIN.ANNOUNCEMENTS}>Tạo thông báo</Link>,
          },
          currentUser?.role === "admin" && {
            key: ROUTERS.ADMIN.MOD_PERMISSIONS,
            icon: <SafetyCertificateOutlined />,
            label: <Link to={ROUTERS.ADMIN.MOD_PERMISSIONS}>Quản lý quyền mod</Link>,
          },
          {
            key: ROUTERS.ADMIN.SETTINGS,
            icon: <SettingOutlined />,
            label: <Link to={ROUTERS.ADMIN.SETTINGS}>Cấu hình hệ thống</Link>,
          },
          {
            key: ROUTERS.USER.HOME,
            icon: <IoMdReturnLeft />,
            label: <Link to={ROUTERS.USER.HOME}>Quay về</Link>,
          }
        ].filter(Boolean)}
      />
    </Sider>
  );
}
