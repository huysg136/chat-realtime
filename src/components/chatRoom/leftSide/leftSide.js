import React, { useState, useContext, useEffect } from "react";
import { AiOutlineLogout } from "react-icons/ai";
import { Avatar, Dropdown, Menu } from "antd";
import { auth } from "../../../firebase/config";
import { AuthContext } from "../../../context/authProvider";
import { db } from "../../../firebase/config";
import { getUserDocIdByUid } from "../../../firebase/services";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import "./leftSide.scss"; 
import { GoHome, GoHomeFill} from "react-icons/go";
//import { RiMessengerFill, RiMessengerLine } from "react-icons/ri";
import { AiFillMessage, AiOutlineMessage  } from "react-icons/ai";
import { IoNotifications, IoMailUnreadOutline, IoMailUnread } from "react-icons/io5";
import { IoMdNotificationsOutline } from "react-icons/io";
import { UserOutlined, SettingOutlined, LogoutOutlined } from '@ant-design/icons';
import { AppContext } from '../../../context/appProvider';
import { MdOutlineAdminPanelSettings } from "react-icons/md";
import { useNavigate } from "react-router-dom";


const defaultAvatar = "https://images.spiderum.com/sp-images/9ae85f405bdf11f0a7b6d5c38c96eb0e.jpeg";

export default function LeftSide() {
  const [active, setActive] = useState("message");
  const [role, setRole] = useState("");
  const { user } = useContext(AuthContext);
  const { setIsProfileVisible } = useContext(AppContext);
  const displayName = user?.displayName;
  const photoURL = user?.photoURL;
  const navigate = useNavigate();

  // Nếu user không có avatar thì set mặc định vào Firestore
  useEffect(() => {
    if (user && !photoURL) {
      const userRef = doc(db, "users", user.uid);
      void updateDoc(userRef, { photoURL: defaultAvatar });
    }
  }, [user, photoURL]);

  // Real-time role listener
  useEffect(() => {
    if (!user) return;
    let unsubscribe;
    const fetchDocIdAndSubscribe = async () => {
      const docId = await getUserDocIdByUid(user.uid);
      if (!docId) return;
      const userRef = doc(db, "users", docId);
      unsubscribe = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          setRole(docSnap.data().role || "user");
        }
      });
    };
    void fetchDocIdAndSubscribe();

    return () => unsubscribe && unsubscribe();
  }, [user]);

  const menu = (
    <Menu style={{cursor: "pointer"}}>
      <Menu.Item key="profile" icon={<UserOutlined />} onClick={() => setIsProfileVisible(true)}>
        Hồ sơ của tôi
      </Menu.Item>
      {role === "admin" && (
        <Menu.Item key="admin" icon={<MdOutlineAdminPanelSettings />} onClick={() => navigate("/admin")}>
          Trang quản trị
        </Menu.Item>
      )}
      <Menu.Item key="settings" icon={<SettingOutlined />}>
        Cài đặt
      </Menu.Item>
      {/* <Menu.Item key="saved" icon={<SaveOutlined />}>
        Đã lưu
      </Menu.Item> */}
      <Menu.Item key="request" icon={<IoMailUnreadOutline />}>
        Lời mời đang chờ
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
      <Dropdown overlay={menu} placement="bottomRight" trigger={["click"]}>
        <Avatar
          size={40}
          src={photoURL || defaultAvatar}
          className="user-avatar"
        >
          {!photoURL && displayName?.charAt(0)?.toUpperCase()}
        </Avatar>
      </Dropdown>

      <div className="icon-group top">
        <div
          className={`icon-item ${active === "home" ? "active" : ""}`}
          // onClick={() => setActive("home")}
        >
          {active === "home" ? <GoHomeFill /> : <GoHome />}
        </div>
        {/* <div
          className={`icon-item ${active === "search" ? "active" : ""}`}
          // onClick={() => setActive("search")}
        >
          {active === "search" ? <HiSearch /> : <HiSearch />}
        </div> */}
        <div
          className={`icon-item ${active === "message" ? "active" : ""}`}
          onClick={() => setActive("message")}
        >
          {active === "message" ? <AiFillMessage /> : <AiOutlineMessage />}
        </div>
        <div
          className={`icon-item ${active === "notification" ? "active" : ""}`}
          // onClick={() => setActive("notification")}
        >
          {active === "notification" ? <IoNotifications /> : <IoMdNotificationsOutline />}
        </div>
        <div
          className={`icon-item ${active === "invitation" ? "active" : ""}`}
          //onClick={() => setActive("invitation")}
        >
          {active === "invitation" ? <IoMailUnread /> : <IoMailUnreadOutline />}
        </div>
      </div>

      <div className="icon-group bottom">
        <div className="icon-item" onClick={() => auth.signOut()}>
          <AiOutlineLogout />
        </div>
      </div>
    </div>
  );
}