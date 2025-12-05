import React from 'react';
import { Button, Avatar, Tooltip, Spin } from 'antd';
import { AiOutlinePhone, AiOutlineVideoCamera, AiOutlineAudioMuted, AiOutlineClockCircle, AiOutlineSync } from "react-icons/ai";
import { MdCallEnd } from "react-icons/md";
import { LoadingOutlined } from '@ant-design/icons';

export default function VideoCallOverlay({
  callStatus,
  callerUser,
  otherUser,
  user,
  localVideoRef,
  remoteVideoRef,
  isVideoEnabled,
  isMuted,
  handleAnswerCall,
  handleRejectCall,
  handleEndCall,
  handleToggleMute,
  handleToggleVideo,
}) {
  // Use callerUser for incoming calls or when otherUser is not available
  const displayUser = otherUser || callerUser;

  // Handle loading state
  const isLoading = !displayUser || displayUser._isPlaceholder;
  const displayName = isLoading ? 'Đang tải...' : (displayUser?.displayName || 'Unknown User');
  const photoURL = isLoading ? null : displayUser?.photoURL;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#0a0a0a',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {/* Top bar with user info and status */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        padding: '20px',
        background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: 10
      }}>
        {/* User avatar and name */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '12px'
        }}>
          {isLoading ? (
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              border: '2px solid white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.1)'
            }}>
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
          <div>
            <div style={{
              color: 'white',
              fontSize: '20px',
              fontWeight: 'bold'
            }}>
              {displayName}
            </div>
            <div style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: '14px',
              marginTop: '2px'
            }}>
              {callStatus === 'calling' && 'Đang gọi...'}
              {callStatus === 'ringing' && 'Đang đổ chuông...'}
              {callStatus === 'connecting' && 'Đang kết nối...'}
              {callStatus === 'connected' && 'Đã kết nối'}
              {callStatus === 'busy' && 'Máy bận'}
            </div>
          </div>
        </div>
      </div>

      {/* Video container */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        padding: '80px 20px 160px 20px'
      }}>
        {/* Remote video (main) */}
        <div style={{ 
          position: 'relative',
          width: '100%',
          maxWidth: '1200px',
          aspectRatio: '16/9',
          borderRadius: '24px',
          overflow: 'hidden',
          backgroundColor: '#1a1a1a',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
        }}>
          <video 
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
          
          {/* Overlay when not connected */}
          {callStatus !== 'connected' && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{
                textAlign: 'center',
                color: 'white'
              }}>
                {isLoading ? (
                  <>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                      <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '500' }}>
                      Đang tải thông tin...
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                      {callStatus === 'calling' && <AiOutlinePhone />}
                      {callStatus === 'ringing' && <AiOutlineClockCircle />}
                      {callStatus === 'connecting' && <AiOutlineSync />}
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '500' }}>
                      {callStatus === 'calling' && 'Đang gọi...'}
                      {callStatus === 'ringing' && 'Đang đổ chuông...'}
                      {callStatus === 'connecting' && 'Đang kết nối...'}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Local video (PiP) */}
          <div style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            width: '240px',
            aspectRatio: '4/3',
            borderRadius: '16px',
            overflow: 'hidden',
            backgroundColor: '#1a1a1a',
            border: '3px solid rgba(255,255,255,0.2)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
          }}>
            <video 
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(-1)' // Mirror effect
              }}
            />
            {!isVideoEnabled && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: '#1a1a1a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Avatar size={64} src={user.photoURL}>
                  {user.displayName?.charAt(0).toUpperCase()}
                </Avatar>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom control bar */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '30px',
        background: 'linear-gradient(0deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)',
        display: 'flex',
        justifyContent: 'center',
        gap: '16px'
      }}>
        <>
          {/* Mute button */}
          <Tooltip title={isMuted ? 'Bật mic' : 'Tắt mic'}>
            <Button
              type={isMuted ? 'primary' : 'default'}
              danger={isMuted}
              size="large"
              onClick={handleToggleMute}
              style={{
                height: '64px',
                width: '64px',
                borderRadius: '50%',
                fontSize: '24px',
                backgroundColor: isMuted ? '#ff4d4f' : 'rgba(255,255,255,0.2)',
                borderColor: isMuted ? '#ff4d4f' : 'transparent',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
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
            style={{
              height: '72px',
              width: '72px',
              borderRadius: '50%',
              fontSize: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(255,77,79,0.4)'
            }}
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
              style={{
                height: '64px',
                width: '64px',
                borderRadius: '50%',
                fontSize: '24px',
                backgroundColor: !isVideoEnabled ? '#ff4d4f' : 'rgba(255,255,255,0.2)',
                borderColor: !isVideoEnabled ? '#ff4d4f' : 'transparent',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <AiOutlineVideoCamera />
            </Button>
          </Tooltip>
        </>
      </div>
    </div>
  );
}