import React, { useState, useEffect } from 'react';
import { Button, Avatar, Tooltip, Spin } from 'antd';
import { AiOutlinePhone, AiOutlineVideoCamera, AiOutlineAudioMuted, AiOutlineClockCircle, AiOutlineSync } from "react-icons/ai";
import { MdCallEnd } from "react-icons/md";
import { LoadingOutlined } from '@ant-design/icons';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { getUserDocIdByUid } from '../../firebase/services';
import './videoCallOverlay.scss';

export default function VideoCallOverlay({
  callStatus,
  callerUser,
  otherUser,
  user,
  localVideoRef,
  remoteVideoRef,
  isVideoEnabled,
  isMuted,
  isRemoteVideoEnabled,
  handleAnswerCall,
  handleRejectCall,
  handleEndCall,
  handleToggleMute,
  handleToggleVideo,
}) {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (!user?.uid) return;

      try {
        const docId = await getUserDocIdByUid(user.uid);
        if (docId) {
          const userDoc = await getDoc(doc(db, 'users', docId));
          if (userDoc.exists()) {
            const userData = { id: userDoc.id, ...userDoc.data() };
            setCurrentUser(userData);
          }
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };

    fetchCurrentUser();
  }, [user?.uid]);

  const displayUser = callerUser || otherUser;
  const isLoading = !displayUser || displayUser._isPlaceholder;
  const displayName = isLoading ? 'Đang tải...' : (displayUser?.displayName || 'Unknown User');
  const photoURL = isLoading ? null : displayUser?.photoURL;

  const getCallStatusText = () => {
    switch(callStatus) {
      case 'calling': return 'Đang gọi...';
      case 'ringing': return 'Đang đổ chuông...';
      case 'connecting': return 'Đang kết nối...';
      case 'connected': return 'Đã kết nối';
      case 'busy': return 'Máy bận';
      default: return '';
    }
  };

  const getCallStatusIcon = () => {
    switch(callStatus) {
      case 'calling': return <AiOutlinePhone />;
      case 'ringing': return <AiOutlineClockCircle />;
      case 'connecting': return <AiOutlineSync />;
      default: return null;
    }
  };

  return (
    <div className="video-call-overlay">
      {/* Top bar with user info and status */}
      <div className="video-call-overlay__top-bar">
        <div className="video-call-overlay__user-info">
          {isLoading ? (
            <div className="video-call-overlay__avatar-loading">
              <Spin indicator={<LoadingOutlined style={{ fontSize: 20, color: 'white' }} spin />} />
            </div>
          ) : (
            <Avatar
              src={photoURL}
              size={48}
              style={{ border: '2px solid white' }}
            >
              {displayName.charAt(0).toUpperCase()}
            </Avatar>
          )}
          <div className="video-call-overlay__user-details">
            <div className="video-call-overlay__user-name">
              {displayName}
            </div>
            <div className="video-call-overlay__call-status">
              {getCallStatusText()}
            </div>
          </div>
        </div>
      </div>

      {/* Video container */}
      <div className="video-call-overlay__video-container">
        {/* Remote video (main) */}
        <div className="video-call-overlay__remote-video">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`video-call-overlay__video ${!isRemoteVideoEnabled ? 'video-call-overlay__video--hidden' : ''}`}
          />

          {/* Overlay when remote video is disabled */}
          {callStatus === 'connected' && !isRemoteVideoEnabled && (
            <div className="video-call-overlay__video-disabled">
              <Avatar size={128} src={photoURL}>
                {displayName.charAt(0).toUpperCase()}
              </Avatar>
            </div>
          )}

          {/* Overlay when not connected */}
          {callStatus !== 'connected' && (
            <div className="video-call-overlay__connecting">
              <div className="video-call-overlay__connecting-content">
                {isLoading ? (
                  <>
                    <div className="video-call-overlay__connecting-icon">
                      <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
                    </div>
                    <div className="video-call-overlay__connecting-text">
                      Đang tải thông tin...
                    </div>
                  </>
                ) : (
                  <>
                    <div className="video-call-overlay__connecting-icon">
                      {getCallStatusIcon()}
                    </div>
                    <div className="video-call-overlay__connecting-text">
                      {getCallStatusText()}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Local video (PiP) */}
          <div className="video-call-overlay__local-video">
            <video 
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="video-call-overlay__video video-call-overlay__video--mirror"
            />
            {!isVideoEnabled && (
              <div className="video-call-overlay__video-disabled">
                <Avatar size={64} src={currentUser?.photoURL}>
                  {currentUser?.displayName?.charAt(0).toUpperCase()}
                </Avatar>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom control bar */}
      <div className="video-call-overlay__controls">
        {/* Mute button */}
        <Tooltip title={isMuted ? 'Bật mic' : 'Tắt mic'}>
          <Button
            type={isMuted ? 'primary' : 'default'}
            danger={isMuted}
            size="large"
            onClick={handleToggleMute}
            className={`video-call-overlay__control-btn ${isMuted ? 'video-call-overlay__control-btn--muted' : ''}`}
          >
            <AiOutlineAudioMuted />
          </Button>
        </Tooltip>

        {/* End call button */}
        <Button
          danger
          type="primary"
          size="large"
          onClick={handleEndCall}
          className="video-call-overlay__control-btn video-call-overlay__control-btn--end"
        >
          <MdCallEnd />
        </Button>

        {/* Video toggle button */}
        <Tooltip title={isVideoEnabled ? 'Tắt camera' : 'Bật camera'}>
          <Button
            type={isVideoEnabled ? 'default' : 'primary'}
            danger={!isVideoEnabled}
            size="large"
            onClick={handleToggleVideo}
            className={`video-call-overlay__control-btn ${!isVideoEnabled ? 'video-call-overlay__control-btn--video-off' : ''}`}
          >
            <AiOutlineVideoCamera />
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}