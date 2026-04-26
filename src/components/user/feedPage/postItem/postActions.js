import React, { useContext } from "react";
import { HeartFilled, HeartOutlined, MessageOutlined, ShareAltOutlined } from "@ant-design/icons";
import { AuthContext } from "../../../../context/authProvider";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "../../../../firebase/config";
import { message as antMessage } from "antd";
import LikeListModal from "../likeListModal/likeListModal";

export default function PostActions({ post, showComments, onToggleComments }) {
    const { user } = useContext(AuthContext);
    const [showLikesModal, setShowLikesModal] = React.useState(false);

    const isLiked = (post.likes || []).includes(user?.uid);
    const likesCount = (post.likes || []).length;

    const handleLike = async () => {
        if (!user?.uid) return;
        const postRef = doc(db, "posts", post.id);
        try {
            if (isLiked) {
                await updateDoc(postRef, { likes: arrayRemove(user.uid) });
            } else {
                await updateDoc(postRef, { likes: arrayUnion(user.uid) });
            }
        } catch {
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
                            <HeartFilled style={{ color: "#ef4444" }} /> {likesCount}
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
                    {/* <span>{isLiked ? "Đã thích" : "Thích"}</span> */}
                </button>

                <button
                    id={`comment-btn-${post.id}`}
                    className={`post-actions__btn ${showComments ? "post-actions__btn--active" : ""}`}
                    onClick={onToggleComments}
                >
                    <MessageOutlined />
                    {/* <span>Bình luận</span> */}
                </button>

                {/* <button className="post-actions__btn" title="Chia sẻ (sắp ra mắt)">
                    <ShareAltOutlined />
                    <span>Chia sẻ</span>
                    </button> */
                }
            </div>

            <LikeListModal
                visible={showLikesModal}
                onClose={() => setShowLikesModal(false)}
                uids={post.likes}
            />
        </div>
    );
}
