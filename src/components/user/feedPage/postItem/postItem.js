import React, { useState } from "react";
import PostHeader from "./postHeader";
import PostContent from "./postContent";
import PostActions from "./postActions";
import CommentSection from "../commentSection/commentSection";
import "./postItem.scss";

export default function PostItem({ post, onPostUpdated, onPostDeleted }) {
  const [hasError, setHasError] = useState(false);

  // không text, media null thì ẩn luôn post
  if (!post.content && hasError) {
    return null;
  }

  return (
    <div className="post-item" id={`post-${post.id}`}>
      <PostHeader post={post} onPostUpdated={onPostUpdated} onPostDeleted={onPostDeleted} />
      <PostContent post={post} setHasError={setHasError} hasError={hasError} />
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
