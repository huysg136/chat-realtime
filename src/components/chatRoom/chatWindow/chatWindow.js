import React, { useContext, useState, useMemo, useRef, useEffect } from "react";
import { Button, Avatar, Tooltip, Spin } from "antd";
import { AiOutlineUsergroupAdd } from "react-icons/ai";
import { FaAngleDoubleDown } from "react-icons/fa";
import {
  MessageOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import 'react-toastify/dist/ReactToastify.css';
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { onSnapshot, collection, query, where, orderBy, limit, startAfter, getDocs } from "firebase/firestore";
import { db } from "../../../firebase/config";
import Message from "../message/message";
import CircularAvatarGroup from "../../common/circularAvatarGroup";
import ChatInput from "../chatInput/chatInput";
import { AppContext } from "../../../context/appProvider";
import { AuthContext } from "../../../context/authProvider";
import { updateDocument, encryptMessage, decryptMessage } from "../../../firebase/services";
import { getOnlineStatus } from "../../common/getOnlineStatus";
import { useUserStatus } from "../../../hooks/useUserStatus";
import VideoCallOverlay from "../../videoCallOverlay/videoCallOverlay";
import "./chatWindow.scss";

const MESSAGES_PER_PAGE = 20;

function formatDate(timestamp) {
  if (!timestamp) return "";
  return format(new Date(timestamp), "HH:mm dd/MM/yy", { locale: vi });
}

export default function ChatWindow({onToggleDetail}) {
  const { 
    users, 
    selectedRoomId, 
    setIsInviteMemberVisible,
    videoCallState,
    selectedRoom: contextSelectedRoom,
    otherUser: contextOtherUser 
  } = useContext(AppContext);
  
  const authContext = useContext(AuthContext) || {};
  const user = authContext.user || {};
  const uid = user.uid || "";

  const [replyTo, setReplyTo] = useState(null);
  const inputRef = useRef(null);
  const [banInfo, setBanInfo] = useState(null);

  // Lazy loading states
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const messageListRef = useRef(null);
  const scrollPositionRef = useRef(0);
  const prevScrollHeightRef = useRef(0);
  const shouldScrollToBottomRef = useRef(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const selectedRoom = contextSelectedRoom;

  const members = selectedRoom ? selectedRoom.members || [] : [];
  const membersData = members
    .map((m) => (typeof m === "string" ? m : m?.uid))
    .filter(Boolean)
    .map((mid) => users.find((u) => String(u.uid).trim() === String(mid).trim()))
    .filter(Boolean);

  const isPrivate = selectedRoom ? selectedRoom.type === "private" && membersData.length === 2 : false;
  
  const otherUser = contextOtherUser;

  const otherUserStatus = useUserStatus(otherUser?.uid);

  useEffect(() => {
    setReplyTo(null);
  }, [selectedRoomId]);

  useEffect(() => {
    if (!selectedRoomId || !uid) return;
    setMessages([]);
    setHasMore(true);
    setLastDoc(null);
    setIsInitialLoad(true);
    shouldScrollToBottomRef.current = true;

    const q = query(
      collection(db, "messages"),
      where("roomId", "==", selectedRoomId),
      orderBy("createdAt", "desc"),
      limit(MESSAGES_PER_PAGE)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages = [];
      let lastVisible = null;

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (Array.isArray(data.visibleFor) && data.visibleFor.includes(uid)) {
          newMessages.push({ id: doc.id, ...data });
        }
        lastVisible = doc;
      });

      setMessages(newMessages);
      setLastDoc(lastVisible);
      setHasMore(snapshot.docs.length === MESSAGES_PER_PAGE);
      
      setTimeout(() => {
        setIsInitialLoad(false);
      }, 100);
    });

    return () => unsubscribe();
  }, [selectedRoomId, uid]);

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

      const decryptedText = (msg.kind === "system")
        ? (msg.text || "")
        : (selectedRoom?.secretKey
            ? decryptMessage(msg.text || "", selectedRoom.secretKey)
            : msg.text || "");

      return {
        ...msg,
        createdAt: timestamp,
        id: msg.id || msg._id || `msg-${index}`,
        decryptedText,
        kind: msg.kind || msg.type || "text",
      };
    });
  }, [messages, selectedRoom?.secretKey]);

  const sortedMessages = useMemo(() => {
    return [...normalizedMessages].sort(
      (a, b) => (a.createdAt || 0) - (b.createdAt || 0)
    );
  }, [normalizedMessages]);

  const loadMoreMessages = async () => {
    if (!selectedRoomId || !uid || !lastDoc || loadingMore || !hasMore) return;

    setLoadingMore(true);

    try {
      const q = query(
        collection(db, "messages"),
        where("roomId", "==", selectedRoomId),
        orderBy("createdAt", "desc"),
        startAfter(lastDoc),
        limit(MESSAGES_PER_PAGE)
      );

      const snapshot = await getDocs(q);
      const olderMessages = [];
      let lastVisible = null;

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (Array.isArray(data.visibleFor) && data.visibleFor.includes(uid)) {
          olderMessages.push({ id: doc.id, ...data });
        }
        lastVisible = doc;
      });

      if (olderMessages.length > 0) {
        const messageList = messageListRef.current;
        if (messageList) {
          prevScrollHeightRef.current = messageList.scrollHeight;
        }

        setMessages((prev) => [...prev, ...olderMessages]);
        setLastDoc(lastVisible);
        setHasMore(snapshot.docs.length === MESSAGES_PER_PAGE);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingMore(false);
    }
  };

  const scrollToBottom = () => {
    const messageList = messageListRef.current;
    if (messageList) {
      messageList.scrollTop = messageList.scrollHeight;
      setShowScrollToBottom(false);
    }
  };

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    
    scrollPositionRef.current = scrollTop;

    if (scrollHeight - scrollTop - clientHeight > 200) {
      setShowScrollToBottom(true);
    } else {
      setShowScrollToBottom(false);
    }

    if (scrollTop < 100 && hasMore && !loadingMore) {
      loadMoreMessages();
    }
  };

  useEffect(() => {
    const messageList = messageListRef.current;
    if (!messageList) return;

    setTimeout(() => {
      messageList.scrollTop = messageList.scrollHeight;
    }, 300);

    prevScrollHeightRef.current = 0;
    scrollPositionRef.current = 0;
    shouldScrollToBottomRef.current = true;
  }, [selectedRoomId]);

  useEffect(() => {
    const messageList = messageListRef.current;
    if (!messageList || sortedMessages.length === 0) return;

    if (shouldScrollToBottomRef.current) {
      setTimeout(() => {
        messageList.scrollTop = messageList.scrollHeight;
        shouldScrollToBottomRef.current = false;
      }, 50);
      return;
    }

    if (prevScrollHeightRef.current) {
      const newScrollHeight = messageList.scrollHeight;
      const scrollDiff = newScrollHeight - prevScrollHeightRef.current;
      if (scrollDiff > 0) {
        messageList.scrollTop = scrollPositionRef.current + scrollDiff;
        prevScrollHeightRef.current = 0;
      }
      return;
    }

    const isNearBottom = messageList.scrollHeight - messageList.scrollTop - messageList.clientHeight < 200;
    if (isNearBottom && !isInitialLoad) {
      setTimeout(() => {
        messageList.scrollTop = messageList.scrollHeight;
      }, 50);
    }
  }, [sortedMessages, isInitialLoad]);

  useEffect(() => {
    if (replyTo && inputRef.current) {
      inputRef.current.input?.focus();
    }
  }, [replyTo]);

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

    const lastMsg = sortedMessages[sortedMessages.length - 1];
    if (lastMsg && lastMsg.id === messageId) {
      await updateDocument("rooms", selectedRoom.id, {
        lastMessage: {
          ...lastMsg,
          text: revokedText,
          kind: "text",
          isRevoked: true,
          visibleFor: selectedRoom.members
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

  const rolesArray = selectedRoom.roles || [];
  const currentUserRole = rolesArray.find((r) => String(r.uid).trim() === String(uid).trim())?.role || "member";
  const isOwner = currentUserRole === "owner";
  const isCoOwner = currentUserRole === "co-owner";
  const isBanned = !!banInfo;

  return (
    <div className="chat-window">
      <header className="chat-window__header">
        <div className="header-avatar">
          {isPrivate ? (
            otherUser ? (
              <div style={{ position: "relative", display: "inline-block" }}>
                <Avatar src={otherUser.photoURL} size={40}>
                  {(otherUser.displayName || "?").charAt(0).toUpperCase()}
                </Avatar>
                {otherUserStatus?.lastOnline && (() => {
                  return (
                    <>
                      {otherUserStatus?.isOnline && otherUser?.showOnlineStatus && user?.showOnlineStatus && (
                        <span
                          style={{
                            position: "absolute",
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            backgroundColor: "#4caf50",
                            border: "2px solid white",
                            bottom: 0,
                            right: 0,
                            boxShadow: "0 0 2px rgba(0,0,0,0.3)",
                          }}
                        />
                      )}
                    </>
                  );
                })()}
              </div>
            ) : (
              <Avatar size={64}>
                {(selectedRoom.name || "?").charAt(0).toUpperCase()}
              </Avatar>
            )
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
            {(!isPrivate)
              ? `${membersData.length} thành viên`
              : otherUserStatus
                ? (otherUserStatus.isOnline && otherUser?.showOnlineStatus && user?.showOnlineStatus)
                  ? "Đang hoạt động" 
                  : (otherUser?.showOnlineStatus && user?.showOnlineStatus)
                  ? getOnlineStatus(otherUserStatus.lastOnline).text
                  : null
                : "Hoạt động lâu rồi"
            }
          </span>
        </div>
        <div className="button-group-right">
          <div className="button-group-style">
            {!isPrivate && (isOwner || isCoOwner) && (
              <Button
                type="text"
                icon={<AiOutlineUsergroupAdd />}
                onClick={() => setIsInviteMemberVisible(true)}  
              />
            )}
            {!banInfo && !isPrivate && videoCallState && (
              <Button
                type="text"
                icon={<VideoCameraOutlined />}
              />
            )}
            {!banInfo && isPrivate && videoCallState && (
              <Button
                type="text"
                icon={<VideoCameraOutlined />}
                onClick={videoCallState.handleVideoCall}
                disabled={!videoCallState.videoCall || !videoCallState.videoCall.isConnected() || videoCallState.isInitializing}
                title={
                  videoCallState.isInitializing 
                    ? 'Đang khởi tạo...'
                    : !videoCallState.videoCall || !videoCallState.videoCall.isConnected()
                    ? 'Đang kết nối...'
                    : 'Gọi video'
                }
              />
            )}
            <Button
              type="text"
              icon={<InfoCircleOutlined />}
              onClick={onToggleDetail}
            />
          </div>
        </div>
      </header>

      {showScrollToBottom && (
        <Button
          type="primary"
          shape="circle"
          size="large"
          style={{
            position: "absolute",
            bottom: 90, 
            right: 20,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={scrollToBottom}
          aria-label="Cuộn xuống cuối"
        >
          <FaAngleDoubleDown size={20} />
        </Button>
      )}

      <div className="chat-window__content">
        <div
          className={`message-list-style ${sortedMessages.length < 7 ? "few-messages" : ""}`}
          ref={messageListRef}
          onScroll={handleScroll}
        >
          {loadingMore && (
            <div style={{ textAlign: "center", padding: "10px" }}>
              <Spin indicator={<LoadingOutlined spin />} />
              <span style={{ marginLeft: "8px", color: "#999" }}>Đang tải tin nhắn...</span>
            </div>
          )}

          {!loadingMore && hasMore && sortedMessages.length >= MESSAGES_PER_PAGE && (
            <div style={{ textAlign: "center", padding: "10px" }}>
              <span style={{ color: "#999", fontSize: "12px" }}>Cuộn lên để xem thêm tin nhắn</span>
            </div>
          )}

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
                    transcript={msg.transcript || ""}
                    onReply={(message) => setReplyTo(message)}
                    onRevoke={() => handleRevokeMessage(msg.id)}
                    isBanned={isBanned}
                    action={msg.action}
                    actor={msg.actor}
                    target={msg.target}
                  />
                </React.Fragment>
              );
            })
          )}
        </div>

        {videoCallState && videoCallState.isInCall && videoCallState.callStatus !== 'incoming' && (
          <VideoCallOverlay
            {...videoCallState}
            user={user}
            otherUser={otherUser}
          />
        )}

        {banInfo ? (
          <div className="ban-message">
            <p>Rất tiếc! Bạn tạm thời bị giới hạn nhắn tin cho đến {format(banInfo.banEnd, "HH:mm dd/MM/yyyy", { locale: vi })}.</p>
          </div>
        ) : (
          <ChatInput
            selectedRoom={selectedRoom}
            user={{ uid, photoURL: user.photoURL, displayName: user.displayName }}
            replyTo={replyTo}
            setReplyTo={setReplyTo}
            isBanned={isBanned}
            inputRef={inputRef}
          />
        )}
      </div>
    </div>
  );
}