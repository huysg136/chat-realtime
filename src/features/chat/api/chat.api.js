import { apiClient } from "../../../shared/api/apiClient";

/**
 * Gửi trạng thái đang gõ (start/stop) cho một room chat
 * @param {string} roomId 
 * @param {"start"|"stop"} action 
 */
export async function sendTypingStatus(roomId, action) {
  if (!roomId || !["start", "stop"].includes(action)) return;

  try {
    const res = await apiClient.post("/api/typing", { roomId, action });
    return res.data;
  } catch (error) {
    console.error("[sendTypingStatus] error:", error);
    return null;
  }
}

/**
 * Lấy danh sách UID người dùng đang gõ trong room chat
 * @param {string} roomId 
 * @returns {Promise<string[]>} Danh sách UIDs đang gõ (loại trừ chính mình)
 */
export async function getTypingUsers(roomId) {
  if (!roomId) return [];

  try {
    const res = await apiClient.get("/api/typing", {
      params: { roomId },
    });
    return res.data?.typingUids || [];
  } catch (error) {
    console.error("[getTypingUsers] error:", error);
    return [];
  }
}
