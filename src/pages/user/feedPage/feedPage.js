import React from "react";
import CreatePost from "../../../components/user/feedPage/createPost/createPost";
import PostList from "../../../components/user/feedPage/postList/postList";
import "./feedPage.scss";

export default function FeedPage() {
  return (
    <div className="feed-page">
      <div className="feed-page__inner">
        <div className="feed-page__header">
          <h2 className="feed-page__title">Bảng tin</h2>
        </div>
        <CreatePost />
        <PostList />
      </div>
    </div>
  );
}
