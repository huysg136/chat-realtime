import React, { useState } from "react";
import 'react-image-lightbox/style.css';
import Lightbox from 'react-image-lightbox';

export default function PostContent({ post, hasError, setHasError }) {
  const [isOpen, setIsOpen] = useState(false);

  const renderContentWithHashtags = (text) => {
    if (!text) return null;
    const parts = text.split(/(#[\p{L}\p{N}_-]+)/gu);
    return parts.map((part, index) => {
      if (part.match(/^#[\p{L}\p{N}_-]+$/u)) {
        return (
          <span key={index} style={{ color: "#1890ff", cursor: "pointer" }}>
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="post-content">
      {post.content && <p className="post-content__text">{renderContentWithHashtags(post.content)}</p>}
      
      {post.mediaUrl && !hasError && (
        <div className="post-content__media">
          {post.kind === "video" ? (
            <video 
              src={post.mediaUrl} 
              controls 
              className="media-element" 
              onError={() => setHasError(true)}
            />
          ) : (
            <>
              <img 
                src={post.mediaUrl} 
                alt="Post media" 
                className="media-element" 
                onClick={() => setIsOpen(true)}
                style={{ cursor: "pointer" }}
                onError={() => setHasError(true)}
              />
              {isOpen && (
                <Lightbox
                  mainSrc={post.mediaUrl}
                  onCloseRequest={() => setIsOpen(false)}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
