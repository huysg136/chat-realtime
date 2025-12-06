class VideoCallService {
  constructor(accessToken, onIncomingCall, onCallStateChanged) {
    this.client = new window.StringeeClient();
    this.accessToken = accessToken;
    this.onIncomingCall = onIncomingCall;
    this.onCallStateChanged = onCallStateChanged;
    this.connected = false;
    this.authenticated = false;
    this.currentCall = null;
    this.localStream = null;
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

      this.client.on('connect', () => {
        this.connected = true;
        clearTimeout(connectTimeout);
      });

      this.client.on('authen', (res) => {
        clearTimeout(authTimeout);
        if (res.r === 0) {
          this.authenticated = true;
          this.connected = true;
          resolve();
        } else {
          this.connected = false;
          this.authenticated = false;
          reject(new Error(`Auth failed [${res.r}]: ${res.message}`));
        }
      });

      this.client.on('disconnect', (reason) => {
        this.connected = false;
        this.authenticated = false;
      });

      this.client.on('requestnewtoken', () => {
        this.connected = false;
        this.authenticated = false;
      });

      this.client.on('otherdeviceauthen', (data) => {
      });

      this.client.on('incomingcall2', (incomingCall) => {
        if (this.onIncomingCall) {
          this.onIncomingCall(incomingCall);
        }

        incomingCall.on('signalingstate', (state) => {
          if (this.onCallStateChanged) {
            this.onCallStateChanged(state);
          }

          if (state.code === 5 || state.code === 6) {
            this.cleanup();
          }
        });
      });

      try {
        this.client.connect(this.accessToken);
      } catch (err) {
        clearTimeout(connectTimeout);
        clearTimeout(authTimeout);
        reject(err);
      }
    });
  }

  isConnected() {
    return this.connected && this.authenticated;
  }

  /**
   * Request camera and microphone permissions
   * @returns {Promise<MediaStream>}
   */
  async requestMediaPermissions() {
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
      
      this.localStream = stream;
      return stream;

    } catch (err) {
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

    this.onCallStateChanged = onStateChanged;

    try {
      const localStream = await this.requestMediaPermissions();
      
      if (onStream) {
        onStream(localStream, 'local');
      }

      const call = new window.StringeeCall2(
        this.client,
        fromUserId,
        toUserId,
        true  
      );

      this.currentCall = call;

      call.on('addremotestream', (stream) => {
        
        if (onStream) {
          onStream(stream, 'remote');
        }
      });

      call.on('signalingstate', (state) => {
        if (this.onCallStateChanged) {
          this.onCallStateChanged(state);
        }

        if (state.code === 5 || state.code === 6) {
          this.cleanup();
        }
        
        // State codes:
        // 1: Calling
        // 2: Ringing  
        // 3: Answered (IMPORTANT - call connected!)
        // 4: Busy
        // 5: Ended
        // 6: Ended (other side)
      });

      call.on('mediastate', (state) => {
      });

      call.on('info', (info) => {
      });

      call.on('disconnect', (res) => {
        this.cleanup();
      });

      call.on('error', (err) => {
      });

      return new Promise((resolve, reject) => {
        call.makeCall((res) => {
          if (res.r === 0) {
            resolve(call);
          } else {
            this.cleanup();
            reject(new Error(res.message));
          }
        });
      });
    } catch (err) {
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

    this.onCallStateChanged = onStateChanged;

    try {
      const localStream = await this.requestMediaPermissions();
      
      if (onStream) {
        onStream(localStream, 'local');
      }

      this.currentCall = call;

      call.on('addremotestream', (stream) => {
        if (onStream) {
          onStream(stream, 'remote');
        }
      });

      call.on('disconnect', (res) => {
        this.cleanup();
      });

      call.on('error', (err) => {
      });

      return new Promise((resolve, reject) => {
        call.answer((res) => {
          if (res.r === 0) {
            resolve();
          } else {
            this.cleanup();
            reject(new Error(res.message));
          }
        });
      });
    } catch (err) {
      this.cleanup();
      throw err;
    }
  }

  rejectCall(call) {
    if (!call) {
      return;
    }

    call.reject((res) => {
    });
  }

  endCall() {
    if (!this.currentCall) {
      return;
    }

    try {
      this.currentCall.hangup((res) => {
      });
    } catch (err) {
    } finally {
      this.cleanup();
    }
  }

  cleanup() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
      });
      this.localStream = null;
    }
    this.currentCall = null;
  }

  setMuted(muted) {
    if (!this.currentCall) {
      return;
    }
    this.currentCall.mute(muted);
  }

  setVideoEnabled(enabled) {
    if (!this.currentCall) {
      return;
    }
    this.currentCall.enableLocalVideo(enabled);
  }

  disconnect() {
    this.cleanup();
    if (this.client) {
      this.client.disconnect();
      this.connected = false;
      this.authenticated = false;
    }
  }

  getCurrentCall() {
    return this.currentCall;
  }

  hasActiveCall() {
    return this.currentCall !== null;
  }
}

export default VideoCallService;