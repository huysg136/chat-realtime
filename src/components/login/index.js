import React from "react";
import { Row, Col, Button, Typography, Space, Divider } from "antd";
import { GoogleOutlined, FacebookOutlined } from "@ant-design/icons";
import { getAuth, signInWithPopup, GoogleAuthProvider, FacebookAuthProvider, getAdditionalUserInfo } from "firebase/auth";
import app from "../../firebase/config";
import { addDocument } from "../../firebase/services";
import "./index.scss";

const { Title, Text } = Typography;

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();

export default function Login() {
  const handleLogin = async (provider) => {
    try {
      const result = await signInWithPopup(auth, provider);
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
      console.log(`${provider.providerId} login success:`, user);
    } catch (err) {
      console.error(`${provider.providerId} login error:`, err);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="background-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>
      
      <Row justify="center" align="middle" className="login-container">
        <Col xs={22} sm={18} md={14} lg={10} xl={8} className="login-card">
          <div className="login-header">
            <div className="app-logo">
              <svg viewBox="0 0 80 80" className="logo-svg">
                <defs>
                  <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6b73ff" />
                    <stop offset="100%" stopColor="#000dff" />
                  </linearGradient>
                </defs>
                
                {/* Background circle */}
                <circle cx="40" cy="40" r="38" fill="url(#logoGradient)" />
                
                {/* Chat bubble 1 */}
                <rect x="18" y="22" width="24" height="16" rx="8" fill="white" fillOpacity="0.9" />
                <circle cx="24" cy="30" r="2" fill="#6b73ff" />
                <circle cx="30" cy="30" r="2" fill="#6b73ff" />
                <circle cx="36" cy="30" r="2" fill="#6b73ff" />
                
                {/* Chat bubble 2 */}
                <rect x="38" y="42" width="24" height="16" rx="8" fill="white" fillOpacity="0.9" />
                <circle cx="44" cy="50" r="2" fill="#000dff" />
                <circle cx="50" cy="50" r="2" fill="#000dff" />
                <circle cx="56" cy="50" r="2" fill="#000dff" />
                
                {/* Chat tails */}
                <path d="M18 34 L12 38 L18 38 Z" fill="white" fillOpacity="0.9" />
                <path d="M62 46 L68 50 L62 50 Z" fill="white" fillOpacity="0.9" />
              </svg>
            </div>
            <Title level={2} className="app-title">ChitChat</Title>
            {/* <Text className="app-subtitle">
              Where conversations come alive
            </Text> */}
          </div>

          <div className="login-content">
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
              <Button
                type="primary"
                size="large"
                icon={<GoogleOutlined />}
                className="social-btn google-btn"
                onClick={() => handleLogin(googleProvider)}
                block
              >
                Continue with Google
              </Button>
              
              <Button
                type="primary"
                size="large"
                icon={<FacebookOutlined />}
                className="social-btn facebook-btn"
                onClick={() => handleLogin(facebookProvider)}
                block
              >
                Continue with Facebook
              </Button>
            </Space>
            
            <Divider className="login-divider">
              <Text type="secondary" className="divider-text">Safe & Secure</Text>
            </Divider>
            
            <Text type="secondary" className="privacy-text">
              Your privacy is protected. We never share your data.
            </Text>
          </div>
        </Col>
      </Row>
    </div>
  );
}