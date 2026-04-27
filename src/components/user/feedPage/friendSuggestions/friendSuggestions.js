import React, { useContext, useMemo } from 'react';
import { Avatar } from 'antd';
import { AppContext } from '../../../../context/appProvider';
import { AuthContext } from '../../../../context/authProvider';
import { useFriends } from '../../../../hooks/useFriends';
import useFirestore from '../../../../hooks/useFirestore';
import UserBadge from '../../../common/userBadge';
import FriendButton from '../../../common/friendButton';
import './friendSuggestions.scss';

function computeSuggestionScore(candidate, mutualCount, mutualGroupsCount, hasMessaged) {
    let score = 0;

    // 1. Bạn chung (10đ mỗi người)
    score += mutualCount * 10;

    // 2. Nhóm chung (4đ mỗi nhóm tối đa 3 nhóm)
    const cappedGroups = Math.min(mutualGroupsCount, 3);
    score += cappedGroups * 4;

    // 3. Đã từng nhắn tin riêng (5đ)
    if (hasMessaged) score += 5;

    // 4. Độ ưu tiên Premium
    const premiumScores = { max: 4, pro: 3, lite: 2 };
    score += premiumScores[candidate.premiumLevel] || 0;

    // 5. Vai trò hệ thống
    const roleScores = { admin: 3, moderator: 2 };
    score += roleScores[candidate.role] || 0;

    // 6. Random noise (để danh sách luôn tươi mới)
    score += Math.random() * 1.5;

    return score;
}

export default function FriendSuggestions() {
    const { users, rooms } = useContext(AppContext);
    const { user } = useContext(AuthContext);
    const { friends, receivedRequests, sentRequests, loading } = useFriends();
    const allFriendships = useFirestore("friends");

    const suggestedUsers = useMemo(() => {
        if (!user?.uid || !users?.length) return [];

        const myFriendsSet = new Set(friends.map(f => f.uid));
        const excludedUids = new Set([
            user.uid,
            ...myFriendsSet,
            ...receivedRequests.map(r => r.fromUid),
            ...sentRequests.map(r => r.toUid),
        ]);

        const globalFriendshipMap = new Map();
        allFriendships.forEach((f) => {
            const pair = f.users || [];
            if (pair.length === 2) {
                const [u1, u2] = pair;
                if (!globalFriendshipMap.has(u1)) globalFriendshipMap.set(u1, new Set());
                if (!globalFriendshipMap.has(u2)) globalFriendshipMap.set(u2, new Set());
                globalFriendshipMap.get(u1).add(u2);
                globalFriendshipMap.get(u2).add(u1);
            }
        });

        return users
            .filter(u => !excludedUids.has(u.uid) && u.displayName)
            .map(u => {
                const candidateFriends = globalFriendshipMap.get(u.uid) || new Set();
                let mutualCount = 0;
                candidateFriends.forEach(uid => {
                    if (myFriendsSet.has(uid)) {
                        mutualCount++;
                    }
                });

                let mutualGroupsCount = 0;
                let hasMessaged = false;

                if (Array.isArray(rooms)) {
                    rooms.forEach(room => {
                        const memberUids = Array.isArray(room.members)
                            ? room.members.map((m) => (typeof m === "string" ? m : m?.uid)).filter(Boolean)
                            : [];

                        if (memberUids.includes(u.uid)) {
                            if (room.type === 'group') {
                                mutualGroupsCount++;
                            } else if (room.type === 'private' && room.lastMessage) {
                                hasMessaged = true;
                            }
                        }
                    });
                }

                const score = computeSuggestionScore(u, mutualCount, mutualGroupsCount, hasMessaged);

                return {
                    ...u,
                    _score: score,
                    _mutualCount: mutualCount
                };
            })
            .sort((a, b) => b._score - a._score)
            .slice(0, 5);

    }, [users, user?.uid, friends, receivedRequests, sentRequests, allFriendships]);

    if (loading || suggestedUsers.length === 0) return null;

    return (
        <div className="friend-suggestions-container">
            <h3 className="friend-suggestions-title">Gợi ý kết bạn</h3>
            <div className="friend-suggestions-list">
                {suggestedUsers.map((u) => (
                    <div className="friend-suggestion-item" key={u.uid}>
                        <Avatar src={u.photoURL} size={36}>
                            {(u.displayName || "?").charAt(0).toUpperCase()}
                        </Avatar>

                        <div className="friend-suggestion-item__info">
                            <div className="friend-suggestion-item__name">
                                <UserBadge
                                    displayName={u.displayName || "Người dùng"}
                                    role={u.role}
                                    premiumLevel={u.premiumLevel}
                                    premiumUntil={u.premiumUntil}
                                    size={13}
                                />
                            </div>

                            {/* Hiển thị username */}
                            {u.username && (
                                <span className="friend-suggestion-item__username">
                                    @{u.username}
                                </span>
                            )}

                            {/* FIX: Bây giờ _mutualCount đã tồn tại */}
                            {u._mutualCount > 0 && (
                                <span className="friend-suggestion-item__mutual">
                                    {u._mutualCount} bạn chung
                                </span>
                            )}
                        </div>

                        <div className="friend-suggestion-item__action">
                            <FriendButton targetUid={u.uid} size="small" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}