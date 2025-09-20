import React, { useState } from "react";
import styled, { css } from "styled-components";
import { MessageOutlined, TeamOutlined, SettingOutlined } from "@ant-design/icons";
import { AiOutlineLogout } from "react-icons/ai";
import { Avatar, Dropdown, Menu } from "antd";
import { auth } from "../../firebase/config";
import { AuthContext } from "../../context/authProvider";

// Sidebar chính
const Sidebar = styled.div`
  height: 100vh;
  width: 64px;
  background-color: #2067ff;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0;
`;

// Avatar trên cùng
const UserAvatar = styled(Avatar)`
  background-color: white !important;
  color: #000000;
  margin-bottom: 10px;
  border: 2px solid #ffffff44;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    border-color: #fff;
    box-shadow: 0 0 6px rgba(255, 255, 255, 0.6);
  }
`;

// Nhóm icon
const IconGroup = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: ${(props) => (props.top ? "12px" : "auto")};
  margin-bottom: ${(props) => (props.bottom ? "16px" : "0")};
  gap: 5px;
`;

// Icon item chung
const IconItem = styled.div`
  font-size: 26px;
  color: white;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.3s;

  &:hover {
    background-color: #5689ff;
    color: #fff;
  }

  svg {
    display: block;
  }

  ${(props) =>
    props.active &&
    css`
      background-color: #5689ff;
      color: #fff;
    `}
`;

export default function LeftSide() {
    const [active, setActive] = useState("message"); 
    const { user } = React.useContext(AuthContext);
    const displayName = user?.displayName;
    const photoURL = user?.photoURL;
    const menu = (
        <Menu>
        <Menu.Item key="name" disabled>
            <strong style={{color: 'black'}}>{displayName}</strong>
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item key="profile">Hồ sơ của tôi</Menu.Item>
        <Menu.Item key="settings">Cài đặt</Menu.Item>
        <Menu.Divider />
        <Menu.Item key="logout" onClick={() => auth.signOut()} style={{ color: 'red', fontWeight: '500' }}>
            Đăng xuất
        </Menu.Item>
        </Menu>
    );

    return (
        <Sidebar>
        {/* Avatar */}
        <Dropdown overlay={menu} placement="bottomRight" trigger={['click']}>
            <UserAvatar size={40} src={photoURL}>
                {!photoURL && displayName?.charAt(0)?.toUpperCase()}
            </UserAvatar>
        </Dropdown>

        {/* Nhóm icon phía trên (có active) */}
        <IconGroup top>
            <IconItem
            active={active === "message"}
            onClick={() => setActive("message")}
            >
            <MessageOutlined />
            </IconItem>
            <IconItem
            active={active === "team"}
            onClick={() => setActive("team")}
            >
            <TeamOutlined />
            </IconItem>
        </IconGroup>

        {/* Nhóm icon phía dưới (chỉ hover, không active) */}
        <IconGroup bottom>
            <IconItem onClick={() => auth.signOut()}>
                <AiOutlineLogout />
            </IconItem>
            <IconItem>
            <SettingOutlined />
            </IconItem>
        </IconGroup>
        </Sidebar>
    );
}
