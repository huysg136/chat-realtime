import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Avatar, Skeleton } from "antd";
import { AiOutlineUsergroupAdd } from "react-icons/ai";
import { InfoCircleOutlined, VideoCameraOutlined } from "@ant-design/icons";
import CircularAvatarGroup from "../../../common/circularAvatarGroup";
import UserBadge from "../../../common/userBadge";
import { getOnlineStatus } from "../../../common/getOnlineStatus";
import { useUserStatus } from "../../../../hooks/useUserStatus";
import { AppContext } from "../../../../context/appProvider";
import { AuthContext } from "../../../../context/authProvider";
import { useTranslation } from "react-i18next";
import "./chatHeader.scss";

export default function ChatHeader({ onToggleDetail, banInfo }) {
    const {
        users,
        setIsInviteMemberVisible,
        videoCallState,
        selectedRoom,
        otherUser
    } = useContext(AppContext);

    const authContext = useContext(AuthContext) || {};
    const user = authContext.user || {};
    const uid = user.uid || "";
    const navigate = useNavigate();

    const { t } = useTranslation();

    const members = selectedRoom ? selectedRoom.members || [] : [];
    const membersData = members
        .map((m) => (typeof m === "string" ? m : m?.uid))
        .filter(Boolean)
        .map((mid) => users.find((u) => String(u.uid).trim() === String(mid).trim()))
        .filter(Boolean);

    const isPrivate = selectedRoom ? selectedRoom.type === "private" && membersData.length === 2 : false;
    const otherUserStatus = useUserStatus(otherUser?.uid);

    const rolesArray = selectedRoom?.roles || [];
    const currentUserRole = rolesArray.find((r) => String(r.uid).trim() === String(uid).trim())?.role || "member";
    const isOwner = currentUserRole === "owner";
    const isCoOwner = currentUserRole === "co-owner";

    if (users.length === 0) {
        return (
            <header className="chat-window__header">
                <div style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '0 20px', paddingTop: '10px' }}>
                    <Skeleton avatar active paragraph={{ rows: 0 }} title={{ width: '150px' }} />
                </div>
            </header>
        );
    }

    if (!selectedRoom) return null;

    return (
        <header className="chat-window__header">
            <div className="header-avatar">
                {isPrivate ? (
                    otherUser ? (
                        <div style={{ position: "relative", display: "inline-block" }}>
                            <Avatar 
                                src={otherUser.photoURL} 
                                size={40} 
                                onClick={() => navigate(`/profile/${otherUser.uid}`)}
                                className="clickable-avatar"
                            />
                            {otherUserStatus?.lastOnline && (
                                <>
                                    {otherUserStatus?.isOnline && otherUser?.showOnlineStatus && user?.showOnlineStatus && (
                                        <span
                                            style={{
                                                position: "absolute",
                                                width: 10,
                                                height: 10,
                                                borderRadius: "50%",
                                                backgroundColor: "#4caf50",
                                                border: "2px solid white",
                                                bottom: 0,
                                                right: 0,
                                                boxShadow: "0 0 2px rgba(0,0,0,0.3)",
                                            }}
                                        />
                                    )}
                                </>
                            )}
                        </div>
                    ) : (
                        <Avatar size={64}>
                            {(selectedRoom.name || "?").charAt(0).toUpperCase()}
                        </Avatar>
                    )
                ) : (
                    <CircularAvatarGroup
                        members={membersData.map((u) => ({
                            avatar: u.photoURL,
                            name: u.displayName,
                        }))}
                        size={64}
                        maxDisplay={3}
                    />
                )}
            </div>

            <div className="header__info">
                <div className="header__title">
                    <UserBadge
                        displayName={isPrivate ? otherUser?.displayName || selectedRoom.name : selectedRoom.name}
                        role={isPrivate ? otherUser?.role : null}
                        premiumLevel={isPrivate ? otherUser?.premiumLevel : null}
                        premiumUntil={isPrivate ? otherUser?.premiumUntil : null}
                        size={16}
                    />
                </div>
                <span className="header__description">
                    {(!isPrivate)
                        ? `${membersData.length} ${t('chatWindow.members')}`
                        : otherUserStatus
                            ? (otherUserStatus.isOnline && otherUser?.showOnlineStatus && user?.showOnlineStatus)
                                ? t('chatWindow.status.activeNow')
                                : (otherUser?.showOnlineStatus && user?.showOnlineStatus)
                                    ? getOnlineStatus(otherUserStatus.lastOnline, t).text
                                    : null
                            : t('chatWindow.status.activeLongAgo')
                    }
                </span>
            </div>
            <div className="button-group-right">
                <div className="button-group-style">
                    {!isPrivate && (isOwner || isCoOwner) && (
                        <Button
                            type="text"
                            icon={<AiOutlineUsergroupAdd />}
                            onClick={() => setIsInviteMemberVisible(true)}
                        />
                    )}
                    {!banInfo && !isPrivate && videoCallState && (
                        <Button
                            type="text"
                            icon={<VideoCameraOutlined />}
                        />
                    )}
                    {!banInfo && isPrivate && videoCallState && (
                        <Button
                            type="text"
                            icon={<VideoCameraOutlined />}
                            onClick={videoCallState.handleVideoCall}
                            disabled={
                                !videoCallState.videoCall ||
                                !videoCallState.videoCall.isConnected() ||
                                videoCallState.isInitializing
                            }
                            title={
                                videoCallState.isInitializing
                                    ? t('chatWindow.videoCall.initializing')
                                    : !videoCallState.videoCall || !videoCallState.videoCall.isConnected()
                                        ? t('chatWindow.videoCall.connecting')
                                        : t('chatWindow.videoCall.callTitle')
                            }
                        />
                    )}
                    <Button
                        type="text"
                        icon={<InfoCircleOutlined />}
                        onClick={onToggleDetail}
                    />
                </div>
            </div>
        </header>
    );
}
