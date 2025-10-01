import React from "react";
import { Avatar } from "antd";

const defaultAvatar = "https://images.spiderum.com/sp-images/9ae85f405bdf11f0a7b6d5c38c96eb0e.jpeg";

const CircularAvatarGroup = ({ members, maxDisplay = 3 }) => {
  if (!members || members.length === 0) {
    return (
      <Avatar src={defaultAvatar} size={40} style={{ flexShrink: 0 }}>
        ?
      </Avatar>
    );
  }

  // Nếu chỉ có 1 thành viên → avatar to
  if (members.length === 1) {
    const user = members[0];
    return (
      <Avatar
        src={user.avatar || defaultAvatar}
        size={40}
        style={{ flexShrink: 0 }}
      >
        {!user.avatar && user.name?.charAt(0)?.toUpperCase()}
      </Avatar>
    );
  }

  const displayMembers = members.slice(0, maxDisplay);
  const remainingCount = members.length - maxDisplay;

  // Tính toán vị trí avatar
  const getAvatarPosition = (index, total, avatarSize = 24) => {
    if (total === 2) {
      const spacing = avatarSize / 2 - 8;
      return { x: index === 0 ? -spacing : spacing, y: 0 };
    }
    const angle = (2 * Math.PI * index) / total;
    const radius = 12;
    const x = Math.cos(angle - Math.PI / 2) * radius;
    const y = Math.sin(angle - Math.PI / 2) * radius;
    return { x, y };
  };

  // Kích thước avatar theo số lượng
  const getAvatarSize = (count) => {
    if (count === 1) return 32;
    if (count === 2) return 28;
    if (count === 3) return 24;
    if (count === 4) return 16;
  };

  const avatarSize = getAvatarSize(displayMembers.length);
  const totalToDisplay =
    remainingCount > 0 ? displayMembers.length + 1 : displayMembers.length;

  return (
    <div className="circular-avatar-group">
      <div
        className="avatar-circle"
        style={{ position: "relative", width: 40, height: 40 }}
      >
        {displayMembers.map((member, index) => {
          const position = getAvatarPosition(index, totalToDisplay, avatarSize);
          return (
            <Avatar
              key={member.id}
              src={member.avatar || defaultAvatar}
              size={avatarSize}
              className="circle-avatar"
              style={{
                position: "absolute",
                left: `calc(50% + ${position.x}px)`,
                top: `calc(50% + ${position.y}px)`,
                transform: "translate(-50%, -50%)",
                border: "2px solid white",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}
            >
              {!member.avatar && member.name?.charAt(0)?.toUpperCase()}
            </Avatar>
          );
        })}

        {/* Hiển thị số còn lại */}
        {remainingCount > 0 && (
          <Avatar
            size={avatarSize}
            className="circle-avatar remaining-count"
            style={{
              position: "absolute",
              left: `calc(50% + ${
                getAvatarPosition(displayMembers.length, totalToDisplay, avatarSize).x
              }px)`,
              top: `calc(50% + ${
                getAvatarPosition(displayMembers.length, totalToDisplay, avatarSize).y
              }px)`,
              transform: "translate(-50%, -50%)",
              backgroundColor: "#bebebeff",
              color: "white",
              border: "2px solid white",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              fontSize: "10px",
              fontWeight: "bold",
            }}
          >
            +{remainingCount}
          </Avatar>
        )}
      </div>
    </div>
  );
};

export default CircularAvatarGroup;
