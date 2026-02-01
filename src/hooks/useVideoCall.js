import { useState, useEffect, useRef } from 'react';

export function useVideoCall(uid, selectedRoomId, otherUser, users, onIncomingCall) {
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL
  const [videoCall, setVideoCall] = useState(null);
  const [isInCall, setIsInCall] = useState(false);
  const [callStatus, setCallStatus] = useState('');
  const [incomingCall, setIncomingCall] = useState(null);
  const [callerUser, setCallerUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isRemoteVideoEnabled, setIsRemoteVideoEnabled] = useState(true);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteVideoCheckInterval = useRef(null);
  const remoteStreamRef = useRef(null);

  const initStringee = async () => {
    if (!uid) {
      return;
    }

    if (!window.StringeeClient || !window.StringeeCall2) {
      await new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (window.StringeeClient && window.StringeeCall2) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
        
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve();
        }, 10000);
      });
    }

    if (!window.StringeeClient || !window.StringeeCall2) {
      return;
    }

    try {
      setIsInitializing(true);

      const tokenRes = await fetch(
        `${API_BASE_URL}/api/stringee/token?uid=${encodeURIComponent(uid)}`
      );
      
      if (!tokenRes.ok) {
        throw new Error(`HTTP ${tokenRes.status}`);
      }

      const data = await tokenRes.json();
      
      if (!data.access_token) {
        throw new Error('No access token received');
      }


      const VideoCallService = (await import('../stringee/StringeeService')).default;
      const vc = new VideoCallService(data.access_token, handleIncomingCall, handleCallStateChanged);

      await vc.connect();
      
      setVideoCall(vc);

    } catch (err) {
      alert(`Không thể kết nối Video Call: ${err.message}`);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleIncomingCall = async (call) => {
    let caller = users.find((u) => String(u.uid).trim() === String(call.fromNumber).trim());
    
    if (!caller) {
      try {
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const { db } = await import('../firebase/config');
        
        const q = query(collection(db, 'users'), where('uid', '==', call.fromNumber));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          caller = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        } else {
          caller = {
            uid: call.fromNumber,
            displayName: 'Unknown User',
            photoURL: null
          };
        }
      } catch (error) {
        caller = {
          uid: call.fromNumber,
          displayName: 'Unknown User',
          photoURL: null
        };
      }
    }

    setCallerUser(caller);
    setIncomingCall(call);
    setIsInCall(true);
    setCallStatus('incoming');

    // Notify parent to auto-select room
    if (onIncomingCall && typeof onIncomingCall === 'function') {
      onIncomingCall(call.fromNumber);
    }
  };

  const handleCallStateChanged = (state) => {
    
    if (state.code === 1) {
      setCallStatus('calling');
    } else if (state.code === 2) {
      setCallStatus('ringing');
    } else if (state.code === 3) {
      setCallStatus('connected');
    } else if (state.code === 4) {
      setCallStatus('busy');
      setTimeout(() => {
        handleEndCall();
      }, 2000);
    } else if (state.code === 5 || state.code === 6) {
      handleEndCall();
    }
  };

  const handleAnswerCall = async () => {
    if (!incomingCall || !videoCall) {
      return;
    }

    setCallStatus('connecting');

    try {
      await videoCall.answerCall(incomingCall, handleStream, handleCallStateChanged);
      setCallStatus('connected');
      setIncomingCall(null);
    } catch (err) {
      alert(`Không thể trả lời: ${err.message}`);
      handleEndCall();
    }
  };

  const handleRejectCall = () => {
    if (!incomingCall || !videoCall) {
      return;
    }

    videoCall.rejectCall(incomingCall);
    
    setIncomingCall(null);
    setIsInCall(false);
    setCallStatus('');
  };

  const handleStream = (stream, type) => {

    if (type === 'local') {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } else if (type === 'remote') {
      remoteStreamRef.current = stream; // Store the remote stream
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        // Check if remote video has video tracks
        const hasVideo = stream && stream.getVideoTracks().length > 0;
        setIsRemoteVideoEnabled(hasVideo);

        // Listen for video track changes
        if (stream && stream.getVideoTracks().length > 0) {
          const videoTrack = stream.getVideoTracks()[0];
          const handleTrackChange = () => {
            const isEnabled = videoTrack.enabled && !videoTrack.muted;
            setIsRemoteVideoEnabled(isEnabled);
          };

          videoTrack.addEventListener('ended', handleTrackChange);
          videoTrack.addEventListener('mute', handleTrackChange);
          videoTrack.addEventListener('unmute', handleTrackChange);

          // Also listen for enabled property changes
          let originalEnabled = videoTrack.enabled;
          Object.defineProperty(videoTrack, 'enabled', {
            get: () => originalEnabled,
            set: (value) => {
              originalEnabled = value;
              handleTrackChange();
            }
          });
        }
      }
    }
  };

  // Effect to manage remote video display based on enabled state
  useEffect(() => {
    if (remoteVideoRef.current) {
      if (isRemoteVideoEnabled && remoteStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
        // Force play to ensure video resumes
        remoteVideoRef.current.play();
      } else if (!isRemoteVideoEnabled) {
        remoteVideoRef.current.srcObject = null;
      }
    }
  }, [isRemoteVideoEnabled]);

  // Effect to periodically check remote video track status
  useEffect(() => {
    if (isInCall && callStatus === 'connected') {
      remoteVideoCheckInterval.current = setInterval(() => {
        if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
          const stream = remoteVideoRef.current.srcObject;
          const videoTracks = stream.getVideoTracks();
          if (videoTracks.length > 0) {
            const videoTrack = videoTracks[0];
            const isEnabled = videoTrack.enabled && !videoTrack.muted;
            if (isEnabled !== isRemoteVideoEnabled) {
              setIsRemoteVideoEnabled(isEnabled);
            }
          }
        }
      }, 500); // Check every 500ms
    } else {
      if (remoteVideoCheckInterval.current) {
        clearInterval(remoteVideoCheckInterval.current);
        remoteVideoCheckInterval.current = null;
      }
    }

    return () => {
      if (remoteVideoCheckInterval.current) {
        clearInterval(remoteVideoCheckInterval.current);
        remoteVideoCheckInterval.current = null;
      }
    };
  }, [isInCall, callStatus, isRemoteVideoEnabled]);

  const handleVideoCall = async () => {
    if (!videoCall) {
      alert('Dịch vụ Video Call chưa sẵn sàng');
      return;
    }

    if (!videoCall.isConnected()) {
      alert('Đang kết nối tới máy chủ, vui lòng thử lại');
      return;
    }

    if (!otherUser || !otherUser.uid) {
      alert('Không tìm thấy người nhận');
      return;
    }

    setCallerUser(null);
    setIsInCall(true);
    setCallStatus('calling');

    try {
      await videoCall.makeVideoCall(uid, otherUser.uid, handleStream, handleCallStateChanged);
    } catch (err) {
      alert(`Không thể gọi: ${err.message}`);
      handleEndCall();
    }
  };

  const handleEndCall = () => {
    if (videoCall) {
      videoCall.endCall();
      videoCall.onCallStateChanged = null; // Clean up callback
    }

    if (localVideoRef.current) {
      const stream = localVideoRef.current.srcObject;
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
      localVideoRef.current.srcObject = null;
    }

    if (remoteVideoRef.current) {
      const stream = remoteVideoRef.current.srcObject;
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
      remoteVideoRef.current.srcObject = null;
    }

    setIsInCall(false);
    setCallStatus('');
    setIncomingCall(null);
    setCallerUser(null);
    setIsMuted(false);
    setIsVideoEnabled(true);
  };

  const handleToggleMute = () => {
    if (!videoCall) return;
    
    const newMutedState = !isMuted;
    videoCall.setMuted(newMutedState);
    setIsMuted(newMutedState);
  };

  const handleToggleVideo = () => {
    if (!videoCall) return;
    
    const newVideoState = !isVideoEnabled;
    videoCall.setVideoEnabled(newVideoState);
    setIsVideoEnabled(newVideoState);
  };

  useEffect(() => {
    if (uid) {
      initStringee();
    }

    return () => {
      if (videoCall) {
        videoCall.disconnect();
      }
    };
  }, [uid]); 

  return {
    videoCall,
    isInCall,
    callStatus,
    incomingCall,
    callerUser,
    isInitializing,
    isMuted,
    isVideoEnabled,
    isRemoteVideoEnabled,
    localVideoRef,
    remoteVideoRef,
    handleVideoCall,
    handleAnswerCall,
    handleRejectCall,
    handleEndCall,
    handleToggleMute,
    handleToggleVideo,
  };
}