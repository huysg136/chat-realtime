import React, { useState } from 'react';
import ReactPlayer from 'react-player';
import { useTranslation } from 'react-i18next';
import 'react-h5-audio-player/lib/styles.css';
import { MdAttachFile, MdImageNotSupported } from "react-icons/md";
import 'react-image-lightbox/style.css';
import Lightbox from 'react-image-lightbox';
import { SlSpeech } from "react-icons/sl";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';


const NOT_FOUND_IMAGE = "https://upload.wikimedia.org/wikipedia/commons/a/a3/Image-not-found.png";

const MediaRenderer = ({ kind, content, fileName, isOwn, isRevoked, action, actorUid, targetUid, users, transcript }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const [hasError, setHasError] = useState(false);
  const audioRef = React.useRef(null);


  if (!content && kind !== 'system') return null;

  if (isRevoked) {
    return <span className="message-text-part revoked">{t('roomList.revoked')}</span>;
  }

  if (hasError) {
    if (kind === 'audio') {
      return <span className="message-text-part revoked">[{t('message.voiceUnavailable')}]</span>;
    }
    return (
      <img
        src={NOT_FOUND_IMAGE}
        alt="Not found"
        className="media-not-found"
      />
    );
  }

  if (kind === 'system') {
    const actor = users.find(u => u.uid === actorUid);
    const target = users.find(u => u.uid === targetUid);

    const actorName = actor?.displayName || "Unknown";
    const targetName = target?.displayName || "Unknown";
    const actorPhoto = actor?.photoURL;
    const targetPhoto = target?.photoURL;

    let messageContent = null;

    switch (action) {
      case 'add_member':
        messageContent = (
          <span className="system-text">
            {targetPhoto && <img src={targetPhoto} alt={targetName} className="system-avatar" />}
            <span className="system-name">{targetName}</span>
            {t('system.addedBy')}
            {actorPhoto && <img src={actorPhoto} alt={actorName} className="system-avatar" />}
            <span className="system-name">{actorName}</span>
            {t('system.toGroup')}
          </span>
        );
        break;
      case 'create_group':
        messageContent = (
          <span className="system-text">
            {actorPhoto && <img src={actorPhoto} alt={actorName} className="system-avatar" />}
            <span className="system-name">{actorName}</span>
            {t('system.createdGroup')}
          </span>
        );
        break;
      case 'remove_member':
        messageContent = (
          <span className="system-text">
            {targetPhoto && <img src={targetPhoto} alt={targetName} className="system-avatar" />}
            <span className="system-name">{targetName}</span>
            {t('system.removedBy')}
            {actorPhoto && <img src={actorPhoto} alt={actorName} className="system-avatar" />}
            <span className="system-name">{actorName}</span>
          </span>
        );
        break;
      case 'leave_group':
        messageContent = (
          <span className="system-text">
            {actorPhoto && <img src={actorPhoto} alt={actorName} className="system-avatar" />}
            <span className="system-name">{actorName}</span>
            {t('system.leftGroup')}
          </span>
        );
        break;
      case 'transfer_ownership':
        messageContent = (
          <span className="system-text">
            {targetPhoto && <img src={targetPhoto} alt={targetName} className="system-avatar" />}
            <span className="system-name">{targetName}</span>
            {t('system.appointedOwner')}
            {actorPhoto && <img src={actorPhoto} alt={actorName} className="system-avatar" />}
            <span className="system-name">{actorName}</span>
            {t('system.appointedOwnerEnd')}
          </span>
        );
        break;
      case 'accept_invite':
        messageContent = (
          <span className="system-text">
            {actorPhoto && <img src={actorPhoto} alt={actorName} className="system-avatar" />}
            <span className="system-name">{actorName}</span>
            {t('system.acceptedInvite')}
            {targetPhoto && <img src={targetPhoto} alt={targetName} className="system-avatar" />}
            <span className="system-name">{targetName}</span>
          </span>
        );
        break;
      default:
        messageContent = <span className="system-text">{t('system.systemMessage')}</span>;
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
          onError={() => setHasError(true)}
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
            onError={() => setHasError(true)}
          />
        ) : (
          <ReactPlayer
            url={content}
            controls
            width="100%"
            height="100%"
            className="react-player"
            onError={() => setHasError(true)}
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
        if (isPlaying) audioRef.current.pause();
        else audioRef.current.play();
        setIsPlaying(!isPlaying);
      }
    };

    const handleTimeUpdate = () => {
      if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
    };

    const handleLoadedMetadata = () => {
      if (audioRef.current) setDuration(audioRef.current.duration);
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
        <div className="voice-message-controls">
          <audio
            ref={audioRef}
            src={content}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
            onError={() => setHasError(true)}
          />

          <button className="voice-play-btn" onClick={togglePlay}>
            {isPlaying ? (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <div className="voice-content">
            <div className="voice-waveform" onClick={handleSeek}>
              <div className="voice-progress" style={{ width: `${progress}%` }} />
              <div className="voice-bars">
                {[3, 5, 4, 6, 3, 5, 7, 4, 5, 3, 6, 4, 5, 3, 7, 5, 4, 6, 3, 5].map((height, i) => (
                  <div key={i} className="voice-bar" style={{ height: `${height * 3}px` }} />
                ))}
              </div>
            </div>
            <div className="voice-time">{formatTime(isPlaying ? currentTime : duration)}</div>
          </div>

          {transcript && (
            <button
              className={`toggle-transcript-btn ${showTranscript ? 'open' : ''}`}
              onClick={() => setShowTranscript(!showTranscript)}
            >
              <SlSpeech />
            </button>
          )}
        </div>


        {showTranscript && transcript && (
          <div className="voice-transcript">
            {transcript}
          </div>
        )}
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

  return (
    <div className={`message-markdown-wrapper ${isOwn ? "own" : ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <SyntaxHighlighter
                style={vscDarkPlus}
                language={match[1]}
                PreTag="div"
                customStyle={{
                  margin: '6px 0',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  padding: '8px 12px',
                  maxWidth: '100%',
                }}
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code
                className={`inline-code ${className || ''}`}
                style={{
                  backgroundColor: isOwn ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.08)',
                  color: isOwn ? '#fff' : '#d63384',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                  fontSize: '0.9em',
                }}
                {...props}
              >
                {children}
              </code>
            );
          },
          a({ node, href, children, ...props }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="message-media-link"
                style={{
                  color: isOwn ? '#ffffff' : '#0084ff',
                  textDecoration: 'underline',
                  fontWeight: 500,
                  wordBreak: 'break-all',
                }}
                {...props}
              >
                {children}
              </a>
            );
          },
          p({ node, children }) {
            return <p style={{ margin: 0, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{children}</p>;
          },
          ul({ node, children }) {
            return <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>{children}</ul>;
          },
          ol({ node, children }) {
            return <ol style={{ margin: '4px 0', paddingLeft: '20px' }}>{children}</ol>;
          },
          blockquote({ node, children }) {
            return (
              <blockquote
                style={{
                  margin: '4px 0',
                  paddingLeft: '10px',
                  borderLeft: `3px solid ${isOwn ? 'rgba(255,255,255,0.7)' : '#0084ff'}`,
                  opacity: 0.9,
                }}
              >
                {children}
              </blockquote>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MediaRenderer;