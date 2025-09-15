// Import SDKs cần thiết
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Config Firebase (tốt nhất nên để ở .env)
const firebaseConfig = {
  apiKey: "AIzaSyAQKPz8K4oCE2_lKS5OmeyerUJmWT5WYZg",
  authDomain: "chat-realtime-54e66.firebaseapp.com",
  projectId: "chat-realtime-54e66",
  storageBucket: "chat-realtime-54e66.appspot.com",
  messagingSenderId: "473742057944",
  appId: "1:473742057944:web:ea3e70fbfbada2b878d2ad",
  measurementId: "G-KMPZEFLRDY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
// Export các service để dùng
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
