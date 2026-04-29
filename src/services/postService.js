const getApiBaseUrl = () => {
  return process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";
};

/**
 * Tạo bài viết mới
 */
export const createPost = async (postData) => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
export const deletePost = async (postId, uid) => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/posts/${postId}?uid=${uid}`, {
      method: "DELETE",
    });
    return await response.json();
  } catch (error) {
    console.error("Error deleting post:", error);
    return { success: false, message: error.message };
  }
};

/**
 * Lấy danh sách Feed
 */
export const getFeed = async ({ userUid, filterUserId, searchQuery, skipCache }) => {
  try {
    const url = new URL(`${getApiBaseUrl()}/api/posts/feed`);
    url.searchParams.append("userUid", userUid);
    if (filterUserId) url.searchParams.append("filterUserId", filterUserId);
    if (searchQuery) url.searchParams.append("searchQuery", searchQuery);
    if (skipCache) url.searchParams.append("skipCache", "true");

    const response = await fetch(url.toString());
    return await response.json();
  } catch (error) {
    console.error("Error fetching feed:", error);
    return { success: false, message: error.message };
  }
};

/**
 * Kiểm tra xem có bài viết mới không
 */
export const checkNewPosts = async ({ userUid, since }) => {
  try {
    const url = new URL(`${getApiBaseUrl()}/api/posts/feed/check-new`);
    url.searchParams.append("userUid", userUid);
    url.searchParams.append("since", since);

    const response = await fetch(url.toString());
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
    const response = await fetch(`${getApiBaseUrl()}/api/posts/${postId}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    const response = await fetch(`${getApiBaseUrl()}/api/posts/${postId}/comment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
export const deleteComment = async (postId, commentId, uid) => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/posts/${postId}/comment/${commentId}?uid=${uid}`, {
      method: "DELETE",
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
    const response = await fetch(`${getApiBaseUrl()}/api/posts/${postId}/comment/${commentId}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await response.json();
  } catch (error) {
    console.error("Error liking comment:", error);
    return { success: false, message: error.message };
  }
};
