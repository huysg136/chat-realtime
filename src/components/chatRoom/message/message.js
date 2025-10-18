import React, { useMemo, useContext } from "react";
import { Avatar } from "antd";
// import { format } from "date-fns";
// import { vi } from "date-fns/locale";
import "./message.scss";
import { AppContext } from "../../../context/appProvider";

// function formatDate(timestamp) {
//   if (!timestamp) return "";
//   let date;
//   if (timestamp.seconds) {
//     date = new Date(timestamp.seconds * 1000);
//   } else {
//     date = new Date(timestamp);
//   }
//   if (isNaN(date)) return "";
//   return format(date, "HH:mm dd/MM/yy", { locale: vi });
// }

const renderTextWithLinks = (text) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  while ((match = urlRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <a
        key={match.index}
        href={match[0]}
        target="_blank"
        rel="noopener noreferrer"
        className="message-link"
      >
        {match[0]}
      </a>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
};


export default function Message({ text, displayName, createdAt, photoURL, isOwn }) {
  const { rooms, selectedRoomId } = useContext(AppContext);
  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId),
    [rooms, selectedRoomId]
  );
  const isPrivate = selectedRoom.type === "private";
  return (
    <div className={`message-row ${isOwn ? "own" : ""}`}>
      {!isOwn && (
        <Avatar
          className="message-avatar"
          src={
            photoURL ||
            "https://images.spiderum.com/sp-images/9ae85f405bdf11f0a7b6d5c38c96eb0e.jpeg"
          }
          size={28}
        />
      )}

      <div className="message-content">
        <div className="message-bubble">
          {!isPrivate && !isOwn && (
            <span className="message-name">{displayName}</span>
          )}
          <span className="message-text">{renderTextWithLinks(text)}</span>
        </div>
      </div>
    </div>
  );
}