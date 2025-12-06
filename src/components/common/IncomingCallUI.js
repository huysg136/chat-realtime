import React, { useState, useRef } from 'react';
import { Avatar, Spin } from 'antd';
import { AiOutlinePhone } from "react-icons/ai";
import { MdCallEnd } from "react-icons/md";
import { LoadingOutlined } from '@ant-design/icons';

export default function IncomingCallUI({ caller, onAccept, onReject }) {
  const isLoading = !caller || caller._isPlaceholder;
  const displayName = isLoading ? 'Đang tải...' : (caller?.displayName || 'Unknown User');
  const photoURL = isLoading ? null : caller?.photoURL;

  const [position, setPosition] = useState(null);
  const dragRef = useRef(null);
  const offsetRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    e.preventDefault();
    const rect = dragRef.current.getBoundingClientRect();
    offsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e) => {
    setPosition({ x: e.clientX - offsetRef.current.x, y: e.clientY - offsetRef.current.y });
  };

  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  return (
    <>
      <style>{`
        .incoming-call-container {
          position: fixed;
          z-index: 99999;
          background-color: rgba(0, 0, 0, 0.9);
          border-radius: 16px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          min-width: 280px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          cursor: grab;
          user-select: none;
        }

        .incoming-call-header {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          margin-bottom: 10px;
        }

        .incoming-avatar {
          border: 2px solid white;
        }

        .incoming-avatar.loading {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: 2px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: rgba(255,255,255,0.1);
        }

        .incoming-info {
          flex: 1;
        }

        .incoming-name {
          color: white;
          font-size: 16px;
          font-weight: bold;
        }

        .incoming-status {
          color: rgba(255,255,255,0.7);
          font-size: 14px;
        }

        .incoming-buttons {
          display: flex;
          gap: 12px;
          width: 100%;
          justify-content: center;
        }

        .accept-btn,
        .reject-btn {
          height: 56px;
          width: 56px;
          border-radius: 50%;
          font-size: 20px;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: white;
        }

        .accept-btn {
          background: #52c41a;
        }

        .accept-btn.disabled {
          background: #666;
          cursor: not-allowed;
        }

        .reject-btn {
          background: #ff4d4f !important;
        }
      `}</style>

      {/* UI */}
      <div
        ref={dragRef}
        onMouseDown={handleMouseDown}
        className="incoming-call-container"
        style={{
          left: position ? `${position.x}px` : undefined,
          top: position ? `${position.y}px` : undefined,
          bottom: position ? undefined : '20px',
          right: position ? undefined : '20px'
        }}
      >
        <div className="incoming-call-header">
          {isLoading ? (
            <div className="incoming-avatar loading">
              <Spin indicator={<LoadingOutlined style={{ fontSize: 20, color: 'white' }} spin />} />
            </div>
          ) : (
            <Avatar src={photoURL} size={48} className="incoming-avatar">
              {displayName.charAt(0).toUpperCase()}
            </Avatar>
          )}

          <div className="incoming-info">
            <div className="incoming-name">{displayName}</div>
            <div className="incoming-status">Cuộc gọi đến...</div>
          </div>
        </div>

        <div className="incoming-buttons">
          <button
            className={`accept-btn ${isLoading ? 'disabled' : ''}`}
            onClick={onAccept}
            disabled={isLoading}
          >
            <AiOutlinePhone />
          </button>

          <button
            className="reject-btn"
            onClick={onReject}
          >
            <MdCallEnd />
          </button>
        </div>
      </div>
    </>
  );
}
