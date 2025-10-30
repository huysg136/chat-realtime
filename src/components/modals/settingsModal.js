import React, { useContext, useEffect, useState } from "react";
import { Modal, Card, Select, Button, Space } from "antd";
import { AppContext } from "../../context/appProvider";
import { AuthContext } from "../../context/authProvider";
import { updateDocument, getUserDocIdByUid } from "../../firebase/services";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const { Option } = Select;

export default function SettingsModal() {
  const { isSettingsVisible, setIsSettingsVisible } = useContext(AppContext);
  const { user, setUser } = useContext(AuthContext);

  const [theme, setTheme] = useState(user?.theme || "system");
  const [language, setLanguage] = useState(user?.language || "vi");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.theme) setTheme(user.theme);
    if (user?.language) setLanguage(user.language);
  }, [user]);

  const handleCancel = () => {
    setIsSettingsVisible(false);
    setTheme(user?.theme || "system");
    setLanguage(user?.language || "vi");
  };

  const handleSave = async () => {
    if (!user?.uid) return;
    setSaving(true);
    try {
      const docId = await getUserDocIdByUid(user.uid);
      if (!docId) {
        toast.error("Không tìm thấy tài khoản");
        setSaving(false);
        return;
      }

      await updateDocument("users", docId, { theme, language });
      setUser((prev) => ({ ...prev, theme, language }));
      toast.success("Đã lưu cài đặt!");
      setIsSettingsVisible(false);
    } catch (error) {
      console.error(error);
      toast.error("Lưu cài đặt thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Cài đặt"
      open={isSettingsVisible}
      onCancel={handleCancel}
      footer={null}
      centered
      width={400}
    >
      <Card
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          border: "none",
        }}
        bodyStyle={{ padding: "24px" }}
      >
        {/* CHỌN GIAO DIỆN */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Chủ đề giao diện</div>
          <Select
            value={theme}
            onChange={setTheme}
            style={{ width: "100%" }}
          >
            <Option value="light">🌞 Sáng (Light)</Option>
            <Option value="dark">🌙 Tối (Dark)</Option>
            <Option value="system">💻 Theo hệ thống</Option>
          </Select>
        </div>

        {/* CHỌN NGÔN NGỮ */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Ngôn ngữ</div>
          <Select
            value={language}
            onChange={setLanguage}
            style={{ width: "100%" }}
          >
            <Option value="vi">🇻🇳 Tiếng Việt</Option>
            <Option value="en">🇺🇸 English</Option>
            <Option value="zh">🇨🇳 中文</Option>
            <Option value="es">🇪🇸 Español</Option>
            <Option value="fr">🇫🇷 Français</Option>
            <Option value="ar">🇸🇦 العربية</Option>
          </Select>
        </div>

        <Space style={{ width: "100%", justifyContent: "flex-end" }}>
          <Button onClick={handleCancel}>Hủy</Button>
          <Button
            type="primary"
            onClick={handleSave}
            loading={saving}
            disabled={saving}
          >
            Lưu
          </Button>
        </Space>
      </Card>
    </Modal>
  );
}
