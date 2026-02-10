import React, { useState, useEffect } from "react";
import { Button, Avatar, Input, Tooltip, Popconfirm } from "antd";
import {
  DeleteOutlined,
  CrownOutlined,
  EditOutlined,
  CheckOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { FaKey } from "react-icons/fa6";
import { toast } from 'react-toastify';
import CircularAvatarGroup from "../../common/circularAvatarGroup";
import { updateDocument, addDocument } from "../../../firebase/services";
import "./chatDetailPanel.scss";
import { useTranslation } from "react-i18next";
import UserBadge from "../../common/userBadge";

export default function ChatDetailPanel({
  isVisible,
  selectedRoom,
  membersData,
  currentUser,
  currentUserRole,
  rolesArray,
  isPrivate,
  otherUser,
  onClose,
  onOpenTransferModal,
}) {
  const [muted, setMuted] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [roomNameLocal, setRoomNameLocal] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const { t } = useTranslation();

  const { uid } = currentUser;

  useEffect(() => {
    setRoomNameLocal(selectedRoom?.name || "");
    setNewRoomName(selectedRoom?.name || "");
    setIsEditingName(false);
  }, [selectedRoom?.id, selectedRoom?.name]);

  useEffect(() => {
    setMuted(Boolean(selectedRoom?.muted));
  }, [selectedRoom?.id, selectedRoom]);

  const getRoleOf = (memberUid) => {
    const r = rolesArray.find((x) => String(x.uid).trim() === String(memberUid).trim());
    return r ? r.role : "member";
  };

  const ownerEntry = rolesArray.find((r) => r.role === "owner");
  const ownerUid = ownerEntry?.uid || (selectedRoom?.members?.[0] && String(selectedRoom.members[0]));

  // const isOwner = currentUserRole === "owner";
  // const isCoOwner = currentUserRole === "co-owner";

  const canToggleCoOwner = (targetUid) => {
    if (currentUserRole !== "owner") return false;
    if (String(targetUid).trim() === String(ownerUid).trim()) return false;
    return true;
  };

  const canRemoveMember = (targetUid) => {
    if (String(targetUid).trim() === String(ownerUid).trim()) return false;
    if (String(targetUid).trim() === String(uid).trim()) return false;
    if (currentUserRole === "owner") return true;
    if (currentUserRole === "co-owner") {
      return getRoleOf(targetUid) === "member";
    }
    return false;
  };

  const toggleCoOwner = async (targetUid) => {
    if (!canToggleCoOwner(targetUid)) return;
    try {
      const existing = rolesArray.find((r) => String(r.uid).trim() === String(targetUid).trim());
      let newRoles;
      if (existing) {
        if (existing.role === "co-owner") {
          newRoles = rolesArray.map(r => r.uid === existing.uid ? { uid: r.uid, role: "member" } : r);
        } else {
          newRoles = rolesArray.map(r => r.uid === existing.uid ? { uid: r.uid, role: "co-owner" } : r);
        }
      } else {
        newRoles = [...rolesArray, { uid: targetUid, role: "co-owner" }];
      }

      await updateDocument("rooms", selectedRoom.id, { roles: newRoles });
      toast.success(t('chatDetail.roleUpdateSuccess'));
    } catch (err) {
      toast.error(t('chatDetail.roleUpdateError'));
    }
  };

  const transferOwnership = async (targetUid) => {
    if (currentUserRole !== "owner") {
      toast.warning(t('chatDetail.ownerOnly'));
      return;
    }

    if (String(targetUid).trim() === String(uid).trim()) {
      toast.warning(t('chatDetail.alreadyOwner'));
      return;
    }

    try {
      const newRoles = (rolesArray || []).map((r) => {
        if (r.role === "owner") return { uid: r.uid, role: "member" };
        if (r.uid === targetUid) return { uid: r.uid, role: "owner" };
        return r;
      });

      if (!newRoles.some(r => r.uid === targetUid)) {
        newRoles.push({ uid: targetUid, role: "owner" });
      }

      await updateDocument("rooms", selectedRoom.id, { roles: newRoles });
      toast.success(t('chatDetail.transferSuccess'));
    } catch (err) {
      toast.error(t('chatDetail.transferError'));
    }
  };

  const removeMember = async (targetUid) => {
    if (!canRemoveMember(targetUid)) {
      toast.warning(t('chatDetail.removePermission'));
      return;
    }

    try {
      const newMembers = (selectedRoom.members || []).filter(
        m => String(m).trim() !== String(targetUid).trim()
      );
      const newRoles = (selectedRoom.roles || []).filter(
        r => String(r.uid).trim() !== String(targetUid).trim()
      );

      await updateDocument("rooms", selectedRoom.id, {
        members: newMembers,
        roles: newRoles
      });

      const targetMember = membersData.find(m => String(m.uid).trim() === String(targetUid).trim());
      const targetName = targetMember?.displayName;
      await addDocument("messages", {
        uid: "system",
        roomId: selectedRoom.id,
        kind: "system",
        action: "remove_member",
        target: { uid: targetMember?.uid, name: targetName, photoURL: targetMember?.photoURL },
        actor: { uid: currentUser?.uid, name: currentUser?.displayName, photoURL: currentUser?.photoURL },
        visibleFor: newMembers,
        createdAt: new Date(),
      });

      toast.success(t('chatDetail.removeSuccess'));
    } catch (err) {
      toast.error(t('chatDetail.removeError'));
    }
  };

  const canEditRoomName = !isPrivate && (currentUserRole === "owner" || currentUserRole === "co-owner");

  const startEditName = () => {
    if (!canEditRoomName) return;
    setNewRoomName(selectedRoom?.name || "");
    setIsEditingName(true);
  };

  const cancelEditName = () => {
    setIsEditingName(false);
    setNewRoomName(selectedRoom?.name || "");
  };

  const saveRoomName = async () => {
    const trimmed = (newRoomName || "").trim();
    if (!trimmed) {
      toast.warning(t('chatDetail.emptyName'));
      return;
    }
    if (trimmed.length > 100) {
      toast.warning(t('chatDetail.nameTooLong'));
      return;
    }

    if (trimmed === (selectedRoom?.name || "")) {
      setIsEditingName(false);
      return;
    }

    setIsSavingName(true);
    try {
      await updateDocument("rooms", selectedRoom.id, { name: trimmed });
      setRoomNameLocal(trimmed);
      setIsEditingName(false);
      toast.success(t('chatDetail.renameSuccess'));
    } catch (err) {
      toast.error(t('chatDetail.renameError'));
    } finally {
      setIsSavingName(false);
    }
  };

  // const handleToggleNotifications = async () => {
  //   const newMuted = !muted;
  //   setMuted(newMuted);
  //   try {
  //     await updateDocument("rooms", selectedRoom.id, { muted: newMuted });
  //     toast.success(newMuted ? "Đã tắt thông báo" : "Đã bật thông báo");
  //   } catch (err) {
  //     toast.error("Lưu cài đặt thất bại");
  //     setMuted(!newMuted);
  //   }
  // };

  // const handleReport = () => {
  //   toast.info("Đã gửi báo cáo (chưa thực hiện)");
  // };

  // const handleBlock = () => {
  //   toast.info("Chặn người dùng (chưa thực hiện)");
  // };

  // const handleDeleteConversation = async () => {
  //   toast.info("Xóa đoạn chat (chưa thực hiện)");
  // };

  const leaveGroupDirect = async () => {
    if (!selectedRoom) return;
    if (!uid) return;

    try {
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

      await addDocument("messages", {
        uid: "system",
        roomId: selectedRoom.id,
        kind: "system",
        action: "leave_group", 
        actor: {
          uid: currentUser?.uid,
          name: currentUser?.displayName || "Người dùng",
          photoURL: currentUser?.photoURL || null,
        },
        visibleFor: newMembers,
        createdAt: new Date(),
      });

      toast.success(t('chatDetail.leaveSuccess'));
      onClose?.();
    } catch (err) {
      toast.error(t('chatDetail.leaveError'));
    }
  };

  return (
    <>
      <aside
        className={`chat-detail-panel ${isVisible ? "open" : ""}`}
        role="dialog"
        aria-hidden={!isVisible}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="chat-detail-header">
          <div className="title-area">
            <h3>{t("chatDetail.title")}</h3>
            <span className="room-type">{isPrivate ? t("chatDetail.private") : t("chatDetail.group")}</span>
          </div>
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
                    <div className="name">
                      {otherUser.displayName}
                      <UserBadge role={otherUser.role}/>
                    </div>
                  </div>
                  
                </div>
              ) : null
            ) : selectedRoom.avatar ? (
              <div className="overview-avatar">
                <Avatar size={64} src={selectedRoom.avatar} />
                <div className="overview-info">
                  <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}>
                    {isEditingName ? (
                      <>
                        <Input
                          value={newRoomName}
                          onChange={(e) => setNewRoomName(e.target.value)}
                          onPressEnter={saveRoomName}
                          placeholder={t("chatDetail.roomNamePlaceholder")}
                          autoFocus
                          style={{ minWidth: 160 }}
                          disabled={isSavingName}
                        />
                        <Button
                          className="save-name-btn"
                          type="primary"
                          icon={<CheckOutlined />}
                          onClick={saveRoomName}
                          loading={isSavingName}
                        />
                        <Button className="cancel-edit-btn" icon={<CloseOutlined />} onClick={cancelEditName} />
                      </>
                    ) : (
                      <>
                        <Tooltip title={roomNameLocal || selectedRoom.name}>
                          <p className="name" style={{ margin: 0 }}>{roomNameLocal || selectedRoom.name}</p>
                        </Tooltip>
                        {canEditRoomName && (
                          <Tooltip title={t("chatDetail.editRoomName")}>
                            <Button className="edit-name-btn" type="text" icon={<EditOutlined />} onClick={startEditName} />
                          </Tooltip>
                        )}
                      </>
                    )}
                  </div>  
                </div>
              </div>
            ) : (
              <div className="overview-avatar">
                <CircularAvatarGroup
                  members={membersData.map((u) => ({ avatar: u.photoURL, name: u.displayName }))}
                  size={64}
                />
                <div className="overview-info">
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
                          className="save-name-btn"
                          type="primary"
                          icon={<CheckOutlined />}
                          onClick={saveRoomName}
                          loading={isSavingName}
                          disabled={!newRoomName.trim()}
                        />
                        <Button className="cancel-edit-btn" icon={<CloseOutlined />} onClick={cancelEditName} />
                      </>
                    ) : (
                      <>
                        <Tooltip title={roomNameLocal || selectedRoom.name}>
                          <p className="name" style={{ margin: 0 }}>{roomNameLocal || selectedRoom.name}</p>
                        </Tooltip>
                        {canEditRoomName && (
                          <Tooltip title="Đổi tên nhóm">
                            <Button className="edit-name-btn" type="text" icon={<EditOutlined />} onClick={startEditName} />
                          </Tooltip>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* <div className="notification-toggle" style={{ marginTop: 12 }}>
            <label className="notification-toggle-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={muted} onChange={handleToggleNotifications} />
              <span>Tắt thông báo</span>
            </label>
          </div> */}

          <div className="members-section" style={{ marginTop: 16 }}>
            <h4>
              {t("chatDetail.members")}
              {isPrivate ? "" : ` (${membersData.length})`}
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
                        <div className="member-name" style={{ margin: 0 }}>
                          {otherUser.displayName}
                          <UserBadge role={otherUser.role}/>
                        </div>
                      </Tooltip>
                      <p style={{ fontSize: 12, color: "gray", margin: 0 }}>@{otherUser.username}</p>
                    </div>
                  </div>
                )
              ) : (
                membersData.map((m) => {
                  const role = getRoleOf(m.uid);
                  const isMemberOwner = role === "owner";
                  const isMemberCoOwner = role === "co-owner";
                  return (
                    <div className="member-item" key={m.uid} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <Avatar src={m.photoURL} size={40}>
                        {(m.displayName || "?").charAt(0).toUpperCase()}
                      </Avatar>
                      <div className="member-info">
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 0 }}>
                          <Tooltip title={m.displayName}>
                            <div className="member-name" style={{ margin: 0 }}>
                              {m.displayName}
                              <UserBadge role={m.role}/>
                            </div>
                          </Tooltip>
                          {isMemberOwner && <FaKey color="gold" />}
                          {isMemberCoOwner && <FaKey color="silver" />}
                        </div>
                        <p style={{ fontSize: 12, color: "gray", margin: 0 }}>@{m.username}</p>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        {canToggleCoOwner(m.uid) && (
                          <Tooltip 
                            title={getRoleOf(m.uid) === "co-owner" 
                              ? t("chatDetail.roles.revokeCoOwner") 
                              : t("chatDetail.roles.assignCoOwner") 
                            }
                          >
                            <Button
                              className="toggle-coowner-btn"
                              type="text"
                              icon={<CrownOutlined />}
                              onClick={(e) => { e.stopPropagation(); toggleCoOwner(m.uid); }}
                              style={{color: "silver"}}
                            />
                          </Tooltip>
                        )}
                        {currentUserRole === "owner" && String(m.uid).trim() !== String(uid).trim() && (
                          <Popconfirm
                            title={t("chatDetail.confirm.transferTitle", { name: m.displayName })}
                            onConfirm={() => transferOwnership(m.uid)}
                            okText={t("chatDetail.confirm.ok")}
                            cancelText={t("chatDetail.confirm.cancel")}
                          >
                            <Tooltip title={t("chatDetail.roles.transferOwner")}>
                              <Button
                                className="transfer-ownership-btn"
                                type="text"
                                icon={<CrownOutlined />}
                                onClick={(e) => e.stopPropagation()}
                                style={{color: "gold"}}
                              />
                            </Tooltip>
                          </Popconfirm>
                        )}
                        {canRemoveMember(m.uid) && (
                          <Popconfirm
                            title={t("chatDetail.confirm.removeMemberTitle", { name: m.displayName })}
                            onConfirm={() => removeMember(m.uid)}
                            okText={t("chatDetail.confirm.remove")}
                            cancelText={t("chatDetail.confirm.cancel")}
                            okButtonProps={{ danger: true }}
                          >
                            <Button 
                              className="remove-member-btn" 
                              type="text" 
                              icon={<DeleteOutlined />} 
                              danger 
                            />
                          </Popconfirm>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {isPrivate ? (
            <div className="chat-actions">
              {/* <button className="danger-btn" onClick={handleReport}>Báo cáo</button>
              <button className="danger-btn" onClick={handleBlock}>Chặn</button> */}
              {/* <button className="danger-btn" onClick={handleDeleteConversation}>Xóa đoạn chat</button> */}
            </div>
          ) : (
            <div className="chat-actions">
              {currentUserRole === "owner" ? (
                <Tooltip title={t('chatDetail.ownerHint')}>
                  <button className="danger-btn" onClick={onOpenTransferModal}>{t('chatDetail.leaveGroup')}</button>
                </Tooltip>
              ) : (
                <Popconfirm
                  title={t('chatDetail.confirm.leaveGroupTitle')}
                  onConfirm={leaveGroupDirect}
                  okText={t('chatDetail.confirm.leave')}
                  cancelText={t('chatDetail.confirm.cancel')}
                >
                  <button className="danger-btn">{t('chatDetail.leaveGroup')}</button>
                </Popconfirm>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}