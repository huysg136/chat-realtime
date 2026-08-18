import React, { useEffect, useState, useRef } from "react";
import { useAuthStore } from "../../../../stores/useAuthStore";
import PostItem from "../postItem/postItem";
import { getFeed, checkNewPosts } from "../../../../services/postService";
import { Spin } from "antd";
import { LoadingOutlined, ArrowUpOutlined } from "@ant-design/icons";
import "./postList.scss";

/**
 * Client-side Feed Cache — sessionStorage, TTL 2 phút.
 * Chỉ cache trang đầu của feed chính (không search, không filterUserId).
 *
 * Chiến lược SWR (Stale-While-Revalidate):
 *   1. Hiển thị tức thì từ cache (0ms latency).
 *   2. Gọi API ngầm — chỉ update state khi post IDs thay đổi.
 */
const FEED_CACHE_TTL_MS = 2 * 60 * 1000; // 2 phút
const FEED_CACHE_PREFIX = 'feed_main_';

const getFeedCache = (uid) => {
    try {
        const raw = sessionStorage.getItem(FEED_CACHE_PREFIX + uid);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (Date.now() - parsed.fetchedAt > FEED_CACHE_TTL_MS) return null;
        return parsed;
    } catch {
        return null;
    }
};

const setFeedCache = (uid, posts, lastCreatedAt, hasMore) => {
    try {
        sessionStorage.setItem(
            FEED_CACHE_PREFIX + uid,
            JSON.stringify({ posts, lastCreatedAt, hasMore, fetchedAt: Date.now() })
        );
    } catch { }
};

export const clearFeedCache = (uid) => {
    try {
        if (uid) sessionStorage.removeItem(FEED_CACHE_PREFIX + uid);
    } catch { }
};

export default function PostList({ searchQuery, filterUserId, refreshTrigger }) {
    const user = useAuthStore((state) => state.user);
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

    const fetchFeed = React.useCallback(async (skipCache = false) => {
        if (!user?.uid) return;

        const isMainFeed = !filterUserId && !searchQuery;

        // step 1: render từ cache
        if (isMainFeed && !skipCache) {
            const cached = getFeedCache(user.uid);
            if (cached) {
                setPosts(cached.posts);
                setLastCreatedAt(cached.lastCreatedAt);
                setHasMore(cached.hasMore);
                setNewPostCount(0);
                setLoading(false);
            }
        }

        // xóa cache cũ trước khi gọi API
        if (skipCache && isMainFeed) {
            clearFeedCache(user.uid);
        }

        // step 2: gọi api
        const hasCachedData = isMainFeed && !skipCache && !!getFeedCache(user.uid);
        // Nếu đã có data từ cache thì không hiện loading spinner
        if (!hasCachedData) setLoading(true);

        try {
            const data = await getFeed({
                filterUserId,
                searchQuery,
                skipCache,
                limit: 15
            });

            if (data.success) {
                // Chỉ update state nếu post IDs thực sự thay đổi (tránh re-render thừa)
                const newIds = data.posts.map(p => p.id).join(',');
                setPosts(prev => {
                    const oldIds = prev.map(p => p.id).join(',');
                    return newIds !== oldIds ? data.posts : prev;
                });
                setLastCreatedAt(data.lastCreatedAt);
                setHasMore(data.hasMore);
                setNewPostCount(0);
                lastFetchedAt.current = Date.now();

                // Lưu trang đầu của feed chính vào sessionStorage cache
                if (isMainFeed) {
                    setFeedCache(user.uid, data.posts, data.lastCreatedAt, data.hasMore);
                }
            }
        } catch (error) {
            console.error("Error fetching feed:", error);
        } finally {
            setLoading(false);
        }
    }, [user?.uid, filterUserId, searchQuery]);

    const fetchMore = React.useCallback(async () => {
        if (!user?.uid || !hasMore || isLazyLoading || searchQuery) return;

        setIsLazyLoading(true);
        try {
            const data = await getFeed({
                filterUserId,
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
                if (entries[0].isIntersecting && hasMore && !isLazyLoading && !loading && !searchQuery) {
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

    if (posts.length === 0) {
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

            {posts.map((post) => (
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

            {hasMore && !isLazyLoading && !searchQuery && (
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

            {!hasMore && !searchQuery && (
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

            {!hasMore && searchQuery && (
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