// MediaRenderer.jsx
import React, { useState } from 'react';
import ReactPlayer from 'react-player';
import AudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';
import { MdAttachFile } from "react-icons/md";
import 'react-image-lightbox/style.css';
import Lightbox from 'react-image-lightbox';

const MediaRenderer = ({ kind, content, fileName, isOwn }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!content) return null;

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
      <div className="message-media-video">
        <ReactPlayer
          url={content}
          controls
          width="100%"
          height="auto"
          style={{ maxWidth: '300px', maxHeight: '200px' }}
        />
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

  if (kind === 'link' || /^https?:\/\/\S+$/.test(content)) {
    return (
      <a
        href={content}
        target="_blank"
        rel="noopener noreferrer"
        className={`message-media-link ${isOwn ? 'own' : ''}`}
      >
        {fileName || content}
      </a>
    );
  }

  return <span className="message-text-part">{content}</span>;
};

export default MediaRenderer;
