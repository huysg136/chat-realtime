import React, { useState, useContext } from "react";
import { MessageOutlined, TeamOutlined, SettingOutlined } from "@ant-design/icons";
import { AiOutlineLogout } from "react-icons/ai";
import { Avatar, Dropdown, Menu } from "antd";
import { auth } from "../../../firebase/config";
import { AuthContext } from "../../../context/authProvider";
import "./leftSide.scss"; 

export default function LeftSide() {
  const [active, setActive] = useState("message");
  const { user } = useContext(AuthContext);
  const displayName = user?.displayName;
  const photoURL = user?.photoURL;

  const menu = (
    <Menu>
      <Menu.Item key="name" disabled>
        <strong style={{ color: "black" }}>{displayName}</strong>
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="profile">Hồ sơ của tôi</Menu.Item>
      <Menu.Item key="settings">Cài đặt</Menu.Item>
      <Menu.Divider />
      <Menu.Item
        key="logout"
        onClick={() => auth.signOut()}
        style={{ color: "red", fontWeight: "500" }}
      >
        Đăng xuất
      </Menu.Item>
    </Menu>
  );

  return (
    <div className="sidebar">
      {/* Avatar */}
      <Dropdown overlay={menu} placement="bottomRight" trigger={["click"]}>
        <Avatar size={40} src={photoURL} className="user-avatar">
          {!photoURL && displayName?.charAt(0)?.toUpperCase()}
        </Avatar>
      </Dropdown>

      {/* Nhóm icon phía trên (có active) */}
      <div className="icon-group top">
        <div
          className={`icon-item ${active === "message" ? "active" : ""}`}
          onClick={() => setActive("message")}
        >
          <MessageOutlined />
        </div>
        <div
          className={`icon-item ${active === "team" ? "active" : ""}`}
          onClick={() => setActive("team")}
        >
          <TeamOutlined />
        </div>
      </div>

      {/* Nhóm icon phía dưới (chỉ hover, không active) */}
      <div className="icon-group bottom">
        <div className="icon-item" onClick={() => auth.signOut()}>
          <AiOutlineLogout />
        </div>
        <div className="icon-item">
          <SettingOutlined />
        </div>
      </div>
    </div>
  );
}
