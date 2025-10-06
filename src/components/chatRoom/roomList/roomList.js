import React, { useContext } from "react";
import { AppContext } from "../../../context/appProvider";
import RoomItem from "./RoomItem";
import "./roomList.scss";

export default function RoomList() {
  const { rooms = [], users = [], selectedRoomId, setSelectedRoomId } = useContext(AppContext);

  const toMs = (ts) => {
    if (!ts) return null;
    if (typeof ts === "number") return ts;
    if (ts.seconds) return ts.seconds * 1000;
    if (ts instanceof Date) return ts.getTime();
    if (typeof ts === "string") return Date.parse(ts);
    return null;
  };

  const sortedRooms = [...rooms].sort((a, b) => {
    const aTime = toMs(a.lastMessage?.createdAt) || 0;
    const bTime = toMs(b.lastMessage?.createdAt) || 0;
    return bTime - aTime;
  });

  return (
    <div className="room-list-wrapper">
      {sortedRooms.map((room) => (
        <RoomItem
          key={room.id}
          room={room}
          users={users}
          selectedRoomId={selectedRoomId}
          setSelectedRoomId={setSelectedRoomId}
        />
      ))}
    </div>
  );
}
