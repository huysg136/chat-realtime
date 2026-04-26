import React, { useState, useContext, useRef, useEffect } from "react";
import { Avatar, Input, Button } from "antd";
import { 
    PictureOutlined, 
    SmileOutlined, 
    SendOutlined, 
    CloseOutlined,
    VideoCameraOutlined
} from "@ant-design/icons";
import { AuthContext } from "../../../../context/authProvider";
import { addDocument, getUserDocIdByUid } from "../../../../firebase/services";
import { uploadToR2 } from "../../../../utils/uploadToR2";
import { validateFile } from "../../../../utils/fileValidation";
import { hasEnoughQuota, increaseQuota, formatBytes, getQuotaLimit } from "../../../../utils/quota";
import { toast } from "react-toastify";
import EmojiPicker from "emoji-picker-react";
import "./createPost.scss";

const { TextArea } = Input;
const defaultAvatar = "https://images.spiderum.com/sp-images/9ae85f405bdf11f0a7b6d5c38c96eb0e.jpeg";

export default function CreatePost({ onPostCreated }) {
    const { user } = useContext(AuthContext);
    const [content, setContent] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    
    // File states
    const [selectedFile, setSelectedFile] = useState(null);
    const [filePreview, setFilePreview] = useState("");
    const [fileType, setFileType] = useState(""); // 'image' or 'video'
    const fileInputRef = useRef(null);

    // Emoji states
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

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
                
                // Increase Quota
                const docId = await getUserDocIdByUid(user.uid);
                if (docId) {
                    await increaseQuota(docId, selectedFile.size);
                }
                
                kind = fileType === "video" ? "video" : "image";
            }

            await addDocument("posts", {
                content: trimmed,
                mediaUrl: mediaUrl,
                kind: kind,
                uid: user.uid,
                displayName: user.displayName || "Người dùng",
                photoURL: user.photoURL || defaultAvatar,
                likes: [],
                commentsCount: 0,
            });

            setContent("");
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

    return (
        <div className={`create-post ${isFocused || selectedFile ? "create-post--focused" : ""}`}>
            <div className="create-post__top">
                <Avatar
                    size={40}
                    src={user?.photoURL || defaultAvatar}
                    className="create-post__avatar"
                >
                    {!user?.photoURL && user?.displayName?.charAt(0)?.toUpperCase()}
                </Avatar>
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

            {(isFocused || selectedFile) && (
                <div className="create-post__bottom">
                    <div className="create-post__actions">
                        <button 
                            className={`create-post__action-btn ${selectedFile ? "active" : ""}`}
                            onClick={() => fileInputRef.current?.click()}
                            disabled={submitting}
                        >
                            <PictureOutlined /> <span>Ảnh/Video</span>
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
                            <SmileOutlined /> <span>Cảm xúc</span>
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
