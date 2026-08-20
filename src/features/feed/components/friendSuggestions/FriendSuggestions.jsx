import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from 'antd';
import { useAuthStore } from '../../../auth/store/auth.store';
import { useFriends } from '../../../friends/hooks/useFriends';
import { getFriendSuggestions } from '../../../friends/api/friend.api';
import UserBadge from '../../../../shared/components/UserBadge';
import FriendButton from '../../../friends/components/FriendButton';
import './friendSuggestions.scss';

/**
 * Cache trong sessionStorage — tồn tại qua reload (F5), mất khi đóng tab.
 * Key: `friend_suggestions_<uid>`
 * TTL: 5 phút — tương đương Redis SUGGESTIONS TTL phía backend.
 *
 * Chiến lược: SWR (Stale-While-Revalidate)
 *   1. Render tức thì từ sessionStorage (0ms latency).
 *   2. Gọi API ngầm để revalidate — chỉ update state khi data thực sự thay đổi.
 */
const SESSION_CACHE_TTL_MS = 5 * 60 * 1000; // 5 phút
const CACHE_KEY_PREFIX = 'friend_suggestions_';

const getCache = (uid) => {
    try {
        const raw = sessionStorage.getItem(CACHE_KEY_PREFIX + uid);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (Date.now() - parsed.fetchedAt > SESSION_CACHE_TTL_MS) return null;
        return parsed;
    } catch {
        return null;
    }
};

const setCache = (uid, suggestions) => {
    try {
        sessionStorage.setItem(
            CACHE_KEY_PREFIX + uid,
            JSON.stringify({ suggestions, fetchedAt: Date.now() })
        );
    } catch { }
};

export const clearFriendSuggestionsCache = (uid) => {
    try {
        if (uid) sessionStorage.removeItem(CACHE_KEY_PREFIX + uid);
    } catch { }
};

export default function FriendSuggestions() {
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const { loading: friendsLoading } = useFriends();
    const [suggestedUsers, setSuggestedUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Dedupe guard: ngăn React StrictMode gọi API 2 lần đồng thời
    const isFetchingRef = useRef(false);

    useEffect(() => {
        if (!user?.uid) return;

        // step 1: render từ cache
        const cached = getCache(user.uid);
        if (cached) {
            setSuggestedUsers(cached.suggestions);
            setLoading(false);
        }

        // step 2: gọi api ngầm để lấy data mới nhất
        // silent = true  → đã có cache, gọi âm thầm, không hiện spinner
        // silent = false → chưa có cache, gọi bình thường (hiện spinner)
        const silent = !!cached;

        if (isFetchingRef.current) return;
        isFetchingRef.current = true;

        const fetchSuggestions = async () => {
            try {
                const data = await getFriendSuggestions(user.uid);
                if (data.success) {
                    // Chỉ update state & cache nếu danh sách uid thực sự thay đổi
                    const newIds = data.suggestions.map(u => u.uid).join(',');
                    const oldIds = (cached?.suggestions || []).map(u => u.uid).join(',');
                    if (newIds !== oldIds) {
                        setSuggestedUsers(data.suggestions);
                        setCache(user.uid, data.suggestions);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch friend suggestions:", error);
            } finally {
                // Chỉ tắt spinner nếu chưa tắt ở bước cache
                if (!silent) setLoading(false);
                isFetchingRef.current = false;
            }
        };

        fetchSuggestions();
    }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

    // ẩn component nếu data null
    if ((loading && suggestedUsers.length === 0) || friendsLoading || suggestedUsers.length === 0) return null;

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

                            {u.username && (
                                <span className="friend-suggestion-item__username">
                                    @{u.username}
                                </span>
                            )}

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
