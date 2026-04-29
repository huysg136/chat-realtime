const getApiBaseUrl = () => {
  return process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";
};

/**
 * Lấy số lượng thông báo chưa đọc
 */
export const getUnreadNotificationCount = async (uid) => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/friends/notifications/unread-count?uid=${uid}`);
    return await response.json();
  } catch (error) {
    console.error("Error fetching unread count:", error);
    return { success: false, count: 0 };
  }
};

/**
 * Đánh dấu tất cả thông báo là đã đọc
 */
export const markAllNotificationsAsRead = async (uid) => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/friends/notifications/read-all`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid }),
    });
    return await response.json();
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return { success: false, message: error.message };
  }
};

/**
 * Đánh dấu một thông báo cụ thể là đã đọc
 */
export const markNotificationAsRead = async (notifId, uid) => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/friends/notifications/${notifId}/read?uid=${uid}`, {
      method: "PATCH",
    });
    return await response.json();
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return { success: false, message: error.message };
  }
};
