import React, { useState } from "react";
import { Row, Col, Button, Typography, Space, Select } from "antd";
import { GoogleOutlined } from "@ant-design/icons";
import { getAuth, signInWithPopup, GoogleAuthProvider, getAdditionalUserInfo } from "firebase/auth";
import app from "../../firebase/config";
import { addDocument, generateKeywords } from "../../firebase/services";
import "./index.scss";
import logo_quik from "../../images/logo_quik.png";

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
          role: "user",
          keywords: generateKeywords(user.displayName)
        });
      }
      //console.log(`${provider.providerId} login success:`, user);
    } catch (err) {
      //console.error(`${provider.providerId} login error:`, err);
    }
  };

  const text = {
    en: {
      title: "Welcome Back",
      subtitle: "Sign in to continue to Quik",
      google: "Continue with Google",
      privacy: "By continuing, you agree to our Terms of Service and Privacy Policy",
    },
    vi: {
      title: "Chào Mừng Trở Lại",
      subtitle: "Đăng nhập để tiếp tục sử dụng Quik",
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
              <div className="app-logo">
                <img src={logo_quik} alt="Quik Logo" className="logo-img" />
              </div>
            </div>
            <Title level={2} className="app-title">Quik</Title>
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
      <div className="footer-credit">
        © 2025 Made by <span className="author-name">Thái Gia Huy</span> · quik.id.vn
      </div>
    </div>
  );
}