import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Input, Button, Radio, Space } from "antd";
import { toast } from "react-toastify";
import { addDocument, updateDocument } from "../../firebase/services";
import { db } from "../../firebase/config";
import { collection, query, where, getDocs } from "firebase/firestore";
import "./reportModal.scss";
import { askGemini } from "../../services/aiService";
import { notifyReportAction } from "../../services/mailService";

const { TextArea } = Input;

// ==================== SIMPLE CATEGORIES ====================
const REPORT_REASONS = [
  {
    value: "harmful",
    label: "🔴 Nội dung nguy hại",
    description: "Bạo lực, xâm hại, đe dọa nghiêm trọng",
  },
  {
    value: "inappropriate",
    label: "🟠 Không phù hợp",
    description: "Nội dung 18+, quấy rối, ngôn từ thù ghét",
  },
  {
    value: "spam",
    label: "🟡 Spam / Lừa đảo",
    description: "Quảng cáo, spam, lừa đảo, link lạ",
  },
  {
    value: "other",
    label: "⚪ Khác",
    description: "Lý do khác",
  },
];

// ==================== UTILITY FUNCTIONS ====================

function safeParseAIJson(raw) {
  if (!raw || typeof raw !== "string") return null;
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) return null;

  try {
    return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
  } catch {
    return null;
  }
}

function normalizeModeration(result, messageLength) {
  let confidence = typeof result?.confidence === "number"
    ? Math.max(0, Math.min(1, result.confidence))
    : 0.5;

  let category = typeof result?.category === "string" ? result.category : "other";

  // ⭐ VALIDATION: Tin nhắn ngắn (<10 ký tự) không thể có confidence cao
  if (messageLength < 10 && confidence > 0.6) {
    confidence = 0.3;
    category = "safe";
  }

  // ⭐ VALIDATION: Category "safe" phải có confidence thấp
  if (category === "safe" && confidence > 0.5) {
    confidence = 0.2;
  }

  // ⭐ VALIDATION: Spam với confidence cao phải có dấu hiệu rõ ràng
  if (category === "spam" && confidence > 0.8) {
    const explanation = result?.explanation || "";
    const hasSpamIndicators =
      explanation.includes("quảng cáo") ||
      explanation.includes("link") ||
      explanation.includes("số điện thoại");

    if (!hasSpamIndicators) {
      confidence = Math.min(0.65, confidence);
    }
  }

  return {
    confidence,
    category: ["harmful", "inappropriate", "spam", "other", "safe"].includes(category)
      ? category
      : "other",
    explanation: typeof result?.explanation === "string"
      ? result.explanation
      : "Cần xem xét thủ công.",
  };
}

