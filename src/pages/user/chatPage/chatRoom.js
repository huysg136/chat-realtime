import React, { useState, useContext, useEffect } from "react";
import SideBar from "../../../components/user/chatPage/sideBar/sideBar"
import ChatWindow from "../../../components/user/chatPage/chatWindow/chatWindow";
import ChatDetailPanel from "../../../components/user/chatPage/chatDetailPanel/chatDetailPanel";
import TransferOwnershipModal from "../../../components/modals/transferOwnershipModal";
import IncomingCallUI from "../../../components/common/IncomingCallUI";
import { AppContext } from "../../../context/appProvider";
import { AuthContext } from "../../../context/authProvider";
import { useParams, useNavigate } from "react-router-dom";
import { ROUTERS } from "../../../configs/router";

export default function ChatRoom() {
    const [isDetailVisible, setIsDetailVisible] = useState(false);
    const [isTransferModalVisible, setIsTransferModalVisible] = useState(false);
    const [selectedTransferUid, setSelectedTransferUid] = useState(null);
    const [leavingLoading, setLeavingLoading] = useState(false);

    const { rooms, users, selectedRoomId, setSelectedRoomId, videoCallState } = useContext(AppContext);
    const { user = {} } = useContext(AuthContext) || {};
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
        if (!roomId) return;
        if (!uid) return;

        if (!rooms || rooms.length === 0) return;
        const room = rooms.find(r => r.id === roomId);
        const isMember = room?.members?.some(m => String(m?.uid ?? m) === String(uid));

        if (!room || !isMember) {
            setSelectedRoomId(null);
            navigate(ROUTERS.USER.HOME);
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
        <div style={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden' }}>
            {/* <div style={{ width: '64px', flexShrink: 0 }}>
                <LeftSide />
            </div> */}

            <div style={{ width: '360px', flexShrink: 0 }}>
                <SideBar />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
                <ChatWindow
                    isDetailVisible={isDetailVisible}
                    onToggleDetail={() => setIsDetailVisible(prev => !prev)}
                />
            </div>

            {isDetailVisible && selectedRoom && (
                <div style={{ width: '360px', flexShrink: 0 }}>
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