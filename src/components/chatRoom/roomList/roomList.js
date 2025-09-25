import React, { useContext } from "react";
import { Avatar } from "antd";
import { AppContext } from "../../../context/appProvider";
import CircularAvatarGroup from "../../common/circularAvatarGroup"; // import mới
import "./roomList.scss";

export default function RoomList() {
  const { rooms, setSelectedRoomId } = useContext(AppContext);

  return (
    <div className="room-list-wrapper">
      {rooms.map((room) => (
        <div
          className="room-item"
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
            <p className="last-message">
              {room.lastMessage || "No messages yet"}
            </p>
          </div>

          <span className="room-time">
            {room.updatedAt
              ? new Date(room.updatedAt.seconds * 1000).toLocaleTimeString()
              : ""}
          </span>
        </div>
      ))}
    </div>
  );
}
