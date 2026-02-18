import { useState, useEffect } from 'react';
import { Avatar, Tooltip, Spin } from 'antd';
import {
  AiOutlinePhone,
  AiOutlineVideoCamera,
  AiOutlineAudio,
  AiOutlineAudioMuted,
  AiOutlineClockCircle,
  AiOutlineSync
} from "react-icons/ai";
import { MdCallEnd, MdVideocamOff } from "react-icons/md";
import { LoadingOutlined } from '@ant-design/icons';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { getUserDocIdByUid } from '../../../firebase/services';
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
      }
    };

    fetchCurrentUser();
  }, [user?.uid]);

  const displayUser = callerUser || otherUser;
  const isLoading = !displayUser || displayUser._isPlaceholder;
  const displayName = isLoading ? 'Đang tải...' : (displayUser?.displayName || 'Unknown User');
  const photoURL = isLoading ? null : displayUser?.photoURL;

  const getCallStatusText = () => {
    switch (callStatus) {
      case 'calling': return 'Đang gọi...';
      case 'ringing': return 'Đang đổ chuông...';
      case 'connecting': return 'Đang kết nối...';
      case 'connected': return 'Đã kết nối';
      case 'busy': return 'Máy bận';
      default: return '';
    }
  };

  const getCallStatusIcon = () => {
    switch (callStatus) {
      case 'calling': return <AiOutlinePhone />;
      case 'ringing': return <AiOutlineClockCircle />;
      case 'connecting': return <AiOutlineSync />;
      default: return null;
    }
  };

  return (
    <div className="video-call-overlay">
      <div className="video-call-overlay__top-bar">
        <div className="video-call-overlay__user-info">
          {isLoading ? (
            <div className="video-call-overlay__avatar-loading">
              <Spin indicator={<LoadingOutlined style={{ fontSize: 20, color: 'white' }} spin />} />
            </div>
          ) : (
            <Avatar src={photoURL} size={48} style={{ border: '2px solid white' }}>
              {displayName.charAt(0).toUpperCase()}
            </Avatar>
          )}
          <div className="video-call-overlay__user-details">
            <div className="video-call-overlay__user-name">{displayName}</div>
            <div className="video-call-overlay__call-status">{getCallStatusText()}</div>
          </div>
        </div>
      </div>

      <div className="video-call-overlay__video-container">
        <div className="video-call-overlay__remote-video">

          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`video-call-overlay__video ${!isRemoteVideoEnabled ? 'video-call-overlay__video--hidden' : ''}`}
          />

          {callStatus === 'connected' && !isRemoteVideoEnabled && (
            <div className="video-call-overlay__video-disabled">
              <Avatar size={128} src={photoURL}>
                {displayName.charAt(0).toUpperCase()}
              </Avatar>
            </div>
          )}

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
                    <div className="video-call-overlay__connecting-icon">{getCallStatusIcon()}</div>
                    <div className="video-call-overlay__connecting-text">{getCallStatusText()}</div>
                  </>
                )}
              </div>
            </div>
          )}

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

      <div className="video-call-overlay__controls">
        <Tooltip title={isMuted ? "Bật mic" : "Tắt mic"}>
          <div
            onClick={handleToggleMute}
            className={`video-call-overlay__control-btn ${isMuted ? "video-call-overlay__control-btn--muted" : ""}`}
          >
            {isMuted ? <AiOutlineAudioMuted /> : <AiOutlineAudio />}
          </div>
        </Tooltip>

        <div
          onClick={handleEndCall}
          className="video-call-overlay__control-btn video-call-overlay__control-btn--end"
          style={{ backgroundColor: "#ff4d4f" }}
        >
          <MdCallEnd />
        </div>

        <Tooltip title={isVideoEnabled ? "Tắt camera" : "Bật camera"}>
          <div
            onClick={handleToggleVideo}
            className={`video-call-overlay__control-btn ${!isVideoEnabled ? "video-call-overlay__control-btn--video-off" : ""}`}
          >
            {isVideoEnabled ? <AiOutlineVideoCamera /> : <MdVideocamOff />}
          </div>
        </Tooltip>

      </div>

    </div>
  );
}
