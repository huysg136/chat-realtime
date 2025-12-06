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
    const { user = {} } = React.useContext(AuthContext) || {};
    const uid = user.uid || "";
    const photoURL = user.photoURL || null;
    const displayName = user.displayName || "Unknown";

    const selectedRoom = rooms.find(r => r.id === selectedRoomId) || {};
    const members = selectedRoom.members || [];
    const membersData = members
        .map(m => (typeof m === "string" ? m : m?.uid))
        .filter(Boolean)
        .map(mid => users.find(u => String(u.uid).trim() === String(mid).trim()))
        .filter(Boolean);

    const rolesArray = selectedRoom.roles || [];
    const currentUserRole = rolesArray.find(r => String(r.uid).trim() === String(uid).trim())?.role || "member";
    const isPrivate = selectedRoom.type === "private" && membersData.length === 2;
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
        <div className="container">
            <Row style={{ display: 'flex' }}>
                <Col
                    xs={0}
                    sm={0}
                    md={2}
                    lg={1}
                    xl={1}
                >
                    <LeftSide />
                </Col>

                <Col
                    xs={selectedRoomId ? 0 : 24}
                    sm={selectedRoomId ? 0 : 24}
                    md={7}
                    lg={6}
                    xl={6}
                >
                    <SideBar />
                </Col>

                <Col
                    xs={isDetailVisible ? 0 : (selectedRoomId ? 24 : 0)}
                    sm={isDetailVisible ? 0 : (selectedRoomId ? 24 : 0)}
                    md={isDetailVisible ? 10 : 15}
                    lg={isDetailVisible ? 11 : 16}
                    xl={isDetailVisible ? 11 : 17}
                >
                    {selectedRoomId && (
                        <ChatWindow
                            isDetailVisible={isDetailVisible}
                            onToggleDetail={() => setIsDetailVisible(prev => !prev)}
                        />
                    )}
                </Col>

                {isDetailVisible && (
                    <Col
                        xs={24}
                        sm={24}
                        md={6}
                        lg={6}
                        xl={6}
                    >
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
