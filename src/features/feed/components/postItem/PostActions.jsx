import React from "react";
import { HeartFilled, HeartOutlined, MessageOutlined, ShareAltOutlined } from "@ant-design/icons";
import { useAuthStore } from "../../../auth/store/auth.store";
import { useModalStore } from "../../../../app/overlays/modal.store";

import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { likePost } from "../../api/post.api";
import { db } from "../../../../shared/firebase/firebaseClient";
import { message as antMessage } from "antd";
import LikeListModal from "../likeListModal/LikeListModal";

export default function PostActions({ post, showComments, onToggleComments, onPostUpdated }) {
    const user = useAuthStore((state) => state.user);
    const isPostDetailVisible = useModalStore((state) => state.isPostDetailVisible);
    const setIsPostDetailVisible = useModalStore((state) => state.setIsPostDetailVisible);
    const setActivePostId = useModalStore((state) => state.setActivePostId);

    const [showLikesModal, setShowLikesModal] = React.useState(false);

    const isLiked = (post.likes || []).includes(user?.uid);
    const likesCount = (post.likes || []).length;

    const handleLike = async () => {
        if (!user?.uid) return;

        const newLikes = isLiked
            ? (post.likes || []).filter((id) => id !== user.uid)
            : [...(post.likes || []), user.uid];

        onPostUpdated && onPostUpdated({
            id: post.id,
            likes: newLikes,
        });

        try {
            const data = await likePost(post.id, {
                displayName: user.displayName,
                photoURL: user.photoURL
            });
            if (!data.success) throw new Error(data.message);
        } catch (error) {
            onPostUpdated && onPostUpdated({
                id: post.id,
                likes: post.likes,
            });
            antMessage.error("Thao tác thất bại.");
        }
    };

    return (
        <div className="post-actions">
            {(likesCount > 0 || (post.commentsCount || 0) > 0) && (
                <div className="post-actions__stats">
                    {likesCount > 0 && (
                        <span
                            className="post-actions__stat"
                            onClick={() => setShowLikesModal(true)}
                            style={{ cursor: "pointer" }}
                        >
                            <HeartFilled style={{ color: "#ef4444" }} /> {likesCount} lượt thích
                        </span>
                    )}

                    {(post.commentsCount || 0) > 0 && (
                        <span className="post-actions__stat post-actions__stat--right">
                            {post.commentsCount} bình luận
                        </span>
                    )}
                </div>
            )}

            <div className="post-actions__divider" />

            <div className="post-actions__buttons">
                <button
                    id={`like-btn-${post.id}`}
                    className={`post-actions__btn ${isLiked ? "post-actions__btn--liked" : ""}`}
                    onClick={handleLike}
                >
                    {isLiked ? <HeartFilled /> : <HeartOutlined />}
                    <span>{isLiked ? "Đã thích" : "Thích"}</span>
                </button>

                <button
                    id={`comment-btn-${post.id}`}
                    className={`post-actions__btn ${showComments ? "post-actions__btn--active" : ""}`}
                    onClick={() => {
                        if (isPostDetailVisible) return;
                        setActivePostId(post.id);
                        setIsPostDetailVisible(true);
                        window.history.pushState(null, "", `/p/${post.id}`);
                    }}
                >
                    <MessageOutlined />
                    <span>Bình luận</span>
                </button>

                {/* <button className="post-actions__btn" title="Chia sẻ (sắp ra mắt)" disabled={true} style={{ cursor: "not-allowed" }}>
                    <ShareAltOutlined />
                    <span>Chia sẻ</span>
                </button> */}

            </div>

            <LikeListModal
                visible={showLikesModal}
                onClose={() => setShowLikesModal(false)}
                uids={post.likes}
            />
        </div>
    );
}
