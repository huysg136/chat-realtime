import { useState, useContext, useEffect } from "react";
import { AiOutlineLogout } from "react-icons/ai";
import { Avatar, Dropdown } from "antd";
import { AuthContext } from "../../../context/authProvider";
import { db } from "../../../firebase/config";
import { getUserDocIdByUid } from "../../../firebase/services";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import "./leftSide.scss";
import { AiFillMessage, AiOutlineMessage } from "react-icons/ai";
import { SettingOutlined, LogoutOutlined } from '@ant-design/icons';
import { AppContext } from '../../../context/appProvider';
import { MdOutlineAdminPanelSettings, MdReportProblem } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useUserStatus } from "../../../hooks/useUserStatus";
import { ROUTERS } from "../../../configs/router";
import { useTranslation } from "react-i18next";
import { FaMoneyBillWave } from "react-icons/fa";
import { GoHome, GoHomeFill } from "react-icons/go";
import { FaRegUser, FaUser } from "react-icons/fa6";




const defaultAvatar = "https://images.spiderum.com/sp-images/9ae85f405bdf11f0a7b6d5c38c96eb0e.jpeg";

export default function LeftSide() {
  const [active, setActive] = useState("message"); // mốt đổi thành home
  const [role, setRole] = useState("");
  const { user, logout } = useContext(AuthContext);
  const { setIsProfileVisible, setIsSettingsVisible, setIsMyReportsVisible, setIsUpgradePlanVisible } = useContext(AppContext);
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

  const menuItems = [
    {
      key: "profile",
      icon: <FaRegUser />,
      label: t('leftSide.myProfile'),
      onClick: () => setIsProfileVisible(true),
    },
    (role === "admin" || (role === "moderator" && user?.permissions?.canAccessAdminPage)) && {
      key: "admin",
      icon: <MdOutlineAdminPanelSettings />,
      label: t('leftSide.adminPage'),
      onClick: () => navigate(ROUTERS.ADMIN.DASHBOARD),
    },
    {
      key: "settings",
      icon: <SettingOutlined />,
      label: t('leftSide.settings'),
      onClick: () => setIsSettingsVisible(true),
    },
    {
      key: "reports",
      icon: <MdReportProblem />,
      label: t('leftSide.myReport'),
      onClick: () => setIsMyReportsVisible(true),
    },
    {
      key: "upgrade-plan",
      icon: <FaMoneyBillWave />,
      label: t('leftSide.upgradePlan'),
      onClick: () => setIsUpgradePlanVisible(true),
    },
    {
      type: 'divider',
      style: { margin: "0" }
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: t('leftSide.logout'),
      onClick: logout,
      danger: true,
      style: { fontWeight: "500" }
    }
  ].filter(Boolean);

  return (
    <div className="sidebar">
      <Dropdown menu={{ items: menuItems }} placement="bottomRight" trigger={["click"]}>
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
          className={`icon-item ${active === "profile" ? "active" : ""}`}
          // onClick={() => setActive("profile")}
        >
          {active === "profile" ? <FaUser /> : <FaRegUser />}
        </div> */}
        {/* mốt đổi lại thành HOME */}
        <div
          className={`icon-item ${active === "home" ? "active" : ""}`}
          onClick={() => 
            <>
              {setActive("home")}
              {navigate(ROUTERS.USER.MESSAGE)} 
            </>
          }
        >
          {active === "home" ? <GoHomeFill /> : <GoHome />}
        </div>
        {/* mốt đổi lại thành MESSAGE */}
        <div
          className={`icon-item ${active === "message" ? "active" : ""}`}
          onClick={() => 
            <>
              {setActive("message")}
              {navigate(ROUTERS.USER.HOME)}
            </>
          }
        >
          {active === "message" ? <AiFillMessage /> : <AiOutlineMessage />}
        </div>
      </div>

      <div className="icon-group bottom">
        <div className="icon-item" onClick={logout}>
          <AiOutlineLogout />
        </div>
      </div>
    </div>
  );
}