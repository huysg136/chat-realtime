const getApiBaseUrl = () => {
  return process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";
};

/**
 * Gửi thông báo báo cáo vi phạm qua email
 */
export const notifyReportAction = async (payload) => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/mail/notify-report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await response.json();
  } catch (error) {
    console.error("Error notifying report action:", error);
    return { success: false, message: error.message };
  }
};

/**
 * Gửi email chào mừng người dùng mới
 */
export const notifyNewUser = async (payload) => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/mail/notify-new-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await response.json();
  } catch (error) {
    console.error("Error sending welcome email:", error);
    return { success: false, message: error.message };
  }
};
