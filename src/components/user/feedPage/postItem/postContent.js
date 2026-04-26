import React, { useState } from "react";
import 'react-image-lightbox/style.css';
import Lightbox from 'react-image-lightbox';

export default function PostContent({ post }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="post-content">
      {post.content && <p className="post-content__text">{post.content}</p>}
      
      {post.mediaUrl && (
        <div className="post-content__media">
          {post.kind === "video" ? (
            <video src={post.mediaUrl} controls className="media-element" />
          ) : (
            <>
              <img 
                src={post.mediaUrl} 
                alt="Post media" 
                className="media-element" 
                onClick={() => setIsOpen(true)}
                style={{ cursor: "pointer" }}
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
