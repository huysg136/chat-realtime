import React, { useContext, useState, useMemo, useRef, useEffect } from "react";
import { Button, Avatar, Tooltip } from "antd";
import {
  PhoneOutlined,
  VideoCameraOutlined,
  UserAddOutlined,
  MessageOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { onSnapshot, collection, query, where } from "firebase/firestore";
import { db } from "../../../firebase/config";
import Message from "../message/message";
import CircularAvatarGroup from "../../common/circularAvatarGroup";
import ChatDetailPanel from "../chatDetailPanel/chatDetailPanel";
import TransferOwnershipModal from "../../modals/transferOwnershipModal";
import ChatInput from "../chatInput/chatInput";
import { AppContext } from "../../../context/appProvider";
import { AuthContext } from "../../../context/authProvider";
import { useFirestore } from "../../../hooks/useFirestore";
import { updateDocument, encryptMessage, decryptMessage } from "../../../firebase/services";

import "./chatWindow.scss";

function formatDate(timestamp) {
  if (!timestamp) return "";
  return format(new Date(timestamp), "HH:mm dd/MM/yy", { locale: vi });
}

export default function ChatWindow() {
  const { rooms, users, selectedRoomId, setIsInviteMemberVisible } = useContext(AppContext);
  const authContext = useContext(AuthContext) || {};
  const user = authContext.user || {};
  const uid = user.uid || "";
  const photoURL = user.photoURL || null;
  const displayName = user.displayName || "Unknown";

  const [replyTo, setReplyTo] = useState(null);
  const inputRef = useRef(null);

  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [isTransferModalVisible, setIsTransferModalVisible] = useState(false);
  const [selectedTransferUid, setSelectedTransferUid] = useState(null);
  const [leavingLoading, setLeavingLoading] = useState(false);
  const [banInfo, setBanInfo] = useState(null);
  const isBanned = !!banInfo;
  

  useEffect(() => {
    setReplyTo(null); 
  }, [selectedRoomId]);

  const toggleDetail = () => {
    setIsDetailVisible((p) => !p);
  };

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
    if (!Array.isArray(messages)) return [];

    return messages
      .filter(msg => Array.isArray(msg.visibleFor) && msg.visibleFor.includes(uid))
      .map((msg, index) => {
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

        const decryptedText = selectedRoom?.secretKey
          ? decryptMessage(msg.text || "", selectedRoom.secretKey)
          : msg.text || "";

        return {
          ...msg,
          createdAt: timestamp,
          id: msg.id || msg._id || `msg-${index}`,
          decryptedText,
          kind: msg.kind || msg.type || "text",
        };
      });
  }, [messages, selectedRoom?.secretKey, uid]);

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

  useEffect(() => {
    if (replyTo && inputRef.current) {
      inputRef.current.input?.focus();
    }
  }, [replyTo]);

  // Real-time ban check
  useEffect(() => {
    if (!uid) return;

    const q = query(collection(db, "bans"), where("uid", "==", uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bans = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        banEnd: doc.data().banEnd?.toDate ? doc.data().banEnd.toDate() : new Date(doc.data().banEnd),
      }));

      const activeBan = bans.find((ban) => ban.banEnd > new Date());
      setBanInfo(activeBan || null);
    });

    return () => unsubscribe();
  }, [uid]);

  const handleRevokeMessage = async (messageId) => {
    if (!selectedRoom) return;
    const revokedText = selectedRoom.secretKey
      ? encryptMessage("[Tin nhắn đã được thu hồi]", selectedRoom.secretKey)
      : "[Tin nhắn đã được thu hồi]";
    await updateDocument("messages", messageId, { text: revokedText, kind: "text", isRevoked: true });

    // Update lastMessage in room if this is the last message
    const lastMsg = sortedMessages[sortedMessages.length - 1];
    if (lastMsg && lastMsg.id === messageId) {
      await updateDocument("rooms", selectedRoom.id, {
        lastMessage: {
          ...lastMsg,
          text: revokedText,
          kind: "text",
          isRevoked: true,
        },
      });
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

  const rolesArray = selectedRoom.roles || [];
  const currentUserRole = rolesArray.find((r) => String(r.uid).trim() === String(uid).trim())?.role || "member";
  const isOwner = currentUserRole === "owner";
  const isCoOwner = currentUserRole === "co-owner";

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
            {!isPrivate 
              ? `${membersData.length} thành viên`
              : selectedRoom.description || "Đang hoạt động"
            }
          </span>
        </div>
        <div className="button-group-right">
          <div className="button-group-style">
            {!isPrivate && (isOwner || isCoOwner) && (
              <Button
                type="text"
                icon={<UserAddOutlined />}
                onClick={() => setIsInviteMemberVisible(true)}
              />
            )}
            {!banInfo && (
              <>
                <Button type="text" icon={<PhoneOutlined />} />
                <Button type="text" icon={<VideoCameraOutlined />} />
              </>
            )}
            <Button
              type="text"
              icon={<InfoCircleOutlined />}
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
                      name: u.displayName
                    }))}
                    size={80}
                  />
                )}
              </div>
              <Tooltip title={isPrivate ? (otherUser?.displayName || selectedRoom.name) : selectedRoom.name}>
                <p className="empty-name">
                  {isPrivate ? (otherUser?.displayName || selectedRoom.name) : selectedRoom.name}
                </p>
              </Tooltip>
              <p className="empty-info">{selectedRoom.description || "Quik"}</p>
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
                    messageId={msg.id}
                    uid={msg.uid}
                    text={msg.decryptedText || ""}
                    photoURL={msg.photoURL || null}
                    displayName={msg.displayName || "Unknown"}
                    createdAt={msg.createdAt}
                    isOwn={msg.uid === uid}
                    replyTo={msg.replyTo}
                    kind={msg.kind || "text"}
                    onReply={(message) => setReplyTo(message)}
                    onRevoke={() => handleRevokeMessage(msg.id)}
                    isBanned={isBanned} 
                  />
                </React.Fragment>
              );
            })
          )}
        </div>

        {banInfo ? (
          <div className="ban-message">
            <p>Rất tiếc! Bạn tạm thời bị giới hạn nhắn tin cho đến {format(banInfo.banEnd, "HH:mm dd/MM/yyyy", { locale: vi })}.</p>
          </div>
        ) : (
          <ChatInput
            selectedRoom={selectedRoom}
            user={{ uid, photoURL, displayName }}
            replyTo={replyTo}
            setReplyTo={setReplyTo}
            isBanned={isBanned}
            inputRef={inputRef}
          />
        )}
      </div>

      {isDetailVisible && <div className="chat-detail-overlay" onClick={toggleDetail} />}

      <ChatDetailPanel
        isVisible={isDetailVisible}
        selectedRoom={selectedRoom}
        membersData={membersData}
        currentUser={{ uid, displayName, photoURL }}
        currentUserRole={currentUserRole}
        rolesArray={rolesArray}
        isPrivate={isPrivate}
        otherUser={otherUser}
        onClose={toggleDetail}
        onOpenTransferModal={() => setIsTransferModalVisible(true)}
      />

      <TransferOwnershipModal
        visible={isTransferModalVisible}
        membersData={membersData}
        currentUid={uid}
        selectedRoom={selectedRoom}
        rolesArray={rolesArray}
        selectedTransferUid={selectedTransferUid}
        setSelectedTransferUid={setSelectedTransferUid}
        leavingLoading={leavingLoading}
        setLeavingLoading={setLeavingLoading}
        onClose={() => setIsTransferModalVisible(false)}
      />
    </div>
  );
}