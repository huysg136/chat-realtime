import React from "react";
import { Input } from "antd";
import styled from "styled-components";
import { SearchOutlined, UserAddOutlined, TeamOutlined } from "@ant-design/icons";
import { auth, db } from "../../firebase/config";
import { collection, getDocs } from "firebase/firestore";
import { AuthContext } from "../../context/authProvider";

const WrapperStyle = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #f2f3f7;
  border-radius: 8px;
  gap: 12px;

  .search-box {
    flex: 1;
    background: #f2f3f7;
  }

  .icons {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 20px;
    color: #1d3557;
    cursor: pointer;
  }

  .icons > span:hover {
    color: #0066ff;
  }
`;

export default function UserInfo() {
  return (
    <WrapperStyle>
      {/* Ô tìm kiếm */}
      <Input
        className="search-box"
        placeholder="Tìm kiếm"
        prefix={<SearchOutlined />}
        bordered={false}
      />

      {/* Các icon bên phải */}
      <div className="icons">
        <UserAddOutlined />
        <TeamOutlined />
      </div>
    </WrapperStyle>
  );
}
