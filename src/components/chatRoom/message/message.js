import React from "react";
import { Avatar } from "antd";
// import { format } from "date-fns";
// import { vi } from "date-fns/locale";
import "./message.scss";

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

export default function Message({ text, displayName, createdAt, photoURL, isOwn }) {
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
          {!isOwn && <span className="message-name">{displayName}</span>}
          <span className="message-text">{text}</span>
        </div>
      </div>
    </div>
  );
}