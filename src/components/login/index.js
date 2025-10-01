import React, { useState } from "react";
import { Row, Col, Button, Typography, Space, Select } from "antd";
import { GoogleOutlined } from "@ant-design/icons";
import { getAuth, signInWithPopup, GoogleAuthProvider, getAdditionalUserInfo } from "firebase/auth";
import app from "../../firebase/config";
import { addDocument, generateKeywords } from "../../firebase/services";
import "./index.scss";

const { Title, Text } = Typography;
const { Option } = Select;

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export default function Login() {
  const [lang, setLang] = useState("en"); 

  const handleLogin = async (provider) => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const additionalUserInfo = getAdditionalUserInfo(result);

      if (additionalUserInfo?.isNewUser) {
        addDocument("users", {
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL || "https://images.spiderum.com/sp-images/9ae85f405bdf11f0a7b6d5c38c96eb0e.jpeg",
          uid: user.uid,
          providerId: additionalUserInfo.providerId,
          keywords: generateKeywords(user.displayName)
        });
      }
      console.log(`${provider.providerId} login success:`, user);
    } catch (err) {
      console.error(`${provider.providerId} login error:`, err);
    }
  };

  const text = {
    en: {
      title: "Welcome Back",
      subtitle: "Sign in to continue to ChitChat",
      google: "Continue with Google",
      privacy: "By continuing, you agree to our Terms of Service and Privacy Policy",
    },
    vi: {
      title: "Chào Mừng Trở Lại",
      subtitle: "Đăng nhập để tiếp tục sử dụng ChitChat",
      google: "Tiếp tục với Google",
      privacy: "Bằng cách tiếp tục, bạn đồng ý với Điều khoản dịch vụ và Chính sách bảo mật của chúng tôi",
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
              <svg viewBox="0 0 80 80" className="logo-svg">
                <defs>
                  <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#4a5568" />
                    <stop offset="100%" stopColor="#2d3748" />
                  </linearGradient>
                </defs>
                <circle cx="40" cy="40" r="38" fill="url(#logoGradient)" />
                <rect x="18" y="22" width="24" height="16" rx="8" fill="white" fillOpacity="0.95" />
                <circle cx="24" cy="30" r="2" fill="#4a5568" />
                <circle cx="30" cy="30" r="2" fill="#4a5568" />
                <circle cx="36" cy="30" r="2" fill="#4a5568" />
                <rect x="38" y="42" width="24" height="16" rx="8" fill="white" fillOpacity="0.95" />
                <circle cx="44" cy="50" r="2" fill="#2d3748" />
                <circle cx="50" cy="50" r="2" fill="#2d3748" />
                <circle cx="56" cy="50" r="2" fill="#2d3748" />
                <path d="M18 34 L12 38 L18 38 Z" fill="white" fillOpacity="0.95" />
                <path d="M62 46 L68 50 L62 50 Z" fill="white" fillOpacity="0.95" />
              </svg>
            </div>
            <Title level={2} className="app-title">ChitChat</Title>
            <Text className="app-subtitle">{text[lang].subtitle}</Text>
          </div>

          <div className="login-content">
            {/* <div className="welcome-text">
              <Title level={3} className="welcome-title">{text[lang].title}</Title>
            </div> */}

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
    </div>
  );
}