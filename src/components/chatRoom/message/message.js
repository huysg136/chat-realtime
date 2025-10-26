import React, { useMemo, useContext } from "react";
import { Avatar } from "antd";
import { FaReply } from "react-icons/fa";
import { AppContext } from "../../../context/appProvider";
import MediaRenderer from "./MediaRenderer";
import "./message.scss";

// Reply preview
const ReplyPreview = ({ replyTo, isOwn }) => {
  if (!replyTo) return null;
  return (
    <div className={`reply-preview-in-message ${isOwn ? "own" : ""}`}>
      <span className="reply-label">Trả lời {replyTo.displayName}:</span>
      <p className="reply-text">{replyTo.text || replyTo.decryptedText}</p>
    </div>
  );
};

// Main Message component
export default function Message({ text, displayName, photoURL, isOwn, replyTo, onReply, kind }) {
  const { rooms, selectedRoomId } = useContext(AppContext);
  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === selectedRoomId),
    [rooms, selectedRoomId]
  );
  const isPrivate = selectedRoom?.type === "private";

  const handleReply = () => {
    if (onReply)
      onReply({ id: Date.now().toString(), decryptedText: text, displayName });
  };

  const defaultAvatar =
    "https://images.spiderum.com/sp-images/9ae85f405bdf11f0a7b6d5c38c96eb0e.jpeg";

  // Kiểm tra xem có phải là media không cần bubble
  const isMediaWithoutBubble = kind === "picture" || kind === "video";

  return (
    <div className={`message-row ${isOwn ? "own" : ""}`}>
      {!isOwn && (
        <Avatar src={photoURL || defaultAvatar} size={28} className="message-avatar" />
      )}

      <div className="message-content">
        {!isPrivate && !isOwn && isMediaWithoutBubble && (
          <span className="message-name" style={{ paddingLeft: '4px' }}>
            {displayName}
          </span>
        )}

        {isMediaWithoutBubble && <ReplyPreview replyTo={replyTo} isOwn={isOwn} />}

        {isMediaWithoutBubble ? (
          <MediaRenderer
            kind={kind}
            content={text}
            fileName={text.split("/").pop()}
            isOwn={isOwn}
          />
        ) : (
          <div className="message-bubble">
            {!isPrivate && !isOwn && (
              <span className="message-name">{displayName}</span>
            )}
            <ReplyPreview replyTo={replyTo} isOwn={isOwn} />
            <MediaRenderer
              kind={kind}
              content={text}
              fileName={text.split("/").pop()}
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