# ⚡ Quik - Real-Time Chat, Video Call & Social Network

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![Zustand](https://img.shields.io/badge/State-Zustand-4338CA?logo=react&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?logo=firebase&logoColor=black)
![Ant Design](https://img.shields.io/badge/Ant%20Design-5.0-0170FE?logo=antdesign&logoColor=white)
[![Stringee](https://img.shields.io/badge/Stringee-Video%20Call-FF0000)](https://stringee.com/)
[![Cloudflare R2](https://img.shields.io/badge/Cloudflare-R2_Storage-F38020?logo=cloudflare&logoColor=white)](https://www.cloudflare.com/developer-platform/r2/)
[![AI](https://img.shields.io/badge/AI-Gemini%20%26%20Llama%203-4285F4?logo=google-gemini&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![AssemblyAI](https://img.shields.io/badge/AssemblyAI-Speech%20to%20Text-673AB7)](https://www.assemblyai.com/)

> **Quik** là nền tảng mạng xã hội và nhắn tin thời gian thực toàn diện được xây dựng trên **React 18** và **Node.js**. Quik mang đến trải nghiệm nhắn tin bảo mật mã hoá đầu cuối (E2EE), gọi thoại/video chất lượng cao, chia sẻ bài viết, trợ lý ảo AI thông minh và hệ thống quản trị mạnh mẽ.

🌐 **Trang chủ & Trải nghiệm trực tiếp:** [https://quik.id.vn](https://quik.id.vn)

---

## 🌟 Tính năng nổi bật (Features)

### 💬 Nhắn tin Realtime & Bảo mật (Chat & Messaging)
* **Realtime Chat**: Gửi và nhận tin nhắn tức thì qua **Firebase Firestore**.
* **Mã hoá đầu cuối (E2EE)**: Mã hoá tin nhắn bằng khoá bí mật AES riêng biệt cho từng phòng trò chuyện.
* **Đa phương tiện**: Gửi ảnh, video, tệp tin dung lượng lớn, ghi âm giọng nói (Voice Note) kèm biểu đồ sóng âm (Waveform).
* **Tự động nhận diện liên kết (Smart URL Linkifier)**: Tự động phát hiện và chuyển đổi link web trong tin nhắn thành liên kết bấm được.
* **Trạng thái Online/Offline & Heartbeat**: Theo dõi trạng thái hoạt động theo thời gian thực qua Firebase Realtime Database.
* **Xem ảnh toàn màn hình (Lightbox)** & Trình phát âm thanh/video tích hợp.

### 📹 Gọi Video & Thoại chất lượng cao (Voice & Video Calls)
* **Stringee SDK**: Gọi thoại 1-1 và gọi video HD ổn định, độ trễ thấp.
* Tự động điều hướng và đồng bộ cuộc gọi ngay trong phòng chat.

### 🤖 Trợ lý thông minh AI (AI Assistants)
* **Google Gemini 2.5 & Groq Llama 3.1**: Tích hợp chatbot AI thông minh trả lời câu hỏi, tóm tắt nội dung và hỗ trợ người dùng.
* **Chuyển giọng nói thành văn bản (Speech-to-Text)**: Tích hợp **AssemblyAI** giúp chuyển đổi tin nhắn thoại thành văn bản tức thì.

### 📰 Bảng tin Mạng xã hội (Social Feed)
* **Dòng thời gian tương tác**: Đăng bài viết, chia sẻ hình ảnh/video, thả tim (Like) và bình luận.
* **Chủ đề thịnh hành (Trending Topics)**: Tự động phân tích và gắn thẻ hashtag thịnh hành.
* **Gợi ý kết bạn thông minh (Friend Suggestions)**: Thuật toán Graph (Friend-of-Friends) tìm kiếm bạn bè phù hợp.
* **Danh sách bạn bè trực tuyến (Online Friends)**: Cập nhật trạng thái bạn bè đang online realtime.

### 💎 Quản lý Gói thành viên & Giới hạn (Subscription & Quota)
* Phân cấp tài khoản: **Free**, **Lite**, **Pro**, **Max**.
* Tự động kiểm tra hạn sử dụng gói và điều chỉnh hạn mức (Quota) tài nguyên.

### 🛡️ Trang quản trị nâng cao (Admin Dashboard)
* **Thống kê tổng quan**: Biểu đồ trực quan hoá số lượng người dùng, tin nhắn, phòng chat với **Recharts & Chart.js**.
* **Quản lý người dùng & phòng chat**: Xem chi tiết, phân quyền (User / Moderator / Admin), khóa/mở tài khoản.
* **Hệ thống báo cáo (Reports)**: Tiếp nhận và xử lý vi phạm, tự động gửi email thông báo qua **Resend** (`no-reply@quik.id.vn`).
* **Thông báo hệ thống (Announcements)**: Phát thông báo toàn hệ thống hoặc theo nhóm đối tượng mục tiêu.
* **Chế độ bảo trì hệ thống (Maintenance Mode)**: Kích hoạt màn hình bảo trì tức thì trên toàn app.

---

## 🛠️ Công nghệ sử dụng (Tech Stack)

### Frontend
- **Core**: ReactJS 18 (CRA)
- **State Management**: **Zustand** (Modular Stores: `useAuthStore`, `useModalStore`, `useChatStore`, `useAppStore`)
- **Giao diện & Styling**: Ant Design 5, SCSS, Styled Components, Lucide Icons, React Icons
- **Đa ngôn ngữ (i18n)**: `react-i18next` (Tiếng Việt / English)
- **Biểu đồ & Thống kê**: Chart.js, Recharts
- **Tiện ích**: `dayjs`, `date-fns`, `crypto-js`, `emoji-picker-react`, `react-markdown`

### Backend & Cloud Services
- **Runtime & API**: Node.js, Express.js
- **Database**: Firebase Firestore, Firebase Realtime Database
- **Caching Layer**: Upstash Redis (lưu cache feed, metadata và atomic counters)
- **Lưu trữ tệp (Object Storage)**: Cloudflare R2 (tương thích S3 API)
- **Cuộc gọi RTC**: Stringee SDK
- **Speech-to-Text**: AssemblyAI
- **Email Service**: Resend

---

## 📂 Cấu trúc thư mục (Project Structure)

```bash
src/
├── components/          # Các Component giao diện UI
│   ├── admin/           # Quản trị viên (Dashboard, Settings, User/Room/Report Manager)
│   ├── common/          # Component dùng chung (Loading, Badge, FriendButton,...)
│   ├── modals/          # Các cửa sổ tương tác (Profile, Settings, AddRoom, UpgradePlan,...)
│   └── user/            # Giao diện người dùng (ChatPage, FeedPage, Message, Comment,...)
├── configs/             # Cấu hình routes, hằng số hệ thống
├── context/             # Adapter/Bridge providers (hỗ trợ tương thích ngược)
├── firebase/            # Khởi tạo Firebase SDK & các hàm CRUD dịch vụ
├── hooks/               # Custom Hooks (useFirestore, useFriends, useVideoCall,...)
├── i18n/                # Cấu hình đa ngôn ngữ (vi, en)
├── layouts/             # Bố cục trang (LandingPage, UserLayout, AdminLayout)
├── pages/               # Các trang chính (ChatRoom, Feed, Profile, Login, Admin, Maintenance)
├── routes/              # Điều hướng & Route Guards (PrivateRoute, AdminRoute)
├── services/            # Kết nối API backend (Post, Friend, Quota, AI)
├── stores/              # Zustand Global Stores (Auth, Chat, Modal, App)
├── stringee/            # Cấu hình & Client gọi video/thoại Stringee
├── style/               # Global SCSS, theme variables, reset css
└── utils/               # Hàm tiện ích (Encryption, Validate file, Format date)
```



## 🔗 Liên kết liên quan
* 📦 **Backend API Repository:** [**chat-realtime-api**](https://github.com/huysg136/chat-realtime-api)
