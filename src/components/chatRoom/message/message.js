import React from 'react';
import { Avatar, Typography } from 'antd';
import { formatRelative } from 'date-fns';
import { vi } from 'date-fns/locale';
import './message.scss';

function formatDate(timestamp) {
  if (!timestamp) return '';
  let date;
  if (timestamp.seconds) {
    date = new Date(timestamp.seconds * 1000);
  } else {
    date = new Date(timestamp);
  }
  if (isNaN(date)) return '';
  // format lại tiếng việt
  let formattedDate = formatRelative(date, new Date(), { locale: vi });
  return formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
}

export default function Message({ text, displayName, createdAt, photoURL }) {
  return (
    <div className="message-wrapper">
      <div className="message-header">
        <Avatar
          size="small"
          src={photoURL || "https://images.spiderum.com/sp-images/9ae85f405bdf11f0a7b6d5c38c96eb0e.jpeg"}
        />
        <Typography.Text className="author">{displayName}</Typography.Text>
        <Typography.Text className="date">
          {formatDate(createdAt)}
        </Typography.Text>
      </div>
      <div className="message-content">
        <Typography.Text>{text}</Typography.Text>
      </div>
    </div>
  );
}
