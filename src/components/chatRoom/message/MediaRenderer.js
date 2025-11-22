import React, { useState } from 'react';
import ReactPlayer from 'react-player';
import AudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';
import { MdAttachFile } from "react-icons/md";
import 'react-image-lightbox/style.css';
import Lightbox from 'react-image-lightbox';

const MediaRenderer = ({ kind, content, fileName, isOwn, isRevoked, action, actorUid, targetUid, users }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = React.useRef(null);


  if (!content && kind !== 'system') return null;

  if (isRevoked) {
    return <span className="message-text-part revoked">[Tin nhắn đã được thu hồi]</span>;
  }

  if (kind === 'system') {
    const actor = users.find(u => u.uid === actorUid);
    const target = users.find(u => u.uid === targetUid);

    const actorName = actor?.displayName || "Unknown";
    const targetName = target?.displayName || "Unknown";
    const actorPhoto = actor?.photoURL;
    const targetPhoto = target?.photoURL;

    let messageContent = null;

    switch(action) {
      case 'add_member':
        messageContent = (
          <span className="system-text">
            {targetPhoto && <img src={targetPhoto} alt={targetName} className="system-avatar" />}
            <span className="system-name">{targetName}</span> đã được
            {actorPhoto && <img src={actorPhoto} alt={actorName} className="system-avatar" />}
            <span className="system-name">{actorName}</span> thêm vào nhóm
          </span>
        );
        break;
      case 'create_group':
        messageContent = (
          <span className="system-text">
            {actorPhoto && <img src={actorPhoto} alt={actorName} className="system-avatar" />}
            <span className="system-name">{actorName}</span> đã tạo nhóm
          </span>
        );
        break;
      case 'remove_member':
        messageContent = (
          <span className="system-text">
            {targetPhoto && <img src={targetPhoto} alt={targetName} className="system-avatar" />}
            <span className="system-name">{targetName}</span> đã bị xóa khỏi nhóm bởi
            {actorPhoto && <img src={actorPhoto} alt={actorName} className="system-avatar" />}
            <span className="system-name">{actorName}</span>
          </span>
        );
        break;
      case 'leave_group':
        messageContent = (
          <span className="system-text">
            {actorPhoto && <img src={actorPhoto} alt={actorName} className="system-avatar" />}
            <span className="system-name">{actorName}</span> đã rời nhóm
          </span>
        );
        break;
      case 'transfer_ownership':
        messageContent = (
          <span className="system-text">
            {targetPhoto && <img src={targetPhoto} alt={targetName} className="system-avatar" />}
            <span className="system-name">{targetName}</span> đã được
            {actorPhoto && <img src={actorPhoto} alt={actorName} className="system-avatar" />}
            <span className="system-name">{actorName}</span> bổ nhiệm làm trưởng nhóm
          </span>
        );
        break;
      default:
        messageContent = <span className="system-text">[Tin nhắn hệ thống]</span>;
    }

    return (
      <div className="message-row system">
        <div className="system-bubble">
          {messageContent}
        </div>
      </div>
    );
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
    const formatTime = (time) => {
      if (isNaN(time)) return '0:00';
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const togglePlay = () => {
      if (audioRef.current) {
        if (isPlaying) {
          audioRef.current.pause();
        } else {
          audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
      }
    };

    const handleTimeUpdate = () => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
    };

    const handleLoadedMetadata = () => {
      if (audioRef.current) {
        setDuration(audioRef.current.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleSeek = (e) => {
      const progressBar = e.currentTarget;
      const clickPosition = e.nativeEvent.offsetX;
      const progressBarWidth = progressBar.offsetWidth;
      const newTime = (clickPosition / progressBarWidth) * duration;
      
      if (audioRef.current) {
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
      }
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
      <div className={`voice-message ${isOwn ? 'own' : ''}`}>
        <audio
          ref={audioRef}
          src={content}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
        />
        
        <button className="voice-play-btn" onClick={togglePlay}>
          {isPlaying ? (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" rx="1"/>
              <rect x="14" y="5" width="4" height="14" rx="1"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </button>

        <div className="voice-content">
          <div className="voice-waveform" onClick={handleSeek}>
            <div className="voice-progress" style={{ width: `${progress}%` }} />
            <div className="voice-bars">
              {[3, 5, 4, 6, 3, 5, 7, 4, 5, 3, 6, 4, 5, 3, 7, 5, 4, 6, 3, 5].map((height, i) => (
                <div
                  key={i}
                  className="voice-bar"
                  style={{ height: `${height * 3}px` }}
                />
              ))}
            </div>
          </div>
          
          <div className="voice-time">
            {formatTime(isPlaying ? currentTime : duration)}
          </div>
        </div>
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