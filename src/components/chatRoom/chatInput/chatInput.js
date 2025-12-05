import React, { useState, useRef } from "react";
import { Button, Form, Input, Select } from "antd";
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
import { askGemini } from "../../../utils/aiBot";
import "./chatInput.scss";

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
  const { uid, photoURL, displayName, language } = user || {};
  const [form] = Form.useForm();
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

  const handleInputChange = (e) => setInputValue(e.target.value);

  const handleSelectTone = async (selectedTone) => {
    setShowTonePicker(false);

    const toneMapping = {
      default: `Giọng văn trung tính, lịch sự, rõ ràng. Giữ xưng hô như trong nội dung gốc.`,
      boss: `Nói chuyện với sếp, cấp trên. Giữ thái độ tôn trọng, lịch sự. Dùng xưng hô phù hợp như "em - sếp".`,
      lover: `Viết nhẹ nhàng, tình cảm, ấm áp. Dùng đại từ thân mật như “em – anh”, “anh – em”.`,
      elder: `Viết lễ phép và tôn trọng với người lớn tuổi. Dùng từ nhẹ nhàng: “dạ”, “em/con/cháu”.`,
      friend: `Viết tự nhiên, thoải mái, gần gũi. Dùng đại từ bạn bè: “mình – bạn”, “tớ – cậu”.`,
      client: `Phù hợp với khách hàng hoặc đối tác. Thái độ chuyên nghiệp, lịch sự, xưng hô trang trọng.`
    };

    if (!inputValue.trim()) return;

    const isMeaningful = (text) => {
      const cleaned = text.replace(/[\p{Emoji}\p{So}\p{Sk}\p{P}\p{S}]/gu, "").trim();
      return cleaned.length >= 2; 
    };

    if (!isMeaningful(inputValue)) {
      toast.info("Nội dung không đủ ý nghĩa để cải thiện");
      return; 
    }

    try {
      setPolishing(true);

      const prompt = `
        Hãy chỉnh sửa đoạn văn sau theo các yêu cầu:
        - Giữ nguyên ý nghĩa gốc
        - Nghe tự nhiên, rõ ràng, mạch lạc
        - Sửa chính tả, viết hoa đầu câu, thêm dấu câu nếu cần
        - Không giải thích, không thêm ghi chú
        - Áp dụng giọng văn: ${toneMapping[selectedTone]}
        Văn bản cần chỉnh sửa:
        ${inputValue}

        QUAN TRỌNG:
          - Nếu văn bản này không có ý nghĩa (chỉ là ký tự vô nghĩa, spam, emoji hoặc lặp lại), hãy trả về chính xác văn bản gốc mà không thêm, xóa, sửa bất cứ gì. Không giải thích gì thêm.
      `;

      const polishedText = await askGemini(prompt);
      const cleanedText = polishedText.replace(/\n+/g, " ").trim();

      if (isMeaningful(cleanedText)) {
        setInputValue(cleanedText);
      }
    } catch (err) {
      toast.error("Không thể cải thiện 🫠");
    } finally {
      setPolishing(false);
    }
  };


  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setSendingFile(true);
      const res = await axios.post(
        "https://chat-realtime-be.vercel.app/upload",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
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
        visibleFor
      });

      await updateDocument("rooms", selectedRoom.id, {
        lastMessage: {
          displayName,
          text: encryptedText,
          uid,
          createdAt: new Date(),
          kind,
          fileName: file.name,
          visibleFor: selectedRoom.members
        },
      });
    } catch (err) {
      toast.error("Upload file thất bại");
    } finally {
      setSendingFile(false);
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
      setSendingVoice(true);
      const uploadRes = await axios.post(
        "https://chat-realtime-be.vercel.app/upload",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      const audioUrl = uploadRes.data.url;
      const encryptedAudioUrl = selectedRoom.secretKey
        ? encryptMessage(audioUrl, selectedRoom.secretKey)
        : audioUrl;

      const assemblyHeaders = { authorization: "9ca437cbe65d4f5387e937846ec08f46" };
      const transcriptRes = await axios.post(
        "https://api.assemblyai.com/v2/transcript",
        { 
          audio_url: audioUrl,
          language_code: language || "vi"
        },
        { headers: assemblyHeaders }
      );

      const transcriptId = transcriptRes.data.id;

      let transcriptText = "";
      while (true) {
        const pollRes = await axios.get(
          `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
          { headers: assemblyHeaders }
        );
        const data = pollRes.data;

        if (data.status === "completed") {
          transcriptText = data.text;
          break;
        } else if (data.status === "error") {
          transcriptText = "";
          toast.error("Chuyển giọng nói thành text thất bại");
          break;
        } else {
          await new Promise((r) => setTimeout(r, 3000));
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
        transcript: transcriptText 
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
      console.error(err);
      toast.error("Gửi tin nhắn thoại thất bại");
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
        askGemini(question)
          .then(async (reply) => {
            const encryptedReply = selectedRoom.secretKey
              ? encryptMessage(reply, selectedRoom.secretKey)
              : reply;

            await addDocument("messages", {
              text: encryptedReply,
              uid: "bot",
              displayName: "Quik Bot",
              photoURL: "https://cdn-icons-png.flaticon.com/512/4712/4712035.png",
              roomId: selectedRoom.id,
              createdAt: new Date(),
              kind: "text",
              visibleFor,
            });
          })
          .catch((err) => {
            console.error("Bot error:", err);
            toast.error("Bot không trả lời được 🫠");
          });
      }
    } catch (err) {
      toast.error("Gửi tin nhắn thất bại");
      console.error(err);
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
                    return <>🖼️ [Hình ảnh]{replyTo.fileName ? ` (${replyTo.fileName})` : ""}</>;
                  case "video":
                    return <>🎬 [Video]{replyTo.fileName ? ` (${replyTo.fileName})` : ""}</>;
                  case "file":
                    return <>📎 [Tệp]{replyTo.fileName ? ` (${replyTo.fileName})` : ""}</>;
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
            <div style={{ position: "absolute", bottom: "50px", left: "0", zIndex: 1000 }}>
              <EmojiPicker
                onEmojiClick={(emojiData) => setInputValue((prev) => prev + emojiData.emoji)}
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

          {inputValue.trim() && (
            <>
              {showTonePicker && (
                <div 
                  className="tone-picker"
                >
                  <p style={{ fontWeight: "bold", marginBottom: 5 }}>Chọn giọng văn:</p>

                  <div className="tone-option" onClick={() => handleSelectTone("default")}>Mặc định</div>
                  <div className="tone-option" onClick={() => handleSelectTone("boss")}>Sếp</div>
                  <div className="tone-option" onClick={() => handleSelectTone("client")}>Đối tác</div>
                  <div className="tone-option" onClick={() => handleSelectTone("lover")}>Người yêu</div>
                  <div className="tone-option" onClick={() => handleSelectTone("elder")}>Người lớn</div>
                  <div className="tone-option" onClick={() => handleSelectTone("friend")}>Bạn bè</div>
                </div>
              )}

              <Button
                type="text"
                onClick={() => setShowTonePicker(!showTonePicker)}
                disabled={polishing || sending}
                className={`polish-btn ${polishing ? 'loading' : ''}`}
                title="Chọn giọng văn để cải thiện"
              >
                {polishing ? <div className="spinner" /> : '✨'}
              </Button>
              <Button
                type="text"
                onClick={handleOnSubmit}
                loading={sending}
                className="send-btn"
              >
                Gửi
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
                {sendingVoice ? <div className="spinner-small" /> : <AudioOutlined />}
              </Button>
              <label htmlFor="fileUpload" className="input-icon-btn">
                {sendingFile ? <div className="spinner-small" /> : <PaperClipOutlined />}
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
    </div>
  );
}
