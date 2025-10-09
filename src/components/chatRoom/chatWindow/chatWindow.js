import React, { useContext, useState, useMemo, useRef, useEffect } from "react";
import {
  Button,
  Avatar,
  Form,
  Input,
  Popconfirm,
  Tag,
  Tooltip,
  message,
  Modal,
  Select,
} from "antd";
import {
  PhoneOutlined,
  VideoCameraOutlined,
  UserAddOutlined,
  MessageOutlined,
  SmileOutlined,
  PictureOutlined,
  AudioOutlined,
  DeleteOutlined,
  CrownOutlined,
  EditOutlined,
  CheckOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { FaKey } from "react-icons/fa6";
import Message from "../message/message";
import { AppContext } from "../../../context/appProvider";
import CircularAvatarGroup from "../../common/circularAvatarGroup";
import "./chatWindow.scss";
import { addDocument, updateDocument, encryptMessage, decryptMessage } from "../../../firebase/services";
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

  // rename group states
  const [isEditingName, setIsEditingName] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [roomNameLocal, setRoomNameLocal] = useState("");

  // *** Leave group states ***
  const [isTransferModalVisible, setIsTransferModalVisible] = useState(false);
  const [selectedTransferUid, setSelectedTransferUid] = useState(null);
  const [leavingLoading, setLeavingLoading] = useState(false);

  const toggleDetail = () => {
    if (isEditingName) {
      cancelEditName();
    }
    setIsDetailVisible((p) => !p);
  }

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId),
    [rooms, selectedRoomId]
  );

  // sync local room name when selectedRoom changes
  useEffect(() => {
    setRoomNameLocal(selectedRoom?.name || "");
    setNewRoomName(selectedRoom?.name || "");
    setIsEditingName(false);
  }, [selectedRoomId, selectedRoom?.name]);

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

      // Decrypt the message text if secretKey exists
      const decryptedText = selectedRoom?.secretKey ? decryptMessage(msg.text || "", selectedRoom.secretKey) : msg.text || "";

      return {
        ...msg,
        createdAt: timestamp,
        id: msg.id || msg._id || `msg-${index}`,
        decryptedText,
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
      const encryptedText = selectedRoom.secretKey ? encryptMessage(messageText, selectedRoom.secretKey) : messageText;

      await addDocument("messages", {
        text: encryptedText,
        uid,
        photoURL,
        roomId: selectedRoom.id,
        displayName,
        createdAt: new Date(),
      });

      await updateDocument("rooms", selectedRoom.id, {
        lastMessage: {
          displayName,
          text: encryptedText,
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

  // ===== Role helpers =====
  const rolesArray = selectedRoom.roles || []; // [{uid, role}]
  const getRoleOf = (memberUid) => {
    const r = rolesArray.find((x) => String(x.uid).trim() === String(memberUid).trim());
    return r ? r.role : "member";
  };

  const ownerEntry = rolesArray.find((r) => r.role === "owner");
  const ownerUid = ownerEntry?.uid || (members[0] && String(members[0])); // fallback

  const currentUserRole = getRoleOf(uid);
  const isOwner = currentUserRole === "owner";
  const isCoOwner = currentUserRole === "co-owner";

  const canToggleCoOwner = (targetUid) => {
    // Only owner can promote/demote co-owner; cannot change owner
    if (currentUserRole !== "owner") return false;
    if (String(targetUid).trim() === String(ownerUid).trim()) return false;
    return true;
  };

  const canRemoveMember = (targetUid) => {
    if (String(targetUid).trim() === String(ownerUid).trim()) return false; // no one can remove owner
    if (String(targetUid).trim() === String(uid).trim()) return false; // don't allow self-remove from UI (could be allowed but keep simple)
    if (currentUserRole === "owner") return true; // owner can remove anyone except owner themself
    if (currentUserRole === "co-owner") {
      // co-owner can remove only 'member' (not other co-owner or owner)
      return getRoleOf(targetUid) === "member";
    }
    return false;
  };

  // ===== Actions for roles/members =====
  const toggleCoOwner = async (targetUid) => {
    if (!canToggleCoOwner(targetUid)) return;
    try {
      const existing = rolesArray.find((r) => String(r.uid).trim() === String(targetUid).trim());
      let newRoles;
      if (existing) {
        if (existing.role === "co-owner") {
          // demote to member
          newRoles = rolesArray.map(r => r.uid === existing.uid ? { uid: r.uid, role: "member" } : r);
        } else {
          // promote to co-owner
          newRoles = rolesArray.map(r => r.uid === existing.uid ? { uid: r.uid, role: "co-owner" } : r);
        }
      } else {
        // if no entry, add as co-owner
        newRoles = [...rolesArray, { uid: targetUid, role: "co-owner" }];
      }

      await updateDocument("rooms", selectedRoom.id, { roles: newRoles });
      message.success("Cập nhật quyền thành công");
    } catch (err) {
      console.error("toggleCoOwner error:", err);
      message.error("Không thể cập nhật quyền, thử lại sau");
    }
  };

  const transferOwnership = async (targetUid) => {
    if (currentUserRole !== "owner") {
      message.warning("Chỉ trưởng nhóm mới có thể chuyển quyền trưởng nhóm");
      return;
    }

    if (String(targetUid).trim() === String(uid).trim()) {
      message.warning("Bạn đã là trưởng nhóm rồi");
      return;
    }

    try {
      const newRoles = (rolesArray || []).map((r) => {
        if (r.role === "owner") return { uid: r.uid, role: "member" };
        if (r.uid === targetUid) return { uid: r.uid, role: "owner" };
        return r;
      });

      // Nếu người nhận chưa có role, thêm mới
      if (!newRoles.some(r => r.uid === targetUid)) {
        newRoles.push({ uid: targetUid, role: "owner" });
      }

      await updateDocument("rooms", selectedRoom.id, { roles: newRoles });
      message.success("Đã chuyển quyền trưởng nhóm thành công!");
    } catch (err) {
      console.error("transferOwnership error:", err);
      message.error("Không thể chuyển quyền, thử lại sau");
    }
  };


  const removeMember = async (targetUid) => {
    if (!canRemoveMember(targetUid)) {
      message.warning("Bạn không có quyền xóa thành viên này.");
      return;
    }

    // confirm handled via Popconfirm in UI; here proceed
    try {
      const newMembers = (selectedRoom.members || []).filter(m => String(m).trim() !== String(targetUid).trim());
      const newRoles = (selectedRoom.roles || []).filter(r => String(r.uid).trim() !== String(targetUid).trim());

      await updateDocument("rooms", selectedRoom.id, {
        members: newMembers,
        roles: newRoles
      });

      message.success("Đã xóa thành viên");
    } catch (err) {
      console.error("removeMember error:", err);
      message.error("Xóa thành viên thất bại, thử lại sau");
    }
  };

  // ===== Rename group logic =====
  const canEditRoomName = !isPrivate && (currentUserRole === "owner" || currentUserRole === "co-owner");

  const startEditName = () => {
    if (!canEditRoomName) return;
    setNewRoomName(selectedRoom?.name || "");
    setIsEditingName(true);
    // slight delay to let input autofocus (see ref in JSX)
  };

  const cancelEditName = () => {
    setIsEditingName(false);
    setNewRoomName(selectedRoom?.name || "");
  };

  const saveRoomName = async () => {
    const trimmed = (newRoomName || "").trim();
    if (!trimmed) {
      message.warning("Tên phòng không được để trống");
      return;
    }
    if (trimmed.length > 100) {
      message.warning("Tên phòng tối đa 100 ký tự");
      return;
    }

    if (trimmed === (selectedRoom?.name || "")) {
      setIsEditingName(false);
      return;
    }

    setIsSavingName(true);
    try {
      await updateDocument("rooms", selectedRoom.id, { name: trimmed });
      setRoomNameLocal(trimmed); // optimistic local update
      setIsEditingName(false);
      message.success("Đã đổi tên phòng");
    } catch (err) {
      console.error("saveRoomName error:", err);
      message.error("Đổi tên thất bại, thử lại");
    } finally {
      setIsSavingName(false);
    }
  };

  // actions (placeholders)
  const handleToggleNotifications = async () => {
    const newMuted = !muted;
    setMuted(newMuted);
    try {
      await updateDocument("rooms", selectedRoom.id, { muted: newMuted });
      message.success(newMuted ? "Đã tắt thông báo" : "Đã bật thông báo");
    } catch (err) {
      console.error(err);
      message.error("Lưu cài đặt thất bại");
      setMuted(!newMuted); // revert
    }
  };

  const handleReport = () => {
    // TODO: implement report logic (create a report doc or call API)
    console.log("Report room", selectedRoom.id);
    message.info("Đã gửi báo cáo (chưa thực hiện)");
  };

  const handleBlock = () => {
    // TODO: implement block user logic
    console.log("Block user / room", selectedRoom.id);
    message.info("Chặn người dùng (chưa thực hiện)");
  };

  const handleDeleteConversation = async () => {
    // TODO: implement delete chat (soft delete or call backend)
    console.log("Delete conversation", selectedRoom.id);
    message.info("Xóa đoạn chat (chưa thực hiện)");
    // Example (uncomment and adjust as needed):
    // await updateDocument('rooms', selectedRoom.id, { deleted: true });
  };

  // ===== Leave group logic =====
  const canLeave = () => {
    // owner phải chuyển quyền trước
    return currentUserRole !== "owner";
  };

  const openTransferModal = (e) => {
    if (e) e.stopPropagation();
    setSelectedTransferUid(null);
    setIsTransferModalVisible(true);
  };

  const closeTransferModal = () => {
    setIsTransferModalVisible(false);
    setSelectedTransferUid(null);
  };

  const leaveGroupDirect = async () => {
    // rời nhóm cho user không phải owner
    if (!selectedRoom) return;
    if (!uid) return;

    try {
      setLeavingLoading(true);
      const newMembers = (selectedRoom.members || []).filter(
        (m) => String(m).trim() !== String(uid).trim()
      );
      const newRoles = (selectedRoom.roles || []).filter(
        (r) => String(r.uid).trim() !== String(uid).trim()
      );

      await updateDocument("rooms", selectedRoom.id, {
        members: newMembers,
        roles: newRoles,
      });

      message.success("Bạn đã rời nhóm");
      // TODO: deselect room or navigate away if needed
    } catch (err) {
      console.error("leaveGroupDirect error:", err);
      message.error("Rời nhóm thất bại, thử lại sau");
    } finally {
      setLeavingLoading(false);
    }
  };

  const transferOwnershipAndLeave = async () => {
    // owner phải chọn người nhận quyền trước khi rời
    if (!selectedTransferUid) {
      message.warning("Vui lòng chọn người nhận quyền trưởng nhóm");
      return;
    }
    if (!selectedRoom) return;
    if (!uid) return;

    if (String(selectedTransferUid).trim() === String(uid).trim()) {
      message.warning("Không thể chuyển quyền cho chính bạn");
      return;
    }

    try {
      setLeavingLoading(true);

      // Build newRoles:
      // - existing owner -> member
      // - selectedTransferUid -> owner
      // - remove current user role entry
      const newRolesMap = {};
      (rolesArray || []).forEach((r) => {
        newRolesMap[String(r.uid).trim()] = r.role;
      });

      // set existing owner -> member (if exists)
      Object.keys(newRolesMap).forEach((k) => {
        if (newRolesMap[k] === "owner") {
          newRolesMap[k] = "member";
        }
      });

      // set receiver -> owner
      newRolesMap[String(selectedTransferUid).trim()] = "owner";

      // remove leaver's role entry
      delete newRolesMap[String(uid).trim()];

      // convert map back to array
      const newRoles = Object.keys(newRolesMap).map((k) => ({ uid: k, role: newRolesMap[k] }));

      // remove leaving user from members
      const newMembers = (selectedRoom.members || []).filter(
        (m) => String(m).trim() !== String(uid).trim()
      );

      await updateDocument("rooms", selectedRoom.id, {
        members: newMembers,
        roles: newRoles,
      });

      message.success("Đã chuyển quyền và rời nhóm");
      closeTransferModal();
      // TODO: deselect room or navigate away if needed
    } catch (err) {
      console.error("transferOwnershipAndLeave error:", err);
      message.error("Chuyển quyền hoặc rời nhóm thất bại, thử lại sau");
    } finally {
      setLeavingLoading(false);
    }
  };

  // Transfer modal options (exclude owner itself)
  const transferCandidates = membersData.filter((m) => String(m.uid).trim() !== String(uid).trim() && String(m.uid).trim() !== String(ownerUid).trim());

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
          <Tooltip title={roomNameLocal || selectedRoom.name}>
            <p className="header__title">
              {isPrivate ? otherUser?.displayName || selectedRoom.name : (roomNameLocal || selectedRoom.name)}
            </p>
          </Tooltip>
          <span className="header__description">
            {selectedRoom.description || (isPrivate ? "Đang hoạt động" : "Đang hoạt động")}
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
                    members={membersData.map((u) => ({ avatar: u.photoURL, name: u.displayName }))}
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
                    text={msg.decryptedText || ""}
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
              //disabled={sending}
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
                    {/* <p className="sub">{otherUser.role}</p> */}
                  </div>
                </div>
              ) : null
            ) : selectedRoom.avatar ? (
              <div className="overview-avatar">
                <Avatar size={64} src={selectedRoom.avatar} />
                <div className="overview-info">
                  {/* room name area with edit */}
                  <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}>
                    {isEditingName ? (
                      <>
                        <Input
                          value={newRoomName}
                          onChange={(e) => setNewRoomName(e.target.value)}
                          onPressEnter={saveRoomName}
                          placeholder="Tên nhóm"
                          autoFocus
                          style={{ minWidth: 160 }}
                          disabled={isSavingName}
                        />
                        <Button
                          type="primary"
                          icon={<CheckOutlined />}
                          onClick={saveRoomName}
                          loading={isSavingName}
                        />
                        <Button icon={<CloseOutlined />} onClick={cancelEditName} />
                      </>
                    ) : (
                      <>
                        <Tooltip title={roomNameLocal || selectedRoom.name}>
                          <p className="name" style={{ margin: 0 }}>{roomNameLocal || selectedRoom.name}</p>
                        </Tooltip>
                        {canEditRoomName && (
                          <Tooltip title="Đổi tên nhóm">
                            <Button
                              type="text"
                              icon={<EditOutlined />}
                              onClick={startEditName}
                            />
                          </Tooltip>
                        )}
                      </>
                    )}
                  </div>

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
                  {/* room name area with edit */}
                  <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}>
                    {isEditingName ? (
                      <>
                        <Input
                          value={newRoomName}
                          onChange={(e) => setNewRoomName(e.target.value)}
                          onPressEnter={saveRoomName}
                          placeholder="Tên nhóm"
                          autoFocus
                          style={{ minWidth: 160 }}
                          disabled={isSavingName}
                        />
                        <Button
                          type="primary"
                          icon={<CheckOutlined />}
                          onClick={saveRoomName}
                          loading={isSavingName}
                          disabled={!newRoomName.trim()}
                        />
                        <Button icon={<CloseOutlined />} onClick={cancelEditName} />
                      </>
                    ) : (
                      <>
                        <Tooltip title={roomNameLocal || selectedRoom.name}>
                          <p className="name" style={{ margin: 0 }}>{roomNameLocal || selectedRoom.name}</p>
                        </Tooltip>
                        {canEditRoomName && (
                          <Tooltip title="Đổi tên nhóm">
                            <Button
                              type="text"
                              icon={<EditOutlined />}
                              onClick={startEditName}
                            />
                          </Tooltip>
                        )}
                      </>
                    )}
                  </div>

                  <p className="sub">{selectedRoom.description}</p>
                </div>
              </div>
            )}
          </div>

          <div className="notification-toggle" style={{ marginTop: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={muted} onChange={handleToggleNotifications} />
              <span>Tắt thông báo</span>
            </label>
          </div>

          <div className="members-section" style={{ marginTop: 16 }}>
            <h4>
              Thành viên 
              {
                isPrivate ? "" : 
                ` (${membersData.length})`
              }
            </h4>
            <div className="members-list">
              {isPrivate ? (
                otherUser && (
                  <div className="member-item" key={otherUser.uid}>
                    <Avatar src={otherUser.photoURL} size={40}>
                      {(otherUser.displayName || "?").charAt(0).toUpperCase()}
                    </Avatar>
                    <div className="member-info">
                      <Tooltip title={otherUser.displayName}>
                        <p className="member-name" style={{ margin: 0 }}>{otherUser.displayName}</p>
                      </Tooltip>
                    </div>
                  </div>
                )
              ) : (
                membersData.map((m) => {
                  const role = getRoleOf(m.uid);
                  const isOwner = role === "owner";
                  const isCoOwner = role === "co-owner";
                  return (
                    <div className="member-item" key={m.uid} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <Avatar src={m.photoURL} size={40}>
                        {(m.displayName || "?").charAt(0).toUpperCase()}
                      </Avatar>
                      <div className="member-info">
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 0 }}>
                          <Tooltip title={m.displayName}>
                            <p className="member-name" style={{ margin: 0 }}>{m.displayName}</p>
                          </Tooltip>
                          {isOwner && <FaKey color="gold" />}
                          {isCoOwner && <FaKey color="silver" />}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        {/* Toggle co-owner (only owner can do) */}
                        {canToggleCoOwner(m.uid) && (
                          <Tooltip title={getRoleOf(m.uid) === "co-owner" ? "Thu hồi Phó nhóm" : "Bổ nhiệm Phó nhóm"}>
                            <Button
                              type="text"
                              icon={<CrownOutlined />}
                              onClick={(e) => { e.stopPropagation(); toggleCoOwner(m.uid); }}
                              style={{color: "silver"}}
                            />
                          </Tooltip>
                        )}
                        {/* Transfer ownership (only current owner can do) */}
                        {currentUserRole === "owner" && String(m.uid).trim() !== String(uid).trim() && (
                          <Popconfirm
                            title={`Chuyển quyền trưởng nhóm cho ${m.displayName}?`}
                            onConfirm={() => transferOwnership(m.uid)}
                            okText="Đồng ý"
                            cancelText="Hủy"
                          >
                            <Tooltip title="Chuyển trưởng nhóm">
                              <Button
                                type="text"
                                icon={<CrownOutlined />}
                                onClick={(e) => e.stopPropagation()}
                                style={{color: "gold"}}
                              />
                            </Tooltip>
                          </Popconfirm>
                        )}
                        {/* Delete button (owner/co-owner rules handled in canRemoveMember) */}
                        {canRemoveMember(m.uid) ? (
                          <Popconfirm
                            title={`Xóa ${m.displayName} khỏi nhóm?`}
                            onConfirm={() => removeMember(m.uid)}
                            okText="Xóa"
                            cancelText="Hủy"
                          >
                            <Button type="text" icon={<DeleteOutlined />} danger />
                          </Popconfirm>
                        ) : (
                          // show disabled delete icon for clarity if current user cannot delete
                          <Tooltip title={
                            String(m.uid).trim() === String(ownerUid).trim() ? "Không thể xóa chủ phòng" :
                            String(m.uid).trim() === String(uid).trim() ? "Bạn không thể xóa chính mình" :
                            "Bạn không có quyền xóa thành viên này"
                          }>
                            <Button type="text" icon={<DeleteOutlined />} disabled />
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {
            isPrivate ? (
              <div className="chat-actions">
                <button className="danger-btn" onClick={handleReport}>Báo cáo</button>
                <button className="danger-btn" onClick={handleBlock}>Chặn</button>
                <button className="danger-btn" onClick={handleDeleteConversation}>Xóa đoạn chat</button>
              </div>
            ) : (
              <div className="chat-actions">
                {/* Group: show leave group flow */}
                {currentUserRole === "owner" ? (
                  <>
                    <Tooltip title="Trưởng nhóm phải chuyển quyền cho thành viên khác trước khi rời">
                      <button className="danger-btn" onClick={openTransferModal}>Rời nhóm</button>
                    </Tooltip>
                  </>
                ) : (
                  <Popconfirm
                    title="Bạn có chắc chắn muốn rời nhóm?"
                    onConfirm={leaveGroupDirect}
                    okText="Rời"
                    cancelText="Hủy"
                  >
                    <button className="danger-btn">Rời nhóm</button>
                  </Popconfirm>
                )}
              </div>
            )
          }
          
        </div>
      </aside>

      <Modal
        title="Chuyển quyền trưởng nhóm và rời"
        visible={isTransferModalVisible}
        onOk={transferOwnershipAndLeave}
        onCancel={closeTransferModal}
        okText="Chuyển & Rời"
        cancelText="Hủy"
        confirmLoading={leavingLoading}
        destroyOnClose
      >
        <p>Vui lòng chọn thành viên sẽ nhận quyền trưởng nhóm trước khi bạn rời.</p>

        {transferCandidates.length === 0 ? (
          <div>
            <p>Không có thành viên nào phù hợp để chuyển quyền. Bạn không thể rời nhóm ngay bây giờ.</p>
          </div>
        ) : (
          <Select
            style={{ width: "100%" }}
            placeholder="Chọn thành viên"
            value={selectedTransferUid}
            onChange={(val) => setSelectedTransferUid(val)}
            optionLabelProp="label"
          >
            {transferCandidates.map((c) => (
              <Select.Option key={c.uid} value={c.uid} label={c.displayName || c.uid}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Avatar src={c.photoURL} size={24}>{(c.displayName || "?").charAt(0).toUpperCase()}</Avatar>
                  <span>{c.displayName || c.uid}</span>
                </div>
              </Select.Option>
            ))}
          </Select>
        )}
      </Modal>
    </div>
  );
}
