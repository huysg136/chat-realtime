import React, { useEffect, useState, useContext } from "react";
import {
  Card,
  Switch,
  Typography,
  Spin,
  Divider,
  Tag,
  DatePicker,
  Button
} from "antd";
import {
  ToolOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { db } from "../../../firebase/config";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import { toast } from 'react-toastify';
import "./adminSettings.scss";
import { AuthContext } from "../../../context/authProvider";
import NoAccess from "../noAccess/noAccess";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

const { Title, Text, Paragraph } = Typography;

export default function AdminSettings() {
  // State chỉnh sửa local
  const [maintenance, setMaintenance] = useState(false);
  const [expectedResume, setExpectedResume] = useState(null);

  // State thực từ Firebase
  const [actualMaintenance, setActualMaintenance] = useState(false);
  const [actualExpectedResume, setActualExpectedResume] = useState(null);

  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useContext(AuthContext);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", "appStatus"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();

        // Cập nhật local state
        setMaintenance(data.maintenance || false);
        setExpectedResume(
          data.expectedResume
            ? dayjs(
                data.expectedResume.toDate
                  ? data.expectedResume.toDate()
                  : data.expectedResume
              )
            : null
        );

        setActualMaintenance(data.maintenance || false);
        setActualExpectedResume(
          data.expectedResume
            ? dayjs(
                data.expectedResume.toDate
                  ? data.expectedResume.toDate()
                  : data.expectedResume
              )
            : null
        );
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  if (!currentUser?.permissions?.canToggleMaintenance && currentUser.role !== "admin") {
    return <NoAccess />;
  }

  const handleSaveConfig = async () => {
    if (expectedResume && dayjs(expectedResume).isBefore(dayjs())) {
      toast.error("Thời gian dự kiến mở lại không được là quá khứ!");
      return;
    }

    try {
      await updateDoc(doc(db, "config", "appStatus"), {
        maintenance,
        expectedResume: expectedResume ? expectedResume.utc().toDate() : null,
        updatedAt: new Date(),
      });
      toast.success("Cập nhật cấu hình thành công!");

      setActualMaintenance(maintenance);
      setActualExpectedResume(expectedResume);
    } catch (err) {
      toast.error("Không thể lưu cấu hình.");
    }
  };

  return (
    <div className="admin-settings-wrapper">
      <Card className="admin-settings-card">
        <div className="settings-header">
          <Title level={3} className="settings-title">
            <ToolOutlined style={{ marginRight: 10 }} />
            Cấu hình hệ thống
          </Title>
          <Paragraph className="settings-description">
            Quản lý chế độ bảo trì và thông tin hiển thị cho người dùng khi hệ thống tạm dừng hoạt động.
          </Paragraph>
        </div>

        <Divider />

        <Spin spinning={loading}>
          <div className="maintenance-section">
            <div className="maintenance-header">
              <div>
                <Text strong className="maintenance-title">
                  <ClockCircleOutlined style={{ marginRight: 8, color: "#1677ff" }} />
                  Chế độ bảo trì
                </Text>
                <Paragraph type="secondary" style={{ marginTop: 4 }} className="maintenance-title">
                  Khi bật, người dùng (trừ admin) sẽ được chuyển đến trang thông báo bảo trì.
                </Paragraph>
              </div>
              <Switch
                checked={maintenance}
                onChange={(checked) => {
                    setMaintenance(checked);
                    if (!checked) {
                    setExpectedResume(null); 
                    }
                }}
                checkedChildren="Bật"
                unCheckedChildren="Tắt"
                className="maintenance-switch"
              />
            </div>

            <Divider />

            {maintenance && (
                <>
                <div className="form-row">
                    <Text strong className="form-label">
                      <CalendarOutlined style={{ marginRight: 6, color: "#1677ff" }}/>
                      Dự kiến mở lại:
                      </Text>
                    <DatePicker
                    showTime
                    format="DD/MM/YYYY HH:mm"
                    value={expectedResume}
                    onChange={setExpectedResume}
                    style={{ flex: 1 }}
                    />
                </div>
                <Divider />
                </>
            )}

            

            <div className="status-row">
              <Text className="status-now" strong>Trạng thái hiện tại:</Text>
              {actualMaintenance ? (
                <Tag color="red">Đang bảo trì</Tag>
              ) : (
                <Tag color="green">Hoạt động bình thường</Tag>
              )}
            </div>

            <div className="save-btn-container" style={{ marginTop: 16 }}>
              <Button type="primary" onClick={handleSaveConfig}>
                Lưu cấu hình
              </Button>
            </div>
          </div>
        </Spin>
      </Card>
    </div>
  );
}
