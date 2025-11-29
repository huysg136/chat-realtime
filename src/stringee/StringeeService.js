/**
 * Stringee Video Call Service - Complete Implementation
 * Handles WebRTC video calling with proper media permissions
 */
class VideoCallService {
  constructor(accessToken, onIncomingCall) {
    this.client = new window.StringeeClient();
    this.accessToken = accessToken;
    this.onIncomingCall = onIncomingCall;
    this.connected = false;
    this.authenticated = false;
    this.currentCall = null;
    this.localStream = null;
    
    console.log('🎥 VideoCallService initialized');
  }

  /**
   * Connect to Stringee server
   * @returns {Promise<void>}
   */
  connect() {
    return new Promise((resolve, reject) => {
      let connectTimeout;
      let authTimeout;

      connectTimeout = setTimeout(() => {
        this.connected = false;
        reject(new Error('Connection timeout'));
      }, 10000);

      authTimeout = setTimeout(() => {
        if (!this.authenticated) {
          this.connected = false;
          reject(new Error('Authentication timeout'));
        }
      }, 15000);

      // Event: Connected
      this.client.on('connect', () => {
        console.log('✅ Connected to Stringee server');
        this.connected = true;
        clearTimeout(connectTimeout);
      });

      // Event: Authentication
      this.client.on('authen', (res) => {
        console.log('🔐 Authentication response:', {
          code: res.r,
          message: res.message,
          userId: res.userId
        });
        
        clearTimeout(authTimeout);

        if (res.r === 0) {
          console.log('✅ Authentication SUCCESS');
          this.authenticated = true;
          this.connected = true;
          resolve();
        } else {
          console.error('❌ Authentication FAILED:', res.message);
          this.connected = false;
          this.authenticated = false;
          reject(new Error(`Auth failed [${res.r}]: ${res.message}`));
        }
      });

      // Event: Disconnected
      this.client.on('disconnect', (reason) => {
        console.warn('⚠️ Disconnected from Stringee:', reason);
        this.connected = false;
        this.authenticated = false;
      });

      // Event: Token expired
      this.client.on('requestnewtoken', () => {
        console.warn('⚠️ Token expired');
        this.connected = false;
        this.authenticated = false;
      });

      // Event: Other device
      this.client.on('otherdeviceauthen', (data) => {
        console.log('📱 Another device authenticated:', data);
      });

      // Event: Incoming call - CRITICAL!
      this.client.on('incomingcall2', (incomingCall) => {
        console.log('\n📞 ===== INCOMING CALL =====');
        console.log('From:', incomingCall.fromNumber);
        console.log('To:', incomingCall.toNumber);
        console.log('Call ID:', incomingCall.callId);
        console.log('Is video:', incomingCall.isVideoCall);
        console.log('========================\n');
        
        if (this.onIncomingCall) {
          this.onIncomingCall(incomingCall);
        }
      });

      // Start connection
      console.log('🔌 Connecting to Stringee...');
      
      try {
        this.client.connect(this.accessToken);
      } catch (err) {
        console.error('❌ Error calling connect():', err);
        clearTimeout(connectTimeout);
        clearTimeout(authTimeout);
        reject(err);
      }
    });
  }

  /**
   * Check if client is connected
   */
  isConnected() {
    return this.connected && this.authenticated;
  }

