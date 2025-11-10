import axios from "axios";
import { toast } from "react-toastify";

export async function askGemini(prompt) {
  if (!prompt || !prompt.trim()) return "Bạn muốn hỏi gì? 🫠";

  try {
    const res = await axios.post(
      "https://chat-realtime-be.vercel.app/api/ask-gemini",
      { prompt },
      { timeout: 30000 }    
    );

    if (res?.data?.answer) return res.data.answer;

    if (res?.data?.error) {
      console.error("Backend Gemini error:", res.data.error);
      return "Bot không trả lời được 🫠";
    }

    return "Bot không trả lời được 🫠";

  } catch (err) {
    if (err.code === "ECONNABORTED") {
      console.error("Timeout khi gọi backend Gemini:", err.message);
      toast.error("Bot phản hồi quá chậm 🫠");
      return "Bot phản hồi quá chậm 🫠";
    }

    if (err.response?.data?.error) {
      console.error("Gemini API error:", err.response.data.error);
    } else {
      console.error("Error calling backend Gemini:", err);
    }

    return "Bot không trả lời được 🫠";
  }
}
