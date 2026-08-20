/**
 * apiClient.js — HTTP client trung tâm
 *
 * Tự động gắn header `Authorization: Bearer <Token>` vào MỌI request gửi lên backend.
 * Sử dụng cho cả `axios` và `fetch` trong các service.
 */

import axios from "axios";
import { auth } from "../firebase/firebaseClient";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";

// Helper lấy Firebase ID Token đáng tin cậy
const getFirebaseToken = async () => {
  let user = auth.currentUser;
  if (!user) {
    // Đợi Firebase Auth khởi tạo phiên đăng nhập từ storage nếu có
    await new Promise((resolve) => {
      const unsubscribe = auth.onAuthStateChanged((u) => {
        unsubscribe();
        resolve(u);
      });
    });
    user = auth.currentUser;
  }
  if (user) {
    return await user.getIdToken();
  }
  return null;
};

// ─── Axios instance ───────────────────────────────────────────────────────────

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor tự động thêm Bearer Token cho Axios
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await getFirebaseToken();
      if (token) {
        if (config.headers && typeof config.headers.set === "function") {
          config.headers.set("Authorization", `Bearer ${token}`);
        } else {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (error) {
      console.error("Error getting Firebase ID Token for Axios:", error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ─── Fetch wrapper ────────────────────────────────────────────────────────────

/**
 * Thay thế cho `fetch()` — tự động thêm baseURL và Authorization header.
 * @param {string} path - Đường dẫn API (ví dụ: "/api/friends/request")
 * @param {RequestInit} options - Các tùy chọn fetch (method, body, headers,...)
 */
export const apiFetch = async (path, options = {}) => {
  const url = `${API_BASE_URL}${path}`;

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  try {
    const token = await getFirebaseToken();
    if (token && !headers.Authorization) {
      headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error("Error getting Firebase ID Token for fetch:", error);
  }

  return fetch(url, { ...options, headers });
};
