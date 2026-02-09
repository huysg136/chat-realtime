import { useState, useContext, useEffect } from "react";
import { AiOutlineLogout } from "react-icons/ai";
import { Avatar, Dropdown, Menu } from "antd";
//import { auth } from "../../../firebase/config";
import { AuthContext } from "../../../context/authProvider";
import { db } from "../../../firebase/config";
import { getUserDocIdByUid } from "../../../firebase/services";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import "./leftSide.scss"; 
import { AiFillMessage, AiOutlineMessage  } from "react-icons/ai";
import { UserOutlined, SettingOutlined, LogoutOutlined } from '@ant-design/icons';
import { AppContext } from '../../../context/appProvider';
import { MdOutlineAdminPanelSettings, MdReportProblem } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useUserStatus } from "../../../hooks/useUserStatus";
import { ROUTERS } from "../../../utils/router";
import { useTranslation } from "react-i18next";


const defaultAvatar = "https://images.spiderum.com/sp-images/9ae85f405bdf11f0a7b6d5c38c96eb0e.jpeg";

export default function LeftSide() {
  const [active, setActive] = useState("message");
  const [role, setRole] = useState("");
  const { user, logout } = useContext(AuthContext);
  const { setIsProfileVisible, setIsSettingsVisible, setIsMyReportsVisible } = useContext(AppContext);
  const displayName = user?.displayName;
  const [photoURL, setPhotoURL] = useState(defaultAvatar);
  const navigate = useNavigate();
  const userStatus = useUserStatus(user?.uid);
  const { t } = useTranslation();

  useEffect(() => {
    if (!user?.uid) return;
    let unsubscribe;

    const fetchDocIdAndSubscribe = async () => {
      const docId = await getUserDocIdByUid(user.uid);
      if (!docId) return;

      const userRef = doc(db, "users", docId);

      unsubscribe = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setRole(data.role || "user");
          setPhotoURL(data.photoURL || defaultAvatar);
        }
      });
    };

    void fetchDocIdAndSubscribe();

    return () => unsubscribe && unsubscribe();
  }, [user?.uid]);

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
        {t('leftSide.myProfile')}
      </Menu.Item>
      {(role === "admin" || (role === "moderator" && user?.permissions?.canAccessAdminPage)) && (
        <Menu.Item key="admin" icon={<MdOutlineAdminPanelSettings />} onClick={() => navigate(ROUTERS.ADMIN.DASHBOARD)}>
          {t('leftSide.adminPage')}
        </Menu.Item>
      )}
      <Menu.Item 
        key="settings" 
        icon={<SettingOutlined />}
        onClick={() => setIsSettingsVisible(true)}
      >
        {t('leftSide.settings')}
      </Menu.Item>
      {/* <Menu.Item key="saved" icon={<SaveOutlined />}>
        Đã lưu
      </Menu.Item> */}
      <Menu.Item key="reports" icon={<MdReportProblem />} onClick={() => setIsMyReportsVisible(true)}>
        {t('leftSide.myReport')}
      </Menu.Item>
      <Menu.Divider style={{margin: "0"}}/>
      <Menu.Item
        key="logout"
        onClick={logout}
        icon={<LogoutOutlined />}
        style={{ color: "#ff4d4f", fontWeight: "500" }}
      >
        {t('leftSide.logout')}
      </Menu.Item>
    </Menu>
  );
  return (
    <div className="sidebar">
      <Dropdown overlay={menu} placement="bottomRight" trigger={["click"]}>
        <div style={{ position: "relative", display: "inline-block" }}>
          <Avatar
            size={40}
            src={photoURL || defaultAvatar}
            className="user-avatar"
          >
            {!photoURL && displayName?.charAt(0)?.toUpperCase()}
          </Avatar>
          {userStatus?.isOnline && user?.showOnlineStatus && (
            <span
              style={{
                position: "absolute",
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: "#4caf50",
                border: "2px solid white",
                bottom: 9,
                right: 0,
                boxShadow: "0 0 2px rgba(0,0,0,0.3)",
              }}
            />
          )}
        </div>
      </Dropdown>


      <div className="icon-group top">
        {/* <div
          className={`icon-item ${active === "home" ? "active" : ""}`}
          // onClick={() => setActive("home")}
        >
          {active === "home" ? <GoHomeFill /> : <GoHome />}
        </div> */}
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
        {/* <div
          className={`icon-item ${active === "contacts" ? "active" : ""}`}
          onClick={() => setActive("contacts")}
        >
          {active === "contacts" ? <IoPeople /> : <IoPeopleOutline />}
        </div> */}
        {/* <div
          className={`icon-item ${active === "notification" ? "active" : ""}`}
          // onClick={() => setActive("notification")}
        >
          {active === "notification" ? <IoNotifications /> : <IoMdNotificationsOutline />}
        </div> */}
        {/* <div
          className={`icon-item ${active === "invitation" ? "active" : ""}`}
          //onClick={() => setActive("invitation")}
        >
          {active === "invitation" ? <IoMailUnread /> : <IoMailUnreadOutline />}
        </div> */}
      </div>

      <div className="icon-group bottom">
        <div className="icon-item" onClick={logout}>
          <AiOutlineLogout />
        </div>
      </div>
    </div>
  );
}