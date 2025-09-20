import React from "react";
import { Row, Col, Button, Typography } from "antd";
import { getAuth, signInWithPopup, GoogleAuthProvider, FacebookAuthProvider, getAdditionalUserInfo } from "firebase/auth";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import app from "../../firebase/config"; 
import { addDocument } from "../../firebase/services";

const { Title } = Typography;

const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();

export default function Login() {
  // Google login
  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const additionalUserInfo = getAdditionalUserInfo(result);

      if (additionalUserInfo?.isNewUser) {
        addDocument("users", {
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          uid: user.uid,
          providerId: additionalUserInfo.providerId,
        }) 
      }
      console.log("Google login success:", user);
    } catch (err) {
      console.error("Google login error:", err);
    }
  };

  // Facebook login
  const handleFacebookLogin = async () => {
    try {
      const result = await signInWithPopup(auth, facebookProvider);
      const user = result.user;
      const additionalUserInfo = getAdditionalUserInfo(result);

      if (additionalUserInfo?.isNewUser) {
        addDocument("users", {
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          uid: user.uid,
          providerId: additionalUserInfo.providerId,
        }) 
      }
      console.log("Facebook login success:", user);
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
        <Button style={{ width: "100%", marginBottom: 5 }} onClick={handleGoogleLogin}>
          Login with Google
        </Button>
        <Button style={{ width: "100%" }} onClick={handleFacebookLogin}>
          Login with Facebook
        </Button>
      </Col>
    </Row>
  );
}
