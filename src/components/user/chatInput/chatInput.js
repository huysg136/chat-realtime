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
import { askGemini } from "../../../utils/AI/geminiBot";
import { askGroq } from "../../../utils/AI/groqBot";
import { uploadToR2 } from "../../../utils/uploadToR2"; 
import { validateFile } from "../../../utils/fileValidation";
import "./chatInput.scss";
import { useTranslation } from "react-i18next";
import { FaMagic } from "react-icons/fa";

const getVisibleFor = (selectedRoom) => {
  if (!selectedRoom) return [];
  const currentMembers = selectedRoom.members || [];
  if (!selectedRoom.lastMessage || !Array.isArray(selectedRoom.lastMessage.visibleFor)) {
    return currentMembers;
  }
  return Array.from(new Set([...selectedRoom.lastMessage.visibleFor, ...currentMembers]));
};

export default function ChatInput({
  selectedRoom,
  user,
  replyTo,
  setReplyTo,
  isBanned,
  inputRef,
}) {
  const { uid, photoURL, displayName } = user || {};
  const formRef = useRef(null);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [sendingFile, setSendingFile] = useState(false);
  const [sendingVoice, setSendingVoice] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioStream, setAudioStream] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const visibleFor = getVisibleFor(selectedRoom);
  const [polishing, setPolishing] = useState(false);
  const [showTonePicker, setShowTonePicker] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); 
  const { t } = useTranslation(); 

  const handleInputChange = (e) => setInputValue(e.target.value);

  const handleSelectTone = async (selectedTone) => {
    setShowTonePicker(false);

    const toneMapping = {
      default: t('tones.default'),
      boss: t('tones.boss'),
      lover: t('tones.lover'),
      elder: t('tones.elder'),
      friend: t('tones.friend'),
      client: t('tones.client')
    };

    if (!inputValue.trim()) return;

    const isMeaningful = (text) => {
      const cleaned = text.replace(/[\p{Emoji}\p{So}\p{Sk}\p{P}\p{S}]/gu, "").trim();
      return cleaned.length >= 2;
    };

    if (!isMeaningful(inputValue)) {
      toast.info(t('notifications.insignificantText'));
      return;
    }

    try {
      setPolishing(true);
      const selectedToneDescription = toneMapping[selectedTone];
      const prompt = t('aiPrompt.polish', {
        tone: selectedToneDescription,
        input: inputValue,
        interpolation: { escapeValue: false }
      });

      const polishedText = await askGemini(prompt);
      const cleanedText = polishedText.replace(/\n+/g, " ").trim();

      if (isMeaningful(cleanedText)) {
        setInputValue(cleanedText);
      }
    } catch (err) {
      toast.error(t('notifications.improveError'));
    } finally {
      setPolishing(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!validateFile(file)) {
      e.target.value = null;
      return;
    }

    try {
      setSendingFile(true);
      setUploadProgress(0);

      // Upload trực tiếp lên R2
      const fileUrl = await uploadToR2(file, (progress) => {
        setUploadProgress(progress);
        console.log(`Upload progress: ${progress}%`);
      });

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
        visibleFor,
      });

      await updateDocument("rooms", selectedRoom.id, {
        lastMessage: {
          displayName,
          text: encryptedText,
          uid,
          createdAt: new Date(),
          kind,
          fileName: file.name,
          visibleFor: selectedRoom.members,
        },
      });
    } catch (err) {
      toast.error("Upload file thất bại");
      console.error(err);
    } finally {
      setSendingFile(false);
      setUploadProgress(0);
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
        toast.error(t('notifications.micError'));
      }
    }
  };

  const handleAudioUpload = async (audioBlob) => {
    // Chuyển Blob thành File
    const audioFile = new File([audioBlob], "voice-message.wav", {
      type: "audio/wav",
    });

    try {
      setSendingVoice(true);

      // Upload audio lên R2
      const audioUrl = await uploadToR2(audioFile);

      const encryptedAudioUrl = selectedRoom.secretKey
        ? encryptMessage(audioUrl, selectedRoom.secretKey)
        : audioUrl;

      const assemblyHeaders = {
        authorization: "9ca437cbe65d4f5387e937846ec08f46",
      };

      let transcriptId = null;
      let transcriptText = "";
      let detectedLanguage = "vi";

      const viRequest = {
        audio_url: audioUrl,
        language_code: "vi",
        punctuate: true,
        format_text: true,
      };

      let resVi = await axios.post(
        "https://api.assemblyai.com/v2/transcript",
        viRequest,
        { headers: assemblyHeaders }
      );

      transcriptId = resVi.data.id;
      let needFallback = false;

      while (true) {
        const poll = await axios.get(
          `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
          { headers: assemblyHeaders }
        );

        if (poll.data.status === "completed") {
          transcriptText = poll.data.text;
          detectedLanguage = poll.data.language_code || "vi";
          break;
        } else if (poll.data.status === "error") {
          needFallback = true;
          break;
        } else {
          await new Promise((r) => setTimeout(r, 3000));
        }
      }

      if (needFallback) {
        const autoRequest = {
          audio_url: audioUrl,
          language_detection: true,
          punctuate: true,
          format_text: true,
        };

        const autoRes = await axios.post(
          "https://api.assemblyai.com/v2/transcript",
          autoRequest,
          { headers: assemblyHeaders }
        );

        transcriptId = autoRes.data.id;
        detectedLanguage = "auto";

        while (true) {
          const poll = await axios.get(
            `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
            { headers: assemblyHeaders }
          );

          if (poll.data.status === "completed") {
            transcriptText = poll.data.text;
            detectedLanguage = poll.data.language_code || detectedLanguage;
            break;
          } else if (poll.data.status === "error") {
            transcriptText = "";
            toast.error(t('notifications.transcriptionError'));
            break;
          } else {
            await new Promise((r) => setTimeout(r, 3000));
          }
        }
      }

      await addDocument("messages", {
        text: encryptedAudioUrl,
        uid,
        photoURL,
        roomId: selectedRoom.id,
        displayName,
        createdAt: new Date(),
        kind: "audio",
        fileName: "voice-message.wav",
        visibleFor,
        transcript: transcriptText,
        language: detectedLanguage,
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
          visibleFor: selectedRoom.members,
        },
      });
    } catch (err) {
      toast.error(t('notifications.voiceError'));
      console.error(err);
    } finally {
      setSendingVoice(false);
      setIsRecording(false);
      setMediaRecorder(null);
      setAudioChunks([]);
    }
  };

  const handleOnSubmit = async () => {
    if (!inputValue.trim() || !selectedRoom || !uid || sending) return;

    setSending(true);
    setReplyTo(null);
    const messageText = inputValue.trim();
    formRef.current?.resetFields();
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
        visibleFor,
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
          visibleFor: selectedRoom.members,
        },
      });

      if (messageText.startsWith("@bot")) {
        const question = messageText.replace(/^@bot\s*/, "");
        askGroq(question)
          .then(async (reply) => {
            const encryptedReply = selectedRoom.secretKey
              ? encryptMessage(reply, selectedRoom.secretKey)
              : reply;

            await addDocument("messages", {
              text: encryptedReply,
              uid: "bot",
              displayName: "Quik Bot",
              photoURL:
                "https://cdn-icons-png.flaticon.com/512/4712/4712035.png",
              roomId: selectedRoom.id,
              createdAt: new Date(),
              kind: "text",
              visibleFor,
            });
          })
          .catch((err) => {
            toast.error(t('notifications.botError'));
          });
      }
    } catch (err) {
      toast.error(t('notifications.sendError'));
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
            <span className="reply-label">
              Trả lời {replyTo.displayName}:
            </span>
            <p className="reply-text">
              {(() => {
                const kind = replyTo.kind || "text";
                switch (kind) {
                  case "picture":
                    return (
                      <>
                        {t('chatInput.media.picture')}
                        {replyTo.fileName ? ` (${replyTo.fileName})` : ""}
                      </>
                    );
                  case "video":
                    return (
                      <>
                        {t('chatInput.media.video')}
                        {replyTo.fileName ? ` (${replyTo.fileName})` : ""}
                      </>
                    );
                  case "file":
                    return (
                      <>
                        {t('chatInput.media.file')}
                        {replyTo.fileName ? ` (${replyTo.fileName})` : ""}
                      </>
                    );
                  case "audio":
                    return <>🎤 {t('chatInput.media.voice')}</>;
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

      <Form className="chat-input-form" ref={formRef}>
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
          placeholder={
            replyTo ? t('chatInput.replyPlaceholder') : t('chatInput.placeholder')
          }
          bordered={false}
          autoComplete="off"
        />

        {inputValue.trim() && (
          <>
            {showTonePicker && (
              <div className="tone-picker">
                <p style={{ fontWeight: "bold", marginBottom: 5 }}>
                  {t('chatInput.selectTone')}
                </p>

                <div
                  className="tone-option"
                  onClick={() => handleSelectTone("default")}
                >
                  {t('chatInput.tonesLabel.default')}
                </div>
                <div
                  className="tone-option"
                  onClick={() => handleSelectTone("boss")}
                >
                  {t('chatInput.tonesLabel.boss')}
                </div>
                <div
                  className="tone-option"
                  onClick={() => handleSelectTone("client")}
                >
                  {t('chatInput.tonesLabel.client')}
                </div>
                <div
                  className="tone-option"
                  onClick={() => handleSelectTone("lover")}
                >
                  {t('chatInput.tonesLabel.lover')}
                </div>
                <div
                  className="tone-option"
                  onClick={() => handleSelectTone("elder")}
                >
                  {t('chatInput.tonesLabel.elder')}
                </div>
                <div
                  className="tone-option"
                  onClick={() => handleSelectTone("friend")}
                >
                  {t('chatInput.tonesLabel.friend')}
                </div>
              </div>
            )}

            <Button
              type="text"
              onClick={() => setShowTonePicker(!showTonePicker)}
              disabled={polishing || sending}
              className={`polish-btn ${polishing ? "loading" : ""}`}
              title={t('chatInput.polishHint')}
            >
              {polishing ? <div className="spinner" /> : <FaMagic />}
            </Button>
            <Button
              type="text"
              onClick={handleOnSubmit}
              loading={sending}
              className="send-btn"
            >
              {t('chatInput.send')}
            </Button>
          </>
        )}

        {!inputValue.trim() && (
          <div className="input-actions">
            <Button
              type="text"
              className={`input-icon-btn ${isRecording ? "recording" : ""}`}
              onClick={handleVoiceButtonClick}
              disabled={sending || sendingVoice}
            >
              {sendingVoice ? (
                <div className="spinner-small" />
              ) : (
                <AudioOutlined />
              )}
            </Button>
            <label htmlFor="fileUpload" className="input-icon-btn">
              {sendingFile ? (
                <div className="spinner-small" />
              ) : (
                <PaperClipOutlined />
              )}
            </label>
            <input
              id="fileUpload"
              type="file"
              style={{ display: "none" }}
              onChange={handleFileUpload}
              disabled={sendingFile}
            />
          </div>
        )}
      </Form>

      {/* OPTIONAL: Progress bar */}
      {sendingFile && uploadProgress > 0 && (
        <div className="upload-progress">
          <div
            className="upload-progress-bar"
            style={{ width: `${uploadProgress}%` }}
          >
            {uploadProgress}%
          </div>
        </div>
      )}
    </div>
  );
}