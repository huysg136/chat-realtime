# TODO: Fix Revoked Message Reply Previews

## Steps to Complete
- [x] Import `getDocs` from `firebase/firestore` in `chatWindow.js`
- [ ] Modify `handleRevokeMessage` function to query messages where `replyTo.id` matches the revoked `messageId`
- [ ] Update each replying message's `replyTo.decryptedText` to "[Tin nhắn đã được thu hồi]"
- [ ] Test the changes to ensure reply previews show revoked text for media messages
