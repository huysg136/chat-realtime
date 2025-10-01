  // Import SDKs cần thiết
  import { initializeApp } from "firebase/app";
  import { getAnalytics } from "firebase/analytics";
  import { getAuth, connectAuthEmulator } from "firebase/auth";
  import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

  // Cấu hình Firebase
  const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
  // Export các service để dùng
  export const auth = getAuth(app);
  export const db = getFirestore(app);

  // if (window.location.hostname === "localhost") {
  //   // Dùng connectAuthEmulator thay vì auth.useEmulator
  //   connectAuthEmulator(auth, "http://localhost:9099");
  //   // Dùng connectFirestoreEmulator thay vì db.useEmulator
  //   connectFirestoreEmulator(db, "localhost", 8080);
  // }

  export default app;
