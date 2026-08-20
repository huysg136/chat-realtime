import React from "react";
import CreatePost from "../components/createPost/CreatePost";
import PostList from "../components/postList/PostList";
import OnlineFriends from "../components/onlineFriends/OnlineFriends";
import FriendSuggestions from "../components/friendSuggestions/FriendSuggestions";
import TrendingTopics from "../components/trendingTopics/TrendingTopics";
import { useOutletContext, useParams } from "react-router-dom";
import { useModalStore } from "../../../app/overlays/modal.store";
import { useChatStore } from "../../chat/store/chat.store";
import "./feedPage.scss";

export default function FeedPage() {
  const { feedSearchQuery } = useOutletContext();
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  const { postId } = useParams();
  const setIsPostDetailVisible = useModalStore((state) => state.setIsPostDetailVisible);
  const setActivePostId = useModalStore((state) => state.setActivePostId);
  const setIsActiveTab = useChatStore((state) => state.setIsActiveTab);

  React.useEffect(() => {
    setIsActiveTab("home");
    if (postId) {
      setActivePostId(postId);
      setIsPostDetailVisible(true);
    }
  }, [postId, setActivePostId, setIsPostDetailVisible, setIsActiveTab]);

  const handlePostCreated = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="feed-page">
      <div className="feed-page__layout">
        <div className="feed-page__inner">
          <CreatePost onPostCreated={handlePostCreated} />
          <PostList searchQuery={feedSearchQuery} refreshTrigger={refreshTrigger} />
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
