import React, { useState, useEffect } from "react";
import SideBar from "../components/sideBar/SideBar"
import ChatWindow from "../components/chatWindow/ChatWindow";
import ChatDetailPanel from "../components/chatDetailPanel/ChatDetailPanel";
import TransferOwnershipModal from "../components/modals/TransferOwnershipModal";
import IncomingCallUI from "../../calls/components/IncomingCallUI";
import { useChatStore } from "../store/chat.store";
import { useAuthStore } from "../../auth/store/auth.store";
import { useParams, useNavigate } from "react-router-dom";
import { ROUTERS } from "../../../app/router/routePaths";
import "./chatRoom.scss";

export default function ChatRoom() {
    const [isDetailVisible, setIsDetailVisible] = useState(false);
    const [isTransferModalVisible, setIsTransferModalVisible] = useState(false);
    const [selectedTransferUid, setSelectedTransferUid] = useState(null);
    const [leavingLoading, setLeavingLoading] = useState(false);

    const rooms = useChatStore((state) => state.rooms);
    const users = useChatStore((state) => state.users);
    const selectedRoomId = useChatStore((state) => state.selectedRoomId);
    const setSelectedRoomId = useChatStore((state) => state.setSelectedRoomId);
    const videoCallState = useChatStore((state) => state.videoCallState);
    const user = useAuthStore((state) => state.user) || {};
    const uid = user.uid || "";

    const selectedRoom = rooms.find(r => r.id === selectedRoomId) || null;
    const members = selectedRoom?.members || [];
    const membersData = members
        .map(m => (typeof m === "string" ? m : m?.uid))
        .filter(Boolean)
        .map(mid => users.find(u => String(u.uid).trim() === String(mid).trim()))
        .filter(Boolean);

    const rolesArray = selectedRoom?.roles || [];
    const currentUserRole = rolesArray.find(r => String(r.uid).trim() === String(uid).trim())?.role || "member";
    const isPrivate = selectedRoom?.type === "private" && membersData.length === 2;
    const otherUser = isPrivate
        ? membersData.find(m => String(m.uid).trim() !== String(uid).trim())
        : null;
    const { roomId } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        if (!roomId) {
            setSelectedRoomId(null);
            return;
        }
        if (!uid) return;

        if (!rooms || rooms.length === 0) return;
        const room = rooms.find(r => r.id === roomId);
        const isMember = room?.members?.some(m => String(m?.uid ?? m) === String(uid));

        if (!room || !isMember) {
            setSelectedRoomId(null);
            navigate(ROUTERS.USER.DIRECT);
            return;
        }

        if (roomId !== selectedRoomId) {
            setSelectedRoomId(roomId);
        }
    }, [roomId, uid, rooms, selectedRoomId, navigate, setSelectedRoomId]);

    useEffect(() => {
        setIsDetailVisible(false);
    }, [selectedRoomId]);

    const handleCloseTransferModal = () => {
        setSelectedTransferUid(null);
        setIsTransferModalVisible(false);
        setIsDetailVisible(false);
    };

    return (
        <div className="chat-room-container">
            <div className={`chat-room-container__sidebar ${selectedRoomId ? 'is-hidden' : ''}`}>
                <SideBar />
            </div>

            <div className={`chat-room-container__window ${!selectedRoomId ? 'is-hidden' : ''}`}>
                <ChatWindow
                    isDetailVisible={isDetailVisible}
                    onToggleDetail={() => setIsDetailVisible(prev => !prev)}
                />
            </div>

            {isDetailVisible && selectedRoom && (
                <div className="chat-room-container__detail">
                    <ChatDetailPanel
                        isVisible={true}
                        selectedRoom={selectedRoom}
                        membersData={membersData}
                        currentUser={user}
                        currentUserRole={currentUserRole}
                        rolesArray={rolesArray}
                        isPrivate={isPrivate}
                        otherUser={otherUser}
                        onClose={() => setIsDetailVisible(false)}
                        onOpenTransferModal={() => setIsTransferModalVisible(true)}
                    />
                </div>
            )}

            {selectedRoom && (
                <TransferOwnershipModal
                    visible={isTransferModalVisible}
                    membersData={membersData}
                    currentUid={uid}
                    currentUser={user}
                    selectedRoom={selectedRoom}
                    rolesArray={rolesArray}
                    selectedTransferUid={selectedTransferUid}
                    setSelectedTransferUid={setSelectedTransferUid}
                    leavingLoading={leavingLoading}
                    setLeavingLoading={setLeavingLoading}
                    onClose={handleCloseTransferModal}
                />
            )}

            {videoCallState && videoCallState.callStatus === "incoming" && (
                <IncomingCallUI
                    caller={videoCallState.callerUser}
                    onAccept={videoCallState.handleAnswerCall}
                    onReject={videoCallState.handleRejectCall}
                />
            )}
        </div>
    );
}
