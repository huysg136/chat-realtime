import React, { useContext, useState, useRef, useEffect } from "react";
import { Avatar, Dropdown, Tooltip, Modal, Input } from "antd";
import { MoreOutlined, DeleteOutlined, ExclamationCircleOutlined, EditOutlined, PictureOutlined, VideoCameraOutlined, CloseOutlined } from "@ant-design/icons";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { AuthContext } from "../../../../context/authProvider";
import { AppContext } from "../../../../context/appProvider";
import { deleteDocument, getUserDocIdByUid } from "../../../../firebase/services";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../../firebase/config";
import { toast } from "react-toastify";
import UserBadge from "../../../common/userBadge";
import { uploadToR2 } from "../../../../utils/uploadToR2";
import { validateFile } from "../../../../utils/fileValidation";
import { hasEnoughQuota, increaseQuota, formatBytes, getQuotaLimit } from "../../../../utils/quota";

const defaultAvatar = "https://images.spiderum.com/sp-images/9ae85f405bdf11f0a7b6d5c38c96eb0e.jpeg";
const { confirm } = Modal;

function toTimestamp(createdAt) {
    if (!createdAt) return null;
    if (createdAt.seconds) return new Date(createdAt.seconds * 1000);
    if (createdAt.toMillis) return new Date(createdAt.toMillis());
    if (createdAt instanceof Date) return createdAt;
    return new Date(createdAt);
}

