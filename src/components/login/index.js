import React, { useState, useEffect } from "react";
import { Row, Col, Button, Typography, Space, Select } from "antd";
import { GoogleOutlined } from "@ant-design/icons";
import { BsSunFill, BsMoonStarsFill, BsLaptop } from "react-icons/bs";
import { getAuth, signInWithPopup, GoogleAuthProvider, getAdditionalUserInfo } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import app, { db } from "../../firebase/config";
import { addDocument, generateKeywords, getUserDocIdByUid } from "../../firebase/services";
import ReactCountryFlag from "react-country-flag";
import "./index.scss";
import logo_quik from "../../images/logo_quik.png";

const { Title, Text } = Typography;
const { Option } = Select;

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export default function Login() {
  const [lang, setLang] = useState("vi");
  const [theme, setTheme] = useState("system");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.add("theme-light");
  }, []);

  useEffect(() => {
    const root = document.body;
    root.classList.remove("theme-light", "theme-dark");
    root.removeAttribute("data-theme");

    if (theme === "light") {
      root.classList.add("theme-light");
    } else if (theme === "dark") {
      root.classList.add("theme-dark");
    } else {
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.add(systemDark ? "theme-dark" : "theme-light");
    }
  }, [theme]);

  const handleLogin = async (provider) => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const additionalUserInfo = getAdditionalUserInfo(result);

      if (additionalUserInfo?.isNewUser) {
        await addDocument("users", {
          displayName: user.displayName,
          email: user.email,
          photoURL:
            user.photoURL ||
            "https://images.spiderum.com/sp-images/9ae85f405bdf11f0a7b6d5c38c96eb0e.jpeg",
          uid: user.uid,
          providerId: additionalUserInfo.providerId,
          role: "user",
          keywords: generateKeywords(user.displayName),
          theme: "system",
          language: "vi",
        });
      }

      const userDocId = await getUserDocIdByUid(user.uid);
      let role = "user";
      if (userDocId) {
        const userDoc = await getDoc(doc(db, "users", userDocId));
        role = userDoc.exists() ? userDoc.data().role : "user";
      }

      const configDoc = await getDoc(doc(db, "config", "appStatus"));
      const maintenance = configDoc.exists() ? configDoc.data().maintenance : false;

      if (maintenance && role !== "admin" && role !== "moderator") {
        navigate("/maintenance");
      } else {
        navigate("/"); 
      }
    } catch (err) {
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  const text = {
    en: {
      title: "Welcome Back",
      subtitle: "Sign in to continue to Quik",
      google: "Continue with Google",
      privacy: "By continuing, you agree to our Terms of Service and Privacy Policy",
      light: "Light",
      dark: "Dark",
      system: "System",
    },
    vi: {
      title: "Chào Mừng Trở Lại",
      subtitle: "Đăng nhập để tiếp tục sử dụng Quik",
      google: "Tiếp tục với Google",
      privacy: "Bằng cách tiếp tục, bạn đồng ý với Điều khoản dịch vụ và Chính sách bảo mật của chúng tôi",
      light: "Sáng",
      dark: "Tối",
      system: "Hệ thống",
    },
    zh: {
      title: "欢迎回来",
      subtitle: "登录以继续使用 Quik",
      google: "使用 Google 继续",
      privacy: "继续即表示您同意我们的服务条款和隐私政策",
      light: "浅色",
      dark: "深色",
      system: "系统",
    },
    es: {
      title: "Bienvenido de nuevo",
      subtitle: "Inicia sesión para continuar con Quik",
      google: "Continuar con Google",
      privacy: "Al continuar, aceptas nuestros Términos de servicio y Política de privacidad",
      light: "Claro",
      dark: "Oscuro",
      system: "Sistema"
    },
    fr: {
      title: "Bon retour",
      subtitle: "Connectez-vous pour continuer sur Quik",
      google: "Continuer avec Google",
      privacy: "En continuant, vous acceptez nos Conditions d'utilisation et notre Politique de confidentialité",
      light: "Clair",
      dark: "Sombre",
      system: "Système",
    },
    ar: {
      title: "مرحبًا بعودتك",
      subtitle: "قم بتسجيل الدخول للمتابعة إلى Quik",
      google: "المتابعة باستخدام Google",
      privacy: "من خلال المتابعة، فإنك توافق على شروط الخدمة وسياسة الخصوصية الخاصة بنا",
      light: "فاتح",
      dark: "داكن",
      system: "النظام",
    },
  };

  const handleChangeTheme = async (value) => {
    setTheme(value);
  };

  const handleChangeLang = async (value) => {
    setLang(value);
  };

  return (
    <div className="login-wrapper">
      <div className="lang-select">
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

      

      <div className="background-pattern">
        <div className="circle circle-1"></div>
        <div className="circle circle-2"></div>
        <div className="circle circle-3"></div>
      </div>

      <Row justify="center" align="middle" className="login-container">
        <Col xs={22} sm={20} md={16} lg={12} xl={10} xxl={8} className="login-card">
          <div className="login-header">
            <div className="app-logo">
              <img src={logo_quik} alt="Quik Logo" className="logo-img" />
            </div>
            <Title level={2} className="app-title">
              Quik
            </Title>
            <Text className="app-subtitle">{text[lang].subtitle}</Text>
          </div>

          <div className="login-content">
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
              <Button
                type="primary"
                size="large"
                icon={<GoogleOutlined />}
                className="google-btn"
                onClick={() => handleLogin(googleProvider)}
                block
              >
                {text[lang].google}
              </Button>
            </Space>

            <Text className="privacy-text">{text[lang].privacy}</Text>
          </div>
        </Col>
      </Row>

      <div className="footer-credit">
        © 2025 Made by <span className="author-name">Thái Gia Huy</span> · quik.id.vn
      </div>
    </div>
  );
}
