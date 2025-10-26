import React, { useMemo, useContext, useState, useEffect } from "react";
import { Avatar } from "antd";
import { FaReply } from "react-icons/fa";
import { AppContext } from "../../../context/appProvider";
import MediaRenderer from "./MediaRenderer";
import { db } from "../../../firebase/config";
import { doc, onSnapshot } from "firebase/firestore";
import { getUserDocIdByUid } from "../../../firebase/services"; 
import "./message.scss";

const ReplyPreview = ({ replyTo, isOwn }) => {
  if (!replyTo) return null;
  return (
    <div className={`reply-preview-in-message ${isOwn ? "own" : ""}`}>
      <span className="reply-label">Trả lời {replyTo.displayName}:</span>
      <p className="reply-text">{replyTo.text || replyTo.decryptedText}</p>
    </div>
  );
};

export default function Message({
  text,
  displayName: initialDisplayName,
  photoURL: initialPhoto,
  isOwn,
  replyTo,
  onReply,
  kind,
  uid,
}) {
  const { rooms, selectedRoomId } = useContext(AppContext);
  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === selectedRoomId),
    [rooms, selectedRoomId]
  );
  const isPrivate = selectedRoom?.type === "private";

  const [displayName, setDisplayName] = useState(initialDisplayName || "Unknown");
  const [photoURL, setPhotoURL] = useState(initialPhoto || null);

  // realtime lắng nghe user doc
  useEffect(() => {
    if (!uid) return;
    let unsubscribe = null;

    getUserDocIdByUid(uid).then((docId) => {
      if (!docId) return;
      unsubscribe = onSnapshot(doc(db, "users", docId), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setDisplayName(data.displayName || initialDisplayName);
          setPhotoURL(data.photoURL || initialPhoto);
        }
      });
    });

    return () => unsubscribe?.();
  }, [uid, initialDisplayName, initialPhoto]);

  const handleReply = () => {
    if (onReply)
      onReply({ id: Date.now().toString(), decryptedText: text, displayName });
  };

  const defaultAvatar =
    "https://images.spiderum.com/sp-images/9ae85f405bdf11f0a7b6d5c38c96eb0e.jpeg";

  const isMediaWithoutBubble = kind === "picture" || kind === "video";

  return (
    <div className={`message-row ${isOwn ? "own" : ""}`}>
      {!isOwn && (
        <Avatar src={photoURL || defaultAvatar} size={28} className="message-avatar" />
      )}

      <div className="message-content">
        {!isPrivate && !isOwn && isMediaWithoutBubble && (
          <span className="message-name" style={{ paddingLeft: "4px" }}>
            {displayName}
          </span>
        )}

        {isMediaWithoutBubble && <ReplyPreview replyTo={replyTo} isOwn={isOwn} />}

        {isMediaWithoutBubble ? (
          <MediaRenderer
            kind={kind}
            content={text}
            fileName={text.split("/").pop().slice(14)}
            isOwn={isOwn}
          />
        ) : (
          <div className="message-bubble">
            {!isPrivate && !isOwn && <span className="message-name">{displayName}</span>}
            <ReplyPreview replyTo={replyTo} isOwn={isOwn} />
            <MediaRenderer
              kind={kind}
              content={text}
              fileName={text.split("/").pop().slice(14)}
              isOwn={isOwn}
            />
          </div>
        )}

        <div className="message-hover" onClick={handleReply}>
          <FaReply />
        </div>
      </div>
    </div>
  );
}
