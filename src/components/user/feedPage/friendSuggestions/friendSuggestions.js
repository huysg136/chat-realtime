import React, { useContext, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from 'antd';
import { AuthContext } from '../../../../context/authProvider';
import { useFriends } from '../../../../hooks/useFriends';
import { getFriendSuggestions } from '../../../../services/friendService';
import UserBadge from '../../../common/userBadge';
import FriendButton from '../../../common/friendButton';
import './friendSuggestions.scss';

/**
 * In-memory session cache — tồn tại suốt vòng đời tab (không reset khi re-render).
 * Key: uid, Value: { suggestions, fetchedAt }
 * TTL: 5 phút — tương đương Redis SUGGESTIONS TTL phía backend.
 */
const SESSION_CACHE = new Map();
const SESSION_CACHE_TTL_MS = 5 * 60 * 1000; // 5 phút

export default function FriendSuggestions() {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const { loading: friendsLoading } = useFriends();
    const [suggestedUsers, setSuggestedUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Dedupe guard: ngăn React StrictMode gọi API 2 lần đồng thời
    const isFetchingRef = useRef(false);

    useEffect(() => {
        if (!user?.uid) return;

        // Kiểm tra session cache còn hạn không
        const cached = SESSION_CACHE.get(user.uid);
        if (cached && Date.now() - cached.fetchedAt < SESSION_CACHE_TTL_MS) {
            setSuggestedUsers(cached.suggestions);
            setLoading(false);
            return;
        }

        // Tránh gọi API đồng thời (StrictMode mount 2 lần)
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;

        const fetchSuggestions = async () => {
            try {
                const data = await getFriendSuggestions(user.uid);
                if (data.success) {
                    setSuggestedUsers(data.suggestions);
                    // Lưu vào session cache
                    SESSION_CACHE.set(user.uid, {
                        suggestions: data.suggestions,
                        fetchedAt: Date.now(),
                    });
                }
            } catch (error) {
                console.error("Failed to fetch friend suggestions:", error);
            } finally {
                setLoading(false);
                isFetchingRef.current = false;
            }
        };

        fetchSuggestions();
    }, [user?.uid]);

    if (loading || friendsLoading || suggestedUsers.length === 0) return null;

    return (
        <div className="friend-suggestions-container">
            <h3 className="friend-suggestions-title">Gợi ý kết bạn</h3>
            <div className="friend-suggestions-list">
                {suggestedUsers.map((u) => (
                    <div className="friend-suggestion-item" key={u.uid} onClick={() => navigate(`/profile/${u.uid}`)}>
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

                        <div className="friend-suggestion-item__action" onClick={(e) => e.stopPropagation()}>
                            <FriendButton targetUid={u.uid} size="small" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}