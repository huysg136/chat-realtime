import React, { useEffect, useState, useContext } from "react";
import {
  Result,
  Button,
  Spin,
  Typography,
  Space,
  Tag,
  Select,
} from "antd";
import {
  ReloadOutlined,
  ToolOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  LoginOutlined,
} from "@ant-design/icons";
import { BsSunFill, BsMoonStarsFill, BsLaptop } from "react-icons/bs";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../../firebase/config";
import { AuthContext } from "../../context/authProvider";
import { getUserDocIdByUid, updateDocument } from "../../firebase/services";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useNavigate } from "react-router-dom";
import "./maintenancePage.scss";

const { Text } = Typography;
const { Option } = Select;

dayjs.extend(utc);
dayjs.extend(timezone);

export default function MaintenancePage() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [maintenance, setMaintenance] = useState(false);
  const [expectedResume, setExpectedResume] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [lang, setLang] = useState("en");
  const [theme, setTheme] = useState("light");

  const tz = "Asia/Bangkok"; // GMT+7

  const text = {
    vi: {
      title: "Hệ thống đang bảo trì",
      subtitle:
        "Chúng tôi đang thực hiện một số nâng cấp để cải thiện trải nghiệm của bạn. Vui lòng quay lại sau.",
      expectedResume: "Dự kiến mở lại",
      timeLeft: "Thời gian còn lại",
      retry: "Thử lại",
      login: "Quay về đăng nhập",
      themeLabel: "Giao diện",
      days: "ngày",
      hours: "giờ",
      minutes: "phút",
      seconds: "giây",
      light: "Sáng",
      dark: "Tối",
      system: "Hệ thống",
    },
    en: {
      title: "System Maintenance",
      subtitle:
        "We are performing some upgrades to improve your experience. Please come back later.",
      expectedResume: "Expected to resume",
      timeLeft: "Time remaining",
      retry: "Retry",
      login: "Back to Login",
      themeLabel: "Theme",
      days: "days",
      hours: "hours",
      minutes: "minutes",
      seconds: "seconds",
      light: "Light",
      dark: "Dark",
      system: "System",
    },
    zh: {
      title: "系统维护中",
      subtitle: "我们正在进行一些升级以改善您的体验。请稍后再回来。",
      expectedResume: "预计恢复时间",
      timeLeft: "剩余时间",
      retry: "重试",
      login: "返回登录",
      themeLabel: "主题",
      days: "天",
      hours: "小时",
      minutes: "分钟",
      seconds: "秒",
      light: "浅色",
      dark: "深色",
      system: "系统",
    },
    es: {
      title: "Mantenimiento del sistema",
      subtitle:
        "Estamos realizando algunas actualizaciones para mejorar su experiencia. Por favor, vuelva más tarde.",
      expectedResume: "Se espera reanudar",
      timeLeft: "Tiempo restante",
      retry: "Reintentar",
      login: "Volver al inicio de sesión",
      themeLabel: "Tema",
      days: "días",
      hours: "horas",
      minutes: "minutos",
      seconds: "segundos",
      light: "Claro",
      dark: "Oscuro",
      system: "Sistema",
    },
    fr: {
      title: "Maintenance du système",
      subtitle:
        "Nous effectuons des mises à jour pour améliorer votre expérience. Veuillez revenir plus tard.",
      expectedResume: "Reprise prévue",
      timeLeft: "Temps restant",
      retry: "Réessayer",
      login: "Retour à la connexion",
      themeLabel: "Thème",
      days: "jours",
      hours: "heures",
      minutes: "minutes",
      seconds: "secondes",
      light: "Clair",
      dark: "Sombre",
      system: "Système",
    },
    ar: {
      title: "صيانة النظام",
      subtitle:
        "نحن نقوم بإجراء بعض التحديثات لتحسين تجربتك. يرجى العودة لاحقًا.",
      expectedResume: "من المتوقع الاستئناف",
      timeLeft: "الوقت المتبقي",
      retry: "أعد المحاولة",
      login: "العودة لتسجيل الدخول",
      themeLabel: "السمة",
      days: "أيام",
      hours: "ساعات",
      minutes: "دقائق",
      seconds: "ثواني",
      light: "فاتح",
      dark: "داكن",
      system: "النظام",
    },
  };

  // 🔹 Lấy cài đặt người dùng từ Firestore
  useEffect(() => {
    const fetchUserSettings = async () => {
      if (!user?.uid) return;
      try {
        const docId = await getUserDocIdByUid(user.uid);
        if (!docId) return;

        const userDoc = await getDoc(doc(db, "users", docId));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.language) setLang(data.language);
          if (data.theme) setTheme(data.theme);
        }
      } catch (err) {
        console.error("Lỗi khi lấy cài đặt người dùng:", err);
      }
    };

    fetchUserSettings();
  }, [user]);

  // 🔧 Lắng nghe trạng thái bảo trì
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", "appStatus"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setMaintenance(data.maintenance || false);
        setExpectedResume(
          data.expectedResume
            ? dayjs(
                data.expectedResume.toDate
                  ? data.expectedResume.toDate()
                  : data.expectedResume
              ).utc()
            : null
        );
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // ⏳ Đếm ngược
  useEffect(() => {
    if (!expectedResume) return;

    const interval = setInterval(() => {
      const now = dayjs().tz(tz);
      const resumeInTz = expectedResume.tz(tz);
      const diff = resumeInTz.diff(now);

      if (diff <= 0) {
        setCountdown(
          <Text type="success" className="countdown-success">
            {lang === "vi"
              ? "Hệ thống đã hoạt động lại!"
              : "System is back online!"}
          </Text>
        );
        clearInterval(interval);
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);

        setCountdown(
          <Space className="countdown-space">
            <Tag color="blue">
              {days} {text[lang].days}
            </Tag>
            <Tag color="green">
              {hours} {text[lang].hours}
            </Tag>
            <Tag color="orange">
              {minutes} {text[lang].minutes}
            </Tag>
            <Tag color="red">
              {seconds} {text[lang].seconds}
            </Tag>
          </Space>
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expectedResume, lang]);

  // 🟢 Đổi ngôn ngữ — tự lưu Firestore
  const handleChangeLang = async (value) => {
    setLang(value);
    if (!user?.uid) return;
    try {
      const docId = await getUserDocIdByUid(user.uid);
      if (!docId) return;
      await updateDocument("users", docId, { language: value });
    } catch (err) {
      console.error("Không thể cập nhật ngôn ngữ:", err);
    }
  };

  // 🎨 Đổi theme — tự lưu Firestore
  const handleChangeTheme = async (value) => {
    setTheme(value);
    if (!user?.uid) return;
    try {
      const docId = await getUserDocIdByUid(user.uid);
      if (!docId) return;
      await updateDocument("users", docId, { theme: value });
    } catch (err) {
      console.error("Không thể cập nhật theme:", err);
    }
  };

  // ⚙️ Điều hướng
  const handleReload = () => navigate("/");
  const handleGoToLogin = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch {
      navigate("/login");
    }
  };

  if (loading)
    return (
      <Spin size="large" style={{ display: "block", marginTop: "40vh" }} />
    );
  if (!maintenance) return null;

  const wrapperStyle =
    theme === "dark"
      ? { backgroundColor: "#0d1117", color: "white" }
      : { backgroundColor: "#f5f5f5", color: "black" };

  return (
    <div className="maintenance-wrapper" style={wrapperStyle}>
      <div className="lang-select">
        <Select value={lang} onChange={handleChangeLang} style={{ width: 140 }}>
          <Option value="vi">🇻🇳 Tiếng Việt</Option>
          <Option value="en">🇺🇸 English</Option>
          <Option value="zh">🇨🇳 中文</Option>
          <Option value="es">🇪🇸 Español</Option>
          <Option value="fr">🇫🇷 Français</Option>
          <Option value="ar">🇸🇦 العربية</Option>
        </Select>

        <div style={{ marginTop: 5 }}>
          <Select value={theme} onChange={handleChangeTheme} style={{ width: 140 }}>
            <Option value="light">
              <BsSunFill style={{ color: "#facc15", marginRight: 6 }} />
              {text[lang].light}
            </Option>
            <Option value="dark">
              <BsMoonStarsFill style={{ color: "#3b82f6", marginRight: 6 }} />
              {text[lang].dark}
            </Option>
            <Option value="system">
              <BsLaptop style={{ color: "#6b7280", marginRight: 6 }} />
              {text[lang].system}
            </Option>
          </Select>
        </div>
      </div>

      <Result
        icon={<ToolOutlined style={{ color: "#1890ff" }} />}
        title={text[lang].title}
        subTitle={
          <>
            <p>{text[lang].subtitle}</p>
            {expectedResume && (
              <p>
                <CalendarOutlined /> {text[lang].expectedResume}:{" "}
                <Text strong>
                  {expectedResume.tz(tz).format("DD/MM/YYYY HH:mm")} (GMT+7)
                </Text>
              </p>
            )}
            {countdown && (
              <p>
                <ClockCircleOutlined /> {text[lang].timeLeft}: {countdown}
              </p>
            )}
          </>
        }
        extra={
          <Space direction="vertical" size="small" className="button-space">
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={handleReload}
            >
              {text[lang].retry}
            </Button>
            <Button icon={<LoginOutlined />} onClick={handleGoToLogin}>
              {text[lang].login}
            </Button>
          </Space>
        }
      />

      <div className="footer-credit">
        © 2025 Made by <span className="author-name">Thái Gia Huy</span> ·
        quik.id.vn
      </div>
    </div>
  );
}
