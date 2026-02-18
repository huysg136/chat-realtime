// components/Modal/MyReportsModal/MyReportsModal.js
import React, { useState, useEffect, useContext } from "react";
import { Modal, Table, Tag, Empty, Input, Select } from "antd";
import { useTranslation } from "react-i18next";
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

function formatTimestamp(timestamp, locale = "vi-VN") {
  if (!timestamp) return "N/A";
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString(locale === "vi" ? "vi-VN" : "en-US");
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

  const { t, i18n } = useTranslation();
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
        toast.error(t('myReports.loadError'));
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
      title: t('myReports.columns.message'),
      key: "message",
      width: 200,
      render: (_, record) => (
        <div className="message-cell">
          <div className="message-kind">
            <FiMessageSquare size={14} />
            <span>{record.messageKind || t('searching.message')}</span>
          </div>
          <div className="message-text">
            {truncateText(record.messageText, 60)}
          </div>
        </div>
      ),
    },
    {
      title: t('myReports.columns.reason'),
      key: "reason",
      width: 150,
      render: (_, record) => {
        const categoryConfig = CATEGORY_COLORS[record.aiCategory] || CATEGORY_COLORS.other;
        return (
          <div>
            <div style={{ fontSize: 13, marginBottom: 4 }}>
              {t(`report.${record.userReportCategory}`) || record.userReportCategoryLabel}
            </div>
            <Tag
              style={{
                color: categoryConfig.color,
                background: categoryConfig.bg,
                border: "none",
                fontSize: 11,
              }}
            >
              AI: {t(`myReports.category.${record.aiCategory}`) || t('myReports.category.other')}
            </Tag>
          </div>
        );
      },
    },
    {
      title: t('myReports.columns.time'),
      key: "time",
      width: 140,
      render: (_, record) => (
        <div className="time-cell">
          <FiClock size={12} />
          <span style={{ fontSize: 12, marginLeft: 4 }}>
            {formatTimestamp(record.createdAt, i18n.language)}
          </span>
        </div>
      ),
    },
    {
      title: t('myReports.columns.status'),
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
            {t(`myReports.status.${record.status}`) || t('myReports.status.pending')}
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
            <span>{t('myReports.title')}</span>
            {reports.length > 0 && (
              <Tag color="blue">{t('myReports.reportCount', { count: reports.length })}</Tag>
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
            placeholder={t('myReports.searchPlaceholder')}
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            style={{ width: 250 }}
            allowClear
          />

          <Select
            placeholder={t('myReports.filters.status')}
            value={filters.status}
            onChange={(value) => setFilters({ ...filters, status: value })}
            style={{ width: 150 }}
            allowClear
          >
            <Select.Option value="">{t('myReports.all')}</Select.Option>
            <Select.Option value="pending">{t('myReports.status.pending')}</Select.Option>
            <Select.Option value="resolved">{t('myReports.status.resolved')}</Select.Option>
          </Select>

          <Select
            placeholder={t('myReports.filters.category')}
            value={filters.category}
            onChange={(value) => setFilters({ ...filters, category: value })}
            style={{ width: 150 }}
            allowClear
          >
            <Select.Option value="">{t('myReports.all')}</Select.Option>
            <Select.Option value="harmful">{t('myReports.category.harmful')}</Select.Option>
            <Select.Option value="inappropriate">{t('myReports.category.inappropriate')}</Select.Option>
            <Select.Option value="spam">{t('myReports.category.spam')}</Select.Option>
            <Select.Option value="safe">{t('myReports.category.safe')}</Select.Option>
            <Select.Option value="other">{t('myReports.category.other')}</Select.Option>
          </Select>

          <Select
            placeholder={t('myReports.filters.sortBy')}
            value={filters.sortBy}
            onChange={(value) => setFilters({ ...filters, sortBy: value })}
            style={{ width: 150 }}
          >
            <Select.Option value="newest">{t('myReports.newest')}</Select.Option>
            <Select.Option value="oldest">{t('myReports.oldest')}</Select.Option>
          </Select>
        </div>

        {loading ? (
          <LoadingScreen />
        ) : filteredReports.length === 0 ? (
          <Empty
            description={t('myReports.empty')}
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
              showTotal: (total) => t('myReports.total', { count: total }),
            }}
            scroll={{ x: 800 }}
          />
        )}
      </Modal>
    </>
  );
}