import React, { useState } from "react";
import PostHeader from "./postHeader";
import PostContent from "./postContent";
import PostActions from "./postActions";
import CommentSection from "../commentSection/commentSection";
import "./postItem.scss";

export default function PostItem({ post }) {
  const [showComments, setShowComments] = useState(false);

  return (
    <div className="post-item" id={`post-${post.id}`}>
      <PostHeader post={post} />
      <PostContent post={post} />
      <PostActions
        post={post}
        showComments={showComments}
        onToggleComments={() => setShowComments((prev) => !prev)}
      />
      <CommentSection postId={post.id} postAuthorUid={post.uid} isPreview={!showComments} />
    </div>
  );
}
