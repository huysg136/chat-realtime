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

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";

const API_SECRET_KEY = process.env.REACT_APP_API_SECRET_KEY || "";

// ─── Axios instance ───────────────────────────────────────────────────────────

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    "x-api-key": API_SECRET_KEY,
  },
});

// ─── Fetch wrapper ────────────────────────────────────────────────────────────

/**
 * Thay thế cho `fetch()` — tự động thêm baseURL và x-api-key header.
 * @param {string} path - Đường dẫn API (ví dụ: "/api/friends/request")
 * @param {RequestInit} options - Các tùy chọn fetch (method, body, headers,...)
 */
export const apiFetch = async (path, options = {}) => {
  const url = `${API_BASE_URL}${path}`;

  const headers = {
    "Content-Type": "application/json",
    "x-api-key": API_SECRET_KEY,
    ...(options.headers || {}),
  };

  return fetch(url, { ...options, headers });
};
