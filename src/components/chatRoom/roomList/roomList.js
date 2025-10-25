import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "../../../context/appProvider";
import { AuthContext } from "../../../context/authProvider";
import RoomItem from "./RoomItem";
import { db } from "../../../firebase/config";
import { doc, onSnapshot } from "firebase/firestore";
import "./roomList.scss";

export default function RoomList() {
  const { rooms = [], users = [], selectedRoomId, setSelectedRoomId } =
    useContext(AppContext);
  const { user } = useContext(AuthContext);
  const [pinnedRooms, setPinnedRooms] = useState([]);

  useEffect(() => {
    if (!user?.uid) return;
    const ref = doc(db, "pinned", user.uid);
    const unsub = onSnapshot(ref, (snap) => {
      setPinnedRooms(snap.exists() ? snap.data().rooms || [] : []);
    });
    return () => unsub();
  }, [user?.uid]);

  const toMs = (ts) => {
    if (!ts) return null;
    if (typeof ts === "number") return ts;
    if (ts.seconds) return ts.seconds * 1000;
    if (ts instanceof Date) return ts.getTime();
    if (typeof ts === "string") return Date.parse(ts);
    return null;
  };

  const sortedRooms = [...rooms].sort((a, b) => {
    const aPinned = pinnedRooms.includes(a.id);
    const bPinned = pinnedRooms.includes(b.id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
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
