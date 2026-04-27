import React, { useState, useEffect, useContext } from "react";
import { Avatar, Dropdown } from "antd";
import { AiOutlineDown } from "react-icons/ai";
import { AuthContext } from "../../../context/authProvider";
import { AppContext } from "../../../context/appProvider";
import { db } from "../../../firebase/config";
import { getUserDocIdByUid } from "../../../firebase/services";
import { doc, onSnapshot } from "firebase/firestore";
import { useUserStatus } from "../../../hooks/useUserStatus";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ROUTERS } from "../../../configs/router";
import { FaRegUser } from "react-icons/fa6";
import { FaMoneyBillWave } from "react-icons/fa";
import { MdOutlineAdminPanelSettings, MdReportProblem } from "react-icons/md";
import { SettingOutlined, LogoutOutlined } from '@ant-design/icons';

const defaultAvatar = "https://images.spiderum.com/sp-images/9ae85f405bdf11f0a7b6d5c38c96eb0e.jpeg";

export default function UserMenu({ showChevron = false }) {
  const { user, logout } = useContext(AuthContext);
  const { setIsProfileVisible, setIsSettingsVisible, setIsMyReportsVisible, setIsUpgradePlanVisible } = useContext(AppContext);
  const [role, setRole] = useState("");
  const [photoURL, setPhotoURL] = useState(defaultAvatar);
  const userStatus = useUserStatus(user?.uid);
  const { t } = useTranslation();
  const navigate = useNavigate();

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
    <Dropdown menu={{ items: menuItems }} placement="bottomRight" trigger={["click"]}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
        <div style={{ position: "relative", display: "block", width: "fit-content" }}>
          <Avatar
            size={36}
            src={photoURL || defaultAvatar}
            className="user-avatar"
            style={{ display: "block" }}
          >
            {!photoURL && user?.displayName?.charAt(0)?.toUpperCase()}
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
                bottom: -2,
                right: -2,
                boxShadow: "0 0 2px rgba(0,0,0,0.3)",
              }}
            />
          )}
        </div>
        {showChevron && <AiOutlineDown style={{ fontSize: "14px", color: "#65676b" }} />}
      </div>
    </Dropdown>
  );
}
