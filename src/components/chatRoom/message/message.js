import React from 'react';
import { Avatar, Typography } from 'antd';
import './message.scss';

export default function Message({ text, displayName, createdAt, photoURL }) {
  const displayTime =
    createdAt && createdAt.seconds
      ? new Date(createdAt.seconds * 1000).toLocaleTimeString()
      : createdAt;

  return (
    <div className="message-wrapper">
      <div className="message-header">
        <Avatar size="small" src={photoURL}>
          {!photoURL && displayName?.charAt(0)?.toUpperCase()}
        </Avatar>
        <Typography.Text className="author">{displayName}</Typography.Text>
        <Typography.Text className="date">{displayTime}</Typography.Text>
      </div>
      <div className="message-content">
        <Typography.Text>{text}</Typography.Text>
      </div>
    </div>
  );
}
