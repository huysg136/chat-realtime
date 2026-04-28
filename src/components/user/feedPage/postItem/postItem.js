import React from "react";
import PostHeader from "./postHeader";
import PostContent from "./postContent";
import PostActions from "./postActions";
import CommentSection from "../commentSection/commentSection";
import "./postItem.scss";

export default function PostItem({ post, onPostUpdated, onPostDeleted }) {
  return (
    <div className="post-item" id={`post-${post.id}`}>
      <PostHeader post={post} onPostUpdated={onPostUpdated} onPostDeleted={onPostDeleted} />
      <PostContent post={post} />
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
      />
    </div>
  );
}