export default function PostHeader({ post }) {
    const { user } = useContext(AuthContext);
    const { users } = useContext(AppContext);
    
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [editContent, setEditContent] = useState(post.content || "");
    const [isEditing, setIsEditing] = useState(false);
    
    const [editSelectedFile, setEditSelectedFile] = useState(null);
    const [editFilePreview, setEditFilePreview] = useState("");
    const [editFileType, setEditFileType] = useState("");
    const [existingMediaUrl, setExistingMediaUrl] = useState(post.mediaUrl || null);
    const [existingMediaKind, setExistingMediaKind] = useState(post.kind || "text");
    const fileInputRef = useRef(null);

    useEffect(() => {
        return () => {
            if (editFilePreview) URL.revokeObjectURL(editFilePreview);
        };
    }, [editFilePreview]);

    const isOwner = user?.uid === post.uid;
    const author = users.find((u) => u.uid === post.uid) || {};

    const timeAgo = post.createdAt
        ? formatDistanceToNow(toTimestamp(post.createdAt), { addSuffix: true, locale: vi })
        : "";

    const handleDelete = () => {
        confirm({
            title: 'Xóa bài viết?',
            icon: <ExclamationCircleOutlined />,
            content: 'Bạn có chắc chắn muốn xóa bài viết này không? Hành động này không thể hoàn tác.',
            okText: 'Xóa',
            okType: 'danger',
            cancelText: 'Hủy',
            onOk: async () => {
                try {
                    await deleteDocument("posts", post.id);
                    toast.success("Đã xóa bài viết thành công!");
                } catch (error) {
                    toast.error("Xóa bài viết thất bại.");
                }
            },
        });
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        e.target.value = null;

        if (!validateFile(file, user)) return;

        if (!hasEnoughQuota(user, file.size)) {
            const limit = formatBytes(getQuotaLimit(user));
            const used = formatBytes(user.quotaUsed || 0);
            toast.error(`Bạn đã hết dung lượng! (${used} / ${limit}). Nâng cấp gói để tiếp tục.`);
            return;
        }

        setEditSelectedFile(file);
        setEditFileType(file.type.startsWith("video/") ? "video" : "image");
        setExistingMediaUrl(null); 
        
        if (editFilePreview) URL.revokeObjectURL(editFilePreview);
        setEditFilePreview(URL.createObjectURL(file));
    };

    const handleRemoveFile = () => {
        setEditSelectedFile(null);
        setEditFileType("");
        setExistingMediaUrl(null);
        setExistingMediaKind("text");
        if (editFilePreview) URL.revokeObjectURL(editFilePreview);
        setEditFilePreview("");
    };

    const handleEdit = async () => {
        const trimmed = editContent.trim();
        if (!trimmed && !editSelectedFile && !existingMediaUrl) {
            toast.error("Nội dung không được để trống!");
            return;
        }
        setIsEditing(true);
        try {
            let finalMediaUrl = existingMediaUrl;
            let finalKind = existingMediaKind;

            if (editSelectedFile) {
                const userDocId = await getUserDocIdByUid(user.uid);
                if (!userDocId) throw new Error("User document not found");

                const url = await uploadToR2(editSelectedFile);
                if (url) {
                    await increaseQuota(userDocId, editSelectedFile.size);
                    finalMediaUrl = url;
                    finalKind = editFileType === "video" ? "video" : "image";
                }
            }

            if (!finalMediaUrl) finalKind = "text";

            await updateDoc(doc(db, "posts", post.id), {
                content: trimmed,
                mediaUrl: finalMediaUrl,
                kind: finalKind,
                editedAt: new Date()
            });
            toast.success("Cập nhật bài viết thành công!");
            setIsEditModalVisible(false);
        } catch (error) {
            toast.error("Cập nhật bài viết thất bại.");
        } finally {
            setIsEditing(false);
        }
    };

    const menuItems = [
        isOwner && {
            key: "edit",
            icon: <EditOutlined />,
            label: "Chỉnh sửa bài viết",
            onClick: () => {
                setEditContent(post.content || "");
                setExistingMediaUrl(post.mediaUrl || null);
                setExistingMediaKind(post.kind || "text");
                setEditSelectedFile(null);
                setEditFilePreview("");
                setEditFileType("");
                setIsEditModalVisible(true);
            },
        },
        isOwner && {
            key: "delete",
            icon: <DeleteOutlined />,
            label: "Xóa bài viết",
            danger: true,
            onClick: handleDelete,
        },
    ].filter(Boolean);

    return (
        <div className="post-header">
            <Avatar
                size={42}
                src={post.photoURL || defaultAvatar}
                className="post-header__avatar"
            >
                {!post.photoURL && post.displayName?.charAt(0)?.toUpperCase()}
            </Avatar>
            <div className="post-header__info">
                <span className="post-header__name">
                    <UserBadge
                        displayName={author.displayName || post.displayName || "Người dùng"}
                        role={author.role}
                        premiumLevel={author.premiumLevel}
                        premiumUntil={author.premiumUntil}
                        size={15}
                    />
                </span>
                <Tooltip title={toTimestamp(post.createdAt)?.toLocaleString("vi-VN")}>
                    <span className="post-header__time">
                        {timeAgo}
                        {post.editedAt && " • (Đã chỉnh sửa)"}
                    </span>
                </Tooltip>
            </div>
            {isOwner && (
                <Dropdown menu={{ items: menuItems }} placement="bottomRight" trigger={["click"]}>
                    <button className="post-header__more-btn" id={`post-menu-${post.id}`}>
                        <MoreOutlined />
                    </button>
                </Dropdown>
            )}

            <Modal
                title="Chỉnh sửa bài viết"
                open={isEditModalVisible}
                onOk={handleEdit}
                onCancel={() => setIsEditModalVisible(false)}
                okText="Lưu"
                cancelText="Hủy"
                confirmLoading={isEditing}
                className="edit-post-modal"
                centered
            >
                {(existingMediaUrl || editFilePreview) && (
                    <div className="create-post__preview" style={{ marginBottom: 12 }}>
                        {existingMediaUrl ? (
                            existingMediaKind === "video" ? (
                                <video src={existingMediaUrl} controls className="create-post__preview-media" />
                            ) : (
                                <img src={existingMediaUrl} alt="Preview" className="create-post__preview-media" />
                            )
                        ) : (
                            editFileType === "video" ? (
                                <video src={editFilePreview} controls className="create-post__preview-media" />
                            ) : (
                                <img src={editFilePreview} alt="Preview" className="create-post__preview-media" />
                            )
                        )}
                        <button className="create-post__remove-btn" onClick={handleRemoveFile}>
                            <CloseOutlined />
                        </button>
                    </div>
                )}
                <Input.TextArea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    autoSize={{ minRows: 3, maxRows: 10 }}
                    placeholder="Bạn đang nghĩ gì?"
                />
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                    <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm"
                        style={{ display: "none" }}
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                    />
                    <button 
                        className="create-post__action-btn"
                        onClick={() => fileInputRef.current?.click()}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <PictureOutlined style={{ color: '#45bd62' }} /> Ảnh
                    </button>
                    <button 
                        className="create-post__action-btn"
                        onClick={() => fileInputRef.current?.click()}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <VideoCameraOutlined style={{ color: '#f50057' }} /> Video
                    </button>
                </div>
            </Modal>
        </div>
    );
}
