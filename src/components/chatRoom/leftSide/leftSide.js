import React, { useState, useContext, useEffect } from "react";
import { AiOutlineLogout } from "react-icons/ai";
import { Avatar, Dropdown, Menu } from "antd";
import { auth } from "../../../firebase/config";
import { AuthContext } from "../../../context/authProvider";
import { db } from "../../../firebase/config";
import { doc, updateDoc } from "firebase/firestore";
import "./leftSide.scss"; 
import { GoHome, GoHomeFill, GoHeart, GoHeartFill } from "react-icons/go";
import { HiSearch } from "react-icons/hi";
import { RiMessengerFill, RiMessengerLine } from "react-icons/ri";
import { CgDetailsMore } from "react-icons/cg";
import { UserOutlined, SettingOutlined, SaveOutlined, MessageOutlined, LogoutOutlined } from '@ant-design/icons';


const defaultAvatar = "https://images.spiderum.com/sp-images/9ae85f405bdf11f0a7b6d5c38c96eb0e.jpeg";

export default function LeftSide() {
  const [active, setActive] = useState("message");
  const { user } = useContext(AuthContext);
  const displayName = user?.displayName;
  const photoURL = user?.photoURL;

  // Nếu user không có avatar thì set mặc định vào Firestore
  useEffect(() => {
    if (user && !photoURL) {
      const userRef = doc(db, "users", user.uid);
      updateDoc(userRef, {
        photoURL: defaultAvatar
      }).catch((err) => console.error("Error updating avatar:", err));
    }
  }, [user, photoURL]);

  const menu = (
    <Menu>
      <Menu.Item key="name" disabled>
        <strong style={{ color: "black", display: "block", textAlign: "center" }}>
          {displayName}
        </strong>
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="profile" icon={<UserOutlined />}>
        Trang cá nhân
      </Menu.Item>
      <Menu.Item key="settings" icon={<SettingOutlined />}>
        Cài đặt
      </Menu.Item>
      <Menu.Item key="saved" icon={<SaveOutlined />}>
        Đã lưu
      </Menu.Item>
      <Menu.Item key="request" icon={<MessageOutlined />}>
        Tin nhắn đang chờ
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item
        key="logout"
        onClick={() => auth.signOut()}
        icon={<LogoutOutlined />}
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
        <Avatar
          size={40}
          src={photoURL || defaultAvatar}
          className="user-avatar"
        >
          {!photoURL && displayName?.charAt(0)?.toUpperCase()}
        </Avatar>
      </Dropdown>

      {/* Nhóm icon phía trên */}
      <div className="icon-group top">
        <div
          className={`icon-item ${active === "home" ? "active" : ""}`}
          onClick={() => setActive("home")}
        >
          {active === "home" ? <GoHomeFill /> : <GoHome />}
        </div>
        <div
          className={`icon-item ${active === "search" ? "active" : ""}`}
          onClick={() => setActive("search")}
        >
          {active === "search" ? <HiSearch /> : <HiSearch />}
        </div>
        <div
          className={`icon-item ${active === "message" ? "active" : ""}`}
          onClick={() => setActive("message")}
        >
          {active === "message" ? <RiMessengerFill /> : <RiMessengerLine />}
        </div>
        <div
          className={`icon-item ${active === "heart" ? "active" : ""}`}
          onClick={() => setActive("heart")}
        >
          {active === "heart" ? <GoHeartFill /> : <GoHeart />}
        </div>
      </div>

      {/* Nhóm icon phía dưới */}
      <div className="icon-group bottom">
        <div className="icon-item" onClick={() => auth.signOut()}>
          <AiOutlineLogout />
        </div>
        {/* <div
          className={`icon-item ${active === "more" ? "active" : ""}`}
          onClick={() => setActive("more")}
        >
          {active === "more" ? <CgDetailsMore /> : <CgDetailsMore />}
        </div> */}
      </div>
    </div>
  );
}