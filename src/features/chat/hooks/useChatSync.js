import { useMemo, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../../shared/firebase/firebaseClient";
import { useFirestore } from "../../../shared/hooks/useFirestore";
import { useVideoCall } from "../../calls/hooks/useVideoCall";
import { useAnnouncement } from "../../notifications/hooks/useAnnouncement";
import { useAuthStore } from "../../auth/store/auth.store";
import { useAppStore } from "../../../app/store/app.store";
import { useChatStore, getOtherUser, findCallerRoom } from "../store/chat.store";

export function useChatSync() {
  const user = useAuthStore((state) => state.user);
  const setIsMaintenance = useAppStore((state) => state.setIsMaintenance);

  const selectedRoomId = useChatStore((state) => state.selectedRoomId);
  const setSelectedRoomId = useChatStore((state) => state.setSelectedRoomId);
  const setRoomsInStore = useChatStore((state) => state.setRooms);
  const setUsersInStore = useChatStore((state) => state.setUsers);
  const setVideoCallState = useChatStore((state) => state.setVideoCallState);

  const location = useLocation();

  // Lắng nghe thông báo hệ thống
  useAnnouncement(user, location.pathname);

  // Lắng nghe trạng thái bảo trì hệ thống
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

  useEffect(() => {
    setVideoCallState(videoCallState);
  }, [videoCallState, setVideoCallState]);

  return { rooms, users, selectedRoom, otherUser, videoCallState };
}

export default useChatSync;
