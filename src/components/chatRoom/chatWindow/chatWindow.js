import React, { useContext, useState, useMemo, useRef, useEffect } from "react";
import { Button, Avatar, Tooltip, Spin } from "antd";
import { AiOutlinePhone, AiOutlineVideoCamera, AiOutlineAudioMuted, AiOutlineClockCircle, AiOutlineSync } from "react-icons/ai";
import { MdCallEnd } from "react-icons/md";
import {
  PhoneOutlined,
  VideoCameraOutlined,
  MessageOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import { AiOutlineUsergroupAdd } from "react-icons/ai";
import { FaAngleDoubleDown } from "react-icons/fa";
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
import "./chatWindow.scss";

const MESSAGES_PER_PAGE = 20;

function formatDate(timestamp) {
  if (!timestamp) return "";
  return format(new Date(timestamp), "HH:mm dd/MM/yy", { locale: vi });
}

export default function ChatWindow({isDetailVisible, onToggleDetail}) {
  const { rooms, users, selectedRoomId, setIsInviteMemberVisible } = useContext(AppContext);
  const authContext = useContext(AuthContext) || {};
  const user = authContext.user || {};
  const uid = user.uid || "";
  const photoURL = user.photoURL || null;
  const displayName = user.displayName || "Unknown";

  const [replyTo, setReplyTo] = useState(null);
  const inputRef = useRef(null);
  const [banInfo, setBanInfo] = useState(null);
  const isBanned = !!banInfo;

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

  const [videoCall, setVideoCall] = useState(null);
  const [isInCall, setIsInCall] = useState(false);
  const [callStatus, setCallStatus] = useState('');
  const [incomingCall, setIncomingCall] = useState(null);
  const [callerUser, setCallerUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const initStringee = async () => {
    if (!uid) {
      console.log('⚠️ No user ID, skipping Stringee init');
      return;
    }

    if (!window.StringeeClient || !window.StringeeCall2) {
      console.log('⏳ Waiting for Stringee SDK...');
      await new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (window.StringeeClient && window.StringeeCall2) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
        
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve();
        }, 10000);
      });
    }

    if (!window.StringeeClient || !window.StringeeCall2) {
      console.error('❌ Stringee SDK not loaded');
      return;
    }

    try {
      setIsInitializing(true);
      console.log('🎥 Initializing Stringee for user:', uid);

      const tokenRes = await fetch(
        `https://chat-realtime-be.vercel.app/api/stringee/token?uid=${encodeURIComponent(uid)}`
      );
      
      if (!tokenRes.ok) {
        throw new Error(`HTTP ${tokenRes.status}`);
      }

      const data = await tokenRes.json();
      
      if (!data.access_token) {
        throw new Error('No access token received');
      }

      console.log('✅ Token received');

      const VideoCallService = (await import('../../../stringee/StringeeService')).default;
      const vc = new VideoCallService(data.access_token, handleIncomingCall);

      await vc.connect();
      
      console.log('✅ Stringee ready');
      setVideoCall(vc);

    } catch (err) {
      console.error('❌ Init Stringee failed:', err);
      alert(`Không thể kết nối Video Call: ${err.message}`);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleIncomingCall = (call) => {
    console.log('📞 Incoming call handler triggered');
    console.log('   From:', call.fromNumber);
    console.log('   Call ID:', call.callId);

    // Find the caller user from the users list
    const caller = users.find((u) => String(u.uid).trim() === String(call.fromNumber).trim());
    setCallerUser(caller);

    setIncomingCall(call);
    setIsInCall(true);
    setCallStatus('incoming');
  };

  const handleCallStateChanged = (state) => {
    console.log('🔔 Call state changed:', state);
    
    // State.code values:
    // 1: Calling
    // 2: Ringing
    // 3: Answered (CONNECTED!)
    // 4: Busy
    // 5: Ended
    // 6: Ended by other side
    
    if (state.code === 1) {
      setCallStatus('calling');
    } else if (state.code === 2) {
      setCallStatus('ringing');
    } else if (state.code === 3) {
      // Call was answered - connected!
      console.log('✅ Call answered and connected!');
      setCallStatus('connected');
    } else if (state.code === 4) {
      setCallStatus('busy');
      setTimeout(() => {
        handleEndCall();
      }, 2000);
    } else if (state.code === 5 || state.code === 6) {
      handleEndCall();
    }
  };

  const handleAnswerCall = async () => {
    if (!incomingCall || !videoCall) {
      console.error('❌ No incoming call to answer');
      return;
    }

    console.log('✅ Answering incoming call...');
    setCallStatus('connecting');

    try {
      await videoCall.answerCall(incomingCall, handleStream, handleCallStateChanged);
      setCallStatus('connected');
      setIncomingCall(null);
      console.log('✅ Call answered');
    } catch (err) {
      console.error('❌ Error answering call:', err);
      alert(`Không thể trả lời: ${err.message}`);
      handleEndCall();
    }
  };

  const handleRejectCall = () => {
    if (!incomingCall || !videoCall) {
      console.error('❌ No incoming call to reject');
      return;
    }

    console.log('❌ Rejecting incoming call...');
    videoCall.rejectCall(incomingCall);
    
    setIncomingCall(null);
    setIsInCall(false);
    setCallStatus('');
  };

  const handleStream = (stream, type) => {
    console.log(`📹 Stream: ${type}`);
    
    if (type === 'local') {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        console.log('✅ Local video attached');
      }
    } else if (type === 'remote') {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        console.log('✅ Remote video attached');
      }
    }
  };

  const handleVideoCall = async () => {
    console.log('📞 Initiating video call...');

    if (!videoCall) {
      alert('Dịch vụ Video Call chưa sẵn sàng');
      return;
    }

    if (!videoCall.isConnected()) {
      alert('Đang kết nối tới máy chủ, vui lòng thử lại');
      return;
    }

    if (!otherUser || !otherUser.uid) {
      alert('Không tìm thấy người nhận');
      return;
    }

    setIsInCall(true);
    setCallStatus('calling');

    try {
      await videoCall.makeVideoCall(uid, otherUser.uid, handleStream, handleCallStateChanged);
      console.log('✅ Call initiated');
    } catch (err) {
      console.error('❌ Call failed:', err);
      alert(`Không thể gọi: ${err.message}`);
      handleEndCall();
    }
  };

  const handleEndCall = () => {
    console.log('📴 Ending call...');

    if (videoCall) {
      videoCall.endCall();
    }

    if (localVideoRef.current) {
      const stream = localVideoRef.current.srcObject;
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
      localVideoRef.current.srcObject = null;
    }

    if (remoteVideoRef.current) {
      const stream = remoteVideoRef.current.srcObject;
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
      remoteVideoRef.current.srcObject = null;
    }

    setIsInCall(false);
    setCallStatus('');
    setIncomingCall(null);
    setIsMuted(false);
    setIsVideoEnabled(true);

    console.log('✅ Call ended');
  };

  const handleToggleMute = () => {
    if (!videoCall) return;
    
    const newMutedState = !isMuted;
    videoCall.setMuted(newMutedState);
    setIsMuted(newMutedState);
    console.log(newMutedState ? '🔇 Muted' : '🔊 Unmuted');
  };

  const handleToggleVideo = () => {
    if (!videoCall) return;
    
    const newVideoState = !isVideoEnabled;
    videoCall.setVideoEnabled(newVideoState);
    setIsVideoEnabled(newVideoState);
    console.log(newVideoState ? '📹 Video ON' : '📵 Video OFF');
  };

  useEffect(() => {
    setReplyTo(null);
    
    if (uid) {
      initStringee();
    }

    return () => {
      if (videoCall) {
        videoCall.disconnect();
      }
    };
  }, [selectedRoomId, uid]);

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId),
    [rooms, selectedRoomId]
  );

  const members = selectedRoom ? selectedRoom.members || [] : [];
  const membersData = members
    .map((m) => (typeof m === "string" ? m : m?.uid))
    .filter(Boolean)
    .map((mid) => users.find((u) => String(u.uid).trim() === String(mid).trim()))
    .filter(Boolean);

  const isPrivate = selectedRoom ? selectedRoom.type === "private" && membersData.length === 2 : false;
  const otherUser = isPrivate
    ? membersData.find((m) => String(m.uid).trim() !== String(uid).trim())
    : null;

  const otherUserStatus = useUserStatus(otherUser?.uid);

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
            {!banInfo && isPrivate && (
              <Button
                type="text"
                icon={<VideoCameraOutlined />}
                onClick={handleVideoCall}
                disabled={!videoCall || !videoCall.isConnected() || isInitializing}
                loading={isInitializing}
                title={
                  isInitializing 
                    ? 'Đang khởi tạo...'
                    : !videoCall || !videoCall.isConnected()
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
          <FaAngleDoubleDown  size={20} />
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

        {isInCall && (
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: '#0a0a0a',
              zIndex: 99999,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {/* Top bar with user info and status */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              padding: '20px',
              background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              zIndex: 10
            }}>
              {/* User avatar and name */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '12px'
              }}>
                <Avatar
                  src={(callStatus === 'incoming' ? callerUser?.photoURL : otherUser?.photoURL)}
                  size={48}
                  style={{ border: '2px solid white' }}
                >
                  {((callStatus === 'incoming' ? callerUser?.displayName : otherUser?.displayName) || 'U').charAt(0).toUpperCase()}
                </Avatar>
                <div>
                  <div style={{
                    color: 'white',
                    fontSize: '20px',
                    fontWeight: 'bold'
                  }}>
                    {(callStatus === 'incoming' ? callerUser?.displayName : otherUser?.displayName) || 'Unknown User'}
                  </div>
                  <div style={{
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '14px',
                    marginTop: '2px'
                  }}>
                    {callStatus === 'calling' && 'Đang gọi...'}
                    {callStatus === 'ringing' && 'Đang đổ chuông...'}
                    {callStatus === 'connecting' && 'Đang kết nối...'}
                    {callStatus === 'connected' && 'Đã kết nối'}
                    {callStatus === 'incoming' && 'Cuộc gọi đến'}
                    {callStatus === 'busy' && 'Máy bận'}
                  </div>
                </div>
              </div>
            </div>

            {/* Video container */}
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              padding: '80px 20px 160px 20px'
            }}>
              {/* Remote video (main) */}
              <div style={{ 
                position: 'relative',
                width: '100%',
                maxWidth: '1200px',
                aspectRatio: '16/9',
                borderRadius: '24px',
                overflow: 'hidden',
                backgroundColor: '#1a1a1a',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
              }}>
                <video 
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
                
                {/* Overlay when not connected */}
                {callStatus !== 'connected' && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(10px)'
                  }}>
                    <div style={{
                      textAlign: 'center',
                      color: 'white'
                    }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                        {callStatus === 'calling' && <AiOutlinePhone />}
                        {callStatus === 'ringing' && <AiOutlineClockCircle />}
                        {callStatus === 'connecting' && <AiOutlineSync />}
                        {callStatus === 'incoming' && <AiOutlinePhone />}
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: '500' }}>
                        {callStatus === 'calling' && 'Đang gọi...'}
                        {callStatus === 'ringing' && 'Đang đổ chuông...'}
                        {callStatus === 'connecting' && 'Đang kết nối...'}
                        {callStatus === 'incoming' && 'Cuộc gọi đến'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Local video (PiP) */}
                <div style={{
                  position: 'absolute',
                  bottom: '20px',
                  right: '20px',
                  width: '240px',
                  aspectRatio: '4/3',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  backgroundColor: '#1a1a1a',
                  border: '3px solid rgba(255,255,255,0.2)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
                }}>
                  <video 
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transform: 'scaleX(-1)' // Mirror effect
                    }}
                  />
                  {!isVideoEnabled && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: '#1a1a1a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Avatar size={64} src={photoURL}>
                        {displayName.charAt(0).toUpperCase()}
                      </Avatar>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom control bar */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '30px',
              background: 'linear-gradient(0deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)',
              display: 'flex',
              justifyContent: 'center',
              gap: '16px'
            }}>
              {callStatus === 'incoming' ? (
                <>
                  {/* Answer button */}
                  <Button
                    type="primary"
                    size="large"
                    onClick={handleAnswerCall}
                    style={{
                      height: '64px',
                      width: '64px',
                      borderRadius: '50%',
                      fontSize: '24px',
                      backgroundColor: '#52c41a',
                      borderColor: '#52c41a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <AiOutlinePhone />
                  </Button>
                  
                  {/* Reject button */}
                  <Button
                    danger
                    type="primary"
                    size="large"
                    onClick={handleRejectCall}
                    style={{
                      height: '64px',
                      width: '64px',
                      borderRadius: '50%',
                      fontSize: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <MdCallEnd />
                  </Button>
                </>
              ) : (
                <>
                  {/* Mute button */}
                  <Tooltip title={isMuted ? 'Bật mic' : 'Tắt mic'}>
                    <Button
                      type={isMuted ? 'primary' : 'default'}
                      danger={isMuted}
                      size="large"
                      onClick={handleToggleMute}
                      style={{
                        height: '64px',
                        width: '64px',
                        borderRadius: '50%',
                        fontSize: '24px',
                        backgroundColor: isMuted ? '#ff4d4f' : 'rgba(255,255,255,0.2)',
                        borderColor: isMuted ? '#ff4d4f' : 'transparent',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <AiOutlineAudioMuted />
                    </Button>
                  </Tooltip>

                  {/* End call button */}
                  <Button
                    danger
                    type="primary"
                    size="large"
                    onClick={handleEndCall}
                    style={{
                      height: '72px',
                      width: '72px',
                      borderRadius: '50%',
                      fontSize: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(255,77,79,0.4)'
                    }}
                  >
                    <MdCallEnd />
                  </Button>

                  {/* Video toggle button */}
                  <Tooltip title={isVideoEnabled ? 'Tắt camera' : 'Bật camera'}>
                    <Button
                      type={isVideoEnabled ? 'default' : 'primary'}
                      danger={!isVideoEnabled}
                      size="large"
                      onClick={handleToggleVideo}
                      style={{
                        height: '64px',
                        width: '64px',
                        borderRadius: '50%',
                        fontSize: '24px',
                        backgroundColor: !isVideoEnabled ? '#ff4d4f' : 'rgba(255,255,255,0.2)',
                        borderColor: !isVideoEnabled ? '#ff4d4f' : 'transparent',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <AiOutlineVideoCamera />
                    </Button>
                  </Tooltip>
                </>
              )}
            </div>
          </div>
        )}

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
    </div>
  );
}