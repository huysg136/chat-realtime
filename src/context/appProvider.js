import React, { useMemo, useEffect } from "react";
import { AuthContext } from "./authProvider";
import { useFirestore } from "../hooks/useFirestore";
import { db } from "../firebase/config";
import { useLocation } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { useVideoCall } from "../hooks/useVideoCall";
import { useModalStore } from "../stores/useModalStore";
import { useAppStore } from "../stores/useAppStore";
import { useChatStore, getOtherUser, findCallerRoom } from "../stores/useChatStore";
import { useAnnouncement } from "../hooks/useAnnouncement";

export const AppContext = React.createContext();

export default function AppProvider({ children }) {
  const selectedRoomId = useChatStore((state) => state.selectedRoomId);
  const setSelectedRoomId = useChatStore((state) => state.setSelectedRoomId);
  const searchText = useChatStore((state) => state.searchText);
  const setSearchText = useChatStore((state) => state.setSearchText);
  const isActiveTab = useChatStore((state) => state.isActiveTab);
  const setIsActiveTab = useChatStore((state) => state.setIsActiveTab);
  const resetChatState = useChatStore((state) => state.resetChatState);
  const setRoomsInStore = useChatStore((state) => state.setRooms);
  const setUsersInStore = useChatStore((state) => state.setUsers);

  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const isMaintenance = useAppStore((state) => state.isMaintenance);
  const setIsMaintenance = useAppStore((state) => state.setIsMaintenance);

  const resetAllModals = useModalStore((state) => state.resetAllModals);

  // Modal selectors for legacy AppContext compatibility
  const isAddRoomVisible = useModalStore((s) => s.isAddRoomVisible);
  const setIsAddRoomVisible = useModalStore((s) => s.setIsAddRoomVisible);
  const isInviteMemberVisible = useModalStore((s) => s.isInviteMemberVisible);
  const setIsInviteMemberVisible = useModalStore((s) => s.setIsInviteMemberVisible);
  const isProfileVisible = useModalStore((s) => s.isProfileVisible);
  const setIsProfileVisible = useModalStore((s) => s.setIsProfileVisible);
  const isPendingInviteVisible = useModalStore((s) => s.isPendingInviteVisible);
  const setIsPendingInviteVisible = useModalStore((s) => s.setIsPendingInviteVisible);
  const isSettingsVisible = useModalStore((s) => s.isSettingsVisible);
  const setIsSettingsVisible = useModalStore((s) => s.setIsSettingsVisible);
  const isMyReportsVisible = useModalStore((s) => s.isMyReportsVisible);
  const setIsMyReportsVisible = useModalStore((s) => s.setIsMyReportsVisible);
  const isUpgradePlanVisible = useModalStore((s) => s.isUpgradePlanVisible);
  const setIsUpgradePlanVisible = useModalStore((s) => s.setIsUpgradePlanVisible);
  const isFriendsVisible = useModalStore((s) => s.isFriendsVisible);
  const setIsFriendsVisible = useModalStore((s) => s.setIsFriendsVisible);
  const isPostDetailVisible = useModalStore((s) => s.isPostDetailVisible);
  const setIsPostDetailVisible = useModalStore((s) => s.setIsPostDetailVisible);
  const activePostId = useModalStore((s) => s.activePostId);
  const setActivePostId = useModalStore((s) => s.setActivePostId);

  const location = useLocation();
  const { user } = React.useContext(AuthContext);

  const announcementState = useAnnouncement(user, location.pathname);

  // Reset state khi logout
  useEffect(() => {
    if (!user?.uid) {
      resetChatState();
      resetAllModals();
    }
  }, [user?.uid, resetChatState, resetAllModals]);

  // Lắng nghe trạng thái bảo trì
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "config", "appStatus"), (snap) => {
      setIsMaintenance(snap.exists() ? snap.data().maintenance : false);
    });
    return () => unsubscribe();
  }, [setIsMaintenance]);

  const roomsCondition = useMemo(
    () => ({ fieldName: "members", operator: "array-contains", compareValue: user?.uid }),
    [user?.uid]
  );

  const rooms = useFirestore("rooms", roomsCondition);
  const users = useFirestore("users");

  useEffect(() => {
    setRoomsInStore(rooms);
  }, [rooms, setRoomsInStore]);

  useEffect(() => {
    setUsersInStore(users);
  }, [users, setUsersInStore]);

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

      selectedRoomId,
      setSelectedRoomId,
      searchText,
      setSearchText,
      theme,
      setTheme,
      isMaintenance,
      isActiveTab,
      setIsActiveTab,

      isAddRoomVisible,
      setIsAddRoomVisible,
      isInviteMemberVisible,
      setIsInviteMemberVisible,
      isProfileVisible,
      setIsProfileVisible,
      isPendingInviteVisible,
      setIsPendingInviteVisible,
      isSettingsVisible,
      setIsSettingsVisible,
      isMyReportsVisible,
      setIsMyReportsVisible,
      isUpgradePlanVisible,
      setIsUpgradePlanVisible,
      isFriendsVisible,
      setIsFriendsVisible,
      isPostDetailVisible,
      setIsPostDetailVisible,
      activePostId,
      setActivePostId,
      resetAllModals,

      ...announcementState,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      rooms,
      users,
      selectedRoom,
      otherUser,
      videoCallState,
      selectedRoomId,
      searchText,
      theme,
      isMaintenance,
      isActiveTab,
      isAddRoomVisible,
      isInviteMemberVisible,
      isProfileVisible,
      isPendingInviteVisible,
      isSettingsVisible,
      isMyReportsVisible,
      isUpgradePlanVisible,
      isFriendsVisible,
      isPostDetailVisible,
      activePostId,
      announcementState,
    ]
  );

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}