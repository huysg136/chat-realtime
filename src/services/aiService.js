import { apiClient } from "../configs/apiClient";
import { toast } from "react-toastify";

export async function askGemini(prompt) {
  if (!prompt || !prompt.trim()) return "Bạn muốn hỏi gì? 🫠";

  try {
    const res = await apiClient.post("/api/ask-gemini", { prompt });

    if (res?.data?.answer) return res.data.answer;
    return "Bot không trả lời được 🫠";
  } catch (err) {
    if (err.code === "ECONNABORTED") {
      toast.error("Bot phản hồi quá chậm 🫠");
      return "Bot phản hồi quá chậm 🫠";
    }
    return "Bot không trả lời được 🫠";
  }
}

export async function askGroq(prompt) {
  if (!prompt || !prompt.trim()) return "Bạn muốn hỏi gì? 🫠";

  try {
    const res = await apiClient.post("/api/ask-groq", { prompt });

    if (res?.data?.answer) return res.data.answer;
    return "Bot không trả lời được 🫠";
  } catch (err) {
    if (err.code === "ECONNABORTED") {
      toast.error("Bot phản hồi quá chậm 🫠");
      return "Bot phản hồi quá chậm 🫠";
    }
    return "Bot không trả lời được 🫠";
  }
}
