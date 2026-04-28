import React, { useContext, useState } from "react";
import { Avatar, Input, Button } from "antd";
import { SendOutlined } from "@ant-design/icons";
import { AuthContext } from "../../../../context/authProvider";


const defaultAvatar = "https://images.spiderum.com/sp-images/9ae85f405bdf11f0a7b6d5c38c96eb0e.jpeg";

export default function CommentInput({ postId, postAuthorUid, parentId = null, replyToUser = null, onSubmitted, placeholder = "Viết bình luận...", onPostUpdated, commentsCount }) {
  const { user } = useContext(AuthContext);
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = value.trim();
    if (!trimmed) return;

    const originalCount = commentsCount || 0;

    // Optimistic UI: Cập nhật ngay lập tức
    onPostUpdated && onPostUpdated({
      id: postId,
      commentsCount: originalCount + 1
    });

    try {
      const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";
      const res = await fetch(`${API_BASE_URL}/api/posts/${postId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentId,
          replyToUid: replyToUser?.uid || null,
          replyToName: replyToUser?.displayName || null,
          content: trimmed,
          uid: user.uid,
          displayName: user.displayName || "Người dùng",
          photoURL: user.photoURL || defaultAvatar,
          postAuthorUid
        })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      setValue("");
      onSubmitted && onSubmitted();
    } catch (error) {
      // Rollback nếu thất bại
      onPostUpdated && onPostUpdated({
        id: postId,
        commentsCount: originalCount
      });
      console.error("Comment failed:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="comment-input">
      <Avatar
        size={32}
        src={user?.photoURL || defaultAvatar}
        className="comment-input__avatar"
      >
        {!user?.photoURL && user?.displayName?.charAt(0)?.toUpperCase()}
      </Avatar>
      <div className="comment-input__box">
        <Input
          autoFocus
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          bordered={false}
          className="comment-input__field"
          id={`comment-input-${postId}-${parentId || "root"}`}
        />
        {value.trim() && (
          <Button
            type="text"
            icon={<SendOutlined />}
            onClick={handleSubmit}
            loading={submitting}
            className="comment-input__send-btn"
          />
        )}
      </div>
    </div>
  );
}
