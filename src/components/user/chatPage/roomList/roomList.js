import React, { useContext, useEffect, useState, useMemo } from "react";
import { AppContext } from "../../../../context/appProvider";
import { AuthContext } from "../../../../context/authProvider";
import RoomItem from "./roomItem";
import { db } from "../../../../firebase/config";
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
    if (!rooms?.length) return [];

    const text = searchText?.trim().toLowerCase() || "";

    return rooms.filter((room) => {
      const lm = room.lastMessage;
      const memberUids = Array.isArray(room.members)
        ? room.members.map((m) => (typeof m === "string" ? m : m?.uid)).filter(Boolean)
        : [];

      const isMember = memberUids.includes(user?.uid);

      // Nếu đang tìm kiếm → chỉ cần user vẫn trong phòng
      if (text) {
        const membersData = memberUids
          .map((uid) => users.find((u) => String(u.uid).trim() === String(uid).trim()))
          .filter(Boolean);

        const isPrivate = room.type === "private" && membersData.length === 2;

        if (isPrivate) {
          const otherUser = membersData.find((u) => u.uid !== user?.uid);
          return (
            isMember &&
            (otherUser?.displayName || "")
              .toLowerCase()
              .includes(text)
          );
        } else {
          return isMember && (room.name || "").toLowerCase().includes(text);
        }
      }

      // Không tìm kiếm → phải có lastMessage và visibleFor chứa user
      if (!lm) return false;
      if (Array.isArray(lm.visibleFor) && !lm.visibleFor.includes(user?.uid)) {
        return false;
      }

      return true;
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
      {sortedRooms.map((room) => {
        const canSeeLastMessage =
          Array.isArray(room.lastMessage?.visibleFor) &&
          room.lastMessage.visibleFor.includes(user?.uid);

        return (
          <RoomItem
            key={room.id}
            room={{
              ...room,
              lastMessage: canSeeLastMessage ? room.lastMessage : null,
            }}
            users={users}
            selectedRoomId={selectedRoomId}
          // setSelectedRoomId={setSelectedRoomId}
          />
        );
      })}
    </div>
  );
}
