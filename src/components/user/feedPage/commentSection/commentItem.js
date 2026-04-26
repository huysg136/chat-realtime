import React, { useState, useContext } from "react";
import { Avatar, Tooltip } from "antd";
import { HeartFilled, HeartOutlined } from "@ant-design/icons";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "../../../../firebase/config";
import { AuthContext } from "../../../../context/authProvider";
import { AppContext } from "../../../../context/appProvider";
import { deleteDocument } from "../../../../firebase/services";
import CommentInput from "./commentInput";
import LikeListModal from "../likeListModal/likeListModal";
import UserBadge from "../../../common/userBadge";

const defaultAvatar = "https://images.spiderum.com/sp-images/9ae85f405bdf11f0a7b6d5c38c96eb0e.jpeg";

function toTimestamp(createdAt) {
    if (!createdAt) return new Date();
    if (createdAt.seconds) return new Date(createdAt.seconds * 1000);
    if (createdAt.toMillis) return new Date(createdAt.toMillis());
    if (createdAt instanceof Date) return createdAt;
    return new Date(createdAt);
}

export default function CommentItem({ comment, postId, repliesMap = {}, rootParentId = null }) {
    const { user } = useContext(AuthContext);
    const { users } = useContext(AppContext);
    
    const author = users.find(u => u.uid === comment.uid) || {};
    const replies = repliesMap[comment.id] || [];
    const isLiked = (comment.likes || []).includes(user?.uid);
    const [showReplyInput, setShowReplyInput] = useState(false);
    const [showReplies, setShowReplies] = useState(false);
    const [showLikesModal, setShowLikesModal] = useState(false);

    // Gán ID của bình luận gốc. Nếu không có rootParentId truyền vào (tức là bình luận này ở Level 1), thì nó chính là gốc.
    const currentRootId = rootParentId || comment.id;

    const timeAgo = comment.createdAt
        ? formatDistanceToNow(toTimestamp(comment.createdAt), { addSuffix: true, locale: vi })
        : "";

    const handleLike = async () => {
        if (!user?.uid) return;
        const ref = doc(db, "comments", comment.id);
        if (isLiked) {
            await updateDoc(ref, { likes: arrayRemove(user.uid) });
        } else {
            await updateDoc(ref, { likes: arrayUnion(user.uid) });
        }
    };

    const handleDelete = async () => {
        await deleteDocument("comments", comment.id);
    };

    return (
        <div className="comment-item">
            <Avatar size={32} src={comment.photoURL || defaultAvatar} className="comment-item__avatar">
                {!comment.photoURL && comment.displayName?.charAt(0)?.toUpperCase()}
            </Avatar>

            <div className="comment-item__body">
                <div className="comment-item__bubble">
                    <span className="comment-item__name">
                        <UserBadge
                            displayName={author.displayName || comment.displayName}
                            role={author.role}
                            premiumLevel={author.premiumLevel}
                            premiumUntil={author.premiumUntil}
                            size={13}
                        />
                    </span>
                    <p className="comment-item__text">
                        {comment.replyToName && (
                            <span style={{ color: '#3b82f6', fontWeight: 600, marginRight: '6px' }}>
                                @{comment.replyToName}
                            </span>
                        )}
                        {comment.content}
                    </p>
                </div>

                <div className="comment-item__meta">
                    <Tooltip title={toTimestamp(comment.createdAt)?.toLocaleString("vi-VN")}>
                        <span className="comment-item__time">{timeAgo}</span>
                    </Tooltip>

                    <button
                        className={`comment-item__action-btn ${isLiked ? "comment-item__action-btn--liked" : ""}`}
                        onClick={handleLike}
                    >
                        {isLiked ? <HeartFilled /> : <HeartOutlined />}
                        {(comment.likes || []).length > 0 && (
                            <span
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowLikesModal(true);
                                }}
                                style={{ cursor: "pointer", marginLeft: "4px" }}
                            >
                                {(comment.likes || []).length}
                            </span>
                        )}
                        {/* <span>{isLiked ? "Đã thích" : "Thích"}</span> */}
                    </button>

                    <button
                        className="comment-item__action-btn"
                        onClick={() => setShowReplyInput((p) => !p)}
                    >
                        Trả lời
                    </button>

                    {user?.uid === comment.uid && (
                        <button className="comment-item__action-btn comment-item__action-btn--delete" onClick={handleDelete}>
                            Xóa
                        </button>
                    )}

                    {replies.length > 0 && (
                        <button
                            className="comment-item__toggle-replies"
                            onClick={() => setShowReplies((p) => !p)}
                        >
                            {showReplies ? "Ẩn" : `Xem ${replies.length} trả lời`}
                        </button>
                    )}
                </div>

                {showReplyInput && (
                    <CommentInput
                        postId={postId}
                        parentId={currentRootId}
                        replyToUser={comment}
                        placeholder={`Trả lời ${comment.displayName}...`}
                        onSubmitted={() => {
                            setShowReplyInput(false);
                            setShowReplies(true);
                        }}
                    />
                )}

                {showReplies && replies.length > 0 && (
                    <div className="comment-item__replies">
                        {replies.map((reply) => (
                            <CommentItem 
                                key={reply.id} 
                                comment={reply} 
                                postId={postId} 
                                repliesMap={repliesMap} 
                                rootParentId={currentRootId}
                            />
                        ))}
                    </div>
                )}

                <LikeListModal
                    visible={showLikesModal}
                    onClose={() => setShowLikesModal(false)}
                    uids={comment.likes}
                />
            </div>
        </div>
    );
}
