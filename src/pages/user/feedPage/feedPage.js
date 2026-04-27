import React from "react";
import CreatePost from "../../../components/user/feedPage/createPost/createPost";
import PostList from "../../../components/user/feedPage/postList/postList";
import OnlineFriends from "../../../components/user/feedPage/onlineFriends/onlineFriends";
import FriendSuggestions from "../../../components/user/feedPage/friendSuggestions/friendSuggestions";
import TrendingTopics from "../../../components/user/feedPage/trendingTopics/trendingTopics";
import { useOutletContext } from "react-router-dom";
import "./feedPage.scss";

export default function FeedPage() {
  const { feedSearchQuery } = useOutletContext();

  return (
    <div className="feed-page">
      <div className="feed-page__layout">
        <div className="feed-page__inner">
          <CreatePost />
          <PostList searchQuery={feedSearchQuery} />
        </div>
        <div className="feed-page__right-side">
          <OnlineFriends />
          <TrendingTopics />
          <FriendSuggestions />
        </div>
      </div>
    </div>
  );
}
