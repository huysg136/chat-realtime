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

export default function PostList() {
    const { user } = useContext(AuthContext);
    const { users } = useContext(AppContext);
    const { friends, loading: friendsLoading } = useFriends();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    const usersRef = useRef(users);
    useEffect(() => { usersRef.current = users; }, [users]);

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

        const scored = rawPosts.map((post) => {
            const cached = cache[post.id];

            if (!cached) {
                const author = currentUsers.find((u) => u.uid === post.uid) || {};
                const score = computeScore({ post, userUid: user.uid, friendUids, author });
                cache[post.id] = { score, cachedAt: now };
                return { ...post, _score: score };
            }

            return { ...post, _score: cached.score };
        });

        scored.sort((a, b) => {
            if (Math.abs(b._score - a._score) > 0.001) return b._score - a._score;
            // Tiebreak: bài mới hơn lên trên
            const aTime = a.createdAt?.seconds ?? 0;
            const bTime = b.createdAt?.seconds ?? 0;
            return bTime - aTime;
        });

        setPosts(scored);
    };

    useEffect(() => {
        if (!user?.uid || friendsLoading) return;

        // Query theo time window 7 ngày thay vì limit(100)
        // → bài viral 3 ngày trước vẫn có cơ hội xuất hiện
        const windowStart = Timestamp.fromMillis(
            Date.now() - FEED_WINDOW_DAYS * 24 * 60 * 60 * 1000
        );

        const q = query(
            collection(db, "posts"),
            where("createdAt", ">=", windowStart),
            orderBy("createdAt", "desc")
        );

        const unsub = onSnapshot(q, (snap) => {
            const rawPosts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            rawPostsRef.current = rawPosts;

            sortAndSet(rawPosts);
            setLoading(false);
        });

        return () => unsub();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.uid, friends, friendsLoading]);

    if (loading || friendsLoading) {
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
                <div className="post-list__empty-icon">🌟</div>
                <h3>Chưa có bài viết nào</h3>
                <p>Kết bạn thêm hoặc hãy là người đầu tiên đăng bài!</p>
            </div>
        );
    }

    return (
        <div className="post-list">
            {posts.map((post) => (
                <PostItem key={post.id} post={post} />
            ))}
        </div>
    );
}