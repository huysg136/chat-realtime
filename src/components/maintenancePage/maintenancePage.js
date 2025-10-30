import React, { useEffect, useState, useContext } from "react";
import {
  Result,
  Button,
  Spin,
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
import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../../firebase/config";
import { AuthContext } from "../../context/authProvider";
import { getUserDocIdByUid, updateDocument } from "../../firebase/services";
import { AppContext } from "../../context/appProvider";
import { useRef } from "react";
import { Navigate } from "react-router-dom";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useNavigate } from "react-router-dom";
import ReactCountryFlag from "react-country-flag";
import "./maintenancePage.scss";

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
  const { theme, setTheme } = useContext(AppContext);

  const tz = "Asia/Bangkok"; // GMT+7

  const text = {
    vi: {
      title: "Hệ thống đang bảo trì",
      subtitle: "Chúng tôi đang thực hiện một số nâng cấp để cải thiện trải nghiệm của bạn. Vui lòng quay lại sau.",
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
      subtitle: "We are performing some upgrades to improve your experience. Please come back later.",
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
      subtitle: "Estamos realizando algunas actualizaciones para mejorar su experiencia. Por favor, vuelva más tarde.",
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
      subtitle: "نحن نقوم بإجراء بعض التحديثات لتحسين تجربتك. يرجى العودة لاحقًا.",
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

  const systemPrefersDark =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  const currentTheme =
    theme === "system" ? (systemPrefersDark ? "dark" : "light") : theme;

  const wrapperStyle =
    currentTheme === "dark"
      ? {
          backgroundColor: "#0d1117",
          color: "#e5e7eb",
          transition: "all 0.3s ease",
        }
      : {
          backgroundColor: "#f9fafb",
          color: "#1f2937",
          transition: "all 0.3s ease",
        };

  useEffect(() => {
    const root = document.body;
    root.classList.remove("theme-light", "theme-dark");
    root.removeAttribute("data-theme");

    if (currentTheme === "light") {
      root.classList.add("theme-light");
    } else if (currentTheme === "dark") {
      root.classList.add("theme-dark");
    }

    return () => {
      root.classList.remove("theme-light", "theme-dark");
      root.removeAttribute("data-theme");
    };
  }, [currentTheme]);

  useEffect(() => {
    if (!expectedResume) return;

    const interval = setInterval(async () => {
      const now = dayjs().tz(tz);
      const resumeInTz = expectedResume.tz(tz);
      const diff = resumeInTz.diff(now);

      if (diff <= 0) {
        setCountdown(
          <span className="countdown-success">
            {lang === "vi"
              ? "Hệ thống đã hoạt động lại!"
              : "System is back online!"}
          </span>
        );
        // Automatically disable maintenance when time is up
        if (maintenance) {
          try {
            await updateDoc(doc(db, "config", "appStatus"), {
              maintenance: false,
              expectedResume: null
            });
            setMaintenance(false);
          } catch (error) {
            console.error("Failed to disable maintenance:", error);
          }
        }
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
  }, [expectedResume, lang, maintenance]);

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
  if (!maintenance) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="maintenance-wrapper" style={wrapperStyle}>
      <div className="background-pattern">
        <div className="circle circle-1"></div>
        <div className="circle circle-2"></div>
        <div className="circle circle-3"></div>
      </div>
      <div className="setting-select">
        <Select value={lang} onChange={handleChangeLang} style={{ width: 160 }}>
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

        <div style={{ marginTop: 5 }}>
          <Select value={theme} onChange={handleChangeTheme} style={{ width: 160 }}>
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
                <strong className="expected-resume-time">
                  {expectedResume.tz(tz).format("DD/MM/YYYY HH:mm")} (GMT+7)
                </strong>
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
            <Button icon={<LoginOutlined />} onClick={handleGoToLogin} className="login-button">
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
