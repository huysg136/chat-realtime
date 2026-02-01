# ⚡ Quik - Real-Time Chat & Video Call

![React](https://img.shields.io/badge/React-18-blue?logo=react&logoColor=white) ![Firebase](https://img.shields.io/badge/Firebase-FFCA28?logo=firebase&logoColor=black) ![Ant Design](https://img.shields.io/badge/Ant%20Design-5.0-red?logo=antdesign&logoColor=white) 
[![Stringee](https://img.shields.io/badge/Stringee-Video%20Call-red)](https://stringee.com/) [![Cloudflare R2](https://img.shields.io/badge/Cloudflare-R2_Storage-orange?logo=cloudflare&logoColor=white)](https://www.cloudflare.com/developer-platform/r2/) [![AI](https://img.shields.io/badge/AI-Gemini%20%26%20Llama-blue?logo=google-gemini&logoColor=white)](https://deepmind.google/technologies/gemini/)

> **Quik** is a powerful, full-featured real-time messaging platform powered by **ReactJS** and **Node.js**. It features high-performance video calls, lightning-fast file storage, and smart AI assistants, designed for both personal and community communication.

⚠️ **Note:** This project is a **Work In Progress (WIP)**.
🌐 **Live Demo:** [https://quik.id.vn](https://quik.id.vn)

---

## 🚀 Features

Quik combines a seamless chat interface with robust backend services.

### 🌟 Key Features
*   **Real-time Messaging**: Instant text messaging powered by **Firebase Firestore**.
*   **📹 Video Calls**: Crystal clear video and voice calls orchestrated by **Stringee SDK**.
*   **☁️ Fast Storage**: Secure, high-speed media and file sharing using **Cloudflare R2**.
*   **🤖 AI Assistant**: Integrated **Google Gemini 2.5** and **Llama 3 (Groq)** for intelligent chat responses and assistance.
*   **🔐 Secure Auth**: User authentication via Google and other providers.

### 🛡️ Admin Dashboard
*   **Dashboard Overview**: Real-time system statistics.
*   **User & Room Management**: Full control over accounts and chat groups.
*   **Report System**: Automated content moderation with email notifications via **Resend**.
*   **Announcements**: System-wide broadcast messaging.
*   **Moderator Permissions**: Granular access control for staff.

---

## 🛠️ Tech Stack

### Frontend
-   **Core**: ReactJS (v18)
-   **UI**: Ant Design, SCSS
-   **State**: Redux / Context API
-   **i18n**: i18next (Internationalization)

### Backend & Cloud Services
-   **Runtime**: Node.js, Express.js
-   **Video/Voice**: Stringee SDK
-   **Speech-to-Text**: AssemblyAI
-   **Storage**: Cloudflare R2 (S3 Compatible)
-   **AI Models**: Google Gemini 2.5 Flash Lite, Groq (Llama 3.1 8b)
-   **Database**: Firebase Firestore, Realtime Database
-   **Email**: Resend

🔗 **Backend Repository:** [**chat-realtime-api**](https://github.com/huysg136/chat-realtime-api)

---

## 📦 Getting Started

### Prerequisites
*   **Node.js** (v18 recommended)
*   **npm** or **yarn**

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/huysg136/chat-realtime.git
    cd chat-realtime
    ```

2.  **Install dependencies**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Environment Setup**
    Create a `.env` file in the root directory and add your keys (match these with your backend/firebase setup):
    ```env
    REACT_APP_FIREBASE_API_KEY=your_api_key
    REACT_APP_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
    REACT_APP_FIREBASE_PROJECT_ID=your_project_id
    REACT_APP_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
    REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
    REACT_APP_FIREBASE_APP_ID=your_app_id
    REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id
    ```

4.  **Start the application**
    ```bash
    npm start
    ```
    The app will launch at `http://localhost:3000`.

---

## 🤝 Contributing

Contributions are welcome! Please fork the repo and submit a PR.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