function buildModerationPrompt({ messageText, reasonLabel, details, messageKind }) {
  const isMediaMessage = messageText.startsWith("[Hình ảnh") ||
    messageText.startsWith("[Video") ||
    messageText.startsWith("[Tệp đính kèm") ||
    messageText.startsWith("[Tin nhắn thoại");
  const hasTranscript = messageText.includes("Transcript]:");

  let lengthWarning = "";
  if (!isMediaMessage && messageText.length < 10) {
    lengthWarning = `

⚠️ LƯU Ý QUAN TRỌNG: Tin nhắn này RẤT NGẮN (${messageText.length} ký tự).
- Tin nhắn ngắn HIẾM KHI vi phạm nghiêm trọng
- Có thể chỉ là test, gõ phím random, hoặc vô nghĩa
- CHO confidence < 0.4 trừ khi vi phạm CỰC KỲ rõ ràng
- Ví dụ "kjkkk", "hehe", "lol" → confidence < 0.3, category: "safe"
`;
  }

  let mediaContext = "";
  if (isMediaMessage) {
    mediaContext = `

📎 ĐÂY LÀ TIN NHẮN MEDIA:
- Nội dung là LINK tới file media (hình ảnh/video/file/voice)
- Domain "files.quik.id.vn" là hệ thống lưu trữ của ứng dụng
${hasTranscript ? "- Có TRANSCRIPT (nội dung chuyển đổi từ giọng nói) - HÃY PHÂN TÍCH TRANSCRIPT" : "- KHÔNG có transcript - chỉ có thể phân tích context"}

VỚI MEDIA:
- Nếu có transcript → phân tích NỘI DUNG transcript
- Nếu chỉ có link → confidence thấp hơn vì không thể "nhìn" nội dung
- Link spam/lạ (không phải files.quik.id.vn) → có thể là spam
`;
  }

  return `
Bạn là AI kiểm duyệt nội dung. Phân tích tin nhắn và trả về JSON thuần (KHÔNG dùng \`\`\`json).

TIN NHẮN: "${messageText}"
LÝ DO USER BÁO CÁO: ${reasonLabel}
CHI TIẾT: ${details || "Không có"}
${lengthWarning}${mediaContext}

TRẢ VỀ JSON:
{
  "category": "harmful|inappropriate|spam|other|safe",
  "confidence": 0.0-1.0,
  "explanation": "Giải thích ngắn gọn (1-2 câu)"
}

CATEGORY:
- **harmful**: Bạo lực, đe dọa, xâm hại trẻ em, tự tử → NGUY HIỂM
- **inappropriate**: Nội dung 18+, quấy rối, hate speech → CẦN XEM XÉT  
- **spam**: Quảng cáo, lừa đảo, link lạ, phishing → SPAM
- **other**: Vi phạm nhẹ khác
- **safe**: KHÔNG vi phạm

CONFIDENCE (Mức độ chắc chắn):
- **0.85-1.0**: Vi phạm CỰC KỲ RÕ RÀNG (text/transcript rõ ràng vi phạm)
- **0.6-0.85**: Có khả năng vi phạm
- **0.4-0.6**: Media không có transcript - cần admin xem xét
- **0.0-0.4**: Không chắc chắn hoặc KHÔNG vi phạm

⚠️ QUY TẮC:
1. CHỈ cho confidence >= 0.85 khi vi phạm CỰC KỲ rõ ràng
2. Tin nhắn ngắn, vô nghĩa → confidence < 0.4, category: "safe"
3. ĐỪNG bị bias bởi lý do user chọn - phân tích độc lập
4. Media không có transcript → confidence tối đa 0.6 (cần admin xem)
5. Voice có transcript vi phạm → phân tích như text thường

VÍ DỤ:

Tin nhắn: "kjkkk"
→ {"category": "safe", "confidence": 0.15, "explanation": "Tin nhắn vô nghĩa, không có dấu hiệu vi phạm"}

Tin nhắn: "[Tin nhắn thoại - Transcript]: Tao sẽ giết mày"
→ {"category": "harmful", "confidence": 0.95, "explanation": "Transcript chứa lời đe dọa bạo lực trực tiếp"}

Tin nhắn: "[Hình ảnh - Link]: https://files.quik.id.vn/abc123.jpg"
→ {"category": "other", "confidence": 0.5, "explanation": "Không thể phân tích nội dung hình ảnh, cần admin xem xét"}

Tin nhắn: "[Video - Link]: https://malicious-site.com/video.mp4"
→ {"category": "spam", "confidence": 0.8, "explanation": "Link video từ domain lạ, có thể là spam/lừa đảo"}

Phân tích CHÍNH XÁC và CÔNG BẰNG.
`.trim();
}

function getMessageText(message) {
  const kind = message?.kind || "text";
  const rawText = (message?.text || message?.decryptedText || "").toString();
  const transcript = message?.transcript || "";

  if (kind === "audio" && transcript) {
    return `[Tin nhắn thoại - Transcript]: ${transcript}`;
  }
  if (kind === "picture") {
    return `[Hình ảnh - Link]: ${rawText}`;
  }
  if (kind === "video") {
    return `[Video - Link]: ${rawText}`;
  }
  if (kind === "file") {
    return `[Tệp đính kèm - Link]: ${rawText}`;
  }
  if (kind === "audio" && !transcript) {
    return `[Tin nhắn thoại - Link]: ${rawText}`;
  }

  return rawText;
}

