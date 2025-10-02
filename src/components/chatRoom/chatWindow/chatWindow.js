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
} from "@ant-design/icons";

import Message from "../message/message";
import { AppContext } from "../../../context/appProvider";
import CircularAvatarGroup from "../../common/circularAvatarGroup";
import "./chatWindow.scss";
import { addDocument, updateDocument } from "../../../firebase/services";
import { AuthContext } from "../../../context/authProvider";
import { useFirestore } from "../../../hooks/useFirestore";
import { IoMdInformationCircleOutline } from "react-icons/io";

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

  // detail panel state
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [muted, setMuted] = useState(false);

  const toggleDetail = () => setIsDetailVisible((p) => !p);

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId),
    [rooms, selectedRoomId]
  );

  // sync muted state when room changes
  useEffect(() => {
    setMuted(Boolean(selectedRoom?.muted));
  }, [selectedRoomId, selectedRoom]);

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
          uid,
          createdAt: new Date(),
        },
      });
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
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
  const membersData = members
    .map((m) => (typeof m === "string" ? m : m?.uid))
    .filter(Boolean)
    .map((mid) => users.find((u) => String(u.uid).trim() === String(mid).trim()))
    .filter(Boolean);

  const isPrivate = selectedRoom.type === "private";
  const otherUser = isPrivate
    ? membersData.find((m) => String(m.uid).trim() !== String(uid).trim())
    : null;

  // actions (placeholders)
  const handleToggleNotifications = () => {
    setMuted((m) => !m);
    // TODO: persist preference to DB, e.g.
    // updateDocument('rooms', selectedRoom.id, { muted: !muted })
    console.log("Toggled muted:", !muted);
  };

  const handleReport = () => {
    // TODO: implement report logic (create a report doc or call API)
    console.log("Report room", selectedRoom.id);
  };

  const handleBlock = () => {
    // TODO: implement block user logic
    console.log("Block user / room", selectedRoom.id);
  };

  const handleDeleteConversation = async () => {
    // TODO: implement delete chat (soft delete or call backend)
    console.log("Delete conversation", selectedRoom.id);
    // Example (uncomment and adjust as needed):
    // await updateDocument('rooms', selectedRoom.id, { deleted: true });
  };

  return (
    <div className="chat-window">
      <header className="chat-window__header">
        <div className="header-avatar">
          {isPrivate ? (
            otherUser ? (
              <Avatar src={otherUser.photoURL} size={40}>
                {(otherUser.displayName || "?").charAt(0).toUpperCase()}
              </Avatar>
            ) : (
              <Avatar size={64}>
                {(selectedRoom.name || "?").charAt(0).toUpperCase()}
              </Avatar>
            )
          ) : selectedRoom.avatar ? (
            <Avatar src={selectedRoom.avatar} size={40} />
          ) : (
            <CircularAvatarGroup
              members={membersData.map((u) => ({
                avatar: u.photoURL,
                name: u.displayName,
              }))}
              size={64}
              maxDisplay={3}
            />
          )}
        </div>

        <div className="header__info">
          <p className="header__title">
            {isPrivate ? otherUser?.displayName || selectedRoom.name : selectedRoom.name}
          </p>
          <span className="header__description">
            {selectedRoom.description || (isPrivate ? "Đang hoạt động" : "Đang hoạt động")}
          </span>
        </div>

        <div className="button-group-right">
          <div className="button-group-style">
            {!isPrivate && (
              <Button
                type="text"
                icon={<UserAddOutlined />}
                onClick={() => setIsInviteMemberVisible(true)}
              />
            )}
            <Button type="text" icon={<PhoneOutlined />} />
            <Button type="text" icon={<VideoCameraOutlined />} />
            <Button
              type="text"
              icon={<IoMdInformationCircleOutline style={{ fontSize: 22 }} />}
              onClick={toggleDetail}
              aria-label="Xem chi tiết cuộc trò chuyện"
            />
          </div>
        </div>
      </header>

      <div className="chat-window__content">
        <div
          className={`message-list-style ${sortedMessages.length < 7 ? "few-messages" : ""}`}
          ref={messageListRef}
        >
          {sortedMessages.length === 0 ? (
            <div className="empty-chat">
              <div className="empty-avatar">
                {isPrivate ? (
                  otherUser ? (
                    <Avatar src={otherUser.photoURL} size={80} />
                  ) : (
                    <Avatar size={80}>
                      {(selectedRoom.name || "?").charAt(0).toUpperCase()}
                    </Avatar>
                  )
                ) : selectedRoom.avatar ? (
                  <Avatar src={selectedRoom.avatar} size={80} />
                ) : (
                  <CircularAvatarGroup
                    members={membersData.map((u) => ({
                      avatar: u.photoURL,
                      name: u.displayName,
                    }))}
                    size={80}
                  />
                )}
              </div>
              <p className="empty-name">
                {isPrivate ? (otherUser?.displayName || selectedRoom.name) : selectedRoom.name}
              </p>
              <p className="empty-info">{selectedRoom.description || "ChitChat"}</p>
              <p className="empty-hint">Hãy gửi tin nhắn để bắt đầu cuộc trò chuyện</p>
            </div>
          ) : (
            sortedMessages.map((msg, index) => {
              const prevMsg = sortedMessages[index - 1];
              const showTime =
                !prevMsg ||
                new Date(prevMsg.createdAt).getMinutes() !== new Date(msg.createdAt).getMinutes() ||
                new Date(prevMsg.createdAt).getHours() !== new Date(msg.createdAt).getHours();

              return (
                <React.Fragment key={msg.id}>
                  {showTime && <div className="chat-time-separator">{formatDate(msg.createdAt)}</div>}
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
            <Button type="text" onClick={handleOnSubmit} loading={sending} className="send-btn">
              Gửi
            </Button>
          ) : (
            <div className="input-actions">
              <Button type="text" icon={<AudioOutlined />} className="input-icon-btn" />
              <Button type="text" icon={<PictureOutlined />} className="input-icon-btn" />
            </div>
          )}
        </Form>
      </div>

      {/* Overlay */}
      {isDetailVisible && <div className="chat-detail-overlay" onClick={toggleDetail} />}

      {/* Detail panel */}
      <aside
        className={`chat-detail-panel ${isDetailVisible ? "open" : ""}`}
        role="dialog"
        aria-hidden={!isDetailVisible}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="chat-detail-header">
          <div className="title-area">
            <h3>Chi tiết</h3>
            <span className="room-type">{isPrivate ? "Cuộc chuyện riêng tư" : "Nhóm"}</span>
          </div>
          <button className="close-btn" onClick={toggleDetail} aria-label="Đóng">✕</button>
        </div>

        <div className="chat-detail-content">
          <div className="room-overview">
            {isPrivate ? (
              otherUser ? (
                <div className="overview-avatar">
                  <Avatar size={64} src={otherUser.photoURL}>
                    {(otherUser.displayName || "?").charAt(0).toUpperCase()}
                  </Avatar>
                  <div className="overview-info">
                    <p className="name">{otherUser.displayName}</p>
                    <p className="sub">{otherUser.username || otherUser.uid}</p>
                  </div>
                </div>
              ) : null
            ) : selectedRoom.avatar ? (
              <div className="overview-avatar">
                <Avatar size={64} src={selectedRoom.avatar} />
                <div className="overview-info">
                  <p className="name">{selectedRoom.name}</p>
                  <p className="sub">{selectedRoom.description}</p>
                </div>
              </div>
            ) : (
              <div className="overview-avatar">
                <CircularAvatarGroup
                  members={membersData.map((u) => ({ avatar: u.photoURL, name: u.displayName }))}
                  size={64}
                />
                <div className="overview-info">
                  <p className="name">{selectedRoom.name}</p>
                  <p className="sub">{selectedRoom.description}</p>
                </div>
              </div>
            )}
          </div>

          <div className="notification-toggle">
            <label>
              <input type="checkbox" checked={muted} onChange={handleToggleNotifications} />
              <span>Tắt thông báo</span>
            </label>
          </div>

          <div className="members-section">
            <h4>Thành viên ({membersData.length})</h4>
            <div className="members-list">
              {membersData.map((m) => (
                <div className="member-item" key={m.uid}>
                  <Avatar src={m.photoURL} size={40}>{(m.displayName || "?").charAt(0).toUpperCase()}</Avatar>
                  <div className="member-info">
                    <p className="member-name">{m.displayName}</p>
                    <span className="member-id">{m.username || m.uid}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="chat-actions">
            <button className="danger-btn" onClick={handleReport}>Báo cáo</button>
            <button className="danger-btn" onClick={handleBlock}>Chặn</button>
            <button className="danger-btn" onClick={handleDeleteConversation}>Xóa đoạn chat</button>
          </div>
        </div>
      </aside>
    </div>
  );
}
