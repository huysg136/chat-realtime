const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, updateDoc, doc } = require("firebase/firestore");

// ⚙️ Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAQKPz8K4oCE2_lKS5OmeyerUJmWT5WYZg",
  authDomain: "chat-realtime-54e66.firebaseapp.com",
  projectId: "chat-realtime-54e66",
  storageBucket: "chat-realtime-54e66.appspot.com",
  messagingSenderId: "473742057944",
  appId: "1:473742057944:web:ea3e70fbfbada2b878d2ad",
  measurementId: "G-KMPZEFLRDY",
};

// 🔥 Khởi tạo Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ✅ Hàm tạo username an toàn0
function generateUsername(displayName) {
  if (!displayName || typeof displayName !== "string") {
    return "@user" + Math.floor(Math.random() * 10000);
  }

  let base = displayName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")            
    .replace(/[^a-z0-9]/g, "");   

  if (!base || base.length < 3) base = "user" + Math.floor(Math.random() * 1000);

  return base;
}

async function updateUsernames() {
  console.log("🚀 Script started... connecting to Firestore");
  console.log("🔍 Đang cập nhật username cho tất cả users...");

  const usersSnap = await getDocs(collection(db, "users"));
  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    const id = userDoc.id;

    try {
      const newUsername = generateUsername(data.displayName);
      console.log(`📝 Updating user ${data.displayName || id} → ${newUsername}`);
      await updateDoc(doc(db, "users", id), { username: newUsername });
    } catch (err) {
      console.error(`❌ Error updating user ${data.displayName || id}:`, err.message);
    }
  }

  console.log("🎉 Hoàn tất cập nhật username cho tất cả users!");
  process.exit(0);
}

updateUsernames();
