import React, { useContext, useState, useEffect } from 'react';
import { Avatar } from 'antd';
import { AppContext } from '../../../../context/appProvider';
import { AuthContext } from '../../../../context/authProvider';
import { useFriends } from '../../../../hooks/useFriends';
import UserBadge from '../../../common/userBadge';
import FriendButton from '../../../common/friendButton';
import './friendSuggestions.scss';

export default function FriendSuggestions() {
    const { user } = useContext(AuthContext);
    const { loading: friendsLoading } = useFriends();
    const [suggestedUsers, setSuggestedUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.uid) return;

        const fetchSuggestions = async () => {
            try {
                const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";
                const res = await fetch(`${API_BASE_URL}/api/friends/suggestions?uid=${user.uid}`);
                const data = await res.json();
                if (data.success) {
                    setSuggestedUsers(data.suggestions);
                }
            } catch (error) {
                console.error("Failed to fetch friend suggestions:", error);
            } finally {
                setLoading(false);
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