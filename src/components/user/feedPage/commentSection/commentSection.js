import React, { useEffect, useState, useContext } from "react";
import { collection, query, where, orderBy, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "../../../../firebase/config";
import { AppContext } from "../../../../context/appProvider";
import CommentItem from "./commentItem";
import CommentInput from "./commentInput";
import "./commentSection.scss";

export default function CommentSection({ postId, postAuthorUid, isPreview = false, onPostUpdated, commentsCount, topComment }) {
  const [comments, setComments] = useState(topComment ? [topComment] : []);
  const { users } = useContext(AppContext);
  const commentScoresRef = React.useRef({});

  useEffect(() => {
    if (!postId) return;
    // Nếu là preview và đã có topComment từ Backend thì không cần fetch nữa
    if (isPreview && topComment) return;

    const q = query(
      collection(db, "comments"),
      where("postId", "==", postId)
    );

    if (isPreview) {
      getDocs(q).then((snap) => {
        const fetchedComments = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        fetchedComments.sort((a, b) => {
          const aTime = a.createdAt?.seconds ?? a.createdAt?.toMillis?.() / 1000 ?? 0;
          const bTime = b.createdAt?.seconds ?? b.createdAt?.toMillis?.() / 1000 ?? 0;
          return aTime - bTime;
        });
        setComments(fetchedComments);
      }).catch((error) => {
        console.error("Error fetching preview comments:", error);
      });
    } else {
      const unsub = onSnapshot(q, (snap) => {
        const fetchedComments = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        fetchedComments.sort((a, b) => {
          const aTime = a.createdAt?.seconds ?? a.createdAt?.toMillis?.() / 1000 ?? 0;
          const bTime = b.createdAt?.seconds ?? b.createdAt?.toMillis?.() / 1000 ?? 0;
          return aTime - bTime;
        });
        setComments(fetchedComments);
      }, (error) => {
        console.error("Error fetching comments:", error);
      });

      return () => unsub();
    }
  }, [postId, isPreview]);

  const topLevel = comments.filter((c) => !c.parentId);

  // Áp dụng thuật toán Top Comments cho bình luận gốc
  topLevel.sort((a, b) => {
    const scoresMap = commentScoresRef.current;

    // Điểm A
    if (scoresMap[a.id] === undefined) {
      const authorA = users.find(u => u.uid === a.uid) || {};
      const likesA = (a.likes || []).length;
      const isPostAuthorA = a.uid === postAuthorUid;
      const isAdminA = authorA.role === "admin";
      scoresMap[a.id] = (likesA * 2) + (isPostAuthorA ? 5 : 0) + (isAdminA ? 8 : 0);
    }
    const scoreA = scoresMap[a.id];

    // Điểm B
    if (scoresMap[b.id] === undefined) {
      const authorB = users.find(u => u.uid === b.uid) || {};
      const likesB = (b.likes || []).length;
      const isPostAuthorB = b.uid === postAuthorUid;
      const isAdminB = authorB.role === "admin";
      scoresMap[b.id] = (likesB * 2) + (isPostAuthorB ? 5 : 0) + (isAdminB ? 8 : 0);
    }
    const scoreB = scoresMap[b.id];

    // Ưu tiên điểm cao
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }

    // Bằng điểm thì cũ nhất xếp trên
    const aTime = a.createdAt?.seconds ?? 0;
    const bTime = b.createdAt?.seconds ?? 0;
    return aTime - bTime;
  });
  const repliesMap = comments
    .filter((c) => c.parentId)
    .reduce((acc, c) => {
      acc[c.parentId] = acc[c.parentId] ? [...acc[c.parentId], c] : [c];
      return acc;
    }, {});

  return (
    <div className="comment-section">
      {!isPreview && <CommentInput postId={postId} postAuthorUid={postAuthorUid} onPostUpdated={onPostUpdated} commentsCount={commentsCount} />}

      <div className="comment-section__list">
        {isPreview ? (
          topLevel.length > 0 && (
            <CommentItem
              key={topLevel[0].id}
              comment={topLevel[0]}
              postId={postId}
              repliesMap={repliesMap}
              isPreview={true}
              onPostUpdated={onPostUpdated}
              commentsCount={commentsCount}
            />
          )
        ) : (
          topLevel.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              postId={postId}
              repliesMap={repliesMap}
              isPreview={false}
              onPostUpdated={onPostUpdated}
              commentsCount={commentsCount}
            />
          ))
        )}
      </div>
    </div>
  );
}
