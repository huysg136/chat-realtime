import React, { useState, useContext, useRef, useEffect } from "react";
import { Avatar, Input, Button, Select } from "antd";
import { SendOutlined, CloseOutlined } from "@ant-design/icons";
import { AiFillPicture } from "react-icons/ai";
import { MdEmojiEmotions } from "react-icons/md";
import { FaVideo } from "react-icons/fa";
import { PRIVACY_CONFIG } from "../../../common/privacyIcon";
import { AuthContext } from "../../../../context/authProvider";
import { addDocument, getUserDocIdByUid } from "../../../../firebase/services";
import { uploadToR2 } from "../../../../utils/uploadToR2";
import { validateFile } from "../../../../utils/fileValidation";
import { hasEnoughQuota, increaseQuota, formatBytes, getQuotaLimit } from "../../../../utils/quota";
import { toast } from "react-toastify";
import EmojiPicker from "emoji-picker-react";
import UserBadge from "../../../common/userBadge";
import "./createPost.scss";

const { TextArea } = Input;
const defaultAvatar = "https://images.spiderum.com/sp-images/9ae85f405bdf11f0a7b6d5c38c96eb0e.jpeg";

export default function CreatePost({ onPostCreated }) {
    const { user } = useContext(AuthContext);
    const [content, setContent] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [privacy, setPrivacy] = useState("public"); // 'public', 'friends', 'private'

    // File states
    const [selectedFile, setSelectedFile] = useState(null);
    const [filePreview, setFilePreview] = useState("");
    const [fileType, setFileType] = useState(""); // 'image' or 'video'
    const fileInputRef = useRef(null);

    // Emoji states
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsFocused(false);
                // click ra ngoài đóng emoji nếu có
                setShowEmojiPicker(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Cleanup preview URL to prevent memory leaks
    useEffect(() => {
        return () => {
            if (filePreview) URL.revokeObjectURL(filePreview);
        };
    }, [filePreview]);

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Reset input so selecting the same file again triggers onChange
        e.target.value = null;

        // Validate premium/size
        if (!validateFile(file, user)) return;

        // Check quota
        if (!hasEnoughQuota(user, file.size)) {
            const limit = formatBytes(getQuotaLimit(user));
            const used = formatBytes(user.quotaUsed || 0);
            toast.error(`Bạn đã hết dung lượng! (${used} / ${limit}). Nâng cấp gói để tiếp tục.`);
            return;
        }

        setSelectedFile(file);
        setFileType(file.type.startsWith("video/") ? "video" : "image");

        // Revoke old preview if exists
        if (filePreview) URL.revokeObjectURL(filePreview);
        setFilePreview(URL.createObjectURL(file));
        setIsFocused(true);
    };

    const handleRemoveFile = () => {
        setSelectedFile(null);
        setFileType("");
        if (filePreview) URL.revokeObjectURL(filePreview);
        setFilePreview("");
    };

    const handleSubmit = async () => {
        const trimmed = content.trim();
        if (!trimmed && !selectedFile) return;

        setSubmitting(true);
        try {
            let mediaUrl = null;
            let kind = "text";

            if (selectedFile) {
                // Upload to R2
                mediaUrl = await uploadToR2(selectedFile);
                kind = fileType === "video" ? "video" : "image";
            }

            const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
            const response = await fetch(`${API_BASE_URL}/api/posts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content: trimmed,
                    mediaUrl: mediaUrl,
                    kind: kind,
                    uid: user.uid,
                    displayName: user.displayName || "Người dùng",
                    photoURL: user.photoURL || defaultAvatar,
                    privacy: privacy,
                    fileSize: selectedFile ? selectedFile.size : 0,
                }),
            });

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message);
            }

            setContent("");
            setPrivacy("public");
            handleRemoveFile();
            setShowEmojiPicker(false);
            setIsFocused(false);
            onPostCreated && onPostCreated();
            toast.success("Đã đăng bài thành công!");
        } catch (err) {
            toast.error("Đăng bài thất bại, vui lòng thử lại.");
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            handleSubmit();
        }
    };

    const canSubmit = content.trim() || selectedFile;
    const isExpanded = isFocused || selectedFile || content.trim().length > 0;

    return (
        <div className={`create-post ${isExpanded ? "create-post--focused" : ""}`} ref={containerRef}>
            <div className="create-post__top">
                <Avatar
                    size={40}
                    src={user?.photoURL || defaultAvatar}
                    className="create-post__avatar"
                >
                    {!user?.photoURL && user?.displayName?.charAt(0)?.toUpperCase()}
                </Avatar>
                <div className="create-post__right-side" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {isExpanded && (
                        <div className="create-post__privacy-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                            <UserBadge
                                displayName={user?.displayName || "Bạn"}
                                role={user?.role}
                                premiumLevel={user?.premiumLevel}
                                premiumUntil={user?.premiumUntil}
                                size={15}
                            />
                            <div style={{ background: '#f0f2f5', borderRadius: '20px', padding: '2px 4px', display: 'flex', alignItems: 'center', height: '26px' }}>
                                <Select
                                    value={privacy}
                                    onChange={setPrivacy}
                                    size="small"
                                    className="create-post__privacy-select"
                                    style={{ width: 125 }}
                                    bordered={false}
                                    dropdownStyle={{ borderRadius: 8 }}
                                    getPopupContainer={() => containerRef.current}
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
                    )}
                    <div className="create-post__input-wrapper">
                        <TextArea
                            placeholder={`${user?.displayName || "Bạn"} ơi, bạn đang nghĩ gì vậy?`}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            onFocus={() => setIsFocused(true)}
                            onKeyDown={handleKeyDown}
                            autoSize={{ minRows: isFocused ? 3 : 1, maxRows: 8 }}
                            className="create-post__textarea"
                            bordered={false}
                        />
                    </div>
                </div>
            </div>

            {/* Media Preview Area */}
            {filePreview && (
                <div className="create-post__media-preview">
                    {fileType === "video" ? (
                        <video src={filePreview} controls className="media-preview-element" />
                    ) : (
                        <img src={filePreview} alt="Preview" className="media-preview-element" />
                    )}
                    <button
                        className="create-post__remove-media"
                        onClick={handleRemoveFile}
                        disabled={submitting}
                    >
                        <CloseOutlined />
                    </button>
                </div>
            )}

            {/* Emoji Picker */}
            {showEmojiPicker && (
                <div className="create-post__emoji-wrapper">
                    <EmojiPicker
                        onEmojiClick={(emojiData) => setContent(prev => prev + emojiData.emoji)}
                        width="100%"
                        height={350}
                    />
                </div>
            )}

            {isExpanded && (
                <div className="create-post__bottom">
                    <div className="create-post__actions">
                        <button
                            className="create-post__action-btn"
                            disabled={true}
                            style={{ opacity: 0.6, cursor: 'not-allowed' }}
                            title="Tính năng này sắp ra mắt"
                        >
                            <FaVideo style={{ color: '#f50057', fontSize: '18px' }} />
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                                <span style={{ lineHeight: 1 }}>Video trực tiếp</span>
                                <span style={{ fontSize: '10px', lineHeight: 1, color: '#f50057', fontWeight: 'bold' }}>Sắp ra mắt</span>
                            </div>
                        </button>
                        <button
                            className={`create-post__action-btn ${selectedFile ? "active" : ""}`}
                            onClick={() => fileInputRef.current?.click()}
                            disabled={submitting}
                        >
                            <AiFillPicture style={{ color: '#45bd62', fontSize: '18px' }} /> <span>Ảnh/Video</span>
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            accept="image/*,video/*"
                            onChange={handleFileSelect}
                        />

                        <button
                            className={`create-post__action-btn ${showEmojiPicker ? "active" : ""}`}
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            disabled={submitting}
                        >
                            <MdEmojiEmotions style={{ color: '#ffe611ff', fontSize: '18px' }} /> <span>Cảm xúc</span>
                        </button>
                    </div>
                    <div className="create-post__submit-area">
                        <span className="create-post__hint">Ctrl+Enter để đăng</span>
                        <Button
                            className="create-post__submit-btn"
                            icon={<SendOutlined />}
                            onClick={handleSubmit}
                            loading={submitting}
                            disabled={!canSubmit}
                        >
                            Đăng bài
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
