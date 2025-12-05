import React from "react";
import { Row, Col } from "antd";
import SideBar from "../chatRoom/sideBar/sideBar";
import ChatWindow from "../chatRoom/chatWindow/chatWindow";
import LeftSide from "./leftSide/leftSide";
import ChatDetailPanel from "./chatDetailPanel/chatDetailPanel";
import TransferOwnershipModal from "../modals/transferOwnershipModal";
import IncomingCallUI from "../common/IncomingCallUI";
import { AppContext } from "../../context/appProvider";
import { AuthContext } from "../../context/authProvider";

export default function ChatRoom() {
    const [isDetailVisible, setIsDetailVisible] = React.useState(false);
    const [isTransferModalVisible, setIsTransferModalVisible] = React.useState(false);
    const [selectedTransferUid, setSelectedTransferUid] = React.useState(null);
    const [leavingLoading, setLeavingLoading] = React.useState(false);

    const { rooms, users, selectedRoomId, videoCallState } = React.useContext(AppContext);
    const authContext = React.useContext(AuthContext) || {};
    const user = authContext.user || {};
    const uid = user.uid || "";
    const photoURL = user.photoURL || null;
    const displayName = user.displayName || "Unknown";

    const selectedRoom = rooms.find((room) => room.id === selectedRoomId) || {};
    const members = selectedRoom.members || [];
    const membersData = members
        .map((m) => (typeof m === "string" ? m : m?.uid))
        .filter(Boolean)
        .map((mid) => users.find((u) => String(u.uid).trim() === String(mid).trim()))
        .filter(Boolean);

    const rolesArray = selectedRoom.roles || [];
    const currentUserRole = rolesArray.find((r) => String(r.uid).trim() === String(uid).trim())?.role || "member";
    const isPrivate = selectedRoom.type === "private" && membersData.length === 2;
    const otherUser = isPrivate
        ? membersData.find((m) => String(m.uid).trim() !== String(uid).trim())
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
        <div>
        <Row gutter={0} className="chat-room">
            <Col span={1}>
            <LeftSide />
            </Col>
            <Col span={6}>
            <SideBar />
            </Col>
            <Col span={isDetailVisible ? 11 : 17}>
                <ChatWindow 
                    isDetailVisible={isDetailVisible}
                    onToggleDetail={() => setIsDetailVisible(prev => !prev)} 
                />
            </Col>

            {isDetailVisible && (
            <Col span={6}>
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
            </Col>
            )}
        </Row>

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
