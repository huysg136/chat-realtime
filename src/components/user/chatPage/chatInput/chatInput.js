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
import { addDocument, updateDocument, encryptMessage, getUserDocIdByUid, decryptMessage } from "../../../../firebase/services";
import { askGemini } from "../../../../utils/AI/geminiBot";
import { askGroq } from "../../../../utils/AI/groqBot";
import { uploadToR2 } from "../../../../utils/uploadToR2";
import { validateFile } from "../../../../utils/fileValidation";
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
      default: t('chatInput.tones.default'),
      boss: t('chatInput.tones.boss'),
      lover: t('chatInput.tones.lover'),
      elder: t('chatInput.tones.elder'),
      friend: t('chatInput.tones.friend'),
      client: t('chatInput.tones.client')
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
      const prompt = t('chatInput.aiPrompt.polish', {
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
        const quikInfo = `
          THÔNG TIN VỀ QUIK:
          - Định danh: Nền tảng nhắn tin đa phương tiện bảo mật, mã hóa đầu cuối (E2E).
          - Website chính thức: Quik.id.vn.
          - Tính năng chính: Nhắn tin thời gian thực, Gọi Video ổn định (Stringee), Lưu trữ đám mây tốc độ cao (Cloudflare R2), Chuyển giọng nói sang văn bản (AssemblyAI).
          - AI Thông minh: Quik Bot hỗ trợ giải đáp (@bot) và AI Polishing (Nút icon FaMagic) giúp cải thiện văn phong theo nhiều tông giọng (Sếp, Người yêu, Bạn bè...).
          - Quản lý Quota: Hệ thống giới hạn dung lượng lưu trữ và kích thước file gửi đi dựa trên gói dịch vụ.

          CÁC GÓI DỊCH VỤ (PLANS):
          1. FREE: 0 VNĐ, Giới hạn gửi file: 5MB, Tổng dung lượng: 100MB.
          2. LITE: 15,000 VNĐ/tháng, Giới hạn gửi file: 25MB, Tổng dung lượng: 2GB, Tên hiển thị Bronze.
          3. PRO (Phổ biến): 49,000 VNĐ/tháng, Giới hạn gửi file: 100MB, Tổng dung lượng: 10GB, Tên hiển thị Silver.
          4. MAX (Vip nhất): 89,000 VNĐ/tháng, Giới hạn gửi file: 200MB, Tổng dung lượng: 30GB, Tên hiển thị Gold. 

          HỖ TRỢ & LIÊN HỆ:
          - Email: thaigiahuy6912@gmail.com
          - Người sáng lập: Thái Gia Huy (Sinh viên năm 4 Hutech, làm việc tại TMA Solutions).
          - Mục tiêu: Kết nối an toàn và thông minh.
          `;
        const now = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
        const userPlan = (premiumLevel || "free").toUpperCase();
        const userRole = role === "admin" ? "Quản trị viên" : role === "moderator" ? "Điều hành viên" : "Người dùng";

        const contextPrompt = `Bạn là trợ lý AI Quik Bot. Bạn đang trò chuyện với người dùng tên là: ${displayName}.
          - Vai trò hệ thống: ${userRole}
          - Gói dịch vụ hiện tại: ${userPlan}
          
          Thời gian hiện tại: ${now}

          THÔNG TIN HỆ THỐNG (Dùng để trả lời khi được hỏi):
          ${quikInfo}

          NGỮ CẢNH HỘI THOẠI (10 tin nhắn gần nhất):
          <history>
          ${recentMessages}
          </history>

          <target_context>
          ${replyContext}
          </target_context>

          YÊU CẦU:
          Phản hồi câu hỏi: "${question}" bằng tiếng Việt.

          RÀNG BUỘC PHẢN HỒI:
          1. Trả lời trực tiếp, tự nhiên như đang chat với bạn bè. 
          2. Tuyệt đối KHÔNG dùng: "Dựa trên...", "Theo thông tin...", "Tôi hiểu là...".
          3. ƯU TIÊN dùng kiến thức từ THÔNG TIN HỆ THỐNG nếu <history> không có dữ liệu.
          4. Đối với câu hỏi về thời gian/thời tiết: Nhìn vào thời gian hiện tại để đưa ra nhận định thực tế.
          5. KHÔNG giải thích suy nghĩ. Trả lời ngắn gọn dưới 3 câu.
          6. Luôn phản hồi lịch sự nhưng không quá trịnh trọng. Hạn chế nói "không biết".
          7. LOGIC TƯ VẤN GÓI (QUAN TRỌNG):
          - Bảng giới hạn file: FREE=5MB, LITE=25MB, PRO=100MB, MAX=200MB
          - Quy tắc: Chỉ gợi ý gói có giới hạn file STRICTLY >= nhu cầu người dùng
          - Ví dụ minh họa (bắt buộc làm theo):
            * Cần 3MB  → FREE (rẻ nhất đủ dùng)
            * Cần 10MB → LITE (rẻ nhất đủ dùng)  
            * Cần 26MB → PRO (LITE chỉ 25MB, không đủ)
            * Cần 50MB → PRO (LITE chỉ 25MB, không đủ)
            * Cần 101MB → MAX (PRO chỉ 100MB, không đủ)
            * Cần >200MB → Không có gói nào phù hợp, cần liên hệ admin.
          - TUYỆT ĐỐI không gợi ý nhiều gói khi chỉ có 1 gói rẻ nhất thỏa mãn.`;

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