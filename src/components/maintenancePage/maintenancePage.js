import React, { useEffect, useState } from "react";
import { Result, Button, Spin, Typography, Space } from "antd";
import { ReloadOutlined, ToolOutlined, ClockCircleOutlined, CalendarOutlined, LoginOutlined } from "@ant-design/icons";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import "./maintenancePage.scss";

const { Text } = Typography;

export default function MaintenancePage() {
  const [loading, setLoading] = useState(true);
  const [maintenance, setMaintenance] = useState(false);
  const [expectedResume, setExpectedResume] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [countdown, setCountdown] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", "appStatus"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setMaintenance(data.maintenance || false);
        setExpectedResume(
          data.expectedResume
            ? dayjs(data.expectedResume.toDate ? data.expectedResume.toDate() : data.expectedResume)
            : null
        );
        setUpdatedAt(
          data.updatedAt
            ? dayjs(data.updatedAt.toDate ? data.updatedAt.toDate() : data.updatedAt)
            : null
        );
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!maintenance) {
      const timer = setTimeout(() => {
        navigate("/");
      }, 1000); 
      return () => clearTimeout(timer);
    }
  }, [maintenance, navigate]);

  useEffect(() => {
    if (maintenance && expectedResume && dayjs().isAfter(expectedResume)) {
      // Auto turn off maintenance
      updateDoc(doc(db, "config", "appStatus"), {
        maintenance: false,
        updatedAt: new Date(),
      }).catch(err => console.error("Error auto-turning off maintenance:", err));
    }
  }, [maintenance, expectedResume]);

  useEffect(() => {
    if (!expectedResume) return;

    const interval = setInterval(() => {
      const now = dayjs();
      const diff = expectedResume.diff(now);
      if (diff <= 0) {
        setCountdown("Hệ thống đã hoạt động lại!");
        clearInterval(interval);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdown(`${hours} giờ ${minutes} phút ${seconds} giây`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expectedResume]);

  const handleReload = () => navigate("/");
  const handleGoToLogin = () => navigate("/login");

  if (loading) return <Spin size="large" style={{ display: "block", marginTop: "40vh" }} />;

  if (!maintenance) return null;

  return (
    <div className="maintenance-wrapper">
      <Result
        icon={<ToolOutlined style={{ color: "#1890ff" }} />}
        title="Hệ thống đang bảo trì"
        subTitle={
          <>
            <p>Chúng tôi đang thực hiện một số nâng cấp để cải thiện trải nghiệm của bạn. Vui lòng quay lại sau.</p>
            {expectedResume ? (
              <p>
                <CalendarOutlined /> Dự kiến mở lại:{" "}
                <Text strong>{expectedResume.format("DD/MM/YYYY HH:mm")}</Text>
              </p>
            ) : (
              <p>
                <CalendarOutlined /> Dự kiến mở lại:{" "}
                <Text strong>Chưa có thời gian dự kiến</Text>
              </p>
            )}
            {countdown && <p><ClockCircleOutlined /> Thời gian còn lại: <Text type="danger">{countdown}</Text></p>}
          </>
        }
        extra={
          <Space direction="vertical" size="small">
            <Button type="primary" icon={<ReloadOutlined />} onClick={handleReload}>
              Thử lại
            </Button>
            <Button icon={<LoginOutlined />} onClick={handleGoToLogin}>
              Quay về đăng nhập
            </Button>
          </Space>
        }
      />
      <div className="footer-credit">
        © 2025 Quik — Made by <span className="author-name">Thái Gia Huy</span>
      </div>
    </div>
  );
}
