import React, { useState, useContext, useMemo, useEffect } from "react";
import { AuthContext } from "./authProvider";
import { useFirestore } from "../hooks/useFirestore";
import { db } from "../firebase/config";
import { useLocation } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { useVideoCall } from "../hooks/useVideoCall";
import { useModalState } from "../hooks/useModalState";
import { useAnnouncement } from "../hooks/useAnnouncement";

export const AppContext = React.createContext();

function getOtherUser(selectedRoom, users, currentUid) {
  if (!selectedRoom || selectedRoom.type !== "private") return null;

  const memberIds = (selectedRoom.members || [])
    .map((m) => (typeof m === "string" ? m : m?.uid))
    .filter(Boolean);

  const membersData = memberIds
    .map((mid) => {
      const found = users.find(
        (u) => String(u.uid).trim() === String(mid).trim()
      );

      // Người dùng chưa load xong → trả placeholder để UI không trống
      if (!found && String(mid).trim() !== String(currentUid).trim()) {
        return { uid: mid, displayName: "Loading...", photoURL: null, _isPlaceholder: true };
      }

      return found;
    })
    .filter(Boolean);

  if (membersData.length !== 2) return null;

  return membersData.find(
    (m) => String(m.uid).trim() !== String(currentUid).trim()
  );
}

function findCallerRoom(rooms, callerId, currentRoomId) {
  const callerRoom = rooms.find((room) => {
    if (room.type !== "private") return false;
    return (room.members || []).some((m) => {
      const memberId = typeof m === "string" ? m : m?.uid;
      return String(memberId).trim() === String(callerId).trim();
    });
  });

  return callerRoom?.id !== currentRoomId ? callerRoom : null;
}

export default function AppProvider({ children }) {
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [searchText, setSearchText] = useState("");
  const [theme, setTheme] = useState("system");
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [isActiveTab, setIsActiveTab] = useState("message");

  const location = useLocation();
  const { user } = useContext(AuthContext);

  const modalState = useModalState();
  const announcementState = useAnnouncement(user, location.pathname);

  // Reset state khi logout
  useEffect(() => {
    if (!user?.uid) {
      setSearchText("");
      setSelectedRoomId("");
      setIsActiveTab("message");
      modalState.resetAllModals();
    }
  }, [user?.uid]);

  // Lắng nghe trạng thái bảo trì
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "config", "appStatus"), (snap) => {
      setIsMaintenance(snap.exists() ? snap.data().maintenance : false);
    });
    return () => unsubscribe();
  }, []);

  const roomsCondition = useMemo(
    () => ({ fieldName: "members", operator: "array-contains", compareValue: user?.uid }),
    [user?.uid]
  );

  const rooms = useFirestore("rooms", roomsCondition);
  const users = useFirestore("users");

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId),
    [rooms, selectedRoomId]
  );

  const otherUser = useMemo(
    () => getOtherUser(selectedRoom, users, user?.uid),
    [selectedRoom, users, user?.uid]
  );

  const videoCallState = useVideoCall(
    user?.uid,
    selectedRoomId,
    otherUser,
    users,
    (callerId) => {
      const callerRoom = findCallerRoom(rooms, callerId, selectedRoomId);
      if (callerRoom) setSelectedRoomId(callerRoom.id);
    }
  );

  const contextValue = useMemo(
    () => ({
      rooms,
      users,
      selectedRoom,
      otherUser,
      videoCallState,

      selectedRoomId, setSelectedRoomId,
      searchText, setSearchText,
      theme, setTheme,
      isMaintenance,
      isActiveTab, setIsActiveTab,

      ...modalState,
      ...announcementState,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      rooms, users, selectedRoom, otherUser, videoCallState,
      selectedRoomId, searchText, theme, isMaintenance, isActiveTab,
      modalState, announcementState,
    ]
  );

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}