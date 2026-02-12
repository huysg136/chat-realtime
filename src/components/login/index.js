import React, { useState, useEffect } from "react";
import { Row, Col, Button, Typography, Space, Select } from "antd";
import { GoogleOutlined } from "@ant-design/icons";
import { BsSunFill, BsMoonStarsFill, BsLaptop } from "react-icons/bs";
import { getAuth, signInWithPopup, GoogleAuthProvider, getAdditionalUserInfo } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDoc, doc, getDocs, updateDoc, serverTimestamp } from "firebase/firestore";
import app, { db } from "../../firebase/config";
import { addDocument, getUserDocIdByUid } from "../../firebase/services";
import ReactCountryFlag from "react-country-flag";
import "./index.scss";
import logo_quik from "../../images/logo_quik.png";
import { toast } from "react-toastify";
import { ROUTERS } from "../../constants/router"
import { useTranslation } from "react-i18next";

const { Title, Text } = Typography;
const { Option } = Select;

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

function generateUsername(displayName) {
  if (!displayName || typeof displayName !== "string") {
    return "user" + Math.floor(Math.random() * 10000);
  }

  let base = displayName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") 
    .replace(/đ/g, "d")             
    .replace(/[^a-z0-9]/g, "");     

  if (!base || base.length < 3) {
    base = "user" + Math.floor(Math.random() * 1000);
  }

  return base;
}

async function isUsernameTaken(username) {
  const q = query(collection(db, "users"), where("username", "==", username));
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

async function getUniqueUsername(baseUsername) {
  let username = baseUsername;
  let counter = 1;

  while (await isUsernameTaken(username)) {
    username = `${baseUsername}${counter++}`;
  }

  return username;
}

export default function Login() {
  const { t, i18n } = useTranslation();
  const [language, setLanguage] = useState(i18n.language || "vi");
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
      // System theme
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      
      const applySystemTheme = () => {
        root.classList.remove("theme-light", "theme-dark");
        root.classList.add(mediaQuery.matches ? "theme-dark" : "theme-light");
      };
      
      // Apply initial system theme
      applySystemTheme();
      
      // Listen for system theme changes
      mediaQuery.addEventListener("change", applySystemTheme);
      
      // Cleanup
      return () => {
        mediaQuery.removeEventListener("change", applySystemTheme);
      };
    }
  }, [theme]);

  const handleLogin = async (provider) => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const additionalUserInfo = getAdditionalUserInfo(result);

      if (additionalUserInfo?.isNewUser) {
        const baseUsername = generateUsername(user.displayName);
        const uniqueUsername = await getUniqueUsername(baseUsername);
        
        await addDocument("users", {
          uid: user.uid,
          displayName: user.displayName,
          username: uniqueUsername,
          email: user.email,
          photoURL: user.photoURL || "https://images.spiderum.com/sp-images/9ae85f405bdf11f0a7b6d5c38c96eb0e.jpeg",
          providerId: additionalUserInfo.providerId,
          role: "user", // admin, moderator, user
          // quản lý gói dịch vụ
          premiumLevel: "free", // free, pro
          premiumUntil: null,
          quotaUsed: 0,
          // Cấu hình cá nhân
          theme: "system",
          language: "vi",
          allowGroupInvite: true,     
          showOnlineStatus: true,
          // quản lý định danh
          usernameChangeCount: 0,      
          lastUsernameChange: null,    
          // trạng thái hệ thống
          isBanned: false,            
          lastOnline: new Date().toISOString(),
        });
      }

      const userDocId = await getUserDocIdByUid(user.uid);
      if (userDocId) {
        await updateDoc(doc(db, "users", userDocId), {
          lastOnline: serverTimestamp()
        });
      }

      let role = "user";
      if (userDocId) {
        const userDoc = await getDoc(doc(db, "users", userDocId));
        role = userDoc.exists() ? userDoc.data().role : "user";
      }

      const configDoc = await getDoc(doc(db, "config", "appStatus"));
      const maintenance = configDoc.exists() ? configDoc.data().maintenance : false;

      if (maintenance && role !== "admin" && role !== "moderator") {
        navigate(ROUTERS.USER.MAINTENANCE);
      } else {
        navigate(ROUTERS.USER.LOGIN);
      }
    } catch (err) {
      toast(`Lỗi đăng nhập: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeTheme = async (value) => {
    setTheme(value);
  };

  const handleChangeLang = async (value) => {
    setLanguage(value);
    i18n.changeLanguage(value);
  };

  return (
    <div className="login-wrapper">
      <div className="lang-select">
        <Select value={language} onChange={handleChangeLang} style={{ width: 160 }}>
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
        </Select>
        <div style={{ marginTop: 5 }}>
          <Select value={theme} onChange={handleChangeTheme} style={{ width: 160 }}>
            <Option value="light">
              <BsSunFill style={{ color: "#facc15", marginRight: 6 }} />
              {t('settings.light')}
            </Option>
            <Option value="dark">
              <BsMoonStarsFill style={{ color: "#3b82f6", marginRight: 6 }} />
              {t('settings.dark')}
            </Option>
            <Option value="system">
              <BsLaptop style={{ color: "#6b7280", marginRight: 6 }} />
              {t('settings.system')}
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
            <Text className="app-subtitle">{t('login.subtitle')}</Text>
          </div>

          <div className="login-content">
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
              <Button
                type="primary"
                size="large"
                icon={<GoogleOutlined />}
                className="google-btn"
                onClick={() => handleLogin(googleProvider)}
                loading={loading}
                block
              >
                {t('login.googleBtn')}
              </Button>
            </Space>

            <Text className="privacy-text">{t('login.privacy')}</Text>
          </div>
        </Col>
      </Row>

      <div className="footer-credit">
        © {new Date().getFullYear()} {t('login.footer')} <span className="author-name">Thái Gia Huy</span> · quik.id.vn
      </div>
    </div>
  );
}