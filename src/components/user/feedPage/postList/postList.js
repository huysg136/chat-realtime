import React, { useEffect, useState, useContext, useRef } from "react";
import { AuthContext } from "../../../../context/authProvider";
import { AppContext } from "../../../../context/appProvider";
import PostItem from "../postItem/postItem";
import { getFeed, checkNewPosts } from "../../../../services/postService";
import { Spin } from "antd";
import { LoadingOutlined, ArrowUpOutlined } from "@ant-design/icons";
import "./postList.scss";

export default function PostList({ searchQuery, filterUserId, refreshTrigger }) {
    const { user } = useContext(AuthContext);
    const { users } = useContext(AppContext);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isLazyLoading, setIsLazyLoading] = useState(false);
    const [newPostCount, setNewPostCount] = useState(0);
    const [lastCreatedAt, setLastCreatedAt] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [showScrollTop, setShowScrollTop] = useState(false);

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
        // Reset feed state when filter or search changes
        setLastCreatedAt(null);
        setHasMore(true);
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



    const fetchFeed = React.useCallback(async (skipCache = false) => {
        if (!user?.uid) return;
        setLoading(true);
        try {
            const data = await getFeed({
                filterUserId,
                searchQuery,
                skipCache,
                limit: 15
            });

            if (data.success) {
                setPosts(data.posts);
                setLastCreatedAt(data.lastCreatedAt);
                setHasMore(data.hasMore);
                setNewPostCount(0); // reset banner
                lastFetchedAt.current = Date.now();
            }
        } catch (error) {
            console.error("Error fetching feed:", error);
        } finally {
            setLoading(false);
        }
    }, [user?.uid, filterUserId, searchQuery]);

    const fetchMore = React.useCallback(async () => {
        // Only paginate on main feed (no search/filter) as per requirements
        if (!user?.uid || !hasMore || isLazyLoading || filterUserId || searchQuery) return;

        setIsLazyLoading(true);
        try {
            const data = await getFeed({
                lastCreatedAt,
                limit: 15
            });

            if (data.success) {
                setPosts((prev) => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const newPosts = data.posts.filter(p => !existingIds.has(p.id));
                    return [...prev, ...newPosts];
                });
                setLastCreatedAt(data.lastCreatedAt);
                setHasMore(data.hasMore);
            }
        } catch (error) {
            console.error("Error fetching more posts:", error);
        } finally {
            setIsLazyLoading(false);
        }
    }, [user?.uid, hasMore, isLazyLoading, lastCreatedAt, filterUserId, searchQuery]);

    // Chỉ check nhẹ xem có bài mới không, KHÔNG fetch toàn bộ feed
    const checkForNewPosts = React.useCallback(async () => {
        // Không poll khi đang search hoặc xem profile hoặc tab bị ẩn
        if (!user?.uid || filterUserId || searchQuery || !isTabVisible.current) return;
        try {
            const data = await checkNewPosts({
                since: lastFetchedAt.current.toString(),
            });
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
            const feedPage = document.querySelector('.feed-page');
            const profilePage = document.querySelector('.profile-container');
            const target = feedPage || profilePage || window;

            let scrollTop = 0;
            if (target === window) {
                scrollTop = window.pageYOffset;
            } else {
                scrollTop = target.scrollTop;
            }

            setShowScrollTop(scrollTop > 500);
        };

        const feedPage = document.querySelector('.feed-page');
        const profilePage = document.querySelector('.profile-container');
        const target = feedPage || profilePage || window;

        if (target === window) {
            window.addEventListener('scroll', handleScroll);
        } else {
            target.addEventListener('scroll', handleScroll);
        }

        return () => {
            if (target === window) {
                window.removeEventListener('scroll', handleScroll);
            } else {
                target.removeEventListener('scroll', handleScroll);
            }
        };
    }, []);

    const scrollToTop = () => {
        const feedPage = document.querySelector('.feed-page');
        const profilePage = document.querySelector('.profile-container');
        const target = feedPage || profilePage || window;

        if (target === window) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            target.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const observerTarget = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isLazyLoading && !loading && !filterUserId && !searchQuery) {
                    fetchMore();
                }
            },
            { threshold: 0.1, rootMargin: "200px" }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => {
            if (observerTarget.current) {
                // eslint-disable-next-line react-hooks/exhaustive-deps
                observer.unobserve(observerTarget.current);
            }
        };
    
    }, [hasMore, isLazyLoading, loading, fetchMore, filterUserId, searchQuery]);

    useEffect(() => {
        fetchFeed();
    }, [fetchFeed, refreshTrigger]);




    if (loading) {
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

            {filteredPosts.map((post) => (
                <PostItem key={post.id} post={post} onPostUpdated={handlePostUpdated} onPostDeleted={handlePostDeleted} />
            ))}

            {/* Sentinel for IntersectionObserver */}
            <div ref={observerTarget} style={{ height: '20px' }} />

            {isLazyLoading && (
                <div className="lazy-load-spinner" style={{ textAlign: 'center', padding: '15px' }}>
                    <Spin indicator={<LoadingOutlined spin />} size="default" />
                    <span style={{ marginLeft: '10px', color: '#65676b', fontSize: '14px' }}>Đang tải thêm bài viết...</span>
                </div>
            )}

            {/* Nút tải thêm thủ công nếu tự động tải không kích hoạt hoặc dự phòng */}
            {hasMore && !isLazyLoading && !filterUserId && !searchQuery && (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                    <button
                        className="load-more-btn"
                        onClick={fetchMore}
                        style={{
                            padding: '8px 24px',
                            borderRadius: '20px',
                            border: '1px solid #ddd',
                            background: '#fff',
                            cursor: 'pointer',
                            color: '#65676b',
                            fontWeight: '600'
                        }}
                    >
                        Xem thêm bài viết cũ
                    </button>
                </div>
            )}

            {!hasMore && !filterUserId && !searchQuery && (
                <div className="feed-end-card">
                    <h4>Bạn đã đọc hết rồi</h4>
                    <p>Không còn bài viết nào để hiển thị.</p>
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

            {!hasMore && (filterUserId || searchQuery) && (
                <div className="profile-feed-end" style={{ textAlign: 'center', padding: '20px 0', color: '#8c8c8c', fontStyle: 'italic' }}>
                    <span>Đã xem hết bài viết</span>
                </div>
            )}

            {/* Nút Scroll to Top */}
            <button
                className={`scroll-top-btn ${showScrollTop ? 'scroll-top-btn--visible' : ''}`}
                onClick={scrollToTop}
                title="Lên đầu trang"
            >
                <ArrowUpOutlined />
            </button>
        </div>
    );
}