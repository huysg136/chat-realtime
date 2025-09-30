import React, { useContext, useState, useMemo, useRef, useEffect } from "react";
import { Button, Avatar, Form, Input } from "antd";
import { PhoneOutlined, VideoCameraOutlined, UserAddOutlined, MessageOutlined } from "@ant-design/icons";

import Message from "../message/message";
import { AppContext } from "../../../context/appProvider";
import CircularAvatarGroup from "../../common/circularAvatarGroup";
import "./chatWindow.scss";
import { addDocument, updateDocument } from "../../../firebase/services";
import { AuthContext } from "../../../context/authProvider";
import { useFirestore } from "../../../hooks/useFirestore";

export default function ChatWindow() {
  const { rooms, selectedRoomId, setIsInviteMemberVisible } = useContext(AppContext);
  const authContext = useContext(AuthContext) || {};
  const user = authContext.user || {};
  const uid = user.uid || "";
  const photoURL = user.photoURL || null;
  const displayName = user.displayName || "Unknown";
  const [form] = Form.useForm();
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const selectedRoom = useMemo(() => rooms.find(room => room.id === selectedRoomId), [rooms, selectedRoomId]);
  const condition = useMemo(() =>
    selectedRoomId ? {
      fieldName: "roomId",
      operator: "==",
      compareValue: selectedRoomId
    } : null,
    [selectedRoomId]
  );
  

  const messages = useFirestore("messages", condition) || [];

  const normalizedMessages = useMemo(() => {
    try {
      if (!Array.isArray(messages)) return [];
      return messages.map((msg, index) => {
        let timestamp = Date.now();
        const createdAt = msg?.createdAt;

        if (createdAt != null) {
          if (typeof createdAt === "number") {
            timestamp = createdAt;
          } else if (createdAt.seconds && typeof createdAt.seconds === "number") {
            timestamp = createdAt.seconds * 1000;
          } else if (typeof createdAt.toMillis === "function") {
            timestamp = createdAt.toMillis();
          } else if (createdAt instanceof Date) {
            timestamp = createdAt.getTime();
          }
        }

        return {
          ...msg,
          createdAt: timestamp,
          id: msg.id || msg._id || `msg-${index}`
        };
      });
    } catch (err) {
      console.error("Error normalizing messages:", err);
      return [];
    }
  }, [messages]);

  const sortedMessages = useMemo(() => {
    return [...normalizedMessages].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  }, [normalizedMessages]);

  const messageListRef = useRef(null);

  useEffect(() => {
    const el = messageListRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      try {
        el.scrollTop = el.scrollHeight;
      } catch (err) {
        console.warn("Scroll to bottom failed:", err);
      }
    });
  }, [sortedMessages, selectedRoomId]);

  const handleInputChange = (e) => setInputValue(e.target.value);

  const handleOnSubmit = async () => {
    if (!inputValue.trim() || !selectedRoom) return;
    if (!uid) {
      console.warn("User not ready yet. Can't send message.");
      return;
    }
    if (sending) return;

    setSending(true);
    try {
      await addDocument("messages", {
        text: inputValue.trim(),
        uid,
        photoURL,
        roomId: selectedRoom.id,
        displayName,
        createdAt: new Date()
      });

      await updateDocument("rooms", selectedRoom.id, {
        lastMessage: {
          displayName,
          text: inputValue.trim(),
          createdAt: new Date()
        }
      });

      form.resetFields(["message"]);
      setInputValue("");
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

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
            <Button type="text" icon={<UserAddOutlined />} onClick={() => setIsInviteMemberVisible(true)} />
            <Button type="text" icon={<PhoneOutlined />} />
            <Button type="text" icon={<VideoCameraOutlined />} />
          </div>
        </div>
      </header>

      <div className="chat-window__content">
        <div className="message-list-style" ref={messageListRef}>
          {sortedMessages.length === 0 ? (
            <p>Chưa có tin nhắn nào</p>
          ) : (
            sortedMessages.map((msg) => (
              <Message
                key={msg.id}
                text={msg.text || ""}
                photoURL={msg.photoURL || null}
                displayName={msg.displayName || "Unknown"}
                createdAt={msg.createdAt}
              />
            ))
          )}
        </div>

        <Form className="form-style" form={form}>
          <Form.Item name="message">
            <Input
              value={inputValue}
              onChange={handleInputChange}
              onPressEnter={handleOnSubmit}
              placeholder="Nhập tin nhắn"
              bordered={false}
              autoComplete="off"
              disabled={sending}
            />
          </Form.Item>
          <Button type="primary" onClick={handleOnSubmit} loading={sending}>
            Gửi
          </Button>
        </Form>
      </div>
    </div>
  );
}
