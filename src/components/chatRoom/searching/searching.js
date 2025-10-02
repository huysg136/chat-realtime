import React, { useContext } from "react";
import { Input, Button, Avatar } from "antd";
import { SearchOutlined, DownOutlined } from "@ant-design/icons";
import { IoCreateOutline } from "react-icons/io5";
import { AppContext } from "../../../context/appProvider";
import { AuthContext } from "../../../context/authProvider";
import "./searching.scss";

export default function Searching() {
  const { setIsAddRoomVisible } = useContext(AppContext);
  const { user } = useContext(AuthContext) || {};

  const handleAddRoom = () => {
    setIsAddRoomVisible(true);
  };

  const username = user?.displayName || user?.username || "Tôi";

  return (
    <div className="searching-panel">
      <div className="user-header">
        <div className="username-wrapper">
          <span className="username">{username}</span>
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
        />
      </div>
    </div>
  );
}