import React, { useContext } from "react";
import { Avatar } from "antd";
import { AppContext } from "../../../context/appProvider";
import "./roomList.scss"; 

export default function RoomList() {
  const { rooms } = useContext(AppContext);

  return (
    <div className="room-list-wrapper">
      {rooms.map((room) => (
        <div className="room-item" key={room.id}>
          <Avatar
            src={
              room.avatar
                ? room.avatar
                : "https://images.spiderum.com/sp-images/9ae85f405bdf11f0a7b6d5c38c96eb0e.jpeg"
            }
            size={40}
          >
            {room.name?.charAt(0)?.toUpperCase()}
          </Avatar>

          <div className="room-info">
            <p className="room-name">{room.name}</p>
            <p className="last-message">{room.lastMessage || "No messages yet"}</p>
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
