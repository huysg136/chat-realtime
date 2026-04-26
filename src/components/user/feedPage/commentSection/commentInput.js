import React, { useContext, useState } from "react";
import { Avatar, Input, Button } from "antd";
import { SendOutlined } from "@ant-design/icons";
import { AuthContext } from "../../../../context/authProvider";
import { addDocument } from "../../../../firebase/services";
import { doc, increment, updateDoc } from "firebase/firestore";
import { db } from "../../../../firebase/config";

const defaultAvatar = "https://images.spiderum.com/sp-images/9ae85f405bdf11f0a7b6d5c38c96eb0e.jpeg";

export default function CommentInput({ postId, parentId = null, replyToUser = null, onSubmitted, placeholder = "Viết bình luận..." }) {
  const { user } = useContext(AuthContext);
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = value.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      await addDocument("comments", {
        postId,
        parentId,          // null = top-level, string = reply
        replyToUid: replyToUser?.uid || null,
        replyToName: replyToUser?.displayName || null,
        content: trimmed,
        uid: user.uid,
        displayName: user.displayName || "Người dùng",
        photoURL: user.photoURL || defaultAvatar,
        likes: [],
      });

      // Increment commentsCount on the post
      const postRef = doc(db, "posts", postId);
      await updateDoc(postRef, { commentsCount: increment(1) });

      setValue("");
      onSubmitted && onSubmitted();
    } catch {
      /* silent */
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
