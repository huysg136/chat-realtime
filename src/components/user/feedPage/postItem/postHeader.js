import React, { useContext, useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, Dropdown, Tooltip, Modal, Input, Select } from "antd";
import { MoreOutlined, DeleteOutlined, ExclamationCircleOutlined, EditOutlined, CloseOutlined } from "@ant-design/icons";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { AiFillPicture } from "react-icons/ai";
import PrivacyIcon, { PRIVACY_CONFIG } from "../../../common/privacyIcon";
import { AuthContext } from "../../../../context/authProvider";
import { AppContext } from "../../../../context/appProvider";
import { deleteDocument, getUserDocIdByUid } from "../../../../firebase/services";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../../firebase/config";
import { deletePost } from "../../../../services/postService";
import { toast } from "react-toastify";
import UserBadge from "../../../common/userBadge";
import { uploadToR2 } from "../../../../services/uploadService";
import { validateFile } from "../../../../utils/fileValidation";
import { hasEnoughQuota, increaseQuota, formatBytes, getQuotaLimit } from "../../../../utils/quota";

const defaultAvatar = "https://images.spiderum.com/sp-images/9ae85f405bdf11f0a7b6d5c38c96eb0e.jpeg";
const { confirm } = Modal;

function toTimestamp(createdAt) {
    if (!createdAt) return null;
    if (createdAt.seconds) return new Date(createdAt.seconds * 1000);
    if (createdAt._seconds) return new Date(createdAt._seconds * 1000);
    if (createdAt.toMillis) return new Date(createdAt.toMillis());
    if (createdAt instanceof Date) return createdAt;
    return new Date(createdAt);
}

export default function PostHeader({ post, onPostUpdated, onPostDeleted }) {
    const { user } = useContext(AuthContext);
    const { users } = useContext(AppContext);
    const navigate = useNavigate();

    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [editContent, setEditContent] = useState(post.content || "");
    const [editPrivacy, setEditPrivacy] = useState(post.privacy || "public");
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

    let timeAgo = post.createdAt
        ? formatDistanceToNow(toTimestamp(post.createdAt), { locale: vi })
        : "";

    timeAgo = timeAgo.replace("khoảng ", "").replace("dưới ", "").trim();

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
                    const data = await deletePost(post.id, user?.uid);
                    if (!data.success) throw new Error(data.message);

                    onPostDeleted && onPostDeleted(post.id);
                    toast.success("Đã xóa bài viết thành công!");
                } catch (error) {
                    toast.error("Xóa bài viết thất bại.");
                    console.error(error);
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
                privacy: editPrivacy,
                editedAt: new Date()
            });
            onPostUpdated && onPostUpdated({
                id: post.id,
                content: trimmed,
                mediaUrl: finalMediaUrl,
                kind: finalKind,
                privacy: editPrivacy,
                editedAt: { _seconds: Math.floor(Date.now() / 1000) }
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
                setEditPrivacy(post.privacy || "public");
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
                style={{ cursor: "pointer" }}
                onClick={() => navigate(`/profile/${post.uid}`)}
            >
                {!post.photoURL && post.displayName?.charAt(0)?.toUpperCase()}
            </Avatar>
            <div className="post-header__info">
                <span 
                    className="post-header__name"
                    style={{ cursor: "pointer" }}
                    onClick={() => navigate(`/profile/${post.uid}`)}
                >
                    <UserBadge
                        displayName={author.displayName || post.displayName || "Người dùng"}
                        role={author.role}
                        premiumLevel={author.premiumLevel}
                        premiumUntil={author.premiumUntil}
                        size={15}
                    />
                </span>
                <Tooltip title={toTimestamp(post.createdAt)?.toLocaleString("vi-VN")}>
                    <span className="post-header__time" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        {timeAgo}
                        {post.editedAt && " • (Đã chỉnh sửa)"}
                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                            <PrivacyIcon privacy={post.privacy || "public"} size={13} color={null} />
                        </span>
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
                <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#6b7280', marginRight: '8px' }}>Đối tượng:</span>
                    <div style={{ background: '#f0f2f5', borderRadius: '20px', padding: '2px 4px', display: 'flex', alignItems: 'center', height: '26px' }}>
                        <Select
                            value={editPrivacy}
                            onChange={setEditPrivacy}
                            size="small"
                            style={{ width: 125 }}
                            bordered={false}
                            dropdownStyle={{ borderRadius: 8 }}
                            options={Object.entries(PRIVACY_CONFIG).map(([key, cfg]) => {
                                const Icon = cfg.icon;
                                return {
                                    value: key,
                                    label: (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Icon size={13 + (cfg.sizeOffset || 0)} style={{ color: cfg.color }} />
                                            <span style={{ fontSize: '13px' }}>{cfg.label}</span>
                                        </div>
                                    )
                                };
                            })}
                        />
                    </div>
                </div>
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
                        <AiFillPicture style={{ color: '#45bd62', fontSize: '18px' }} /> <span>Ảnh/Video</span>
                    </button>
                </div>
            </Modal>
        </div>
    );
}
