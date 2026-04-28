import React from "react";
import CreatePost from "../../../components/user/feedPage/createPost/createPost";
import PostList from "../../../components/user/feedPage/postList/postList";
import OnlineFriends from "../../../components/user/feedPage/onlineFriends/onlineFriends";
import FriendSuggestions from "../../../components/user/feedPage/friendSuggestions/friendSuggestions";
import TrendingTopics from "../../../components/user/feedPage/trendingTopics/trendingTopics";
import { useOutletContext, useParams } from "react-router-dom";
import { AppContext } from "../../../context/appProvider";
import "./feedPage.scss";

export default function FeedPage() {
  const { feedSearchQuery } = useOutletContext();
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  const { postId } = useParams();
  const { setIsPostDetailVisible, setActivePostId, setIsActiveTab } = React.useContext(AppContext);

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