  /**
   * Request camera and microphone permissions
   * @returns {Promise<MediaStream>}
   */
  async requestMediaPermissions() {
    console.log('🎤 Requesting media permissions...');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      console.log('✅ Media permissions granted');
      console.log('   Video tracks:', stream.getVideoTracks().length);
      console.log('   Audio tracks:', stream.getAudioTracks().length);
      
      this.localStream = stream;
      return stream;

    } catch (err) {
      console.error('❌ Media permission denied:', err);
      
      if (err.name === 'NotFoundError') {
        throw new Error('Không tìm thấy camera hoặc microphone');
      } else if (err.name === 'NotAllowedError') {
        throw new Error('Bạn cần cho phép truy cập camera và microphone');
      } else if (err.name === 'NotReadableError') {
        throw new Error('Camera hoặc microphone đang được sử dụng bởi ứng dụng khác');
      } else {
        throw new Error(`Lỗi truy cập thiết bị: ${err.message}`);
      }
    }
  }

  /**
   * Make a video call
   * @param {string} fromUserId 
   * @param {string} toUserId 
   * @param {Function} onStream 
   * @param {Function} onStateChanged - Callback for call state changes
   * @returns {Promise<object>}
   */
  async makeVideoCall(fromUserId, toUserId, onStream, onStateChanged) {
    if (!this.isConnected()) {
      throw new Error('Client not connected');
    }

    console.log(`\n📞 ===== MAKING VIDEO CALL =====`);
    console.log(`From: ${fromUserId}`);
    console.log(`To: ${toUserId}`);

    // Store the callback
    this.onCallStateChanged = onStateChanged;

    try {
      // Step 1: Request media permissions first
      const localStream = await this.requestMediaPermissions();
      
      // Show local video immediately
      if (onStream) {
        onStream(localStream, 'local');
      }

      // Step 2: Create call
      const call = new window.StringeeCall2(
        this.client,
        fromUserId,
        toUserId,
        true  // isVideoCall
      );

      this.currentCall = call;

      // Event: Remote stream
      call.on('addremotestream', (stream) => {
        console.log('📹 Remote stream added');
        console.log('   Stream ID:', stream.id);
        console.log('   Tracks:', stream.getTracks().length);
        
        if (onStream) {
          onStream(stream, 'remote');
        }
      });

      // Event: Signaling state
      call.on('signalingstate', (state) => {
        console.log('🔔 Signaling state:', state);
        
        // Notify about state changes
        if (this.onCallStateChanged) {
          this.onCallStateChanged(state);
        }
        
        // State codes:
        // 1: Calling
        // 2: Ringing  
        // 3: Answered (IMPORTANT - call connected!)
        // 4: Busy
        // 5: Ended
        // 6: Ended (other side)
      });

      // Event: Media state
      call.on('mediastate', (state) => {
        console.log('🎥 Media state:', state);
      });

      // Event: Call info
      call.on('info', (info) => {
        console.log('ℹ️ Call info:', info);
      });

      // Event: Signaling state
      call.on('signalingstate', (state) => {
        console.log('🔔 Signaling state (answer):', state);
        
        if (this.onCallStateChanged) {
          this.onCallStateChanged(state);
        }
      });

      // Event: Call ended
      call.on('disconnect', (res) => {
        console.log('📴 Call disconnected:', res);
        this.cleanup();
      });

      // Event: Error
      call.on('error', (err) => {
        console.error('❌ Call error:', err);
      });

      // Step 3: Make the call
      return new Promise((resolve, reject) => {
        call.makeCall((res) => {
          console.log('📞 Make call response:', res);
          
          if (res.r === 0) {
            console.log('✅ Call initiated successfully');
            console.log('   Call ID:', res.callId);
            console.log('===============================\n');
            resolve(call);
          } else {
            console.error('❌ Failed to initiate call:', res.message);
            this.cleanup();
            reject(new Error(res.message));
          }
        });
      });

    } catch (err) {
      console.error('❌ Error in makeVideoCall:', err);
      this.cleanup();
      throw err;
    }
  }

  /**
   * Answer incoming call
   * @param {object} call 
   * @param {Function} onStream 
   * @param {Function} onStateChanged
   */
  async answerCall(call, onStream, onStateChanged) {
    if (!call) {
      throw new Error('No call object');
    }

    console.log('\n✅ ===== ANSWERING CALL =====');
    console.log('Call ID:', call.callId);
    console.log('From:', call.fromNumber);

    // Store the callback
    this.onCallStateChanged = onStateChanged;

    try {
      // Step 1: Request media permissions
      const localStream = await this.requestMediaPermissions();
      
      // Show local video
      if (onStream) {
        onStream(localStream, 'local');
      }

      this.currentCall = call;

      // Event: Remote stream
      call.on('addremotestream', (stream) => {
        console.log('📹 Remote stream added');
        if (onStream) {
          onStream(stream, 'remote');
        }
      });

      // Event: Call ended
      call.on('disconnect', (res) => {
        console.log('📴 Call ended:', res);
        this.cleanup();
      });

      // Event: Error
      call.on('error', (err) => {
        console.error('❌ Call error:', err);
      });

      // Step 2: Answer the call
      return new Promise((resolve, reject) => {
        call.answer((res) => {
          console.log('Answer response:', res);
          
          if (res.r === 0) {
            console.log('✅ Call answered successfully');
            console.log('============================\n');
            resolve();
          } else {
            console.error('❌ Failed to answer:', res.message);
            this.cleanup();
            reject(new Error(res.message));
          }
        });
      });

    } catch (err) {
      console.error('❌ Error answering call:', err);
      this.cleanup();
      throw err;
    }
  }

  /**
   * Reject incoming call
   */
  rejectCall(call) {
    if (!call) {
      console.warn('⚠️ No call to reject');
      return;
    }

    console.log('❌ Rejecting call...');
    
    call.reject((res) => {
      console.log('Reject response:', res);
    });
  }

  /**
   * End current call
   */
  endCall() {
    if (!this.currentCall) {
      console.warn('⚠️ No active call to end');
      return;
    }

    console.log('📴 Ending call...');
    
    try {
      this.currentCall.hangup((res) => {
        console.log('Hangup response:', res);
      });
    } catch (err) {
      console.error('❌ Error ending call:', err);
    } finally {
      this.cleanup();
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    console.log('🧹 Cleaning up resources...');
    
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
        console.log('   Stopped track:', track.kind);
      });
      this.localStream = null;
    }

    this.currentCall = null;
  }

  /**
   * Mute/unmute microphone
   */
  setMuted(muted) {
    if (!this.currentCall) {
      console.warn('⚠️ No active call');
      return;
    }

    this.currentCall.mute(muted);
    console.log(muted ? '🔇 Muted' : '🔊 Unmuted');
  }

  /**
   * Enable/disable video
   */
  setVideoEnabled(enabled) {
    if (!this.currentCall) {
      console.warn('⚠️ No active call');
      return;
    }

    this.currentCall.enableLocalVideo(enabled);
    console.log(enabled ? '📹 Video ON' : '📵 Video OFF');
  }

  /**
   * Disconnect from Stringee
   */
  disconnect() {
    console.log('🔌 Disconnecting...');
    
    this.cleanup();
    
    if (this.client) {
      this.client.disconnect();
      this.connected = false;
      this.authenticated = false;
    }
  }

  /**
   * Get current call
   */
  getCurrentCall() {
    return this.currentCall;
  }

  /**
   * Check if in call
   */
  hasActiveCall() {
    return this.currentCall !== null;
  }
}

export default VideoCallService;