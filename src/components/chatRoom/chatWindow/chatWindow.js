import React, { useContext, useState, useMemo, useRef, useEffect } from "react";
import { Button, Avatar, Form, Input } from "antd";
import {
  PhoneOutlined,
  VideoCameraOutlined,
  UserAddOutlined,
  MessageOutlined,
  SmileOutlined,
  PictureOutlined,
  AudioOutlined,
  HeartOutlined,
} from "@ant-design/icons";

import Message from "../message/message";
import { AppContext } from "../../../context/appProvider";
import CircularAvatarGroup from "../../common/circularAvatarGroup";
import "./chatWindow.scss";
import { addDocument, updateDocument } from "../../../firebase/services";
import { AuthContext } from "../../../context/authProvider";
import { useFirestore } from "../../../hooks/useFirestore";

export default function ChatWindow() {
  const { rooms, selectedRoomId, setIsInviteMemberVisible } =
    useContext(AppContext);
  const authContext = useContext(AuthContext) || {};
  const user = authContext.user || {};
  const uid = user.uid || "";
  const photoURL = user.photoURL || null;
  const displayName = user.displayName || "Unknown";

  const [form] = Form.useForm();
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId),
    [rooms, selectedRoomId]
  );

  const condition = useMemo(
    () =>
      selectedRoomId
        ? {
            fieldName: "roomId",
            operator: "==",
            compareValue: selectedRoomId,
          }
        : null,
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
          id: msg.id || msg._id || `msg-${index}`,
        };
      });
    } catch (err) {
      console.error("Error normalizing messages:", err);
      return [];
    }
  }, [messages]);

  const sortedMessages = useMemo(() => {
    return [...normalizedMessages].sort(
      (a, b) => (a.createdAt || 0) - (b.createdAt || 0)
    );
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
        createdAt: new Date(),
      });

      await updateDocument("rooms", selectedRoom.id, {
        lastMessage: {
          displayName,
          text: inputValue.trim(),
          createdAt: new Date(),
        },
      });

      form.resetFields(["message"]);
      setInputValue("");
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  if (!selectedRoom) {
    return (
      <div className="chat-window no-room">
        <div className="welcome-screen">
          <MessageOutlined />
          <h2>Tin nhắn của bạn</h2>
          <p>Gửi ảnh và tin nhắn riêng tư cho bạn bè</p>
        </div>
      </div>
    );
  }

  const members = selectedRoom.members || [];

  return (
    <div className="chat-window">
      <header className="chat-window__header">
        {selectedRoom.avatar ? (
          <Avatar src={selectedRoom.avatar} size={44} />
        ) : (
          <CircularAvatarGroup members={members} maxDisplay={3} />
        )}

        <div className="header__info">
          <p className="header__title">{selectedRoom.name}</p>
          <span className="header__description">
            {selectedRoom.description || "Đang hoạt động"}
          </span>
        </div>

        <div className="button-group-right">
          <div className="button-group-style">
            <Button
              type="text"
              icon={<PhoneOutlined />}
            />
            <Button type="text" icon={<VideoCameraOutlined />} />
            <Button
              type="text"
              icon={<UserAddOutlined />}
              onClick={() => setIsInviteMemberVisible(true)}
            />
          </div>
        </div>
      </header>

      <div className="chat-window__content">
        <div className="message-list-style" ref={messageListRef}>
          {sortedMessages.length === 0 ? (
            <div className="empty-chat">
              <div className="empty-avatar">
                {selectedRoom.avatar ? (
                  <Avatar src={selectedRoom.avatar} size={80} />
                ) : (
                  <CircularAvatarGroup members={members} size={80} />
                )}
              </div>
              <p className="empty-name">{selectedRoom.name}</p>
              <p className="empty-info">{selectedRoom.description || "Instagram"}</p>
              <p className="empty-hint">Hãy gửi tin nhắn để bắt đầu cuộc trò chuyện</p>
            </div>
          ) : (
            sortedMessages.map((msg) => (
              <Message
                key={msg.id}
                text={msg.text || ""}
                photoURL={msg.photoURL || null}
                displayName={msg.displayName || "Unknown"}
                createdAt={msg.createdAt}
                isOwn={msg.uid === uid}
              />
            ))
          )}
        </div>

        <Form className="form-style" form={form}>
          <Button 
            type="text" 
            icon={<SmileOutlined />} 
            className="input-icon-btn"
          />
          
          <Form.Item name="message">
            <Input
              value={inputValue}
              onChange={handleInputChange}
              onPressEnter={handleOnSubmit}
              placeholder="Nhắn tin..."
              bordered={false}
              autoComplete="off"
              disabled={sending}
            />
          </Form.Item>

          {inputValue.trim() ? (
            <Button 
              type="text" 
              onClick={handleOnSubmit} 
              loading={sending}
              className="send-btn"
            >
              Gửi
            </Button>
          ) : (
            <div className="input-actions">
              <Button type="text" icon={<AudioOutlined />} className="input-icon-btn" />
              <Button type="text" icon={<PictureOutlined />} className="input-icon-btn" />
              <Button type="text" icon={<HeartOutlined />} className="input-icon-btn" />
            </div>
          )}
        </Form>
      </div>
    </div>
  );
}