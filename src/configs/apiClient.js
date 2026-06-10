/**
 * apiClient.js — HTTP client trung tâm
 *
 * Tự động gắn header `x-api-key` vào MỌI request gửi lên backend.
 * Sử dụng thay thế cho `axios` và `fetch` trực tiếp trong các service.
 *
 * Usage (axios-style):
 *   import { apiClient } from "../configs/apiClient";
 *   apiClient.post("/api/ask-gemini", { prompt });
 *
 * Usage (fetch-style):
 *   import { apiFetch } from "../configs/apiClient";
 *   apiFetch("/api/friends/request", { method: "POST", body: JSON.stringify(...) });
 */

import axios from "axios";
import { auth } from "../firebase/config";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";

// ─── Axios instance ───────────────────────────────────────────────────────────

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor to inject Firebase ID Token dynamically into every Axios request
apiClient.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;
    if (user) {
      try {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      } catch (error) {
        console.error("Error getting Firebase ID Token for Axios:", error);
      }
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

  const user = auth.currentUser;
  if (user) {
    try {
      const token = await user.getIdToken();
      headers.Authorization = `Bearer ${token}`;
    } catch (error) {
      console.error("Error getting Firebase ID Token for fetch:", error);
    }
  }

  return fetch(url, { ...options, headers });
};

