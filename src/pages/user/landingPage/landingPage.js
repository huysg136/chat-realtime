import React from "react";
import SideBar from "../../../components/user/sideBar/sideBar";
import ChatWindow from "../../../components/user/chatWindow/chatWindow";
import LeftSide from "../../../components/user/leftSide/leftSide";
import ChatDetailPanel from "../../../components/user/chatDetailPanel/chatDetailPanel";
import TransferOwnershipModal from "../../../components/modals/transferOwnershipModal";
import IncomingCallUI from "../../../components/common/IncomingCallUI";
import { AppContext } from "../../../context/appProvider";
import { AuthContext } from "../../../context/authProvider";

export default function ChatRoom() {
    const [isDetailVisible, setIsDetailVisible] = React.useState(false);
    const [isTransferModalVisible, setIsTransferModalVisible] = React.useState(false);
    const [selectedTransferUid, setSelectedTransferUid] = React.useState(null);
    const [leavingLoading, setLeavingLoading] = React.useState(false);

    const { rooms, users, selectedRoomId, videoCallState } = React.useContext(AppContext);
    const { user = {} } = React.useContext(AuthContext) || {};
    const uid = user.uid || "";
    const photoURL = user.photoURL || null;
    const displayName = user.displayName || "Unknown";

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

    React.useEffect(() => {
        setIsDetailVisible(false);
    }, [selectedRoomId]);

    const handleCloseTransferModal = () => {
        setSelectedTransferUid(null);
        setIsTransferModalVisible(false);
        setIsDetailVisible(false);
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', width: '100%', overflow: 'hidden' }}>
            <div style={{ width: '64px', flexShrink: 0 }}>
                <LeftSide />
            </div>

            <div style={{ width: '360px', flexShrink: 0 }}> 
                <SideBar />
            </div>

            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
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
                        currentUser={{ uid, displayName, photoURL }}
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