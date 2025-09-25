import React, { useContext } from "react";
import { Button, Avatar, Form, Input } from "antd";
import {
  PhoneOutlined,
  VideoCameraOutlined,
  UserAddOutlined,
  MessageOutlined,
} from "@ant-design/icons";

import Message from "../message/message";
import { AppContext } from "../../../context/appProvider";

import CircularAvatarGroup from "../../common/circularAvatarGroup";
import "./chatWindow.scss";

export default function ChatWindow() {
  const { rooms, selectedRoomId, setIsInviteMemberVisible } =
    useContext(AppContext);

  const selectedRoom = React.useMemo(
    () => rooms.find((room) => room.id === selectedRoomId),
    [rooms, selectedRoomId]
  );

  // Khi chưa chọn phòng
  if (!selectedRoom) {
    return (
      <div className="chat-window no-room">
        <div className="welcome-screen">
          <MessageOutlined style={{ fontSize: "64px", color: "#1890ff" }} />
          <h2>Chào mừng đến với ChitChat</h2>
          <p>👉 Hãy chọn một phòng chat ở sidebar để bắt đầu trò chuyện</p>
        </div>
      </div>
    );
  }

  // Khi đã chọn phòng
  const members = selectedRoom.members || [];

  return (
    <div className="chat-window">
      <header className="chat-window__header">
        {selectedRoom.avatar ? (
          <Avatar src={selectedRoom.avatar} size={48} />
        ) : (
          <CircularAvatarGroup members={members} maxDisplay={3} />
        )}

        <div className="header__info">
          <p className="header__title">{selectedRoom.name}</p>
          <span className="header__description">{selectedRoom.description}</span>
        </div>

        <div className="button-group-right">
          <div className="button-group-style">
            <Button
              type="text"
              icon={<UserAddOutlined />}
              onClick={() => setIsInviteMemberVisible(true)}
            />
            <Button type="text" icon={<PhoneOutlined />} />
            <Button type="text" icon={<VideoCameraOutlined />} />
          </div>
        </div>
      </header>

      <div className="chat-window__content">
        <div className="message-list-style">
          <Message
            text="Hello world"
            photoURL={null}
            displayName="Huy"
            createdAt={Date.now()}
          />
        </div>

        <Form className="form-style">
          <Form.Item>
            <Input
              placeholder="Nhập tin nhắn"
              bordered={false}
              autoComplete="off"
            />
          </Form.Item>
          <Button type="primary">Gửi</Button>
        </Form>
      </div>
    </div>
  );
}
