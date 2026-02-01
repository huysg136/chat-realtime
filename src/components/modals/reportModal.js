import React, { useMemo, useState } from "react";
import { Modal, Input, Button, Radio, Space } from "antd";
import { toast } from "react-toastify";
import { addDocument, updateDocument } from "../../firebase/services";
import { db } from "../../firebase/config";
import { collection, query, where, getDocs } from "firebase/firestore";
import "./reportModal.scss";
import { askGemini } from "../../utils/AI/geminiBot";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL
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
  // ⭐ Detect media type from prefix
  const isMediaMessage = messageText.startsWith("[Hình ảnh") ||
    messageText.startsWith("[Video") ||
    messageText.startsWith("[Tệp đính kèm") ||
    messageText.startsWith("[Tin nhắn thoại");
  const hasTranscript = messageText.includes("Transcript]:");

  // ⭐ Thêm cảnh báo nếu tin nhắn ngắn (chỉ với text thường)
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

  // ⭐ Media context for AI
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

  // Voice message: use transcript for AI analysis
  if (kind === "audio" && transcript) {
    return `[Tin nhắn thoại - Transcript]: ${transcript}`;
  }

  // Media types: prefix with type for AI context
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

function renderMessagePreview(message) {
  const kind = message?.kind || "text";
  const text = message?.text || message?.decryptedText || "";
  const transcript = message?.transcript || "";

  if (kind === "text") return <p>{text}</p>;

  if (kind === "picture") {
    return (
      <div>
        <p>🖼️ [Hình ảnh]</p>
        <a href={text} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#1890ff", wordBreak: "break-all" }}>
          {text}
        </a>
      </div>
    );
  }

  if (kind === "video") {
    return (
      <div>
        <p>🎬 [Video]</p>
        <a href={text} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#1890ff", wordBreak: "break-all" }}>
          {text}
        </a>
      </div>
    );
  }

  if (kind === "file") {
    return (
      <div>
        <p>📎 [Tệp đính kèm]</p>
        <a href={text} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#1890ff", wordBreak: "break-all" }}>
          {text}
        </a>
      </div>
    );
  }

  if (kind === "audio") {
    return (
      <div>
        <p>🎤 [Tin nhắn thoại]</p>
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

  return <p>[Tin nhắn]</p>;
}

async function getExistingReports(messageId) {
  try {
    const reportsRef = collection(db, "reports");
    const q = query(reportsRef, where("messageId", "==", messageId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching existing reports:", error);
    return [];
  }
}

// ==================== MAIN COMPONENT ====================

export default function ReportModal({ visible, onClose, message, currentUser }) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [existingReportCount, setExistingReportCount] = useState(0);

  const reasonData = useMemo(() => {
    return REPORT_REASONS.find((r) => r.value === reason);
  }, [reason]);

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
      toast.warning("Vui lòng chọn lý do báo cáo");
      return;
    }
    if (!message?.uid || !currentUser?.uid) {
      toast.error("Thiếu thông tin người dùng hoặc tin nhắn.");
      return;
    }

    try {
      setSubmitting(true);

      // 1. Get message text
      const messageText = getMessageText(message);

      // 2. Check existing reports
      const existingReports = await getExistingReports(message.id);
      const reportCount = existingReports.length + 1;

      const alreadyReported = existingReports.some(
        (report) => report.reportedBy === currentUser.uid
      );

      if (alreadyReported) {
        toast.warning("Bạn đã báo cáo tin nhắn này rồi.");
        setSubmitting(false);
        return;
      }

      // 3. AI Analysis
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
          explanation: "Không thể phân tích tự động, cần xem xét thủ công",
        },
        messageText.length // ⭐ Pass message length for validation
      );

      // 4. Determine status (SIMPLE)
      let status = "pending"; // Chờ xem xét
      let needsUrgent = false;

      // Auto-resolution fields
      let resolved = false;
      let action = null;
      let actionNotes = null;
      let reviewedBy = null;
      let reviewedByName = null;
      let reviewedAt = null;

      if (moderationResult.category === "harmful" && moderationResult.confidence >= 0.85) {
        // status = "urgent"; // REMOVED: Simplify statuses
        needsUrgent = true;
      } else if (moderationResult.category === "safe") {
        // ⭐ AUTO-REJECT: Nếu AI xác định an toàn -> Tự động từ chối
        status = "resolved";
        resolved = true;
        action = "reject";
        actionNotes = moderationResult.explanation;
        reviewedBy = "system_ai";
        reviewedByName = "AI System";
        reviewedAt = new Date();
      }
      // else if (moderationResult.confidence < 0.5) {
      //   status = "low_priority"; // REMOVED: Simplify statuses
      // }

      // Nếu nhiều người báo cáo → Ưu tiên cao hơn (chỉ nếu chưa resolved)
      if (!resolved && reportCount >= 3) {
        // status = "pending"; // Already pending
        needsUrgent = true;
      }

      // 5. Create report document (SIMPLE)
      const reportData = {
        // Message Info
        messageId: message?.id || "",
        messageText,
        messageRawText: message?.text || message?.decryptedText || "", // Original link/text
        messageTranscript: message?.transcript || "", // Voice transcript if any
        messageUid: message?.uid,
        messageDisplayName: message?.displayName || "",
        messageKind: message?.kind || "text",
        roomId: message?.roomId || "",

        // Reporter Info
        reportedBy: currentUser?.uid,
        reportedByName: currentUser?.displayName || "",
        reportedByEmail: currentUser?.email || "",

        // Report Details
        userReportCategory: reason,
        userReportCategoryLabel: reasonData?.label || "",
        userReportDetails: details || "",

        // AI Analysis (SIMPLE)
        aiCategory: moderationResult.category,
        aiConfidence: moderationResult.confidence,
        aiExplanation: moderationResult.explanation,

        // Status (SIMPLE)
        status, // pending, resolved
        reportCount,
        needsUrgent,

        // Resolution Info (if auto-resolved)
        resolved,
        videoResolved: resolved, // sync
        action,
        actionNotes,
        reviewedBy,
        reviewedByName,
        reviewedAt,

        // Timestamps
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 6. Add to Firestore
      await addDocument("reports", reportData);

      // 7. Update existing report if any
      if (existingReports.length > 0 && existingReports[0]?.id) {
        await updateDocument("reports", existingReports[0].id, {
          reportCount,
          updatedAt: new Date(),
          // Escalate if ≥3 reports (only if not already resolved)
          ...(!resolved && reportCount >= 3
            ? {
              needsUrgent: true,
            }
            : {}),
        });
      }

      // 8. Send Email if Auto-Resolved
      if (resolved) {
        try {
          fetch(`${API_BASE_URL}/api/reports/notify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              reporterEmail: currentUser?.email,
              reporterName: currentUser?.displayName,
              messageText: messageText,
              action: "reject",
              adminName: "AI System", // System handled it
              reason: actionNotes,
              reportDate: new Date().toLocaleString("vi-VN"),
            }),
          }).catch(console.error); // Fire and forget
        } catch (e) {
          console.error("Auto-reply email error", e);
        }
      }

      // 9. Show toast
      toast.success("Báo cáo đã được ghi nhận. Cảm ơn bạn đã góp ý.");

      resetForm();
      onClose?.();
    } catch (err) {
      console.error("Report error:", err);
      toast.error("Không thể gửi báo cáo. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  const senderName = message?.displayName || "Người dùng";

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span>Báo cáo tin nhắn</span>
          {existingReportCount > 0 && (
            <span style={{ fontSize: 12, color: "#ff4d4f", fontWeight: "normal" }}>
              ({existingReportCount} người đã báo cáo)
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
          {/* Message Preview */}
          <div className="message-preview">
            <div className="preview-label">
              Tin nhắn từ: <span className="sender-name">{senderName}</span>
            </div>
            <div className="preview-box">{renderMessagePreview(message)}</div>
          </div>

          {/* Reason Selection */}
          <div className="reason-section">
            <div className="section-label">
              Lý do báo cáo: <span className="required">*</span>
            </div>

            <Radio.Group
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="reason-group"
              disabled={submitting}
            >
              <Space direction="vertical" style={{ width: "100%" }}>
                {REPORT_REASONS.map((r) => (
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

          {/* Additional Details */}
          <div className="details-section">
            <div className="section-label">Chi tiết bổ sung (tùy chọn):</div>
            <TextArea
              rows={4}
              placeholder="Mô tả thêm về vi phạm (nếu có)..."
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

      {/* Footer */}
      <div className="report-footer">
        <Button onClick={handleCancel} disabled={submitting} className="cancel-button">
          Hủy
        </Button>
        <Button
          type="primary"
          danger
          loading={submitting}
          onClick={handleSubmit}
          disabled={!reason || submitting}
          className="submit-button"
        >
          {submitting ? "Đang gửi..." : "Gửi báo cáo"}
        </Button>
      </div>
    </Modal>
  );
}