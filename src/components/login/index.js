import React from "react";
import { Row, Col, Button, Typography } from "antd";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider, signInWithPopup } from "firebase/auth";
import app from "../../firebase/config"; 
import { useNavigate } from "react-router-dom";

const { Title } = Typography;

// Khởi tạo auth và providers
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();

export default function Login() {
  // Google login
  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      console.log("Google login success:", result.user);
    } catch (err) {
      console.error("Google login error:", err);
    }
  };

  // Facebook login
  const handleFacebookLogin = async () => {
    try {
      const result = await signInWithPopup(auth, facebookProvider);
      console.log("Facebook login success:", result.user);
    } catch (err) {
      console.error("Facebook login error:", err);
    }
  };

  return (
    <Row justify="center" style={{ height: 800 }}>
      <Col span={8}>
        <Title style={{ textAlign: "center" }} level={3}>
          Fun Chat
        </Title>
        <Button
          style={{ width: "100%", marginBottom: 5 }}
          onClick={handleGoogleLogin}
        >
          Login with Google
        </Button>
        <Button
          style={{ width: "100%" }}
          onClick={handleFacebookLogin}
        >
          Login with Facebook
        </Button>
      </Col>
    </Row>
  );
}
