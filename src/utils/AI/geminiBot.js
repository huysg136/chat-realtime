import axios from "axios";
import { toast } from "react-toastify";

export async function askGemini(prompt) {
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL
  if (!prompt || !prompt.trim()) return "Bạn muốn hỏi gì? 🫠";

  try {
    const res = await axios.post(
      `${API_BASE_URL}/api/ask-gemini`,
      { prompt },
      { timeout: 30000 }    
    );

    if (res?.data?.answer) return res.data.answer;

    if (res?.data?.error) {
      return "Bot không trả lời được 🫠";
    }

    return "Bot không trả lời được 🫠";

  } catch (err) {
    if (err.code === "ECONNABORTED") {
      toast.error("Bot phản hồi quá chậm 🫠");
      return "Bot phản hồi quá chậm 🫠";
    }

    return "Bot không trả lời được 🫠";
  }
}
