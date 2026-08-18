import { create } from "zustand";

export const getOtherUser = (selectedRoom, users, currentUid) => {
  if (!selectedRoom || selectedRoom.type !== "private") return null;

  const memberIds = (selectedRoom.members || [])
    .map((m) => (typeof m === "string" ? m : m?.uid))
    .filter(Boolean);

  const membersData = memberIds
    .map((mid) => {
      const found = (users || []).find(
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
};

export const findCallerRoom = (rooms, callerId, currentRoomId) => {
  const callerRoom = (rooms || []).find((room) => {
    if (room.type !== "private") return false;
    return (room.members || []).some((m) => {
      const memberId = typeof m === "string" ? m : m?.uid;
      return String(memberId).trim() === String(callerId).trim();
    });
  });

  return callerRoom?.id !== currentRoomId ? callerRoom : null;
};

export const useChatStore = create((set) => ({
  selectedRoomId: "",
  searchText: "",
  isActiveTab: "message",
  rooms: [],
  users: [],

  videoCallState: null,

  setSelectedRoomId: (selectedRoomId) => set({ selectedRoomId }),
  setSearchText: (searchText) => set({ searchText }),
  setIsActiveTab: (isActiveTab) => set({ isActiveTab }),
  setRooms: (rooms) => set({ rooms }),
  setUsers: (users) => set({ users }),
  setVideoCallState: (videoCallState) => set({ videoCallState }),

  resetChatState: () =>
    set({
      selectedRoomId: "",
      searchText: "",
      isActiveTab: "message",
      videoCallState: null,
    }),
}));

