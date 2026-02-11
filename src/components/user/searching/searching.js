import React, { useContext, useEffect, useState } from "react";
import { Input, Button } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { IoCreateOutline } from "react-icons/io5";
import { AppContext } from "../../../context/appProvider";
import { AuthContext } from "../../../context/authProvider";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../../firebase/config";
import { getUserDocIdByUid } from "../../../firebase/services";
import "./searching.scss";
import { useTranslation } from "react-i18next";
import UserBadge from "../../common/userBadge";

export default function Searching() {
  const { setIsAddRoomVisible, searchText, setSearchText, selectedRoomId } = useContext(AppContext);
  const { setIsPendingInviteVisible } = useContext(AppContext);
  const { user } = useContext(AuthContext) || {};
  const [displayName, setDisplayName] = useState("");
  const [usernameHandle, setUsernameHandle] = useState("");
  const { t } = useTranslation();

  useEffect(() => {
    if (!user?.uid) return;

    let unsubscribe = () => {};
    const setupRealtime = async () => {
      const docId = await getUserDocIdByUid(user.uid);
      if (!docId) return;

      const docRef = doc(db, "users", docId);
      unsubscribe = onSnapshot(
        docRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setDisplayName(data.displayName || "");
            setUsernameHandle(data.username ? `@${data.username}` : "");
          }
        },
        (error) => {}
      );
    };

    setupRealtime();

    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    if (selectedRoomId) {
      setSearchText("");
    }
  }, [selectedRoomId, setSearchText]);

  const handleAddRoom = () => setIsAddRoomVisible(true);
  const handleSearchChange = (e) => setSearchText(e.target.value);

  return (
    <div className="searching-panel">
      <div className="user-header">
        <div className="username-wrapper">
          <div className="display-name-wrapper">
            <UserBadge displayName={displayName} role={user.role} premiumLevel={user.premiumLevel} premiumUntil={user.premiumUntil} size={16}/>
          </div>
          {usernameHandle && <span className="username">@{usernameHandle.replace(/^@/, "")}</span>}
        </div>
        <div className="action-buttons">
          <Button
            type="text"
            className="create-btn"
            onClick={handleAddRoom}
            icon={<IoCreateOutline />}
          />
        </div>
      </div>

      <div className="search-wrapper">
        <Input
          className="search-input"
          placeholder={t('searching.placeholder')}
          prefix={<SearchOutlined className="search-icon" />}
          bordered={false}
          value={searchText}
          onChange={handleSearchChange}
        />
      </div>

      <div className="room-header">
        <span className="header-1">{t('searching.message')}</span>
        <span 
          className="header-2"
          onClick={() => setIsPendingInviteVisible(true)}
        >
            {t('searching.invitePending')}
        </span>
      </div>
    </div>
  );
}
