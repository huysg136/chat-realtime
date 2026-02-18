import React, { useState, useMemo } from "react";
import { Modal, Input, Avatar, Button, Checkbox } from "antd";
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
    const text = searchText.toLowerCase();
    return rooms.filter((room) => {
      // Xác định loại phòng và tên hiển thị để filter
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

      const isPrivate = room.type === "private" && membersData.length === 2;

      if (isPrivate) {
        const otherUser = membersData.find((u) => u.uid !== currentUser?.uid);
        return (otherUser?.displayName || "").toLowerCase().includes(text);
      }

      return (room.name || "").toLowerCase().includes(text);
    });
  }, [rooms, searchText, users, currentUser?.uid]);

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
      footer={null}
      width={450}
      centered
      className="forward-message-modal"
    >
      {/* Search */}
      <div className="search-container">
        <div className="section-label">Tìm kiếm phòng</div>
        <Input
          placeholder="Tìm kiếm phòng..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>

      {/* List */}
      <div className="rooms-list">
        {filteredRooms.map((room) => {
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

          const isPrivate = room.type === "private" && membersData.length === 2;
          const isGroup = !isPrivate && (room.type === "group" || membersData.length > 1);

          let displayNameToShow = room.name;
          let avatarElement = null;

          if (isPrivate) {
            const otherUser = membersData.find((u) => u.uid !== currentUser?.uid);
            displayNameToShow = otherUser?.displayName || room.name;
            avatarElement = (
              <Avatar src={otherUser?.photoURL} size={32}>
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
                  size={32}
                />
              </div>
            );
          } else {
            avatarElement = (
              <Avatar size={32}>
                {(room.name || "?").charAt(0).toUpperCase()}
              </Avatar>
            );
          }

          return (
            <div
              key={room.id}
              className={`room-item-row ${isSelected ? 'selected' : ''}`}
              onClick={() => toggleRoomSelect(room)}
            >
              <div className="item-inner">
                {avatarElement}
                <div className="item-info">
                  <div className="name-wrapper">
                    {isGroup && (
                      <TeamOutlined className="team-icon" />
                    )}
                    <span className="name-text">
                      {displayNameToShow}
                    </span>
                  </div>
                  <span className="sub-label">
                    {isPrivate ? "Riêng tư" : "Nhóm"}
                  </span>
                </div>
              </div>
              <Checkbox checked={isSelected} />
            </div>
          );
        })}
      </div>

      {/* Button */}
      <Button
        type="primary"
        block
        onClick={handleSubmit}
        loading={forwarding}
        disabled={selectedRooms.length === 0}
        className="submit-btn"
      >
        Chia sẻ ({selectedRooms.length})
      </Button>
    </Modal>
  );
}
