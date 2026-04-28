import React, { useEffect, useState, useContext, useRef } from "react";
import { AuthContext } from "../../../../context/authProvider";
import { AppContext } from "../../../../context/appProvider";
import { useFriends } from "../../../../hooks/useFriends";
import PostItem from "../postItem/postItem";
import { Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import "./postList.scss";

// Lấy bài trong 7 ngày gần nhất
const FEED_WINDOW_DAYS = 7;
const INITIAL_VISIBLE_POSTS = 4;
const INCREMENT_VISIBLE_POSTS = 3;

export default function PostList({ searchQuery, filterUserId, refreshTrigger }) {
    const { user } = useContext(AuthContext);
    const { users } = useContext(AppContext);
    const { friends, loading: friendsLoading } = useFriends();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_POSTS);
    const [isLazyLoading, setIsLazyLoading] = useState(false);
    const [newPostCount, setNewPostCount] = useState(0);

    // Lưu timestamp lần fetch cuối để so sánh
    const lastFetchedAt = useRef(Date.now());
    const pollTimerRef = useRef(null);
    const isTabVisible = useRef(true);
    const POLL_INTERVAL = 60_000; // 60 giây

    const handlePostUpdated = (updatedPost) => {
        setPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? { ...p, ...updatedPost } : p)));
    };

    const handlePostDeleted = (deletedPostId) => {
        setPosts((prev) => prev.filter((p) => p.id !== deletedPostId));
    };


    useEffect(() => {
        setVisibleCount(INITIAL_VISIBLE_POSTS);
    }, [filterUserId, searchQuery]);

    const usersRef = useRef(users);
    useEffect(() => { usersRef.current = users; }, [users]);

    const filteredPosts = posts.filter((post) => {
        if (!searchQuery) return true;

        const contentMatch = post.content?.toLowerCase().includes(searchQuery.toLowerCase());

        const currentUsers = usersRef.current || [];
        const author = currentUsers.find((u) => u.uid === post.uid) || {};
        const authorName = author.displayName || post.displayName || "";
        const authorMatch = authorName.toLowerCase().includes(searchQuery.toLowerCase());

        return contentMatch || authorMatch;
    });

    const friendUidsRef = useRef([]);

    useEffect(() => {
        friendUidsRef.current = friends.map((f) => f.uid).filter(Boolean);
    }, [friends]);

    const fetchFeed = React.useCallback(async (skipCache = false) => {
        if (!user?.uid) return;
        setLoading(true);
        try {
            const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
            const url = new URL(`${API_BASE_URL}/api/posts/feed`);
            url.searchParams.append("userUid", user.uid);
            if (filterUserId) url.searchParams.append("filterUserId", filterUserId);
            if (searchQuery) url.searchParams.append("searchQuery", searchQuery);
            if (skipCache) url.searchParams.append("skipCache", "true");

            const response = await fetch(url.toString());
            const data = await response.json();

            if (data.success) {
                setPosts(data.posts);
                setNewPostCount(0); // reset banner
                lastFetchedAt.current = Date.now();
            }
        } catch (error) {
            console.error("Error fetching feed:", error);
        } finally {
            setLoading(false);
        }
    }, [user?.uid, filterUserId, searchQuery]);

    // Chỉ check nhẹ xem có bài mới không, KHÔNG fetch toàn bộ feed
    const checkForNewPosts = React.useCallback(async () => {
        // Không poll khi đang search hoặc xem profile hoặc tab bị ẩn
        if (!user?.uid || filterUserId || searchQuery || !isTabVisible.current) return;
        try {
            const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
            const url = new URL(`${API_BASE_URL}/api/posts/feed/check-new`);
            url.searchParams.append("userUid", user.uid);
            url.searchParams.append("since", lastFetchedAt.current.toString());

            const res = await fetch(url.toString());
            const data = await res.json();
            if (data.success && data.count > 0) {
                setNewPostCount(data.count);
            }
        } catch (err) {
            console.error("Error checking for new posts:", err);
        }
    }, [user?.uid, filterUserId, searchQuery]);

    // Dừng/tiếp tục poll khi tab bị ẩn
    useEffect(() => {
        const handleVisibility = () => {
            isTabVisible.current = !document.hidden;
            // Tab active trở lại → check ngay
            if (!document.hidden) checkForNewPosts();
        };
        document.addEventListener("visibilitychange", handleVisibility);
        return () => document.removeEventListener("visibilitychange", handleVisibility);
    }, [checkForNewPosts]);

    // Setup polling
    useEffect(() => {
        // Không poll khi search/profile view
        if (filterUserId || searchQuery) return;

        pollTimerRef.current = setInterval(checkForNewPosts, POLL_INTERVAL);
        return () => clearInterval(pollTimerRef.current);
    }, [checkForNewPosts, filterUserId, searchQuery, POLL_INTERVAL]);


    useEffect(() => {
        const handleScroll = () => {
            const scrollableParent = document.querySelector('.profile-container') || document.querySelector('.feed-page');
            let isBottom = false;

            if (scrollableParent) {
                const { scrollTop, scrollHeight, clientHeight } = scrollableParent;
                if (scrollTop + clientHeight >= scrollHeight - 150) {
                    isBottom = true;
                }
            } else {
                const scrollY = window.scrollY;
                const windowHeight = window.innerHeight;
                const documentHeight = document.documentElement.scrollHeight;
                if (scrollY + windowHeight >= documentHeight - 150) {
                    isBottom = true;
                }
            }

            if (isBottom && visibleCount < filteredPosts.length && !isLazyLoading) {
                setIsLazyLoading(true);
                setTimeout(() => {
                    setVisibleCount((prev) => prev + INCREMENT_VISIBLE_POSTS);
                    setIsLazyLoading(false);
                }, 800);
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        const scrollableParent = document.querySelector('.profile-container') || document.querySelector('.feed-page');
        if (scrollableParent) {
            scrollableParent.addEventListener('scroll', handleScroll, { passive: true });
        }

        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (scrollableParent) {
                scrollableParent.removeEventListener('scroll', handleScroll);
            }
        };
    }, [visibleCount, filteredPosts.length, isLazyLoading]);

    useEffect(() => {
        if (!friendsLoading) {
            fetchFeed();
        }
    }, [fetchFeed, friendsLoading, refreshTrigger]);




    if (loading || friendsLoading) {
        return (
            <div className="post-list post-list--loading">
                <Spin indicator={<LoadingOutlined spin />} size="large" />
                <span>Đang tải bài viết...</span>
            </div>
        );
    }

    if (filteredPosts.length === 0) {
        return (
            <div className="post-list post-list--empty">
                <h3>Không tìm thấy bài viết nào</h3>
                <p>
                    {searchQuery
                        ? `Không có kết quả cho "${searchQuery}"`
                        : filterUserId
                            ? filterUserId === user?.uid
                                ? "Bạn chưa có bài viết nào. Hãy chia sẻ khoảnh khắc đầu tiên nhé!"
                                : "Người dùng này chưa đăng bài viết nào."
                            : "Kết bạn thêm hoặc hãy là người đầu tiên đăng bài!"}
                </p>
            </div>
        );
    }

    return (
        <div className="post-list">
            {/* Banner bài mới — user tự quyết định có load không */}
            {newPostCount > 0 && !filterUserId && !searchQuery && (
                <button
                    className="new-posts-banner"
                    onClick={() => {
                        fetchFeed(true); // skipCache = true
                        const feedPage = document.querySelector('.feed-page');
                        if (feedPage) {
                            feedPage.scrollTo({ top: 0, behavior: 'smooth' });
                        } else {
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                    }}
                >
                    <span className="banner-icon">↑</span> {newPostCount} bài viết mới
                </button>
            )}

            {filteredPosts.slice(0, visibleCount).map((post) => (
                <PostItem key={post.id} post={post} onPostUpdated={handlePostUpdated} onPostDeleted={handlePostDeleted} />
            ))}

            {isLazyLoading && (
                <div className="lazy-load-spinner" style={{ textAlign: 'center', padding: '15px' }}>
                    <Spin indicator={<LoadingOutlined spin />} size="default" />
                    <span style={{ marginLeft: '10px', color: '#65676b', fontSize: '14px' }}>Đang tải thêm bài viết...</span>
                </div>
            )}

            {visibleCount >= filteredPosts.length && !filterUserId && (
                <div className="feed-end-card">
                    <h4>Bạn đã đọc hết rồi</h4>
                    <p>Không còn bài viết nào trong {FEED_WINDOW_DAYS} ngày gần đây.</p>
                    <button className="feed-end-card__reload-btn" onClick={() => {
                        fetchFeed();

                        const feedPage = document.querySelector('.feed-page');
                        if (feedPage) {
                            feedPage.scrollTo({ top: 0, behavior: 'smooth' });
                        } else {
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                    }}>
                        Tải lại bảng tin
                    </button>
                </div>
            )}

            {visibleCount >= filteredPosts.length && filterUserId && (
                <div className="profile-feed-end" style={{ textAlign: 'center', padding: '20px 0', color: '#8c8c8c', fontStyle: 'italic' }}>
                    <span>Đã xem hết bài viết của người dùng này</span>
                </div>
            )}
        </div>
    );
}