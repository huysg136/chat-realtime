import { useEffect, useState, useContext } from "react";
import { db } from "../../../firebase/config";
import {
  collection,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  query,
  where,
  getDocs,
  addDoc,
} from "firebase/firestore";
import { AuthContext } from "../../../context/authProvider";
import { toast } from "react-toastify";
import {
  FiEye,
  FiCheck,
  FiX,
  FiTrash2,
  FiUser,
  FiMessageSquare,
  FiCopy,
  FiSlash,
} from "react-icons/fi";
import { IoIosCloseCircleOutline } from "react-icons/io";
import NoAccess from "../noAccess/noAccess";
import { Table, Tag, Spin, Modal, Input, Radio, Space, Select } from "antd";
import "react-toastify/dist/ReactToastify.css";
import "./reportManager.scss";

const { TextArea } = Input;

// ==================== CONSTANTS ====================
const CATEGORY_COLORS = {
  harmful: { color: "#ff4d4f", bg: "rgba(255, 77, 79, 0.15)", label: "Nguy hại" },
  inappropriate: { color: "#ff7a45", bg: "rgba(255, 122, 69, 0.15)", label: "Không phù hợp" },
  spam: { color: "#ffa940", bg: "rgba(255, 169, 64, 0.15)", label: "Spam" },
  other: { color: "#8c8c8c", bg: "rgba(140, 140, 140, 0.15)", label: "Khác" },
  safe: { color: "#52c41a", bg: "rgba(82, 196, 26, 0.15)", label: "An toàn" },
};

const STATUS_COLORS = {
  pending: { color: "#1677ff", bg: "rgba(22, 119, 255, 0.15)", label: "Chờ xử lý" },
  urgent: { color: "#ff4d4f", bg: "rgba(255, 77, 79, 0.15)", label: "Khẩn cấp" },
  low_priority: { color: "#8c8c8c", bg: "rgba(140, 140, 140, 0.15)", label: "Ưu tiên thấp" },
  resolved: { color: "#52c41a", bg: "rgba(82, 196, 26, 0.15)", label: "Đã xử lý" },
};

const ACTION_OPTIONS = [
  { value: "delete_only", label: "Chỉ xóa tin nhắn" },
  { value: "delete_and_ban", label: "Xóa tin nhắn + Cấm chat" },
  { value: "reject", label: "Từ chối báo cáo (không vi phạm)" },
];

// ⭐ NEW: Time units
const TIME_UNITS = [
  { value: "minutes", label: "Phút", max: 1440, min: 1 }, // Max 1 day in minutes
  { value: "hours", label: "Giờ", max: 720, min: 1 }, // Max 30 days in hours
  { value: "days", label: "Ngày", max: 365, min: 1 },
];

// ==================== UTILITY FUNCTIONS ====================
function formatTimestamp(timestamp) {
  if (!timestamp) return "N/A";
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString("vi-VN");
}

function truncateText(text, maxLength = 50) {
  if (!text) return "";
  return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
}

async function getUserDocIdByUid(uid) {
  try {
    const q = query(collection(db, "users"), where("uid", "==", uid));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].id;
    }
    return null;
  } catch (err) {
    return null;
  }
}

// ⭐ NEW: Convert ban duration to milliseconds
function getBanDurationInMs(value, unit) {
  const MS_PER_MINUTE = 60 * 1000;
  const MS_PER_HOUR = 60 * MS_PER_MINUTE;
  const MS_PER_DAY = 24 * MS_PER_HOUR;

  switch (unit) {
    case "minutes":
      return value * MS_PER_MINUTE;
    case "hours":
      return value * MS_PER_HOUR;
    case "days":
      return value * MS_PER_DAY;
    default:
      return value * MS_PER_DAY; // Default to days
  }
}

// ⭐ NEW: Format ban duration for display
function formatBanDuration(value, unit) {
  const unitLabels = {
    minutes: "phút",
    hours: "giờ",
    days: "ngày",
  };
  return `${value} ${unitLabels[unit] || "ngày"}`;
}

