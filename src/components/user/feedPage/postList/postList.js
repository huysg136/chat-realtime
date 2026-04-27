import React, { useEffect, useState, useContext, useRef } from "react";
import {
    collection, query, orderBy, onSnapshot,
    where, Timestamp,
} from "firebase/firestore";
import { db } from "../../../../firebase/config";
import { AuthContext } from "../../../../context/authProvider";
import { AppContext } from "../../../../context/appProvider";
import { useFriends } from "../../../../hooks/useFriends";
import PostItem from "../postItem/postItem";
import { Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import "./postList.scss";

import "./postList.scss";

// Lấy bài trong 7 ngày gần nhất
const FEED_WINDOW_DAYS = 7;
const INITIAL_VISIBLE_POSTS = 4;
const INCREMENT_VISIBLE_POSTS = 3;

const GRAVITY = 1.8; // Tăng lên 1.8 (chuẩn hơn, bài cũ chìm nhanh hơn)

function computeScore({ post, userUid, friendUids, author }) {
    // E — Engagement
    const likesCount = post.likes?.length || 0;
    const commentsCount = post.commentsCount || 0;
    const E = likesCount * 1 + commentsCount * 3;

    // A — Affinity (phân tầng rõ hơn)
    let A = 0;
    if (post.uid === userUid) A = 15;
    else if (friendUids.includes(post.uid)) A = 8;

    // P — Privilege (giảm xuống, không lấn át E)
    let P = 0;
    if (author?.role === "admin") P = 12;
    else if (author?.role === "moderator") P = 8;
    else if (author?.premiumLevel === "max") P = 6;
    else if (author?.premiumLevel === "pro") P = 4;
    else if (author?.premiumLevel === "lite") P = 2;

    // T — Thời gian tính bằng giờ
    const postTimeMs = post.createdAt?.seconds
        ? post.createdAt.seconds * 1000
        : Date.now();
    const T = Math.max(0, (Date.now() - postTimeMs) / (1000 * 60 * 60));

    // Freshness boost: bài < 1 giờ tuổi được nhân 1.3
    const freshnessMultiplier = T < 1 ? 1.3 : 1.0;

    const score = ((E + A + P) / Math.pow(T + 2, GRAVITY)) * freshnessMultiplier;
    return score;
}

export default function PostList({ searchQuery, filterUserId }) {
    const { user } = useContext(AuthContext);
    const { users } = useContext(AppContext);
    const { friends, loading: friendsLoading } = useFriends();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_POSTS);
    const [isLazyLoading, setIsLazyLoading] = useState(false);

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

    // Cache score kèm timestamp để biết khi nào cần tính lại
    const scoreCacheRef = useRef({}); // { [postId]: { score, cachedAt } }

    // Re-sort định kỳ mỗi 3 phút để T decay đúng dù Firestore không có snapshot mới
    const rawPostsRef = useRef([]);
    const friendUidsRef = useRef([]);

    useEffect(() => {
        friendUidsRef.current = friends.map((f) => f.uid).filter(Boolean);
    }, [friends]);

    const sortAndSet = (rawPosts) => {
        const currentUsers = usersRef.current;
        const friendUids = friendUidsRef.current;
        const cache = scoreCacheRef.current;
        const now = Date.now();

        const scored = rawPosts
            .filter((post) => {
                const isAuthor = post.uid === user.uid;
                const isFriend = friendUids.includes(post.uid);

                if (post.privacy === "private") {
                    return isAuthor;
                }
                if (post.privacy === "friends") {
                    return isAuthor || isFriend;
                }
                return true; // Default or 'public'
            })
            .map((post) => {
                const cached = cache[post.id];

                if (!cached) {
                    const author = currentUsers.find((u) => u.uid === post.uid) || {};
                    const score = computeScore({ post, userUid: user.uid, friendUids, author });
                    cache[post.id] = { score, cachedAt: now };
                    return { ...post, _score: score };
                }

                return { ...post, _score: cached.score };
            });

        if (filterUserId) {
            scored.sort((a, b) => {
                const aTime = a.createdAt?.seconds ?? 0;
                const bTime = b.createdAt?.seconds ?? 0;
                return bTime - aTime;
            });
        } else {
            scored.sort((a, b) => {
                if (Math.abs(b._score - a._score) > 0.001) return b._score - a._score;
                const aTime = a.createdAt?.seconds ?? 0;
                const bTime = b.createdAt?.seconds ?? 0;
                return bTime - aTime;
            });
        }

        setPosts(scored);
    };

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
        if (!user?.uid || friendsLoading) return;

        let q;
        if (filterUserId) {
            q = query(
                collection(db, "posts"),
                where("uid", "==", filterUserId),
                orderBy("createdAt", "desc")
            );
        } else {
            // Query theo time window 7 ngày thay vì limit(100)
            const windowStart = Timestamp.fromMillis(
                Date.now() - FEED_WINDOW_DAYS * 24 * 60 * 60 * 1000
            );
            q = query(
                collection(db, "posts"),
                where("createdAt", ">=", windowStart),
                orderBy("createdAt", "desc")
            );
        }

        const unsub = onSnapshot(q, (snap) => {
            const rawPosts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            rawPostsRef.current = rawPosts;

            sortAndSet(rawPosts);
            setLoading(false);
        });

        return () => unsub();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.uid, friends, friendsLoading, filterUserId]);



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
            {filteredPosts.slice(0, visibleCount).map((post) => (
                <PostItem key={post.id} post={post} />
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
                        scoreCacheRef.current = {};
                        sortAndSet(rawPostsRef.current);
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