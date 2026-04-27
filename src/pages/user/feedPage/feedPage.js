import React from "react";
import CreatePost from "../../../components/user/feedPage/createPost/createPost";
import PostList from "../../../components/user/feedPage/postList/postList";
import OnlineFriends from "../../../components/user/feedPage/onlineFriends/onlineFriends";
import "./feedPage.scss";

export default function FeedPage() {
  return (
    <div className="feed-page">
      <div className="feed-page__layout">
        <div className="feed-page__inner">
          <div className="feed-page__header">
          </div>
          <CreatePost />
          <PostList />
        </div>
        <OnlineFriends />
      </div>
    </div>
  );
}