// ==================== MAIN COMPONENT ====================
export default function ReportManager() {
  const { user: currentUser } = useContext(AuthContext);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    messageId: "",
    reportedBy: "",
    category: "",
    status: "",
  });

  // Modals
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [actionReport, setActionReport] = useState(null);
  const [actionType, setActionType] = useState("");
  const [actionNotes, setActionNotes] = useState("");
  const [banDuration, setBanDuration] = useState(7); // ⭐ Renamed from banDays
  const [banUnit, setBanUnit] = useState("days"); // ⭐ NEW: Unit selection
  const [submitting, setSubmitting] = useState(false);

  // ==================== FIRESTORE LISTENERS ====================
  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(
      collection(db, "reports"),
      (snapshot) => {
        const reportList = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        
        reportList.sort((a, b) => {
          if (a.status === "urgent" && b.status !== "urgent") return -1;
          if (a.status !== "urgent" && b.status === "urgent") return 1;
          return (
            (b.createdAt?.toDate?.() || new Date(b.createdAt)) -
            (a.createdAt?.toDate?.() || new Date(a.createdAt))
          );
        });
        
        setReports(reportList);
        setLoading(false);
      },
      (error) => {
        toast.error("Không thể tải danh sách báo cáo");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

    // ==================== PERMISSION CHECK ====================
    if (!currentUser?.permissions?.canManageReports && currentUser.role !== "admin") {
        return <NoAccess />;
    }

    // ==================== HANDLERS ====================
    const showDetailModal = (report) => {
        setSelectedReport(report);
        setDetailModalVisible(true);
    };

  const showActionModal = (report) => {
    setActionReport(report);
    setActionType("delete_only");
    setActionNotes("");
    setBanDuration(7);
    setBanUnit("days"); // ⭐ Reset to default
    setActionModalVisible(true);
  };

  const handleActionSubmit = async () => {
    if (!actionType) {
      toast.warning("Vui lòng chọn hành động xử lý");
      return;
    }

    if (!actionNotes.trim()) {
      toast.warning("Vui lòng nhập ghi chú xử lý");
      return;
    }

    // ⭐ Validate ban duration based on unit
    if (actionType === "delete_and_ban") {
      const currentUnit = TIME_UNITS.find((u) => u.value === banUnit);
      if (!banDuration || banDuration < currentUnit.min || banDuration > currentUnit.max) {
        toast.warning(
          `Thời gian cấm phải từ ${currentUnit.min}-${currentUnit.max} ${currentUnit.label.toLowerCase()}`
        );
        return;
      }
    }

    try {
      setSubmitting(true);

      // 1. Delete message if needed
      if (actionType === "delete_only" || actionType === "delete_and_ban") {
        try {
          const messagesRef = collection(db, "messages");
          const q = query(messagesRef, where("id", "==", actionReport.messageId));
          const snapshot = await getDocs(q);

          if (!snapshot.empty) {
            await deleteDoc(snapshot.docs[0].ref);
          }
        } catch (err) {
        }
      }

      // 2. Ban user if needed
      if (actionType === "delete_and_ban") {
        try {
          const targetUid = actionReport.messageUid;
          const userDocId = await getUserDocIdByUid(targetUid);

          if (userDocId) {
            const userDoc = await getDocs(
              query(collection(db, "users"), where("uid", "==", targetUid))
            );

            if (!userDoc.empty) {
              const userData = userDoc.docs[0].data();
              const banStart = new Date();
              // ⭐ Use helper function to calculate ban end time
              const banDurationMs = getBanDurationInMs(banDuration, banUnit);
              const banEnd = new Date(banStart.getTime() + banDurationMs);

              await addDoc(collection(db, "bans"), {
                uid: targetUid,
                displayName: userData.displayName || actionReport.messageDisplayName,
                email: userData.email || "",
                role: userData.role || "user",
                banStart: banStart.toISOString(),
                banEnd: banEnd.toISOString(),
                reason: actionNotes,
                bannedBy: currentUser.uid,
                bannedByName: currentUser.displayName,
                reportId: actionReport.id,
                // ⭐ Store original duration and unit
                banDuration,
                banUnit,
                createdAt: new Date(),
              });
            }
          }
        } catch (err) {
          toast.warning("Đã xóa tin nhắn nhưng không thể cấm chat người dùng");
        }
      }

      

      // 3. Update report status
      await updateDoc(doc(db, "reports", actionReport.id), {
        status: "resolved",
        resolved: true,
        reviewedBy: currentUser.uid,
        reviewedByName: currentUser.displayName,
        reviewedAt: new Date(),
        action: actionType,
        actionNotes,
        // ⭐ Store both duration and unit
        ...(actionType === "delete_and_ban" && { 
          banDuration,
          banUnit,
          banDurationFormatted: formatBanDuration(banDuration, banUnit),
        }),
        updatedAt: new Date(),
      });

      try {
        const emailResponse = await fetch('https://chat-realtime-be.vercel.app/api/reports/notify', {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            },
            body: JSON.stringify({
            reporterEmail: actionReport.reportedByEmail,
            reporterName: actionReport.reportedByName,
            messageText: actionReport.messageText,
            action: actionType,
            adminName: currentUser.displayName,
            reason: actionNotes,
            reportDate: formatTimestamp(actionReport.createdAt),
            ...(actionType === "delete_and_ban" && {
                banDuration,
                banUnit,
            }),
            }),
        });

        const emailResult = await emailResponse.json();
        
        if (emailResult.success) {
        } else {
        }
        } catch (emailError) {
        // Không hiện lỗi cho user vì đã xử lý báo cáo thành công
        }

      // 4. Success message
      if (actionType === "delete_and_ban") {
        toast.success(`Đã xóa tin nhắn và cấm chat ${formatBanDuration(banDuration, banUnit)}`);
      } else if (actionType === "delete_only") {
        toast.success("Đã xóa tin nhắn vi phạm");
      } else {
        toast.success("Đã từ chối báo cáo");
      }

      setActionModalVisible(false);
    } catch (err) {
      toast.error("Không thể xử lý. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (reportId) => {
    if (!window.confirm("Bạn có chắc muốn xóa báo cáo này?")) return;

    try {
      await deleteDoc(doc(db, "reports", reportId));
      toast.success("Đã xóa báo cáo");
    } catch (err) {
      toast.error("Không thể xóa báo cáo");
    }
  };

  // ==================== FILTERS ====================
  const filteredReports = reports
    .filter((r) =>
      r.messageId?.toLowerCase().includes(filters.messageId.toLowerCase())
    )
    .filter((r) =>
      r.reportedByName?.toLowerCase().includes(filters.reportedBy.toLowerCase())
    )
    .filter((r) => (filters.category ? r.aiCategory === filters.category : true))
    .filter((r) => (filters.status ? r.status === filters.status : true));

  // ==================== TABLE COLUMNS ====================
  const columns = [
    {
      title: "Tin nhắn",
      key: "message",
      width: 250,
      render: (_, record) => (
        <div className="message-preview-cell">
          <div className="message-kind">
            <FiMessageSquare size={14} />
            <span>{record.messageKind || "text"}</span>
          </div>
          <div className="message-text">{truncateText(record.messageText, 80)}</div>
          <div className="message-meta">
            <span
              className="copyable-id"
              onClick={() => {
                navigator.clipboard.writeText(record.messageId);
                toast.info("Đã sao chép ID", { autoClose: 1200 });
              }}
            >
              ID: {record.messageId?.slice(0, 8)}... <FiCopy size={12} />
            </span>
          </div>
        </div>
      ),
    },
    {
      title: "Người báo cáo",
      key: "reporter",
      width: 150,
      render: (_, record) => (
        <div className="reporter-cell">
          <div className="reporter-name">
            <FiUser size={14} />
            <span>{truncateText(record.reportedByName, 20)}</span>
          </div>
          <div className="reporter-meta">{formatTimestamp(record.createdAt)}</div>
          {record.reportCount > 1 && (
            <Tag color="red" style={{ fontSize: 11, marginTop: 4 }}>
              {record.reportCount} báo cáo
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: "Phân loại",
      key: "category",
      width: 150,
      render: (_, record) => {
        const categoryConfig = CATEGORY_COLORS[record.aiCategory] || CATEGORY_COLORS.other;
        return (
          <div className="category-cell">
            <Tag
              color={categoryConfig.color}
              style={{
                background: categoryConfig.bg,
                border: "none",
                fontWeight: 500,
                marginBottom: 4,
              }}
            >
              {record.userReportCategoryLabel}
            </Tag>
            <div className="ai-category" style={{ fontSize: 11, color: "#8c8c8c" }}>
              AI: {categoryConfig.label}
            </div>
          </div>
        );
      },
    },
    {
      title: "Khả năng vi phạm",
      key: "confidence",
      width: 150,
      render: (_, record) => {
        const confidence = (record.aiConfidence || 0) * 100;
        return (
          <div className="confidence-cell">
            <div className="confidence-label" style={{ fontSize: 13, fontWeight: 500 }}>
              {confidence.toFixed(0)}%
            </div>
            <div className="confidence-progress">
              <div
                className="confidence-fill"
                style={{
                  width: `${confidence}%`,
                  height: 6,
                  background:
                    confidence >= 85
                      ? "#ff4d4f"
                      : confidence >= 60
                      ? "#ffa940"
                      : "#52c41a",
                  borderRadius: 3,
                }}
              />
            </div>
            <div className="ai-explanation" style={{ fontSize: 11, color: "#8c8c8c", marginTop: 4 }}>
              {truncateText(record.aiExplanation, 50)}
            </div>
          </div>
        );
      },
    },
    {
      title: "Trạng thái",
      key: "status",
      width: 120,
      render: (_, record) => {
        const statusConfig = STATUS_COLORS[record.status] || STATUS_COLORS.pending;
        return (
          <Tag
            color={statusConfig.color}
            style={{
              background: statusConfig.bg,
              border: "none",
              fontWeight: 500,
            }}
          >
            {statusConfig.label}
          </Tag>
        );
      },
    },
    {
      title: "Hành động",
      key: "actions",
      width: 180,
      fixed: "right",
      render: (_, record) => {
        const isResolved = record.resolved || record.status === "resolved";

        return (
          <div className="actions-cell">
            <button
              className="btn-action btn-view"
              onClick={() => showDetailModal(record)}
            >
              <FiEye size={14} /> Chi tiết
            </button>

            {!isResolved && (
              <button
                className="btn-action btn-review"
                onClick={() => showActionModal(record)}
              >
                <FiCheck size={14} /> Xử lý
              </button>
            )}

            {currentUser.role === "admin" && (
              <button
                className="btn-action btn-delete"
                onClick={() => handleDelete(record.id)}
              >
                <FiTrash2 size={14} /> Xóa
              </button>
            )}
          </div>
        );
      },
    },
  ];

  // ==================== RENDER ====================
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "400px",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="report-manager">
      <div className="filters">
        <input
          type="text"
          placeholder="Message ID..."
          value={filters.messageId}
          onChange={(e) => setFilters({ ...filters, messageId: e.target.value })}
        />
        <input
          type="text"
          placeholder="Người báo cáo..."
          value={filters.reportedBy}
          onChange={(e) => setFilters({ ...filters, reportedBy: e.target.value })}
        />
        <select
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
        >
          <option value="">Tất cả phân loại</option>
          <option value="harmful">Nguy hại</option>
          <option value="inappropriate">Không phù hợp</option>
          <option value="spam">Spam</option>
          <option value="other">Khác</option>
          <option value="safe">An toàn</option>
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="pending">Chờ xử lý</option>
          <option value="urgent">Khẩn cấp</option>
          <option value="low_priority">Ưu tiên thấp</option>
          <option value="resolved">Đã xử lý</option>
        </select>
      </div>

      <Table
        columns={columns}
        dataSource={filteredReports}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        scroll={{ x: 1200 }}
      />

      {/* Detail Modal */}
      {detailModalVisible && selectedReport && (
        <Modal
          title="Chi tiết báo cáo"
          open={detailModalVisible}
          onCancel={() => setDetailModalVisible(false)}
          footer={null}
          width={700}
          className="report-detail-modal"
        >
          <div className="report-detail-content">
            <div className="detail-section">
              <h4>📩 Tin nhắn</h4>
              <p>
                <strong>Nội dung:</strong> {selectedReport.messageText}
              </p>
              <p>
                <strong>Người gửi:</strong> {selectedReport.messageDisplayName}
              </p>
              <p>
                <strong>Message ID:</strong>{" "}
                <span
                  className="copyable-text"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedReport.messageId);
                    toast.info("Đã sao chép", { autoClose: 1200 });
                  }}
                >
                  {selectedReport.messageId} <FiCopy size={12} />
                </span>
              </p>
            </div>

            <div className="detail-section">
              <h4>👤 Người báo cáo</h4>
              <p>
                <strong>Tên:</strong> {selectedReport.reportedByName}
              </p>
              <p>
                <strong>Email:</strong> {selectedReport.reportedByEmail}
              </p>
              <p>
                <strong>Lý do:</strong> {selectedReport.userReportCategoryLabel}
              </p>
              <p>
                <strong>Chi tiết:</strong> {selectedReport.userReportDetails || "Không có"}
              </p>
              <p>
                <strong>Số báo cáo:</strong> {selectedReport.reportCount || 1}
              </p>
            </div>

            <div className="detail-section">
              <h4>🤖 Phân tích AI</h4>
              <p>
                <strong>Category:</strong>{" "}
                {CATEGORY_COLORS[selectedReport.aiCategory]?.label || "Khác"}
              </p>
              <p>
                <strong>Confidence:</strong>{" "}
                {((selectedReport.aiConfidence || 0) * 100).toFixed(1)}%
              </p>
              <p>
                <strong>Giải thích:</strong> {selectedReport.aiExplanation}
              </p>
            </div>

            {selectedReport.resolved && (
              <div className="detail-section">
                <h4>✅ Kết quả xử lý</h4>
                <p>
                  <strong>Xử lý bởi:</strong> {selectedReport.reviewedByName}
                </p>
                <p>
                  <strong>Thời gian:</strong> {formatTimestamp(selectedReport.reviewedAt)}
                </p>
                <p>
                  <strong>Hành động:</strong>{" "}
                  {selectedReport.action === "delete_and_ban"
                    ? `Xóa tin nhắn + Cấm chat ${
                        selectedReport.banDurationFormatted || 
                        `${selectedReport.banDays || selectedReport.banDuration} ngày`
                      }`
                    : selectedReport.action === "delete_only"
                    ? "Xóa tin nhắn"
                    : "Từ chối báo cáo"}
                </p>
                <p>
                  <strong>Ghi chú:</strong> {selectedReport.actionNotes || "N/A"}
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Action Modal */}
      {actionModalVisible && actionReport && (
        <Modal
          title="Xử lý báo cáo vi phạm"
          open={actionModalVisible}
          onCancel={() => setActionModalVisible(false)}
          footer={null}
          width={550}
          className="action-modal"
        >
          <div className="action-content">
            {/* Quick Info */}
            <div className="quick-info">
              <p>
                <strong>Tin nhắn:</strong> {truncateText(actionReport.messageText, 80)}
              </p>
              <p>
                <strong>Người vi phạm:</strong> {actionReport.messageDisplayName}
              </p>
              <p>
                <strong>Khả năng vi phạm:</strong>{" "}
                {((actionReport.aiConfidence || 0) * 100).toFixed(0)}%
              </p>
            </div>

            {/* Action Selection */}
            <div className="action-selection" style={{ marginTop: 16 }}>
              <label style={{ fontWeight: 600, marginBottom: 8, display: "block" }}>
                Hành động: <span style={{ color: "#ff4d4f" }}>*</span>
              </label>
              <Radio.Group
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                style={{ width: "100%" }}
              >
                <Space direction="vertical" style={{ width: "100%" }}>
                  {ACTION_OPTIONS.map((option) => (
                    <Radio key={option.value} value={option.value}>
                      {option.label}
                    </Radio>
                  ))}
                </Space>
              </Radio.Group>
            </div>

            {/* ⭐ Ban Duration Input (only if delete_and_ban) */}
            {actionType === "delete_and_ban" && (
              <div className="ban-duration-input" style={{ marginTop: 16 }}>
                <label style={{ fontWeight: 600, marginBottom: 8, display: "block" }}>
                  Thời gian cấm chat: <span style={{ color: "#ff4d4f" }}>*</span>
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <Input
                    type="number"
                    min={TIME_UNITS.find((u) => u.value === banUnit)?.min || 1}
                    max={TIME_UNITS.find((u) => u.value === banUnit)?.max || 365}
                    value={banDuration}
                    onChange={(e) => setBanDuration(Number(e.target.value))}
                    placeholder="Nhập số"
                    style={{ flex: 1 }}
                  />
                  <Select
                    value={banUnit}
                    onChange={(value) => {
                      setBanUnit(value);
                      // Reset duration to safe value when changing unit
                      const newUnit = TIME_UNITS.find((u) => u.value === value);
                      if (banDuration > newUnit.max) {
                        setBanDuration(newUnit.max);
                      }
                    }}
                    style={{ width: 100 }}
                  >
                    {TIME_UNITS.map((unit) => (
                      <Select.Option key={unit.value} value={unit.value}>
                        {unit.label}
                      </Select.Option>
                    ))}
                  </Select>
                </div>
                <div style={{ fontSize: 12, color: "#8c8c8c", marginTop: 4 }}>
                  Người dùng sẽ không thể chat trong {formatBanDuration(banDuration, banUnit)}
                </div>
              </div>
            )}

            {/* Action Notes */}
            <div className="action-notes" style={{ marginTop: 16 }}>
              <label style={{ fontWeight: 600, marginBottom: 8, display: "block" }}>
                Ghi chú xử lý: <span style={{ color: "#ff4d4f" }}>*</span>
              </label>
              <TextArea
                rows={4}
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder={
                  actionType === "reject"
                    ? "Lý do từ chối báo cáo (ví dụ: Không có dấu hiệu vi phạm)..."
                    : "Lý do xử lý (ví dụ: Vi phạm quy định về nội dung không phù hợp)..."
                }
                maxLength={500}
                showCount
              />
            </div>

            {/* Actions */}
            <div className="modal-actions" style={{ marginTop: 20 }}>
              <button
                className="btn-cancel"
                onClick={() => setActionModalVisible(false)}
                disabled={submitting}
              >
                <IoIosCloseCircleOutline size={18} /> Hủy
              </button>
              <button
                className={`btn-submit ${
                  actionType === "reject" ? "reject" : "approve"
                }`}
                onClick={handleActionSubmit}
                disabled={!actionType || !actionNotes.trim() || submitting}
              >
                {submitting ? (
                  <>
                    <Spin size="small" /> Đang xử lý...
                  </>
                ) : actionType === "delete_and_ban" ? (
                  <>
                    <FiSlash size={18} /> Xóa & Cấm chat
                  </>
                ) : actionType === "delete_only" ? (
                  <>
                    <FiCheck size={18} /> Xóa tin nhắn
                  </>
                ) : (
                  <>
                    <FiX size={18} /> Từ chối
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}