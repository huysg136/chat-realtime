import React, { useContext, useState, useCallback, useEffect } from 'react';
import { Avatar } from 'antd';
import { AppContext } from '../../../../context/appProvider';
import { AuthContext } from '../../../../context/authProvider';
import { useFriends } from '../../../../hooks/useFriends';
import { useUserStatus } from '../../../../hooks/useUserStatus';
import UserBadge from '../../../common/userBadge';
import { useNavigate } from 'react-router-dom';
import { ROUTERS } from '../../../../configs/router';
import { collection, query, where, limit, getDocs } from "firebase/firestore";
import { db } from "../../../../firebase/config";
import { addDocument, generateAESKey } from "../../../../firebase/services";
import './onlineFriends.scss';

function OnlineFriendItem({ uid, onStatusChange }) {
    const { users, setSelectedRoomId } = useContext(AppContext);
    const { user: currentUser } = useContext(AuthContext);
    const navigate = useNavigate();

    const friendInfo = users.find((u) => u.uid === uid);
    const status = useUserStatus(uid);

    const isOnline = status?.isOnline && friendInfo?.showOnlineStatus && currentUser?.showOnlineStatus;

    useEffect(() => {
        onStatusChange(uid, !!isOnline);
    }, [uid, isOnline, onStatusChange]);

    if (!friendInfo || !isOnline) return null;

    const handleMessage = async () => {
        const pairKey = [currentUser.uid, uid].sort().join("_");
        const q = query(
            collection(db, "rooms"),
            where("type", "==", "private"),
            where("pairKey", "==", pairKey),
            limit(1)
        );
        const snap = await getDocs(q);
        let roomId;
        if (!snap.empty) {
            roomId = snap.docs[0].id;
        } else {
            const docRef = await addDocument("rooms", {
                type: "private",
                members: [currentUser.uid, uid],
                pairKey,
                secretKey: generateAESKey(),
                createdAt: new Date(),
            });
            roomId = docRef.id;
        }
        setSelectedRoomId(roomId);
        navigate(ROUTERS.USER.CHAT.replace(":roomId", roomId));
    };

    return (
        <div className="online-friend-item" onClick={handleMessage}>
            <div className="online-friend-item__avatar-wrapper">
                <Avatar src={friendInfo.photoURL} size={36}>
                    {(friendInfo.displayName || "?").charAt(0).toUpperCase()}
                </Avatar>
                <span className="online-friend-item__status-dot" />
            </div>
            <div className="online-friend-item__name">
                <UserBadge
                    displayName={friendInfo.displayName || "Bạn bè"}
                    role={friendInfo.role}
                    premiumLevel={friendInfo.premiumLevel}
                    premiumUntil={friendInfo.premiumUntil}
                    size={13}
                />
            </div>
        </div>
    );
}

export default function OnlineFriends() {
    const { friends, loading } = useFriends();
    const [onlineMap, setOnlineMap] = useState({});

    const handleStatusChange = useCallback((uid, isOnline) => {
        setOnlineMap(prev => {
            if (prev[uid] === isOnline) return prev;
            return { ...prev, [uid]: isOnline };
        });
    }, []);

    const hasOnlineFriends = Object.values(onlineMap).some(Boolean);

    return (
        <div className="online-friends-container">
            <h3 className="online-friends-title">Bạn bè đang hoạt động</h3>
            {loading ? (
                <div className="online-friends-loading">Đang tải...</div>
            ) : (
                <div className="online-friends-list">
                    {friends.map((f) => (
                        <OnlineFriendItem key={f.uid} uid={f.uid} onStatusChange={handleStatusChange} />
                    ))}
                    {!hasOnlineFriends && (
                        <div className="online-friends-empty">Không có ai trực tuyến</div>
                    )}
                </div>
            )}
        </div>
    );
}
