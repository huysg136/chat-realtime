import React, { useState, useMemo, useRef, useEffect, useLayoutEffect } from "react";
import { Button, Avatar, Tooltip, Spin } from "antd";
import { FaAngleDoubleDown } from "react-icons/fa";
import {
  MessageOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import 'react-toastify/dist/ReactToastify.css';
import { format } from "date-fns";
import { vi, enUS } from "date-fns/locale";
import { onSnapshot, collection, query, where, orderBy, limit, startAfter, getDocs } from "firebase/firestore";
import { db } from "../../../../shared/firebase/firebaseClient";
import Message from "../message/Message";
import CircularAvatarGroup from "../../../../shared/components/CircularAvatarGroup";
import ChatInput from "../chatInput/ChatInput";
import { useChatStore, getOtherUser } from "../../store/chat.store";
import { useAuthStore } from "../../../auth/store/auth.store";
import { updateDocument, encryptMessage, decryptMessage } from "../../../../shared/firebase/firestore";
import ChatHeader from "../chatHeader/ChatHeader";
import VideoCallOverlay from "../../../calls/components/VideoCallOverlay";
import { getTypingUsers } from "../../api/chat.api";
import "./chatWindow.scss";
import { useTranslation } from "react-i18next";

const MESSAGES_PER_PAGE = 20;

const LOADING_BUBBLES = [
  { own: false, width: "42%", lines: 2 },
  { own: true, width: "34%", lines: 1 },
  { own: false, width: "55%", lines: 2 },
  { own: true, width: "46%", lines: 2 },
  { own: false, width: "30%", lines: 1 },
];

function ChatRoomLoading({ label }) {
  return (
    <div className="chat-room-loading" role="status" aria-live="polite">
      <div className="chat-room-loading__label">
        <Spin size="small" />
        <span>{label}</span>
      </div>

      <div className="chat-room-loading__conversation" aria-hidden="true">
        {LOADING_BUBBLES.map((bubble, index) => (
          <div
            className={`chat-room-loading__message ${bubble.own ? "is-own" : ""}`}
            key={`${bubble.own}-${index}`}
          >
            {!bubble.own && <span className="chat-room-loading__avatar" />}
            <div
              className="chat-room-loading__bubble"
              style={{ width: bubble.width }}
            >
              {Array.from({ length: bubble.lines }).map((_, lineIndex) => (
                <span key={lineIndex} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatDate(timestamp) {
  if (!timestamp) return "";
  return format(new Date(timestamp), "HH:mm dd/MM/yy", { locale: vi });
}

export default function ChatWindow({ onToggleDetail }) {
  const users = useChatStore((state) => state.users);
  const rooms = useChatStore((state) => state.rooms);
  const selectedRoomId = useChatStore((state) => state.selectedRoomId);
  const videoCallState = useChatStore((state) => state.videoCallState);
  const user = useAuthStore((state) => state.user) || {};
  const uid = user.uid || "";

  const contextSelectedRoom = rooms.find((r) => r.id === selectedRoomId) || null;
  const contextOtherUser = getOtherUser(contextSelectedRoom, users, uid);

  const [replyTo, setReplyTo] = useState(null);
  const inputRef = useRef(null);
  const [banInfo, setBanInfo] = useState(null);

  // Lazy loading states
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [loadedRoomId, setLoadedRoomId] = useState(null);
  const messageListRef = useRef(null);
  const scrollPositionRef = useRef(0);
  const prevScrollHeightRef = useRef(0);
  const shouldScrollToBottomRef = useRef(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [typingUids, setTypingUids] = useState([]);

  useEffect(() => {
    if (!selectedRoomId) {
      setTypingUids([]);
      return;
    }

    const fetchTyping = async () => {
      const uids = await getTypingUsers(selectedRoomId);
      setTypingUids(uids);
    };

    fetchTyping();
    const interval = setInterval(fetchTyping, 3000);

    return () => clearInterval(interval);
  }, [selectedRoomId]);

  const typingUsers = useMemo(() => {
    if (!typingUids || typingUids.length === 0) return [];
    return typingUids
      .map((tUid) => users.find((u) => String(u.uid).trim() === String(tUid).trim()))
      .filter(Boolean);
  }, [typingUids, users]);

  const selectedRoom = contextSelectedRoom;

  const members = selectedRoom ? selectedRoom.members || [] : [];
  const membersData = members
    .map((m) => (typeof m === "string" ? m : m?.uid))
    .filter(Boolean)
    .map((mid) => users.find((u) => String(u.uid).trim() === String(mid).trim()))
    .filter(Boolean);

  const isPrivate = selectedRoom ? selectedRoom.type === "private" && membersData.length === 2 : false;

  const otherUser = contextOtherUser;

  const { t, i18n } = useTranslation();
  const currentLocale = i18n.language === 'vi' ? vi : enUS;
  const dateFormat = i18n.language === 'vi' ? "HH:mm dd/MM/yyyy" : "hh:mm a MM/dd/yyyy";

  useEffect(() => {
    setReplyTo(null);
  }, [selectedRoomId]);

  useEffect(() => {
    if (!selectedRoomId || !uid) return;
    setMessages([]);
    setHasMore(true);
    setLastDoc(null);
    setIsInitialLoad(true);
    setShowScrollToBottom(false);
    shouldScrollToBottomRef.current = true;

    const q = query(
      collection(db, "messages"),
      where("roomId", "==", selectedRoomId),
      orderBy("createdAt", "desc"),
      limit(MESSAGES_PER_PAGE)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
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
        setLoadedRoomId(selectedRoomId);
        setIsInitialLoad(false);
      },
      () => {
        setMessages([]);
        setHasMore(false);
        setLoadedRoomId(selectedRoomId);
        setIsInitialLoad(false);
      }
    );

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

  const isRoomLoading = isInitialLoad || loadedRoomId !== selectedRoomId;

  // Position the first message batch before the browser paints it. Using a
  // normal effect here makes the list briefly appear at the top and then jump.
  useLayoutEffect(() => {
    const messageList = messageListRef.current;
    if (!messageList || isRoomLoading || !shouldScrollToBottomRef.current) return;

    messageList.scrollTop = messageList.scrollHeight;
    shouldScrollToBottomRef.current = false;
    prevScrollHeightRef.current = 0;
    scrollPositionRef.current = messageList.scrollTop;
  }, [isRoomLoading, selectedRoomId, sortedMessages.length]);

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
    if (!messageList || sortedMessages.length === 0) return;

    if (shouldScrollToBottomRef.current) {
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
          <h2>{t('chatWindow.welcomeTitle')}</h2>
          <p>{t('chatWindow.welcomeDescription')}</p>
        </div>
      </div>
    );
  }

  // const rolesArray = selectedRoom.roles || [];
  // const currentUserRole = rolesArray.find((r) => String(r.uid).trim() === String(uid).trim())?.role || "member";
  // const isOwner = currentUserRole === "owner";
  // const isCoOwner = currentUserRole === "co-owner";
  const isBanned = !!banInfo;

  return (
    <div className="chat-window">
      <ChatHeader onToggleDetail={onToggleDetail} banInfo={banInfo} />

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
        >
          <FaAngleDoubleDown size={20} />
        </Button>
      )}

      <div className="chat-window__content">
        <div
          className={`message-list-style ${sortedMessages.length < 7 ? "few-messages" : ""} ${isRoomLoading ? "is-loading" : "is-ready"}`}
          ref={messageListRef}
          onScroll={handleScroll}
        >
          {isRoomLoading ? (
            <ChatRoomLoading label={t('chatWindow.chat.loadingMessages')} />
          ) : (
            <>
          {loadingMore && (
            <div style={{ textAlign: "center", padding: "10px" }}>
              <Spin indicator={<LoadingOutlined spin />} />
              <span style={{ marginLeft: "8px", color: "#999" }}>
                {t('chatWindow.chat.loadingMessages')}
              </span>
            </div>
          )}

          {!loadingMore && hasMore && sortedMessages.length >= MESSAGES_PER_PAGE && (
            <div style={{ textAlign: "center", padding: "10px" }}>
              <span style={{ color: "#999", fontSize: "12px" }}>
                {t('chatWindow.chat.scrollMore')}
              </span>
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
              <p className="empty-hint">{t('chatWindow.chat.emptyHint')}</p>
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
            </>
          )}
        </div>

        {videoCallState && videoCallState.isInCall && videoCallState.callStatus !== 'incoming' && (
          <VideoCallOverlay
            {...videoCallState}
            user={user}
            otherUser={otherUser}
          />
        )}

        {typingUsers.length > 0 && (
          <div className="typing-indicator-wrapper">
            <div className="typing-bubble">
              <div className="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
            <span className="typing-text">
              {typingUsers.map((u) => u.displayName || "Ai đó").join(", ")} đang soạn tin...
            </span>
          </div>
        )}

        {banInfo ? (
          <div className="ban-message">
            <p>
              {t('chatWindow.chat.banMessage', {
                date: format(banInfo.banEnd, dateFormat, { locale: currentLocale })
              })}
            </p>
          </div>
        ) : (
          <ChatInput
            selectedRoom={selectedRoom}
            user={user}
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
