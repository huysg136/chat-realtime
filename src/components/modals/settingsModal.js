import React, { useContext, useEffect, useState } from "react";
import { Modal, Card, Select, Button, Space } from "antd";
import { AppContext } from "../../context/appProvider";
import { AuthContext } from "../../context/authProvider";
import { updateDocument, getUserDocIdByUid } from "../../firebase/services";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ReactCountryFlag from "react-country-flag";
import { BsSunFill, BsMoonStarsFill, BsLaptop } from "react-icons/bs";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/config";

const { Option } = Select;

export default function SettingsModal() {
  const { isSettingsVisible, setIsSettingsVisible } = useContext(AppContext);
  const { user, setUser } = useContext(AuthContext);

  const [theme, setTheme] = useState(user?.theme || "system");
  const [language, setLanguage] = useState(user?.language || "vi");
  const [saving, setSaving] = useState(false);

  const text = {
    vi: {
      title: "Cài đặt",
      themeLabel: "Chủ đề giao diện",
      light: "Sáng",
      dark: "Tối",
      system: "Theo hệ thống",
      languageLabel: "Ngôn ngữ",
      cancel: "Hủy",
      save: "Lưu",
    },
    en: {
      title: "Settings",
      themeLabel: "Theme",
      light: "Light",
      dark: "Dark",
      system: "System",
      languageLabel: "Language",
      cancel: "Cancel",
      save: "Save",
    },
    zh: {
      title: "设置",
      themeLabel: "主题",
      light: "浅色",
      dark: "深色",
      system: "系统",
      languageLabel: "语言",
      cancel: "取消",
      save: "保存",
    },
    es: {
      title: "Configuración",
      themeLabel: "Tema",
      light: "Claro",
      dark: "Oscuro",
      system: "Sistema",
      languageLabel: "Idioma",
      cancel: "Cancelar",
      save: "Guardar",
    },
    fr: {
      title: "Paramètres",
      themeLabel: "Thème",
      light: "Clair",
      dark: "Sombre",
      system: "Système",
      languageLabel: "Langue",
      cancel: "Annuler",
      save: "Enregistrer",
    },
    ar: {
      title: "الإعدادات",
      themeLabel: "السمة",
      light: "فاتح",
      dark: "داكن",
      system: "النظام",
      languageLabel: "اللغة",
      cancel: "إلغاء",
      save: "حفظ",
    },
  };

  useEffect(() => {
    if (!isSettingsVisible || !user?.uid) return;

    const fetchUserSettings = async () => {
      try {
        const docId = await getUserDocIdByUid(user.uid);
        if (!docId) return;
        const docSnap = await getDoc(doc(db, "users", docId));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setTheme(data.theme || "system");
          setLanguage(data.language || "vi");
        }
      } catch (err) {
        console.error("Không thể tải cài đặt người dùng:", err);
      }
    };

    fetchUserSettings();
  }, [isSettingsVisible, user]);


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
      toast.success("Đã lưu cài đặt");
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
      title={text[language].title}
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
        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>{text[language].themeLabel}</div>
          <div className="modal-select">
            <Select
              value={theme}
              onChange={setTheme}
              style={{ width: "100%" }}
            >
              <Option value="light">
                <BsSunFill style={{ color: "#facc15", marginRight: 6 }} />
                {text[language].light}
              </Option>
              <Option value="dark">
                <BsMoonStarsFill style={{ color: "#3b82f6", marginRight: 6 }} />
                {text[language].dark}
              </Option>
              <Option value="system">
                <BsLaptop style={{ color: "#6b7280", marginRight: 6 }} />
                {text[language].system}
              </Option>
            </Select>
          </div>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>{text[language].languageLabel}</div>
          <div className="modal-select">
            <Select
              value={language}
              onChange={setLanguage}
              style={{ width: "100%" }}
            >
              <Option value="vi">
                <ReactCountryFlag
                  countryCode="VN"
                  svg
                  style={{ width: "1.3em", height: "1.3em", borderRadius: "50%", marginRight: 8 }}
                />
                Tiếng Việt
              </Option>
              <Option value="en">
                <ReactCountryFlag
                  countryCode="US"
                  svg
                  style={{ width: "1.3em", height: "1.3em", borderRadius: "50%", marginRight: 8 }}
                />
                English
              </Option>
              <Option value="zh">
                <ReactCountryFlag
                  countryCode="CN"
                  svg
                  style={{ width: "1.3em", height: "1.3em", borderRadius: "50%", marginRight: 8 }}
                />
                中文
              </Option>
              <Option value="es">
                <ReactCountryFlag
                  countryCode="ES"
                  svg
                  style={{ width: "1.3em", height: "1.3em", borderRadius: "50%", marginRight: 8 }}
                />
                Español
              </Option>
              <Option value="fr">
                <ReactCountryFlag
                  countryCode="FR"
                  svg
                  style={{ width: "1.3em", height: "1.3em", borderRadius: "50%", marginRight: 8 }}
                />
                Français
              </Option>
              <Option value="ar">
                <ReactCountryFlag
                  countryCode="SA"
                  svg
                  style={{ width: "1.3em", height: "1.3em", borderRadius: "50%", marginRight: 8 }}
                />
                العربية
              </Option>
            </Select>
          </div>
        </div>

        <Space style={{ width: "100%", justifyContent: "flex-end" }}>
          <Button onClick={handleCancel}>{text[language].cancel}</Button>
          <Button
            type="primary"
            onClick={handleSave}
            loading={saving}
            disabled={saving}
          >
            {text[language].save}
          </Button>
        </Space>
      </Card>
    </Modal>
  );
}
