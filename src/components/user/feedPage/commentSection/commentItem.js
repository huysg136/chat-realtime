import React, { useState, useContext } from "react";
import { Avatar, Tooltip, Modal } from "antd";
import { HeartFilled, HeartOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { doc, updateDoc, arrayUnion, arrayRemove, writeBatch, collection, query, where, getDocs } from "firebase/firestore";
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
    if (createdAt._seconds) return new Date(createdAt._seconds * 1000);
    if (createdAt.toMillis) return new Date(createdAt.toMillis());
    if (createdAt instanceof Date) return createdAt;
    return new Date(createdAt);
}

const { confirm } = Modal;

export default function CommentItem({ comment, postId, repliesMap = {}, rootParentId = null, isPreview = false }) {
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

    let timeAgo = comment.createdAt
        ? formatDistanceToNow(toTimestamp(comment.createdAt), { locale: vi })
        : "";

    timeAgo = timeAgo.replace("khoảng ", "").replace("dưới ", "").trim();

    const handleLike = async () => {
        if (!user?.uid) return;
        
        try {
            const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";
            const res = await fetch(`${API_BASE_URL}/api/posts/${postId}/comment/${comment.id}/like`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    uid: user.uid,
                    displayName: user.displayName,
                    photoURL: user.photoURL
                })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message);
        } catch (error) {
            console.error("Thao tác thích bình luận thất bại:", error);
        }
    };

    const handleDelete = () => {
        confirm({
            title: 'Xóa bình luận?',
            icon: <ExclamationCircleOutlined />,
            content: 'Bạn có chắc chắn muốn xóa bình luận này và toàn bộ các câu trả lời liên quan không? Hành động này không thể hoàn tác.',
            okText: 'Xóa',
            okType: 'danger',
            cancelText: 'Hủy',
            onOk: async () => {
                try {
                    const batch = writeBatch(db);

                    // Xóa chính nó
                    batch.delete(doc(db, "comments", comment.id));

                    // Tìm tất cả comment trong bài viết này để lọc đệ quy
                    const q = query(collection(db, "comments"), where("postId", "==", postId));
                    const snapshot = await getDocs(q);
                    const allComments = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

                    const descendantIds = [];
                    const findDescendants = (parentId) => {
                        allComments.forEach(c => {
                            if (c.parentId === parentId) {
                                descendantIds.push(c.id);
                                findDescendants(c.id); // Đệ quy tìm tiếp
                            }
                        });
                    };
                    findDescendants(comment.id);

                    // Thêm các comment con vào batch xóa
                    descendantIds.forEach(id => {
                        batch.delete(doc(db, "comments", id));
                    });

                    await batch.commit();
                } catch (error) {
                    console.error("Xóa comment thất bại:", error);
                }
            }
        });
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

                    {isPreview ? (
                        <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: 'auto', fontStyle: 'italic' }}>Bình luận hàng đầu</span>
                    ) : (
                        <>
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
                        </>
                    )}
                </div>

                {!isPreview && showReplyInput && (
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

                {!isPreview && showReplies && replies.length > 0 && (
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
