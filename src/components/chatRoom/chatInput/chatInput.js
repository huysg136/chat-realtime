import React, { useState, useRef } from "react";
import { Button, Form, Input } from "antd";
import {
  SmileOutlined,
  PaperClipOutlined,
  AudioOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { toast } from "react-toastify";
import axios from "axios";
import EmojiPicker from "emoji-picker-react";
import { addDocument, updateDocument, encryptMessage } from "../../../firebase/services";
import "./chatInput.scss";

export default function ChatInput({
  selectedRoom,
  user,
  replyTo,
  setReplyTo,
  isBanned,
  inputRef,
}) {
  const { uid, photoURL, displayName } = user;
  const [form] = Form.useForm();
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioStream, setAudioStream] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);

  const handleInputChange = (e) => setInputValue(e.target.value);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setSending(true);
      const res = await axios.post(
        "https://chat-realtime-be.vercel.app/upload",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      const fileUrl = res.data.url;
      const kind = file.type.startsWith("image/")
        ? "picture"
        : file.type.startsWith("video/")
        ? "video"
        : "file";

      const encryptedText = selectedRoom.secretKey
        ? encryptMessage(fileUrl, selectedRoom.secretKey)
        : fileUrl;

      await addDocument("messages", {
        text: encryptedText,
        uid,
        photoURL,
        roomId: selectedRoom.id,
        displayName,
        createdAt: new Date(),
        kind,
        fileName: file.name,
      });

      await updateDocument("rooms", selectedRoom.id, {
        lastMessage: {
          displayName,
          text: encryptedText,
          uid,
          createdAt: new Date(),
          kind,
          fileName: file.name,
        },
      });
    } catch (err) {
      toast.error("Upload file thất bại");
    } finally {
      setSending(false);
      e.target.value = null;
    }
  };

  const handleVoiceButtonClick = async () => {
    if (isRecording) {
      mediaRecorder?.stop();
      audioStream?.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      setMediaRecorder(null);
      setAudioStream(null);
      setAudioChunks([]);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        const chunks = [];

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunks.push(event.data);
        };

        recorder.onstop = async () => {
          const audioBlob = new Blob(chunks, { type: "audio/wav" });
          await handleAudioUpload(audioBlob);
        };

        setMediaRecorder(recorder);
        setAudioStream(stream);
        setAudioChunks(chunks);
        recorder.start();
        setIsRecording(true);
      } catch (err) {
        toast.error("Không thể truy cập microphone");
      }
    }
  };

  const handleAudioUpload = async (audioBlob) => {
    const formData = new FormData();
    formData.append("file", audioBlob, "voice-message.wav");

    try {
      setSending(true);
      const res = await axios.post(
        "https://chat-realtime-be.vercel.app/upload",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      const audioUrl = res.data.url;

      const encryptedText = selectedRoom.secretKey
        ? encryptMessage(audioUrl, selectedRoom.secretKey)
        : audioUrl;

      await addDocument("messages", {
        text: encryptedText,
        uid,
        photoURL,
        roomId: selectedRoom.id,
        displayName,
        createdAt: new Date(),
        kind: "audio",
        fileName: "voice-message.wav",
      });

      await updateDocument("rooms", selectedRoom.id, {
        lastMessage: {
          displayName,
          text: selectedRoom.secretKey
            ? encryptMessage("[Voice Message]", selectedRoom.secretKey)
            : "[Voice Message]",
          uid,
          createdAt: new Date(),
          kind: "audio",
        },
      });
    } catch (err) {
      toast.error("Upload audio thất bại");
    } finally {
      setSending(false);
      setIsRecording(false);
      setMediaRecorder(null);
      setAudioChunks([]);
    }
  };

  const handleOnSubmit = async () => {
    if (!inputValue.trim() || !selectedRoom) return;
    if (!uid) return;
    if (sending) return;

    setSending(true);
    const messageText = inputValue.trim();

    form.resetFields(["message"]);
    setInputValue("");
    setShowEmojiPicker(false);

    try {
      const encryptedText = selectedRoom.secretKey
        ? encryptMessage(messageText, selectedRoom.secretKey)
        : messageText;

      await addDocument("messages", {
        text: encryptedText,
        uid,
        photoURL,
        roomId: selectedRoom.id,
        displayName,
        createdAt: new Date(),
        kind: "text",
        replyTo: replyTo
        ? {
            id: replyTo.id,
            text: replyTo.decryptedText || replyTo.text || "",
            displayName: replyTo.displayName,
            kind: replyTo.kind,
            fileName: replyTo.fileName || null,
            }
        : null,
      });

      await updateDocument("rooms", selectedRoom.id, {
        lastMessage: {
          displayName,
          text: encryptedText,
          uid,
          createdAt: new Date(),
          kind: "text",
        },
      });

      setReplyTo(null);
    } catch (err) {
      toast.error("Gửi tin nhắn thất bại");
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  };

  if (isBanned) return null;

  return (
    <div className="chat-input-wrapper">
      {replyTo && (
        <div className="reply-preview">
          <div className="reply-content">
            <span className="reply-label">Trả lời {replyTo.displayName}:</span>
            <p className="reply-text">
              {(() => {
                const kind = replyTo.kind || "text";
                switch (kind) {
                  case "picture":
                    return (
                      <>
                        🖼️ [Hình ảnh]
                        {replyTo.fileName ? ` (${replyTo.fileName})` : ""}
                      </>
                    );
                  case "video":
                    return (
                      <>
                        🎬 [Video]
                        {replyTo.fileName ? ` (${replyTo.fileName})` : ""}
                      </>
                    );
                  case "file":
                    return (
                      <>
                        📎 [Tệp]
                        {replyTo.fileName ? ` (${replyTo.fileName})` : ""}
                      </>
                    );
                  case "audio":
                    return <>🎤 [Tin nhắn thoại]</>;
                  default:
                    return replyTo.decryptedText;
                }
              })()}
            </p>
          </div>
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={() => setReplyTo(null)}
            className="cancel-reply-btn"
          />
        </div>
      )}

      <Form className="chat-input-form" form={form}>
        <div style={{ position: "relative" }}>
          <Button
            type="text"
            icon={<SmileOutlined />}
            className="input-icon-btn"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          />
          {showEmojiPicker && (
            <div
              style={{
                position: "absolute",
                bottom: "50px",
                left: "0",
                zIndex: 1000,
              }}
            >
              <EmojiPicker
                onEmojiClick={(emojiData) =>
                  setInputValue((prev) => prev + emojiData.emoji)
                }
              />
            </div>
          )}
        </div>

        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onPressEnter={handleOnSubmit}
          placeholder={replyTo ? "Trả lời tin nhắn..." : "Nhập tin nhắn..."}
          bordered={false}
          autoComplete="off"
        />

        {inputValue.trim() ? (
          <Button
            type="text"
            onClick={handleOnSubmit}
            loading={sending}
            className="send-btn"
          >
            Gửi
          </Button>
        ) : (
          <div className="input-actions">
            <Button
              type="text"
              icon={<AudioOutlined />}
              className={`input-icon-btn ${isRecording ? "recording" : ""}`}
              onClick={handleVoiceButtonClick}
              disabled={sending}
            />
            <label htmlFor="fileUpload" className="input-icon-btn">
              <PaperClipOutlined />
            </label>
            <input
              id="fileUpload"
              type="file"
              style={{ display: "none" }}
              onChange={handleFileUpload}
            />
          </div>
        )}
      </Form>
    </div>
  );
}