function renderMessagePreview(message, t) {
  const kind = message?.kind || "text";
  const text = message?.text || message?.decryptedText || "";
  const transcript = message?.transcript || "";

  if (kind === "text") return <p>{text}</p>;

  if (kind === "picture") {
    return (
      <div>
        <p>🖼️ [{t('message.openImage')}]</p>
        <a href={text} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#1890ff", wordBreak: "break-all" }}>
          {text}
        </a>
      </div>
    );
  }

  if (kind === "video") {
    return (
      <div>
        <p>🎬 [{t('message.openVideo')}]</p>
        <a href={text} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#1890ff", wordBreak: "break-all" }}>
          {text}
        </a>
      </div>
    );
  }

  if (kind === "file") {
    return (
      <div>
        <p>📎 [{t('chatInput.media.file')}]</p>
        <a href={text} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#1890ff", wordBreak: "break-all" }}>
          {text}
        </a>
      </div>
    );
  }

  if (kind === "audio") {
    return (
      <div>
        <p>🎤 [{t('chatInput.media.voice')}]</p>
        {transcript && (
          <p style={{ fontSize: 12, color: "#595959", marginTop: 4, fontStyle: "italic" }}>
            Transcript: "{transcript}"
          </p>
        )}
        <a href={text} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#1890ff", wordBreak: "break-all" }}>
          {text}
        </a>
      </div>
    );
  }

  return <p>[{t('searching.message')}]</p>;
}

