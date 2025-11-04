import React, { useContext, useState, useMemo, useRef, useEffect } from "react";
import { Button, Avatar, Form, Input, Tooltip } from "antd";
import {
  PhoneOutlined,
  VideoCameraOutlined,
  UserAddOutlined,
  MessageOutlined,
  SmileOutlined,
  PaperClipOutlined,
  AudioOutlined,
  CloseOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import axios from "axios";
import { onSnapshot, collection, query, where } from "firebase/firestore";
import { db } from "../../../firebase/config";
import Message from "../message/message";
import CircularAvatarGroup from "../../common/circularAvatarGroup";
import ChatDetailPanel from "../chatDetailPanel/chatDetailPanel";
import TransferOwnershipModal from "../../modals/transferOwnershipModal";
import { AppContext } from "../../../context/appProvider";
import { AuthContext } from "../../../context/authProvider";
import { useFirestore } from "../../../hooks/useFirestore";
import { addDocument, updateDocument, encryptMessage, decryptMessage } from "../../../firebase/services";
import EmojiPicker from "emoji-picker-react";

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

  const [form] = Form.useForm();
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const inputRef = useRef(null);

  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [isTransferModalVisible, setIsTransferModalVisible] = useState(false);
  const [selectedTransferUid, setSelectedTransferUid] = useState(null);
  const [leavingLoading, setLeavingLoading] = useState(false);
  const [banInfo, setBanInfo] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);

  const toggleDetail = () => {
    setIsDetailVisible((p) => !p);
  };

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId),
    [rooms, selectedRoomId]
  );

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setSending(true); // giữ loading icon
      const res = await axios.post(
        "https://chat-realtime-be.vercel.app/upload", // backend của bạn
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      const fileUrl = res.data.url; // backend trả về URL file

      // Gửi message chứa file
      const encryptedText = selectedRoom.secretKey
        ? encryptMessage(fileUrl, selectedRoom.secretKey)
        : fileUrl;

      await addDocument("messages", {
        text: encryptedText,
        uid,
        photoURL,
        roomId: selectedRoom.id,
        displayName,
        createdAt: new Date(),
        kind: file.type.startsWith("image/")
          ? "picture"
          : file.type.startsWith("video/")
          ? "video"
          : "file",
        fileName: file.name,
      });

      await updateDocument("rooms", selectedRoom.id, {
        lastMessage: {
          displayName,
          text: encryptedText,
          uid,
          createdAt: new Date(),
          kind: file.type.startsWith("image/")
            ? "picture"
            : file.type.startsWith("video/")
            ? "video"
            : "file",
          fileName: file.name,
        },
      });
    } catch (err) {
      toast.error("Upload file thất bại");
    } finally {
      setSending(false);
      e.target.value = null; // reset input
    }
  };


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
  }, [messages, selectedRoom?.secretKey]);

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

  const handleInputChange = (e) => setInputValue(e.target.value);

  const handleVoiceButtonClick = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorder) {
        mediaRecorder.stop();
      }
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        const chunks = [];

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        recorder.onstop = async () => {
          const audioBlob = new Blob(chunks, { type: 'audio/wav' });
          await handleAudioUpload(audioBlob);
          stream.getTracks().forEach(track => track.stop());
        };

        setMediaRecorder(recorder);
        setAudioChunks(chunks);
        recorder.start();
        setIsRecording(true);
      } catch (err) {
        toast.error("Không thể truy cập microphone");
      }
    }
  };

  const handleAudioUpload = async (audioBlob) => {
    const formData = new FormData();
    formData.append("file", audioBlob, "voice-message.wav");

    try {
      setSending(true);
      const res = await axios.post(
        "https://chat-realtime-be.vercel.app/upload",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      const audioUrl = res.data.url;

      const encryptedText = selectedRoom.secretKey
        ? encryptMessage(audioUrl, selectedRoom.secretKey)
        : audioUrl;

      await addDocument("messages", {
        text: encryptedText,
        uid,
        photoURL,
        roomId: selectedRoom.id,
        displayName,
        createdAt: new Date(),
        kind: "audio",
        fileName: "voice-message.wav",
      });

      await updateDocument("rooms", selectedRoom.id, {
        lastMessage: {
          displayName,
          text: selectedRoom.secretKey 
            ? encryptMessage("[Voice Message]", selectedRoom.secretKey) 
            : "[Voice Message]",
          uid,
          createdAt: new Date(),
          kind: "audio",
        },
      });
    } catch (err) {
      toast.error("Upload audio thất bại");
    } finally {
      setSending(false);
      setIsRecording(false);
      setMediaRecorder(null);
      setAudioChunks([]);
    }
  };

  const handleOnSubmit = async () => {
    if (!inputValue.trim() || !selectedRoom) return;
    if (!uid) return;
    if (sending) return;

    setSending(true);
    const messageText = inputValue.trim();

    form.resetFields(["message"]);
    setInputValue("");
    setShowEmojiPicker(false);

    try {
      const encryptedText = selectedRoom.secretKey 
        ? encryptMessage(messageText, selectedRoom.secretKey) 
        : messageText;

      await addDocument("messages", {
        text: encryptedText,
        uid,
        photoURL,
        roomId: selectedRoom.id,
        displayName,
        createdAt: new Date(),
        kind: "text",
        replyTo: replyTo ? {
          id: replyTo.id,
          text: replyTo.decryptedText,
          displayName: replyTo.displayName
        } : null,
      });

      await updateDocument("rooms", selectedRoom.id, {
        lastMessage: {
          displayName,
          text: encryptedText,
          uid,
          createdAt: new Date(),
          kind: "text",
        },
      });

      setReplyTo(null);
    } catch (err) {
      toast.error("Gửi tin nhắn thất bại");
    } finally {
      setSending(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
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
            <Button type="text" icon={<PhoneOutlined />} />
            <Button type="text" icon={<VideoCameraOutlined />} />
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
                      />
                    </React.Fragment>
                  );
                })
              )}
            </div>
          {banInfo ? (
            <div className="ban-message">
              <p>Rất tiếc! Chức năng chat của bạn tạm thời bị giới hạn đến {format(banInfo.banEnd, "HH:mm dd/MM/yyyy", { locale: vi })}.</p>
            </div>
          ) : (
            <Form className="form-style" form={form}>
              {replyTo && (
                <div className="reply-preview">
                  <div className="reply-content">
                    <span className="reply-label">Trả lời {replyTo.displayName}:</span>
                    <p className="reply-text">{replyTo.decryptedText}</p>
                  </div>
                  <Button
                    type="text"
                    icon={<CloseOutlined />}
                    onClick={() => setReplyTo(null)}
                    className="cancel-reply-btn"
                  />
                </div>
              )}
              <div style={{ position: "relative" }}>
                <Button
                  type="text"
                  icon={<SmileOutlined />}
                  className="input-icon-btn"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                />

                {showEmojiPicker && (
                  <div style={{ position: "absolute", bottom: "50px", left: "0", zIndex: 1000 }}>
                    <EmojiPicker
                      onEmojiClick={(emojiData) => {
                        setInputValue((prev) => prev + emojiData.emoji);
                      }}
                    />
                  </div>
                )}
              </div>
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={handleInputChange}
                onPressEnter={handleOnSubmit}
                placeholder={replyTo ? "Trả lời tin nhắn..." : "Nhập tin nhắn..."}
                bordered={false}
                autoComplete="off"
              />
              {inputValue.trim() ? (
                <Button type="text" onClick={handleOnSubmit} loading={sending} className="send-btn">
                  Gửi
                </Button>
              ) : (
                <div className="input-actions">
                  <Button
                    type="text"
                    icon={<AudioOutlined />}
                    className={`input-icon-btn ${isRecording ? 'recording' : ''}`}
                    onClick={handleVoiceButtonClick}
                    disabled={sending}
                  />
                  <label htmlFor="fileUpload" className="input-icon-btn">
                    <PaperClipOutlined />
                  </label>
                  <input
                    id="fileUpload"
                    type="file"
                    style={{ display: "none" }}
                    onChange={handleFileUpload}
                  />
                </div>
              )}
            </Form>
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