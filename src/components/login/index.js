import React, { useState, useEffect } from "react";
import { Row, Col, Button, Typography, Space, Divider, Select } from "antd";
import { GoogleOutlined, FacebookOutlined } from "@ant-design/icons";
import { getAuth, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, FacebookAuthProvider, getAdditionalUserInfo } from "firebase/auth";
import app from "../../firebase/config";
import { addDocument } from "../../firebase/services";
import { useNavigate } from "react-router-dom"; // nếu dùng react-router
import "./index.scss";

const { Title, Text } = Typography;
const { Option } = Select;

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();

export default function Login() {
  const [lang, setLang] = useState("en");
  const navigate = useNavigate(); // react-router navigation

  // Xử lý redirect result (Facebook mobile)
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          const user = result.user;
          const additionalUserInfo = getAdditionalUserInfo(result);

          if (additionalUserInfo?.isNewUser) {
            addDocument("users", {
              displayName: user.displayName,
              email: user.email,
              photoURL: user.photoURL,
              uid: user.uid,
              providerId: additionalUserInfo.providerId,
            });
          }

          navigate("/chat"); // chuyển sang chat
        }
      })
      .catch(console.error);
  }, [navigate]);

  // Google login
  const handleLoginGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const additionalUserInfo = getAdditionalUserInfo(result);

      if (additionalUserInfo?.isNewUser) {
        await addDocument("users", {
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          uid: user.uid,
          providerId: additionalUserInfo.providerId,
        });
      }

      navigate("/chat");
    } catch (err) {
      console.error("Google login error:", err);
    }
  };

  // Facebook login: popup trên desktop, redirect trên mobile
  const handleLoginFacebook = () => {
    if (/Mobi|Android/i.test(navigator.userAgent)) {
      signInWithRedirect(auth, facebookProvider);
    } else {
      signInWithPopup(auth, facebookProvider)
        .then((result) => {
          const user = result.user;
          const additionalUserInfo = getAdditionalUserInfo(result);

          if (additionalUserInfo?.isNewUser) {
            addDocument("users", {
              displayName: user.displayName,
              email: user.email,
              photoURL: user.photoURL,
              uid: user.uid,
              providerId: additionalUserInfo.providerId,
            });
          }

          navigate("/chat");
        })
        .catch((err) => console.error("Facebook login error:", err));
    }
  };

  const text = {
    en: {
      google: "Continue with Google",
      facebook: "Continue with Facebook",
      safe: "Safe & Secure",
      privacy: "Your privacy is protected. We never share your data.",
    },
    vi: {
      google: "Tiếp tục với Google",
      facebook: "Tiếp tục với Facebook",
      safe: "An toàn & Bảo mật",
      privacy: "Quyền riêng tư của bạn được bảo vệ. Chúng tôi không chia sẻ dữ liệu của bạn.",
    },
  };

  return (
    <div className="login-wrapper">
      {/* Chọn ngôn ngữ */}
      <div className="lang-select" style={{ position: "absolute", top: 20, right: 20, zIndex: 2 }}>
        <Select value={lang} onChange={setLang} style={{ width: 120 }}>
          <Option value="en">English</Option>
          <Option value="vi">Tiếng Việt</Option>
        </Select>
      </div>

      <div className="background-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>

      <Row justify="center" align="middle" className="login-container">
        <Col xs={22} sm={18} md={14} lg={10} xl={8} className="login-card">
          <div className="login-header">
            <div className="app-logo">
              {/* giữ nguyên SVG logo */}
            </div>
            <Title level={2} className="app-title">ChitChat</Title>
          </div>

          <div className="login-content">
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
              <Button
                type="primary"
                size="large"
                icon={<GoogleOutlined />}
                className="social-btn google-btn"
                onClick={handleLoginGoogle}
                block
              >
                {text[lang].google}
              </Button>

              <Button
                type="primary"
                size="large"
                icon={<FacebookOutlined />}
                className="social-btn facebook-btn"
                onClick={handleLoginFacebook}
                block
              >
                {text[lang].facebook}
              </Button>
            </Space>

            <Divider className="login-divider">
              <Text type="secondary" className="divider-text">{text[lang].safe}</Text>
            </Divider>

            <Text type="secondary" className="privacy-text" style={{ fontSize: lang === "vi" ? 12 : 14 }}>
              {text[lang].privacy}
            </Text>
          </div>
        </Col>
      </Row>
    </div>
  );
}
