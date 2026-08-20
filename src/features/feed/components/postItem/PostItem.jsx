import React, { useState } from "react";
import PostHeader from "./PostHeader";
import PostContent from "./PostContent";
import PostActions from "./PostActions";
import CommentSection from "../commentSection/CommentSection";
import { useAuthStore } from "../../../auth/store/auth.store";
import "./postItem.scss";

export default function PostItem({ post, onPostUpdated, onPostDeleted }) {
  const user = useAuthStore((state) => state.user);
  const [hasError, setHasError] = useState(false);
  const isOwner = user?.uid === post.uid;

  // Nếu bài viết không có text và media bị lỗi load
  // Ẩn hoàn toàn nếu KHÔNG phải chủ sở hữu
  if (!post.content && hasError && !isOwner) {
    return null;
  }

  return (
    <div className="post-item" id={`post-${post.id}`}>
      <PostHeader post={post} onPostUpdated={onPostUpdated} onPostDeleted={onPostDeleted} />
      <PostContent post={post} setHasError={setHasError} hasError={hasError} isOwner={isOwner} />
      <PostActions
        post={post}
        onPostUpdated={onPostUpdated}
      />
      <CommentSection
        postId={post.id}
        postAuthorUid={post.uid}
        isPreview={true}
        onPostUpdated={onPostUpdated}
        commentsCount={post.commentsCount || 0}
        topComment={post.topComment}
      />
    </div>
  );
}
