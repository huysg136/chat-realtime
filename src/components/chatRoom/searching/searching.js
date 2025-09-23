import React, { useContext } from "react";
import { Input } from "antd";
import { SearchOutlined, UserAddOutlined } from "@ant-design/icons";
import { AiOutlineUsergroupAdd } from "react-icons/ai";
import { AppContext } from "../../../context/appProvider";
import "./searching.scss"; // import file SCSS

export default function Searching() {
  const { setIsAddRoomVisible } = useContext(AppContext);

  const handleAddRoom = () => {
    setIsAddRoomVisible(true);
  };

  return (
    <div className="searching-wrapper">
      <Input
        className="search-box"
        placeholder="Tìm kiếm"
        prefix={<SearchOutlined />}
        bordered={false}
      />

      <div className="icons">
        <UserAddOutlined />
      </div>
      <div className="icons" onClick={handleAddRoom}>
        <AiOutlineUsergroupAdd />
      </div>
    </div>
  );
}
