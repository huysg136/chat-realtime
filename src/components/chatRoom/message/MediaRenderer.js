// MediaRenderer.jsx
import React, { useState } from 'react';
import ReactPlayer from 'react-player';
import AudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';
import { MdAttachFile } from "react-icons/md";
import 'react-image-lightbox/style.css';
import Lightbox from 'react-image-lightbox';

const MediaRenderer = ({ kind, content, fileName, isOwn, isRevoked }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!content) return null;

  if (isRevoked) {
    return <span className="message-text-part revoked">[Tin nhắn đã được thu hồi]</span>;
  }

  if (kind === 'picture' || kind === 'image') {
    return (
      <>
        <img
          src={content}
          alt={fileName || ''}
          className="message-media-image"
          onClick={() => setIsOpen(true)}
          onError={(e) => (e.target.style.display = 'none')}
        />
        {isOpen && (
          <Lightbox
            mainSrc={content}
            onCloseRequest={() => setIsOpen(false)}
            imageTitle={fileName}
          />
        )}
      </>
    );
  }

  if (kind === 'video') {
    return (
      <div
        className="message-media-video"
        style={{
          maxWidth: "320px",
          borderRadius: "12px",
          overflow: "hidden",
          background: "#000",
        }}
      >
        {content.endsWith(".mp4") || content.includes("firebasestorage") ? (
          <video
            src={content}
            controls
            style={{
              width: "100%",
              height: "auto",
              display: "block",
              borderRadius: "12px",
            }}
            preload="metadata"
          />
        ) : (
          <ReactPlayer
            url={content}
            controls
            width="100%"
            height="100%"
            className="react-player"
          />
        )}
      </div>
    );
  }


  if (kind === 'audio') {
    return (
      <div className="message-media-audio">
        <AudioPlayer
          src={content}
          showJumpControls={false}
          showDownloadProgress={false}
          customAdditionalControls={[]}
          customVolumeControls={[]}
          layout="horizontal-reverse"
          style={{
            backgroundColor: isOwn ? 'rgba(255,255,255,0.1)' : '#f5f5f5',
            borderRadius: '8px',
            boxShadow: 'none'
          }}
        />
      </div>
    );
  }

  if (kind === 'file') {
    return (
      <a
        href={content}
        target="_blank"
        rel="noopener noreferrer"
        className={`message-media-file ${isOwn ? 'own' : ''}`}
      >
        <MdAttachFile className="file-icon" />
        <span className="file-name">{fileName}</span>
      </a>
    );
  }

  const urlRegex = /((https?:\/\/)?((www\.)?[\w-]+(\.[\w-]+)+)(\/[^\s]*)?)/i;
  if (urlRegex.test(content.trim()) && content.trim().match(urlRegex)[0] === content.trim()) {
    const href = content.startsWith("http") ? content : `https://${content}`;
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`message-media-link ${isOwn ? "own" : ""}`}
        style={{ display: "inline-block", textDecoration: "underline" }}
      >
        {content}
      </a>
    );
  }
  const parts = content.split(/((?:https?:\/\/)?(?:www\.)?[\w-]+(?:\.[\w-]+)+(?:[/?#][[^\s]*)?)/);
  return (
    <span className="message-text-part">
      {parts.map((part, i) => {
        if (/^(?:https?:\/\/)?(?:www\.)?[\w-]+(?:\.[\w-]+)+(?:[/?#][^\s]*)?$/.test(part)) {
          const href = part.startsWith("http") ? part : `https://${part}`;
          return (
            <a
              key={i}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={`message-media-link ${isOwn ? "own" : ""}`}
            >
              {part}
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
};

export default MediaRenderer;
