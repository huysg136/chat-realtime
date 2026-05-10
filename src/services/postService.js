import { getAuth } from "firebase/auth";
import app from "../firebase/config";

const auth = getAuth(app);

const getApiBaseUrl = () => {
  return process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";
};

const getAuthHeaders = async () => {
  const user = auth.currentUser;
  if (!user) return { "Content-Type": "application/json" };
  const token = await user.getIdToken();
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  };
};

/**
 * Tạo bài viết mới
 */
export const createPost = async (postData) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${getApiBaseUrl()}/api/posts`, {
      method: "POST",
      headers,
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
    const headers = await getAuthHeaders();
    const response = await fetch(`${getApiBaseUrl()}/api/posts/${postId}`, {
      method: "DELETE",
      headers,
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
    const headers = await getAuthHeaders();
    const response = await fetch(`${getApiBaseUrl()}/api/posts/${postId}`, {
      method: "PUT",
      headers,
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
    const headers = await getAuthHeaders();
    const url = new URL(`${getApiBaseUrl()}/api/posts/feed`);
    if (filterUserId) url.searchParams.append("filterUserId", filterUserId);
    if (searchQuery) url.searchParams.append("searchQuery", searchQuery);
    if (skipCache) url.searchParams.append("skipCache", "true");
    if (lastCreatedAt) url.searchParams.append("lastCreatedAt", lastCreatedAt);
    if (limit) url.searchParams.append("limit", limit);

    const response = await fetch(url.toString(), { headers });
    return await response.json();
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
    const headers = await getAuthHeaders();
    const url = new URL(`${getApiBaseUrl()}/api/posts/feed/check-new`);
    url.searchParams.append("since", since);

    const response = await fetch(url.toString(), { headers });
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
    const headers = await getAuthHeaders();
    const response = await fetch(`${getApiBaseUrl()}/api/posts/${postId}/like`, {
      method: "POST",
      headers,
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
    const headers = await getAuthHeaders();
    const response = await fetch(`${getApiBaseUrl()}/api/posts/${postId}/comment`, {
      method: "POST",
      headers,
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
    const headers = await getAuthHeaders();
    const response = await fetch(`${getApiBaseUrl()}/api/posts/${postId}/comment/${commentId}`, {
      method: "DELETE",
      headers,
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
    const headers = await getAuthHeaders();
    const response = await fetch(`${getApiBaseUrl()}/api/posts/${postId}/comment/${commentId}/like`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    return await response.json();
  } catch (error) {
    console.error("Error liking comment:", error);
    return { success: false, message: error.message };
  }
};
