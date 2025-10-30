import React, { useState, useEffect } from "react";
import { Row, Col, Button, Typography, Space, Select } from "antd";
import { GoogleOutlined } from "@ant-design/icons";
import { getAuth, signInWithPopup, GoogleAuthProvider, getAdditionalUserInfo } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import app, { db } from "../../firebase/config";
import { addDocument, generateKeywords, getUserDocIdByUid } from "../../firebase/services";
import "./index.scss";
import logo_quik from "../../images/logo_quik.png";

const { Title, Text } = Typography;
const { Option } = Select;

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export default function Login() {
  const [lang, setLang] = useState("en");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
      privacy:
        "By continuing, you agree to our Terms of Service and Privacy Policy",
    },
    vi: {
      title: "Chào Mừng Trở Lại",
      subtitle: "Đăng nhập để tiếp tục sử dụng Quik",
      google: "Tiếp tục với Google",
      privacy:
        "Bằng cách tiếp tục, bạn đồng ý với Điều khoản dịch vụ và Chính sách bảo mật của chúng tôi",
    },
  };

  return (
    <div className="login-wrapper">
      <div className="lang-select">
        <Select value={lang} onChange={setLang}>
          <Option value="en">English</Option>
          <Option value="vi">Tiếng Việt</Option>
        </Select>
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
