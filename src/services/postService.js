import { getAuth } from "firebase/auth";
import app from "../firebase/config";
import { apiFetch } from "../configs/apiClient";

const auth = getAuth(app);

/** Lấy Firebase token để xác thực user (gộp vào x-api-key header) */
const getAuthHeaders = async () => {
  const user = auth.currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
};

/**
 * Tạo bài viết mới
 */
export const createPost = async (postData) => {
  try {
    const authHeaders = await getAuthHeaders();
    const response = await apiFetch("/api/posts", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(postData),
    });
    return await response.json();
  } catch (error) {
    console.error("Error creating post:", error);
    return { success: false, message: error.message };
  }
};

/**
 * Xóa bài viết
 */
export const deletePost = async (postId) => {
  try {
    const authHeaders = await getAuthHeaders();
    const response = await apiFetch(`/api/posts/${postId}`, {
      method: "DELETE",
      headers: authHeaders,
    });
    return await response.json();
  } catch (error) {
    console.error("Error deleting post:", error);
    return { success: false, message: error.message };
  }
};

/**
 * Cập nhật bài viết
 */
export const updatePost = async (postId, postData) => {
  try {
    const authHeaders = await getAuthHeaders();
    const response = await apiFetch(`/api/posts/${postId}`, {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify(postData),
    });
    return await response.json();
  } catch (error) {
    console.error("Error updating post:", error);
    return { success: false, message: error.message };
  }
};

/**
 * Lấy danh sách Feed
 */
export const getFeed = async ({ filterUserId, searchQuery, skipCache, lastCreatedAt, limit }) => {
  try {
    const authHeaders = await getAuthHeaders();
    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";
    const url = new URL(`${API_BASE_URL}/api/posts/feed`);
    if (filterUserId) url.searchParams.append("filterUserId", filterUserId);
    if (searchQuery) url.searchParams.append("searchQuery", searchQuery);
    if (skipCache) url.searchParams.append("skipCache", "true");
    if (lastCreatedAt) url.searchParams.append("lastCreatedAt", lastCreatedAt);
    if (limit) url.searchParams.append("limit", limit);

    const response = await apiFetch(`/api/posts/feed?${url.searchParams.toString()}`, {
      headers: authHeaders,
    });
    return await response.json();
  } catch (error) {
    console.error("Error fetching feed:", error);
    return { success: false, message: error.message };
  }
};

/**
 * Kiểm tra xem có bài viết mới không
 */
export const checkNewPosts = async ({ since }) => {
  try {
    const authHeaders = await getAuthHeaders();
    const response = await apiFetch(`/api/posts/feed/check-new?since=${since}`, {
      headers: authHeaders,
    });
    return await response.json();
  } catch (error) {
    console.error("Error checking new posts:", error);
    return { success: false, message: error.message };
  }
};

/**
 * Thích / Bỏ thích bài viết
 */
export const likePost = async (postId, payload) => {
  try {
    const authHeaders = await getAuthHeaders();
    const response = await apiFetch(`/api/posts/${postId}/like`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(payload),
    });
    return await response.json();
  } catch (error) {
    console.error("Error liking post:", error);
    return { success: false, message: error.message };
  }
};

/**
 * Bình luận bài viết
 */
export const commentPost = async (postId, commentData) => {
  try {
    const authHeaders = await getAuthHeaders();
    const response = await apiFetch(`/api/posts/${postId}/comment`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(commentData),
    });
    return await response.json();
  } catch (error) {
    console.error("Error commenting on post:", error);
    return { success: false, message: error.message };
  }
};

/**
 * Xóa bình luận
 */
export const deleteComment = async (postId, commentId) => {
  try {
    const authHeaders = await getAuthHeaders();
    const response = await apiFetch(`/api/posts/${postId}/comment/${commentId}`, {
      method: "DELETE",
      headers: authHeaders,
    });
    return await response.json();
  } catch (error) {
    console.error("Error deleting comment:", error);
    return { success: false, message: error.message };
  }
};

/**
 * Thích / Bỏ thích bình luận
 */
export const likeComment = async (postId, commentId, payload) => {
  try {
    const authHeaders = await getAuthHeaders();
    const response = await apiFetch(`/api/posts/${postId}/comment/${commentId}/like`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(payload),
    });
    return await response.json();
  } catch (error) {
    console.error("Error liking comment:", error);
    return { success: false, message: error.message };
  }
};
