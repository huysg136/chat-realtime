import { useState, useContext, useEffect } from "react";
import {
  AiOutlineLogout,
  AiFillMessage,
  AiOutlineMessage,
  AiOutlineUser,
  AiFillHome,
  AiOutlineHome,
  AiOutlineTeam
} from "react-icons/ai";
import { AuthContext } from "../../../context/authProvider";
import { db } from "../../../firebase/config";
import { getUserDocIdByUid } from "../../../firebase/services";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import "./leftSide.scss";
import { SettingOutlined, LogoutOutlined } from '@ant-design/icons';
import { AppContext } from '../../../context/appProvider';
import { MdHome, MdOutlineAdminPanelSettings, MdOutlineHome, MdReportProblem } from "react-icons/md";
import { useNavigate, useLocation } from "react-router-dom";
import { ROUTERS } from "../../../configs/router";
import { useTranslation } from "react-i18next";
import { FaMoneyBillWave } from "react-icons/fa";
import { FaRegUser } from "react-icons/fa6";
import { HiUserGroup, HiOutlineUserGroup } from "react-icons/hi2";
import { useFriends } from "../../../hooks/useFriends";
import UserMenu from "../userMenu/userMenu";

const defaultAvatar = "https://images.spiderum.com/sp-images/9ae85f405bdf11f0a7b6d5c38c96eb0e.jpeg";

export default function LeftSide({ isExpanded }) {
  const location = useLocation();
  const [active, setActive] = useState("home");
  const [role, setRole] = useState("");
  const { user, logout } = useContext(AuthContext);
  const { setIsProfileVisible, setIsSettingsVisible, setIsMyReportsVisible, setIsUpgradePlanVisible, selectedRoomId: roomId, setSelectedRoomId, setIsActiveTab } = useContext(AppContext);
  const [photoURL, setPhotoURL] = useState(defaultAvatar);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { receivedRequests } = useFriends();

  useEffect(() => {
    if (location.pathname === ROUTERS.USER.HOME || location.pathname.startsWith("/p/")) {
      setActive("home");
    } else if (location.pathname === ROUTERS.USER.DIRECT || location.pathname.startsWith("/direct/t")) {
      // Only reset to "message" if we are NOT currently on the friends tab
      setActive((prev) => (prev === "friends" ? "friends" : "message"));
    } else if (location.pathname.startsWith("/profile")) {
      setActive("profile");
    } else if (location.pathname.startsWith("/direct")) {
      setActive("message");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, user?.uid]);

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
    <div className={`sidebar ${isExpanded ? "expanded" : ""}`}>
      {!isExpanded && (
        <div className="left-side-user-menu-wrapper" style={{ marginBottom: "10px" }}>
          <UserMenu />
        </div>
      )}


      <div className="icon-group top">
        {isExpanded ? (
          <>
            <div
              className={`icon-item ${active === "home" ? "active" : ""}`}
              onClick={() => {
                setActive("home");
                setSelectedRoomId(null);
                navigate(ROUTERS.USER.HOME);
              }}
            >
              {active === "home" ? <AiFillHome /> : <AiOutlineHome />}
              <span className="icon-label">Trang chủ</span>
            </div>
            <div
              className={`icon-item ${active === "message" ? "active" : ""}`}
              onClick={() => {
                setActive("message");
                setIsActiveTab("message");
                if (roomId) {
                  navigate(ROUTERS.USER.CHAT.replace(":roomId", roomId));
                } else {
                  navigate(ROUTERS.USER.DIRECT);
                }
              }}
            >
              {active === "message" ? <AiFillMessage /> : <AiOutlineMessage />}
              <span className="icon-label">Tin nhắn</span>
            </div>
            <div
              className={`icon-item ${active === "friends" ? "active" : ""}`}
              onClick={() => {
                setActive("friends");
                setIsActiveTab("friends");
                if (roomId) {
                  navigate(ROUTERS.USER.CHAT.replace(":roomId", roomId));
                } else {
                  navigate(ROUTERS.USER.DIRECT);
                }
              }}
            >
              {active === "friends" ? <AiOutlineTeam /> : <AiOutlineTeam />}
              <span className="icon-label">Bạn bè</span>
            </div>
            <div
              className={`icon-item ${active === "profile" ? "active" : ""}`}
              onClick={() => {
                setActive("profile");
                if (user?.uid) {
                  navigate(`/profile/${user.uid}`);
                }
              }}
            >
              <AiOutlineUser />
              <span className="icon-label">Trang cá nhân</span>
            </div>
          </>
        ) : (
          <>
            <div
              className={`icon-item ${active === "home" ? "active" : ""}`}
              onClick={() => {
                setActive("home");
                setSelectedRoomId(null);
                navigate(ROUTERS.USER.HOME);
              }}
            >
              {active === "home" ? <MdHome /> : <MdOutlineHome />}
            </div>
            <div
              className={`icon-item ${active === "message" ? "active" : ""}`}
              onClick={() => {
                setActive("message");
                setIsActiveTab("message");
                if (roomId) {
                  navigate(ROUTERS.USER.CHAT.replace(":roomId", roomId));
                } else {
                  navigate(ROUTERS.USER.DIRECT);
                }
              }}
            >
              {active === "message" ? <AiFillMessage /> : <AiOutlineMessage />}
            </div>
            <div
              className={`icon-item ${active === "friends" ? "active" : ""}`}
              onClick={() => {
                setActive("friends");
                setIsActiveTab("friends");
                if (roomId) {
                  navigate(ROUTERS.USER.CHAT.replace(":roomId", roomId));
                } else {
                  navigate(ROUTERS.USER.DIRECT);
                }
              }}
              title={t('friends.modalTitle')}
            >
              {active === "friends" ? <HiUserGroup /> : <HiOutlineUserGroup />}
              {receivedRequests.length > 0 && (
                <span className="nav-badge">
                  {receivedRequests.length > 9 ? "9+" : receivedRequests.length}
                </span>
              )}
            </div>
            <div
              className={`icon-item ${active === "profile" ? "active" : ""}`}
              onClick={() => {
                setActive("profile");
                if (user?.uid) {
                  navigate(`/profile/${user.uid}`);
                }
              }}
              title="Trang cá nhân"
            >
              <AiOutlineUser />
            </div>
          </>
        )}
      </div>

      <div className="icon-group bottom">
        <div className="icon-item" onClick={logout}>
          <AiOutlineLogout />
        </div>
      </div>
    </div>
  );
}