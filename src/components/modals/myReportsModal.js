// components/Modal/MyReportsModal/MyReportsModal.js
import React, { useState, useEffect, useContext } from "react";
import { Modal, Table, Tag, Empty, Input, Select } from "antd";
import { FiMessageSquare, FiClock } from "react-icons/fi";
import { db } from "../../firebase/config";
import { collection, query, where, getDocs } from "firebase/firestore";
import { toast } from "react-toastify";
import "./myReportsModal.scss";
import { AuthContext } from "../../context/authProvider";
import { AppContext } from "../../context/appProvider";
import LoadingScreen from '../common/loadingScreen';

const STATUS_COLORS = {
  pending: { color: "#0958d9", bg: "#e6f4ff", label: "Chờ xử lý" },
  resolved: { color: "#389e0d", bg: "#f6ffed", label: "Đã xử lý" },
};

const CATEGORY_COLORS = {
  harmful: { color: "#cf1322", bg: "#fff1f0", label: "Nguy hại" },
  inappropriate: { color: "#d4380d", bg: "#fff2e8", label: "Không phù hợp" },
  spam: { color: "#d46b08", bg: "#fff7e6", label: "Spam" },
  other: { color: "#595959", bg: "#fafafa", label: "Khác" },
  safe: { color: "#389e0d", bg: "#f6ffed", label: "An toàn" },
};

function formatTimestamp(timestamp) {
  if (!timestamp) return "N/A";
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString("vi-VN");
}

function truncateText(text, maxLength = 50) {
  if (!text) return "";
  return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
}

function getTimestamp(t) {
  if (!t) return 0;
  if (t.seconds) return t.seconds;
  if (t instanceof Date) return t.getTime() / 1000;
  if (t.toDate) return t.toDate().getTime() / 1000;
  return 0;
}

export default function MyReportsModal() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);

  const { user } = useContext(AuthContext);
  const { isMyReportsVisible, setIsMyReportsVisible } = useContext(AppContext);

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    category: "",
    sortBy: "newest",
  });

  useEffect(() => {
    if (!isMyReportsVisible || !user?.uid) return;

    const fetchMyReports = async () => {
      setLoading(true);
      try {
        const reportsRef = collection(db, "reports");
        const q = query(
          reportsRef,
          where("reportedBy", "==", user.uid)
        );

        const snapshot = await getDocs(q);
        const reportList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setReports(reportList);
      } catch (err) {
        toast.error("Không thể tải danh sách báo cáo");
      } finally {
        setLoading(false);
      }
    };

    fetchMyReports();
  }, [isMyReportsVisible, user?.uid]);

  const filteredReports = reports
    .filter((r) =>
      r.messageText?.toLowerCase().includes(filters.search.toLowerCase())
    )
    .filter((r) => (filters.status ? r.status === filters.status : true))
    .filter((r) => (filters.category ? r.aiCategory === filters.category : true))
    .sort((a, b) => {
      const timeA = getTimestamp(a.createdAt);
      const timeB = getTimestamp(b.createdAt);

      if (filters.sortBy === "newest") {
        return timeB - timeA;
      } else {
        return timeA - timeB;
      }
    });

  const columns = [
    {
      title: "Tin nhắn",
      key: "message",
      width: 200,
      render: (_, record) => (
        <div className="message-cell">
          <div className="message-kind">
            <FiMessageSquare size={14} />
            <span>{record.messageKind || "text"}</span>
          </div>
          <div className="message-text">
            {truncateText(record.messageText, 60)}
          </div>
        </div>
      ),
    },
    {
      title: "Lý do báo cáo",
      key: "reason",
      width: 150,
      render: (_, record) => {
        const categoryConfig = CATEGORY_COLORS[record.aiCategory] || CATEGORY_COLORS.other;
        return (
          <div>
            <div style={{ fontSize: 13, marginBottom: 4 }}>
              {record.userReportCategoryLabel}
            </div>
            <Tag
              style={{
                color: categoryConfig.color,
                background: categoryConfig.bg,
                border: "none",
                fontSize: 11,
              }}
            >
              AI: {categoryConfig.label}
            </Tag>
          </div>
        );
      },
    },
    {
      title: "Thời gian",
      key: "time",
      width: 140,
      render: (_, record) => (
        <div className="time-cell">
          <FiClock size={12} />
          <span style={{ fontSize: 12, marginLeft: 4 }}>
            {formatTimestamp(record.createdAt)}
          </span>
        </div>
      ),
    },
    {
      title: "Trạng thái",
      key: "status",
      width: 120,
      render: (_, record) => {
        const statusConfig = STATUS_COLORS[record.status] || STATUS_COLORS.pending;
        return (
          <Tag
            style={{
              color: statusConfig.color,
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
  ];

  const handleClose = () => {
    setFilters({
      search: "",
      status: "",
      category: "",
      sortBy: "newest"
    });
    setIsMyReportsVisible(false);
  };

  return (
    <>
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>Báo cáo của tôi</span>
            {reports.length > 0 && (
              <Tag color="blue">{reports.length} báo cáo</Tag>
            )}
          </div>
        }
        open={isMyReportsVisible}
        onCancel={handleClose}
        footer={null}
        width={900}
        centered
        bodyStyle={{ maxHeight: "70dvh", overflowY: "auto", padding: "10px" }}
        className="my-reports-modal"
      >
        <div className="reports-filters">
          <Input.Search
            placeholder="Tìm kiếm tin nhắn..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            style={{ width: 250 }}
            allowClear
          />

          <Select
            placeholder="Trạng thái"
            value={filters.status}
            onChange={(value) => setFilters({ ...filters, status: value })}
            style={{ width: 150 }}
            allowClear
          >
            <Select.Option value="">Tất cả</Select.Option>
            <Select.Option value="pending">Chờ xử lý</Select.Option>
            <Select.Option value="resolved">Đã xử lý</Select.Option>
          </Select>

          <Select
            placeholder="Phân loại"
            value={filters.category}
            onChange={(value) => setFilters({ ...filters, category: value })}
            style={{ width: 150 }}
            allowClear
          >
            <Select.Option value="">Tất cả</Select.Option>
            <Select.Option value="harmful">Nguy hại</Select.Option>
            <Select.Option value="inappropriate">Không phù hợp</Select.Option>
            <Select.Option value="spam">Spam</Select.Option>
            <Select.Option value="safe">An toàn</Select.Option>
            <Select.Option value="other">Khác</Select.Option>
          </Select>

          <Select
            placeholder="Sắp xếp"
            value={filters.sortBy}
            onChange={(value) => setFilters({ ...filters, sortBy: value })}
            style={{ width: 150 }}
          >
            <Select.Option value="newest">Mới nhất</Select.Option>
            <Select.Option value="oldest">Cũ nhất</Select.Option>
          </Select>
        </div>

        {loading ? (
          <LoadingScreen />
        ) : filteredReports.length === 0 ? (
          <Empty
            description="Bạn chưa có báo cáo nào"
            style={{ padding: "60px 0" }}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={filteredReports}
            rowKey="id"
            pagination={{
              pageSize: 3,
              showSizeChanger: false,
              showTotal: (total) => `Tổng ${total} báo cáo`,
            }}
            scroll={{ x: 800 }}
          />
        )}
      </Modal>
    </>
  );
}