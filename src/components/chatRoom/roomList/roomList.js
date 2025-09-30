import React, { useContext } from "react";
import { Avatar } from "antd";
import { AppContext } from "../../../context/appProvider";
import CircularAvatarGroup from "../../common/circularAvatarGroup"; // import mới
import "./roomList.scss";

export default function RoomList() {
  const { rooms, selectedRoomId, setSelectedRoomId } = useContext(AppContext);
  const timeAgo = (timestamp) => {
    if (!timestamp) return "";

    const now = new Date();
    const time = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const diff = Math.floor((now - time) / 1000); // chênh lệch giây

    if (diff < 60) return "vài giây trước";
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    if (diff < 172800) return `Hôm qua`;
    
    return `${time.getDate()}/${time.getMonth() + 1}/${time.getFullYear()}`;
  };
  
  return (
    <div className="room-list-wrapper">
      {rooms.map((room) => (
        <div
          className={`room-item ${selectedRoomId === room.id ? "active" : ""}`}
          key={room.id}
          onClick={() => setSelectedRoomId(room.id)}
        >
          {room.avatar ? (
            <Avatar src={room.avatar} size={40}>
              {room.name?.charAt(0)?.toUpperCase()}
            </Avatar>
          ) : (
            <CircularAvatarGroup members={room.members || []} size={40} />
          )}

          <div className="room-info">
            <p className="room-name">{room.name}</p>
            {room.lastMessage ? (
              <p className="last-message">
                {room.lastMessage.displayName}: {room.lastMessage.text}
              </p>
            ) : (
              <p className="last-message">No messages yet</p>
            )}
          </div>

          <span className="room-time">
            {room.lastMessage?.createdAt
              ? timeAgo(
                  room.lastMessage.createdAt.seconds
                    ? room.lastMessage.createdAt.seconds * 1000
                    : room.lastMessage.createdAt
                )
              : ""}
          </span>
        </div>
      ))}
    </div>
  );
}
