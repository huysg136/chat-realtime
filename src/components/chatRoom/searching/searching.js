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

export default function Searching() {
  const { setIsAddRoomVisible, searchText, setSearchText } = useContext(AppContext);
  const { user } = useContext(AuthContext) || {};
  const [displayName, setDisplayName] = useState("");
  const [usernameHandle, setUsernameHandle] = useState("");

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

  const handleAddRoom = () => setIsAddRoomVisible(true);
  const handleSearchChange = (e) => setSearchText(e.target.value);

  return (
    <div className="searching-panel">
      <div className="user-header">
        <div className="username-wrapper">
          <span className="display-name">{displayName}</span>
          {usernameHandle && <span className="username">@{usernameHandle.replace(/^@/, "")}</span>}
        </div>
        <Button
          type="text"
          className="create-btn"
          onClick={handleAddRoom}
          icon={<IoCreateOutline />}
        />
      </div>

      <div className="search-wrapper">
        <Input
          className="search-input"
          placeholder="Tìm kiếm"
          prefix={<SearchOutlined className="search-icon" />}
          bordered={false}
          value={searchText}
          onChange={handleSearchChange}
        />
      </div>

      <div className="room-header">
        <span className="header-1">Tin nhắn</span>
        <span className="header-2">Lời mời đang chờ</span>
      </div>
    </div>
  );
}
