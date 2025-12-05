import { useState, useEffect, useRef } from 'react';

export function useVideoCall(uid, selectedRoomId, otherUser, users, onIncomingCall) {
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
      console.log('⚠️ No user ID, skipping Stringee init');
      return;
    }

    if (!window.StringeeClient || !window.StringeeCall2) {
      console.log('⏳ Waiting for Stringee SDK...');
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
      console.error('❌ Stringee SDK not loaded');
      return;
    }

    try {
      setIsInitializing(true);
      console.log('🎥 Initializing Stringee for user:', uid);

      const tokenRes = await fetch(
        `https://chat-realtime-be.vercel.app/api/stringee/token?uid=${encodeURIComponent(uid)}`
      );
      
      if (!tokenRes.ok) {
        throw new Error(`HTTP ${tokenRes.status}`);
      }

      const data = await tokenRes.json();
      
      if (!data.access_token) {
        throw new Error('No access token received');
      }

      console.log('✅ Token received');

      const VideoCallService = (await import('../stringee/StringeeService')).default;
      const vc = new VideoCallService(data.access_token, handleIncomingCall);

      await vc.connect();
      
      console.log('✅ Stringee ready');
      setVideoCall(vc);

    } catch (err) {
      console.error('❌ Init Stringee failed:', err);
      alert(`Không thể kết nối Video Call: ${err.message}`);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleIncomingCall = async (call) => {
    console.log('📞 Incoming call handler triggered');
    console.log('   From:', call.fromNumber);
    console.log('   Call ID:', call.callId);

    let caller = users.find((u) => String(u.uid).trim() === String(call.fromNumber).trim());
    
    if (!caller) {
      console.log('⏳ Caller not in users array, fetching from Firestore...');
      try {
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const { db } = await import('../firebase/config');
        
        const q = query(collection(db, 'users'), where('uid', '==', call.fromNumber));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          caller = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
          console.log('✅ Caller fetched:', caller.displayName);
        } else {
          console.warn('⚠️ Caller not found in database');
          // Create a fallback user object
          caller = {
            uid: call.fromNumber,
            displayName: 'Unknown User',
            photoURL: null
          };
        }
      } catch (error) {
        console.error('❌ Error fetching caller:', error);
        // Create a fallback user object
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
    console.log('🔔 Call state changed:', state);
    
    if (state.code === 1) {
      setCallStatus('calling');
    } else if (state.code === 2) {
      setCallStatus('ringing');
    } else if (state.code === 3) {
      console.log('✅ Call answered and connected!');
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
      console.error('❌ No incoming call to answer');
      return;
    }

    console.log('✅ Answering incoming call...');
    setCallStatus('connecting');

    try {
      await videoCall.answerCall(incomingCall, handleStream, handleCallStateChanged);
      setCallStatus('connected');
      setIncomingCall(null);
      console.log('✅ Call answered');
    } catch (err) {
      console.error('❌ Error answering call:', err);
      alert(`Không thể trả lời: ${err.message}`);
      handleEndCall();
    }
  };

  const handleRejectCall = () => {
    if (!incomingCall || !videoCall) {
      console.error('❌ No incoming call to reject');
      return;
    }

    console.log('❌ Rejecting incoming call...');
    videoCall.rejectCall(incomingCall);
    
    setIncomingCall(null);
    setIsInCall(false);
    setCallStatus('');
  };

  const handleStream = (stream, type) => {
    console.log(`📹 Stream: ${type}`);

    if (type === 'local') {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        console.log('✅ Local video attached');
      }
    } else if (type === 'remote') {
      remoteStreamRef.current = stream; // Store the remote stream
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        // Check if remote video has video tracks
        const hasVideo = stream && stream.getVideoTracks().length > 0;
        setIsRemoteVideoEnabled(hasVideo);
        console.log('✅ Remote video attached, has video:', hasVideo);

        // Listen for video track changes
        if (stream && stream.getVideoTracks().length > 0) {
          const videoTrack = stream.getVideoTracks()[0];
          const handleTrackChange = () => {
            const isEnabled = videoTrack.enabled && !videoTrack.muted;
            setIsRemoteVideoEnabled(isEnabled);
            console.log('📹 Remote video track changed, enabled:', isEnabled);
          };

          videoTrack.addEventListener('ended', handleTrackChange);
          videoTrack.addEventListener('mute', handleTrackChange);
          videoTrack.addEventListener('unmute', handleTrackChange);

          // Also listen for enabled property changes
          const originalEnabled = videoTrack.enabled;
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
        remoteVideoRef.current.play().catch(err => console.log('Play failed:', err));
        console.log('📹 Remote video restored, showing live video');
      } else if (!isRemoteVideoEnabled) {
        remoteVideoRef.current.srcObject = null;
        console.log('🖤 Remote video cleared, showing avatar overlay');
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
              console.log('📹 Remote video status changed:', isEnabled);
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
    console.log('📞 Initiating video call...');

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

    setIsInCall(true);
    setCallStatus('calling');

    try {
      await videoCall.makeVideoCall(uid, otherUser.uid, handleStream, handleCallStateChanged);
      console.log('✅ Call initiated');
    } catch (err) {
      console.error('❌ Call failed:', err);
      alert(`Không thể gọi: ${err.message}`);
      handleEndCall();
    }
  };

  const handleEndCall = () => {
    console.log('📴 Ending call...');

    if (videoCall) {
      videoCall.endCall();
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
    setIsMuted(false);
    setIsVideoEnabled(true);

    console.log('✅ Call ended');
  };

  const handleToggleMute = () => {
    if (!videoCall) return;
    
    const newMutedState = !isMuted;
    videoCall.setMuted(newMutedState);
    setIsMuted(newMutedState);
    console.log(newMutedState ? '🔇 Muted' : '🔊 Unmuted');
  };

  const handleToggleVideo = () => {
    if (!videoCall) return;
    
    const newVideoState = !isVideoEnabled;
    videoCall.setVideoEnabled(newVideoState);
    setIsVideoEnabled(newVideoState);
    console.log(newVideoState ? '📹 Video ON' : '📵 Video OFF');
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
  }, [uid]); // Remove selectedRoomId from dependencies

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