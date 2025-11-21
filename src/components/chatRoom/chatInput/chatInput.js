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

// Lấy danh sách user có thể nhìn thấy message
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
  const { uid, photoURL, displayName } = user;
  const [form] = Form.useForm();
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
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
      default: `
        Giọng văn trung tính, lịch sự, rõ ràng.
        Không thiên về thân mật hay trang trọng.
        Giữ xưng hô như trong nội dung gốc.
      `,

      boss: `
        Nói chuyện với sếp, cấp trên.
        Giữ thái độ tôn trọng, lịch sự.
        Dùng xưng hô phù hợp như "em - sếp".
        Ngữ khí trang trọng, chuyên nghiệp.
      `,

      lover: `
        Viết nhẹ nhàng, tình cảm, ấm áp.
        Dùng đại từ thân mật phù hợp như “em – anh”, “anh – em”.
        Có thể thêm sắc thái dịu dàng nhưng không quá sến.
        Ngữ khí gần gũi, thể hiện quan tâm.
      `,

      elder: `
        Viết lễ phép và tôn trọng, phù hợp khi nói chuyện với người lớn tuổi.
        Dùng từ ngữ nhẹ nhàng: “dạ”, “em/con/cháu”.
        Tránh văn phong quá trang trọng kiểu nghi thức.
        Giữ giọng tự nhiên, ấm áp, lịch sự.
      `,


      friend: `
        Viết tự nhiên, thoải mái, gần gũi.
        Dùng đại từ bạn bè: “mình – bạn”, “tớ – cậu”, hoặc giữ nguyên theo ngữ cảnh.
        Giao tiếp thân thiện nhưng không suồng sã quá mức.
        Nghe giống cách nhắn tin giữa bạn bè thân.
      `,

      client: `
        Phù hợp khi nói chuyện với khách hàng hoặc đối tác.
        Giữ thái độ chuyên nghiệp, lịch sự.
        Dùng xưng hô trang trọng như "em - quý khách"
        Ngữ khí rõ ràng, mạch lạc, tránh dùng từ ngữ quá thân mật.
      `,
    };


    if (!inputValue.trim()) return;

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
      `;

      const polishedText = await askGemini(prompt);
      const cleanedText = polishedText.replace(/\n+/g, " ").trim();

      setInputValue(cleanedText);
    } catch (err) {
      toast.error("Không thể cải thiện 🫠");
    } finally {
      setPolishing(false);
    }
  };


  // ==== Upload file ====
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
      setSending(false);
      e.target.value = null;
    }
  };

  // ==== Ghi âm giọng nói ====
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
        visibleFor
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
          visibleFor: selectedRoom.members
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

  // ==== Gửi tin nhắn ====
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

      

      // Gọi bot nếu có tag @bot
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
