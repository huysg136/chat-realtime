# 💬 Real-Time Chat Application with ReactJS, Firebase & Node.js

[![React](https://img.shields.io/badge/React-18-blue?logo=react&logoColor=white)]
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?logo=firebase&logoColor=black)]
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000?logo=vercel&logoColor=white)]
[![Node.js](https://img.shields.io/badge/Node.js-18-green?logo=node.js&logoColor=white)]

A **real-time messaging application** built with **ReactJS**, **Firebase**, and **Node.js**, featuring private & group chat, live updates, user authentication, and image upload.

⚠️ **Note:** This project is **WIP (Work In Progress)** – not yet complete.

🌐 **Live Demo:** [https://quik.id.vn](https://quik.id.vn)

---

## 🚀 Features

- ✨ Real-time messaging with Firebase Firestore
- 👥 Private and group chat rooms
- 🖼 Send images, video, file, voice via Node.js backend
- 📍 Responsive design for desktop & mobile
- 🔐 User authentication (Google OAuth)
- ⚡ Fast, smooth, and lightweight

---

## 🛠️ Tech Stack

- Frontend: ReactJS, Ant Design, SCSS
- Backend: Node.js, Express
- Database & Realtime: Firebase Firestore
- Authentication: Firebase Auth
- File Storage: Firebase Storage
- Hosting: Vercel
- State Management: Context API

---

## 📦 Getting Started

These instructions will get you a copy of the project up and running on your local machine.

### Prerequisites

- Node.js >= 18.x
- Yarn or npm
- Firebase account

### Installation

# Clone repository
git clone https://github.com/yourusername/chat-realtime.git
cd chat-realtime

# Install dependencies
yarn install

---

## 🖼 Node.js Backend (Image Upload)

1. Navigate to server folder:

cd server
yarn install

2. Create `.env` file:

FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
PORT=5000

3. Start server:

yarn dev
# or
node index.js

This provides an endpoint to upload images which can be called from React frontend.

---
