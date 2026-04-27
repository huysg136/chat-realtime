import React, { useEffect, useState, useContext } from "react";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../../../../firebase/config";
import { useOutletContext } from "react-router-dom";
import { AiOutlineRise } from "react-icons/ai";
import "./trendingTopics.scss";

export default function TrendingTopics() {
  const context = useOutletContext() || {};
  const setSearchInput = context.setSearchInput;
  const triggerFeedSearch = context.triggerFeedSearch;
  const [trends, setTrends] = useState([]);

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(50));
        const snap = await getDocs(q);
        const hashtags = {};

        snap.forEach((doc) => {
          const content = doc.data().content || "";
          const found = content.match(/#[\p{L}\p{N}_-]+/gu);
          if (found) {
            found.forEach((tag) => {
              hashtags[tag] = (hashtags[tag] || 0) + 1;
            });
          }
        });

        let sortedTrends = Object.keys(hashtags).map((tag) => ({
          tag,
          count: hashtags[tag],
        }));

        sortedTrends.sort((a, b) => b.count - a.count);

        setTrends(sortedTrends.slice(0, 3));
      } catch (error) {
        console.error("Error fetching trends:", error);
      }
    };

    fetchTrends();
  }, []);

  const handleTrendClick = (tag) => {
    if (setSearchInput) {
      setSearchInput(tag);
    }
    if (triggerFeedSearch) {
      triggerFeedSearch(tag);
    }
    const feedPage = document.querySelector('.feed-page');
    if (feedPage) {
      feedPage.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="trending-topics">
      <div className="trending-topics__header">
        <h3>Chủ đề thịnh hành</h3>
      </div>
      <div className="trending-topics__list">
        {trends.length === 0 ? (
          <div className="trending-topics__empty" style={{ fontSize: '13px', color: '#8c8c8c', textAlign: 'center', padding: '10px 0' }}>
            Không có chủ đề thịnh hành nào
          </div>
        ) : (
          trends.map((item, index) => (
            <div
              key={index}
              className="trending-topics__item"
              onClick={() => handleTrendClick(item.tag)}
            >
              <div className="trending-topics__rank">{index + 1}</div>
              <div className="trending-topics__content">
                <span className="trending-topics__tag">{item.tag}</span>
                <span className="trending-topics__count">{item.count} bài đăng</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
