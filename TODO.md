# TODO: Rewrite Message and MediaRenderer Components

## Tasks
- [x] Edit src/components/chatRoom/chatWindow/chatWindow.js:
  - [x] In handleFileUpload: Change 'type' to 'kind', and map file.type.startsWith("image/") to "picture" instead of "image".
  - [x] In handleOnSubmit: Add kind: "text" for text messages to be explicit.

## Followup Steps
- [ ] Test file uploads (picture, video, file) to ensure correct kind is set and rendered.
- [ ] Test text messages to ensure kind="text".
- [ ] Verify reply functionality.