async function getExistingReports(messageId) {
  try {
    const reportsRef = collection(db, "reports");
    const q = query(reportsRef, where("messageId", "==", messageId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    return [];
  }
}

export default function ReportModal({ visible, onClose, message, currentUser }) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [existingReportCount, setExistingReportCount] = useState(0);

  const reportReasons = useMemo(() => [
    {
      value: "harmful",
      label: t('report.harmful'),
      description: t('report.harmfulDesc'),
    },
    {
      value: "inappropriate",
      label: t('report.inappropriate'),
      description: t('report.inappropriateDesc'),
    },
    {
      value: "spam",
      label: t('report.spam'),
      description: t('report.spamDesc'),
    },
    {
      value: "other",
      label: t('report.other'),
      description: t('report.otherDesc'),
    },
  ], [t]);

  const reasonData = useMemo(() => {
    return reportReasons.find((r) => r.value === reason);
  }, [reason, reportReasons]);

  const resetForm = () => {
    setReason("");
    setDetails("");
  };

  const handleCancel = () => {
    if (submitting) return;
    resetForm();
    onClose?.();
  };

  React.useEffect(() => {
    if (visible && message?.id) {
      getExistingReports(message.id).then((reports) => {
        setExistingReportCount(reports.length);
      });
    }
  }, [visible, message?.id]);

  const handleSubmit = async () => {
    if (!reason) {
      toast.warning(t('report.noReason'));
      return;
    }
    if (!message?.uid || !currentUser?.uid) {
      toast.error(t('report.missingInfo'));
      return;
    }

    try {
      setSubmitting(true);
      const messageText = getMessageText(message);
      const existingReports = await getExistingReports(message.id);
      const reportCount = existingReports.length + 1;

      const alreadyReported = existingReports.some(
        (report) => report.reportedBy === currentUser.uid
      );

      if (alreadyReported) {
        toast.warning(t('report.alreadyReported'));
        setSubmitting(false);
        return;
      }

      const prompt = buildModerationPrompt({
        messageText,
        reasonLabel: reasonData?.label || "",
        details,
        messageKind: message?.kind || "text",
      });

      const aiRaw = await askGemini(prompt);
      const parsed = safeParseAIJson(aiRaw);
      const moderationResult = normalizeModeration(
        parsed || {
          confidence: 0.5,
          category: "other",
          explanation: t('report.aiResultManual'),
        },
        messageText.length
      );

      let status = "pending";

      let resolved = false;
      let action = null;
      let actionNotes = null;
      let reviewedBy = null;
      let reviewedByName = null;
      let reviewedAt = null;

      if (moderationResult.category === "safe") {
        status = "resolved";
        resolved = true;
        action = "reject";
        actionNotes = moderationResult.explanation;
        reviewedBy = "system_ai";
        reviewedByName = "AI System";
        reviewedAt = new Date();
      }

      const reportData = {
        messageId: message?.id || "",
        messageText,
        messageRawText: message?.text || message?.decryptedText || "",
        messageTranscript: message?.transcript || "",
        messageUid: message?.uid,
        messageDisplayName: message?.displayName || "",
        messageKind: message?.kind || "text",
        roomId: message?.roomId || "",

        reportedBy: currentUser?.uid,
        reportedByName: currentUser?.displayName || "",
        reportedByEmail: currentUser?.email || "",

        userReportCategory: reason,
        userReportCategoryLabel: reasonData?.label || "",
        userReportDetails: details || "",

        aiCategory: moderationResult.category,
        aiConfidence: moderationResult.confidence,
        aiExplanation: moderationResult.explanation,

        status,
        reportCount,

        resolved,
        videoResolved: resolved,
        action,
        actionNotes,
        reviewedBy,
        reviewedByName,
        reviewedAt,

        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await addDocument("reports", reportData);

      if (existingReports.length > 0 && existingReports[0]?.id) {
        await updateDocument("reports", existingReports[0].id, {
          reportCount,
          updatedAt: new Date(),
        });
      }

      if (resolved) {
        try {
          notifyReportAction({
            reporterEmail: currentUser?.email,
            reporterName: currentUser?.displayName,
            messageText: messageText,
            action: "reject",
            adminName: "AI System",
            reason: actionNotes,
            reportDate: new Date().toLocaleString("vi-VN"),
          }).catch();
        } catch (e) {
        }
      }
      toast.success(t('report.success'));
      resetForm();
      onClose?.();
    } catch (err) {
      toast.error(t('report.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const senderName = message?.displayName || t('chatWindow.members');

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span>{t('report.title')}</span>
          {existingReportCount > 0 && (
            <span style={{ fontSize: 12, color: "#ff4d4f", fontWeight: "normal" }}>
              {t('report.reportedByCount', { count: existingReportCount })}
            </span>
          )}
        </div>
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      centered
      width={520}
      className="report-modal"
    >
      <div className="report-scrollable">
        <div className="report-content">
          <div className="message-preview">
            <div className="preview-label">
              {t('report.messageFrom')} <span className="sender-name">{senderName}</span>
            </div>
            <div className="preview-box">{renderMessagePreview(message, t)}</div>
          </div>
          <div className="reason-section">
            <div className="section-label">
              {t('report.reasonLabel')} <span className="required">*</span>
            </div>

            <Radio.Group
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="reason-group"
              disabled={submitting}
            >
              <Space direction="vertical" style={{ width: "100%" }}>
                {reportReasons.map((r) => (
                  <Radio key={r.value} value={r.value} className="reason-radio">
                    <div>
                      <div style={{ fontWeight: 500 }}>{r.label}</div>
                      <div style={{ fontSize: 12, color: "#888", marginTop: 2, lineHeight: 1.3 }}>
                        {r.description}
                      </div>
                    </div>
                  </Radio>
                ))}
              </Space>
            </Radio.Group>
          </div>

          <div className="details-section">
            <div className="section-label">{t('report.detailsLabel')}</div>
            <TextArea
              rows={4}
              placeholder={t('report.detailsPlaceholder')}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={500}
              showCount
              className="details-textarea"
              disabled={submitting}
            />
          </div>
        </div>
      </div>

      <div className="report-footer">
        <Button onClick={handleCancel} disabled={submitting} className="cancel-button">
          {t('report.btnCancel')}
        </Button>
        <Button
          type="primary"
          danger
          loading={submitting}
          onClick={handleSubmit}
          disabled={!reason || submitting}
          className="submit-button"
        >
          {submitting ? t('report.submitting') : t('report.btnSubmit')}
        </Button>
      </div>
    </Modal>
  );
}