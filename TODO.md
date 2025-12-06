# Fix Call Signaling Issue

## Tasks
- [x] Update VideoCallService constructor to accept onCallStateChanged callback
- [x] Pass handleCallStateChanged to VideoCallService constructor in useVideoCall.js
- [x] Remove manual setting of videoCall.onCallStateChanged in handleIncomingCall
- [x] Update handleEndCall to set videoCall.onCallStateChanged = null
- [x] Update incoming call signalingstate listener to call onCallStateChanged for all state changes

## Testing
- [ ] Test: A calls B, A hangs up before B answers → B's UI should clear
- [ ] Test other scenarios: Answer, reject, hangup after answer

## Testing
- [ ] Test: A calls B, A hangs up before B answers → B's UI should clear
- [ ] Test other scenarios: Answer, reject, hangup after answer
