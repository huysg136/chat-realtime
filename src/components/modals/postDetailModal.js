import React, { useContext, useEffect, useState } from "react";
import { Modal, Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/config";
import { AppContext } from "../../context/appProvider";
import PostHeader from "../user/feedPage/postItem/postHeader";
import PostContent from "../user/feedPage/postItem/postContent";
import PostActions from "../user/feedPage/postItem/postActions";
import CommentSection from "../user/feedPage/commentSection/commentSection";
import "../user/feedPage/postItem/postItem.scss";
import "./postDetailModal.scss";

export default function PostDetailModal() {
  const { isPostDetailVisible, setIsPostDetailVisible, activePostId, setActivePostId } = useContext(AppContext);
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activePostId || !isPostDetailVisible) {
      setPost(null);
      return;
    }

    setLoading(true);
    const unsub = onSnapshot(doc(db, "posts", activePostId), (snap) => {
      if (snap.exists()) {
        setPost({ id: snap.id, ...snap.data() });
      } else {
        setPost(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching post detail:", error);
      setLoading(false);
    });

    return () => unsub();
  }, [activePostId, isPostDetailVisible]);

  useEffect(() => {
    if (isPostDetailVisible && !loading) {
      setTimeout(() => {
        const modalContent = document.querySelector(".post-detail-modal .ant-modal-content");
        if (modalContent) {
          modalContent.scrollTop = 0;
        }
      }, 200);
    }
  }, [isPostDetailVisible, loading]);

  const handleClose = () => {
    setIsPostDetailVisible(false);
    setActivePostId("");
    window.history.pushState(null, "", "/");
  };

  const handlePostUpdated = (updatedData) => {
    setPost(prev => (prev ? { ...prev, ...updatedData } : null));
  };

  return (
    <Modal
      open={isPostDetailVisible}
      onCancel={handleClose}
      footer={null}
      width={700}
      className="post-detail-modal"
      centered
      destroyOnClose={true}
      styles={{
        content: {
          borderRadius: 12,
          padding: "24px",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "var(--bg-card, #ffffff)",
          color: "var(--text-primary, #1c1e21)",
        },
        mask: {
          backdropFilter: "blur(4px)",
        }
      }}
    >
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <Spin indicator={<LoadingOutlined spin />} size="large" />
          <p style={{ marginTop: 12, color: "#65676b" }}>Đang tải bài viết...</p>
        </div>
      ) : post ? (
        <div className="post-detail-modal__content post-item">
          <PostHeader post={post} onPostUpdated={handlePostUpdated} />
          <PostContent post={post} />
          <PostActions 
            post={post} 
            showComments={true} 
            onToggleComments={() => {}} 
            onPostUpdated={handlePostUpdated}
          />
          <CommentSection 
            postId={post.id} 
            postAuthorUid={post.uid} 
            isPreview={false} 
            onPostUpdated={handlePostUpdated} 
            commentsCount={post.commentsCount || 0}
          />
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#65676b" }}>
          Không tìm thấy bài viết hoặc bài viết đã bị xóa.
        </div>
      )}
    </Modal>
  );
}
