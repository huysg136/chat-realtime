import React, { useContext, useEffect, useState, useMemo } from "react";
import { AppContext } from "../../../context/appProvider";
import { AuthContext } from "../../../context/authProvider";
import RoomItem from './roomItem';
import { db } from "../../../firebase/config";
import { doc, onSnapshot } from "firebase/firestore";
import "./roomList.scss";

export default function RoomList() {
  const { rooms = [], users = [], selectedRoomId, setSelectedRoomId, searchText } =
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
    if (!ts) return 0;
    if (typeof ts === "number") return ts;
    if (ts.seconds) return ts.seconds * 1000;
    if (ts instanceof Date) return ts.getTime();
    if (typeof ts === "string") return Date.parse(ts);
    return 0;
  };

  const filteredRooms = useMemo(() => {
    if (!searchText?.trim()) return rooms;
    const text = searchText.toLowerCase();

    return rooms.filter((room) => {
      const memberUids = Array.isArray(room.members)
        ? room.members.map((m) => (typeof m === "string" ? m : m?.uid)).filter(Boolean)
        : [];

      const membersData = memberUids
        .map((uid) => users.find((u) => String(u.uid).trim() === String(uid).trim()))
        .filter(Boolean);

      const isPrivate = room.type === "private" && membersData.length === 2;

      if (isPrivate) {
        const otherUser = membersData.find((u) => u.uid !== user?.uid);
        return (otherUser?.displayName || "")
          .toLowerCase()
          .includes(text);
      } else {
        // group or normal room
        return (room.name || "")
          .toLowerCase()
          .includes(text);
      }
    });
  }, [rooms, searchText, users, user?.uid]);


  const sortedRooms = useMemo(() => {
    return [...filteredRooms].sort((a, b) => {
      const aPinned = pinnedRooms.includes(a.id);
      const bPinned = pinnedRooms.includes(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      const aTime = toMs(a.lastMessage?.createdAt);
      const bTime = toMs(b.lastMessage?.createdAt);
      return bTime - aTime;
    });
  }, [filteredRooms, pinnedRooms]);

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