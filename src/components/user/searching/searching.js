import React, { useContext, useEffect, useState } from "react";
import { Input, Button } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { IoCreateOutline } from "react-icons/io5";
import { AppContext } from "../../../context/appProvider";
import { AuthContext } from "../../../context/authProvider";
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
    if (user) {
      setDisplayName(user.displayName || "");
      setUsernameHandle(user.username ? `@${user.username}` : "");
    }
  }, [user]);

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
            <UserBadge displayName={displayName} role={user.role} premiumLevel={user.premiumLevel} premiumUntil={user.premiumUntil} size={16} />
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
          variant="borderless"
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
