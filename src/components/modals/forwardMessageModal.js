import React, { useState, useMemo } from "react";
import { Modal, Input, List, Avatar, Button } from "antd";
import { SearchOutlined, TeamOutlined } from "@ant-design/icons";
import CircularAvatarGroup from "../common/circularAvatarGroup";
import "./forwardMessageModal.scss";

export default function ForwardMessageModal({
  visible,
  onCancel,
  onSubmit,
  rooms,
  users,
  currentUser,
  text,
  forwarding,
}) {
  const [searchText, setSearchText] = useState("");
  const [selectedRooms, setSelectedRooms] = useState([]);

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) =>
      room.name.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [rooms, searchText]);

  const toggleRoomSelect = (room) => {
    if (selectedRooms.some((r) => r.id === room.id)) {
      setSelectedRooms(selectedRooms.filter((r) => r.id !== room.id));
    } else {
      setSelectedRooms([...selectedRooms, room]);
    }
  };

  const handleSubmit = async () => {
    if (onSubmit) await onSubmit(selectedRooms);
    setSelectedRooms([]);
  };

  return (
    <Modal
      title="Chia sẻ tin nhắn"
      open={visible}
      onCancel={() => {
        setSelectedRooms([]);
        onCancel?.();
      }}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Hủy
        </Button>,
        <Button
          key="submit"
          type="primary"
          onClick={handleSubmit}
          loading={forwarding}
          disabled={selectedRooms.length === 0}
        >
          Chia sẻ ({selectedRooms.length})
        </Button>,
      ]}
      width={450}
      className="forward-message-modal"
    >
      <Input
        placeholder="Tìm kiếm phòng..."
        prefix={<SearchOutlined />}
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        style={{ marginBottom: 16 }}
      />
      <List
        dataSource={filteredRooms}
        renderItem={(room) => {
          const isSelected = selectedRooms.some((r) => r.id === room.id);

          // Xác định avatar hiển thị
          const memberUids = Array.isArray(room.members)
            ? room.members
                .map((m) => (typeof m === "string" ? m : m?.uid))
                .filter(Boolean)
            : [];

          const membersData = memberUids
            .map((uid) =>
              users.find((u) => String(u.uid).trim() === String(uid).trim())
            )
            .filter(Boolean);

          const isPrivate =
            room.type === "private" && membersData.length === 2;
          const isGroup =
            !isPrivate && (room.type === "group" || membersData.length > 1);

          let avatarElement = null;
          if (isPrivate) {
            const otherUser = membersData.find(
              (u) => u.uid !== currentUser?.uid
            );
            avatarElement = (
              <Avatar src={otherUser?.photoURL} size={40}>
                {otherUser?.displayName?.charAt(0)?.toUpperCase() || "?"}
              </Avatar>
            );
          } else if (isGroup) {
            avatarElement = (
              <div className="room-circular-avatar-wrapper">
                <CircularAvatarGroup
                  members={membersData.map((u) => ({
                    avatar: u.photoURL || null,
                    name: u.displayName || "?",
                  }))}
                  maxDisplay={3}
                />
              </div>
            );
          } else {
            avatarElement = (
              <Avatar size={40}>
                {(room.name || "?").charAt(0).toUpperCase()}
              </Avatar>
            );
          }

          return (
            <List.Item
              onClick={() => toggleRoomSelect(room)}
              className={`room-item ${isSelected ? 'selected-room' : ''}`}
              style={{
                cursor: "pointer",
                backgroundColor: isSelected ? "#e6f7ff" : "transparent",
                borderRadius: 6,
                padding: "8px 12px",
                alignItems: "center",
                display: "flex",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f5f5f5")}
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = isSelected ? "#e6f7ff" : "transparent")
              }
            >
              <div style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
                {avatarElement}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    marginLeft: 16,
                    overflow: "hidden",
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                    }}
                  >
                    {isGroup && (
                      <TeamOutlined style={{ color: "#8c8c8c", flexShrink: 0 }} />
                    )}
                    <span
                      className="room-name"
                      style={{
                        fontWeight: 500,
                        fontSize: 15,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        flex: 1,
                        maxWidth: "220px",
                      }}
                      title={room.name}
                    >
                      {room.name}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      color: "#888",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {isPrivate ? "Riêng tư" : "Nhóm"}
                  </span>
                </div>
              </div>
              {isSelected && (
                <div style={{ color: "#1890ff", fontWeight: "bold", fontSize: 18 }}>✓</div>
              )}
            </List.Item>

          );
        }}
        style={{ maxHeight: 300, overflowY: "auto" }}
      />
    </Modal>
  );
}
