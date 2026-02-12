// Import SDKs cần thiết
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getDatabase, connectDatabaseEmulator } from "firebase/database";
// import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";

// Cấu hình Firebase
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: "https://chat-realtime-54e66-default-rtdb.asia-southeast1.firebasedatabase.app", // Thêm URL RTDB
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// if (typeof window !== "undefined") {
//   // Dòng này giúp bạn làm việc trên localhost không bị chặn
//   // Sau này khi deploy web thật (với domain riêng), bạn có thể xóa dòng debug này
//   if (window.location.hostname === "localhost") {
//     // eslint-disable-next-line no-restricted-globals
//     // self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
//   }

//   initializeAppCheck(app, {
//     provider: new ReCaptchaEnterpriseProvider('6Le372gsAAAAEwNEinmQwMcUMkPWjSL8viaPPfv'),
//     isTokenAutoRefreshEnabled: true,
//   });
// }

const analytics = getAnalytics(app);

// Export các service để dùng
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app); // Export Realtime Database

// Nếu muốn chạy trên localhost với emulator
// if (window.location.hostname === "localhost") {
//   connectAuthEmulator(auth, "http://localhost:9099");
//   connectFirestoreEmulator(db, "localhost", 8080);
//   connectDatabaseEmulator(rtdb, "localhost", 9000);
// }

export default app;
