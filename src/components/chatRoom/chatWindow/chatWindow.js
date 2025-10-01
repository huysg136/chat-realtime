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

import { format } from "date-fns";
import { vi } from "date-fns/locale";

function formatDate(timestamp) {
  if (!timestamp) return "";
  return format(new Date(timestamp), "HH:mm dd/MM/yy", { locale: vi });
}

export default function ChatWindow() {
  const { rooms, users, selectedRoomId, setIsInviteMemberVisible } =
    useContext(AppContext);
  const authContext = useContext(AuthContext) || {};
  const user = authContext.user || {};
  const uid = user.uid || "";
  const photoURL = user.photoURL || null;
  const displayName = user.displayName || "Unknown";

  const [form] = Form.useForm();
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef(null);

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

  // chuẩn hoá thời gian
  const normalizedMessages = useMemo(() => {
    if (!Array.isArray(messages)) return [];
    return messages.map((msg, index) => {
      let timestamp = Date.now();
      const createdAt = msg?.createdAt;

      if (createdAt != null) {
        if (typeof createdAt === "number") {
          timestamp = createdAt;
        } else if (createdAt.seconds) {
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
      el.scrollTop = el.scrollHeight;
    });
  }, [sortedMessages, selectedRoomId]);

  const handleInputChange = (e) => setInputValue(e.target.value);

  const handleOnSubmit = async () => {
    if (!inputValue.trim() || !selectedRoom) return;
    if (!uid) return;
    if (sending) return;

    setSending(true);
    const messageText = inputValue.trim();
    
    // Reset form và input ngay lập tức
    form.resetFields(["message"]);
    setInputValue("");
    
    try {
      await addDocument("messages", {
        text: messageText,
        uid,
        photoURL,
        roomId: selectedRoom.id,
        displayName,
        createdAt: new Date(),
      });

      await updateDocument("rooms", selectedRoom.id, {
        lastMessage: {
          displayName,
          text: messageText,
          createdAt: new Date(),
        },
      });
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
      // Focus lại input sau một khoảng thời gian ngắn
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
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
  const membersData = members.map(uid => users.find(u => String(u.uid).trim() === String(uid).trim())).filter(Boolean);

  return (
    <div className="chat-window">
      <header className="chat-window__header">
        <CircularAvatarGroup members={membersData.map(u => ({avatar: u.photoURL, name: u.displayName}))} maxDisplay={3} />

        <div className="header__info">
          <p className="header__title">{selectedRoom.name}</p>
          <span className="header__description">
            {selectedRoom.description || "Đang hoạt động"}
          </span>
        </div>

        <div className="button-group-right">
          <div className="button-group-style">
            <Button type="text" icon={<PhoneOutlined />} />
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
        <div
          className={`message-list-style ${
            sortedMessages.length < 7 ? "few-messages" : ""
          }`}
          ref={messageListRef}
        >
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
              <p className="empty-info">
                {selectedRoom.description || "ChitChat"}
              </p>
              <p className="empty-hint">
                Hãy gửi tin nhắn để bắt đầu cuộc trò chuyện
              </p>
            </div>
          ) : (
            sortedMessages.map((msg, index) => {
              const prevMsg = sortedMessages[index - 1];
              const showTime =
                !prevMsg ||
                new Date(prevMsg.createdAt).getMinutes() !==
                  new Date(msg.createdAt).getMinutes() ||
                new Date(prevMsg.createdAt).getHours() !==
                  new Date(msg.createdAt).getHours();

              return (
                <React.Fragment key={msg.id}>
                  {showTime && (
                    <div className="chat-time-separator">
                      {formatDate(msg.createdAt)}
                    </div>
                  )}
                  <Message
                    text={msg.text || ""}
                    photoURL={msg.photoURL || null}
                    displayName={msg.displayName || "Unknown"}
                    createdAt={msg.createdAt}
                    isOwn={msg.uid === uid}
                  />
                </React.Fragment>
              );
            })
          )}
        </div>

        <Form className="form-style" form={form}>
          <Button type="text" icon={<SmileOutlined />} className="input-icon-btn" />

          <Form.Item name="message">
            <Input
              ref={inputRef}
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
              <Button
                type="text"
                icon={<AudioOutlined />}
                className="input-icon-btn"
              />
              <Button
                type="text"
                icon={<PictureOutlined />}
                className="input-icon-btn"
              />
              <Button
                type="text"
                icon={<HeartOutlined />}
                className="input-icon-btn"
              />
            </div>
          )}
        </Form>
      </div>
    </div>
  );
}