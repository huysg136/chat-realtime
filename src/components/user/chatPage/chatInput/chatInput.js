import React, { useState, useRef } from "react";
import { Button, Form, Input } from "antd";
import {
  SmileOutlined,
  PaperClipOutlined,
  AudioOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { toast } from "react-toastify";
import EmojiPicker from "emoji-picker-react";
import { addDocument, updateDocument, encryptMessage, getUserDocIdByUid, decryptMessage } from "../../../../firebase/services";
import { askGemini } from "../../../../utils/AI/geminiBot";
import { askGroq } from "../../../../utils/AI/groqBot";
import { uploadToR2 } from "../../../../utils/uploadToR2";
import { validateFile } from "../../../../utils/fileValidation";
import { getToneMappings, buildPolishPrompt } from "../../../../utils/AI/tonePrompts";
import { buildBotContextPrompt } from "../../../../utils/AI/botPrompts";
import { transcribeAudio } from "../../../../utils/audio/audioService";
import "./chatInput.scss";
import { useTranslation } from "react-i18next";
import { FaMagic } from "react-icons/fa";
import { hasEnoughQuota, increaseQuota, formatBytes, getQuotaLimit } from "../../../../utils/quota";
import { db } from "../../../../firebase/config";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";

const getVisibleFor = (selectedRoom) => {
  if (!selectedRoom) return [];
  const currentMembers = selectedRoom.members || [];
  if (!selectedRoom.lastMessage || !Array.isArray(selectedRoom.lastMessage.visibleFor)) {
    return currentMembers;
  }
  return Array.from(new Set([...selectedRoom.lastMessage.visibleFor, ...currentMembers]));
};

const isMeaningful = (text) => {
  if (!text) return false;
  const cleaned = text.replace(/[\p{Emoji}\p{So}\p{Sk}\p{P}\p{S}]/gu, "").trim();
  return cleaned.length >= 2;
};

export default function ChatInput({
  selectedRoom,
  user,
  replyTo,
  setReplyTo,
  isBanned,
  inputRef,
}) {
  const { uid, photoURL, displayName, role, premiumLevel } = user || {};
  const formRef = useRef(null);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [sendingFile, setSendingFile] = useState(false);
  const [sendingVoice, setSendingVoice] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioStream, setAudioStream] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [audioChunks, setAudioChunks] = useState([]);
  const visibleFor = getVisibleFor(selectedRoom);
  const [polishing, setPolishing] = useState(false);
  const [showTonePicker, setShowTonePicker] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { t } = useTranslation();

  const handleInputChange = (e) => setInputValue(e.target.value);

  const handleSelectTone = async (selectedTone) => {
    setShowTonePicker(false);

    if (!inputValue.trim()) return;

    if (!isMeaningful(inputValue)) {
      toast.info(t('notifications.insignificantText'));
      return;
    }

    try {
      setPolishing(true);
      const toneMapping = getToneMappings(t);
      const selectedToneDescription = toneMapping[selectedTone];
      const prompt = buildPolishPrompt(t, selectedToneDescription, inputValue);

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

    if (!validateFile(file, user)) {
      e.target.value = null;
      return;
    }

    if (!hasEnoughQuota(user, file.size)) {
      const limit = formatBytes(getQuotaLimit(user));
      const used = formatBytes(user.quotaUsed || 0);
      toast.error(`Bạn đã hết dung lượng! (${used} / ${limit}). Nâng cấp gói để tiếp tục.`);
      e.target.value = null;
      return;
    }

    try {
      setSendingFile(true);
      setUploadProgress(0);

      // Upload trực tiếp lên R2
      const fileUrl = await uploadToR2(file, (progress) => {
        setUploadProgress(progress);
      });

      const docId = await getUserDocIdByUid(user.uid);
      await increaseQuota(docId, file.size);

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
    // chuyển Blob thành File
    const audioFile = new File([audioBlob], "voice-message.wav", {
      type: "audio/wav",
    });

    if (!hasEnoughQuota(user, audioFile.size)) {
      toast.error("Bạn đã hết dung lượng! Nâng cấp gói để tiếp tục.");
      return;
    }

    try {
      setSendingVoice(true);
      // upload audio thẳng lên R2
      const audioUrl = await uploadToR2(audioFile);

      const docId = await getUserDocIdByUid(user.uid);
      await increaseQuota(docId, audioFile.size);

      const encryptedAudioUrl = selectedRoom.secretKey
        ? encryptMessage(audioUrl, selectedRoom.secretKey)
        : audioUrl;

      let transcriptText = "";
      let detectedLanguage = "vi";

      try {
        const { text, languageCode } = await transcribeAudio(audioUrl);
        transcriptText = text;
        detectedLanguage = languageCode;
      } catch (transcribeErr) {
        toast.error(t('notifications.transcriptionError'));
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

        const messageRef = collection(db, "messages");
        const q = query(
          messageRef,
          where("roomId", "==", selectedRoom.id),
          orderBy("createdAt", "desc"),
          limit(10)
        )

        const snapshot = await getDocs(q);
        const recentMessages = snapshot.docs
          .map((doc) => doc.data())
          .reverse() // đảo lại để đúng thứ tự cũ → mới
          .filter((msg) => msg.kind === "text")
          .map((msg) => {
            const text = selectedRoom.secretKey
              ? decryptMessage(msg.text, selectedRoom.secretKey)
              : msg.text;
            return `${msg.displayName}: ${text}`;
          })
          .join("\n");

        const replyContext = replyTo
          ? `\nNgười dùng đang trả lời tin nhắn sau:\nTừ ${replyTo.displayName}: "${replyTo.decryptedText || replyTo.text}"\n`
          : "";

        const now = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
        const userPlan = (premiumLevel || "free").toUpperCase();
        const userRole = role === "admin" ? "Quản trị viên" : role === "moderator" ? "Điều hành viên" : "Người dùng";

        const contextPrompt = buildBotContextPrompt({
          displayName,
          userRole,
          userPlan,
          now,
          recentMessages,
          replyContext,
          question
        });

        askGroq(contextPrompt)
          .then(async (reply) => {
            const cleanedReply = reply.normalize("NFC").trim();
            const encryptedReply = selectedRoom.secretKey
              ? encryptMessage(cleanedReply, selectedRoom.secretKey)
              : cleanedReply;

            await addDocument("messages", {
              text: encryptedReply,
              uid: "bot",
              displayName: "Quik Bot",
              photoURL:
                "https://img.freepik.com/free-vector/graident-ai-robot-vectorart_78370-4114.jpg?semt=ais_user_personalization&w=740&q=80",
              roomId: selectedRoom.id,
              createdAt: new Date(),
              kind: "text",
              visibleFor,
            });

            await updateDocument("rooms", selectedRoom.id, {
              lastMessage: {
                displayName: "Quik Bot",
                text: encryptedReply,
                uid: "bot",
                createdAt: new Date(),
                kind: "text",
                visibleFor: selectedRoom.members,
              },
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
                    return <>{t('chatInput.media.voice')}</>;
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
          variant="borderless"
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