import axios from "axios";
import { apiClient } from "../configs/apiClient";

/**
 * Upload file trực tiếp lên R2 qua Presigned URL
 * @param {File} file - File cần upload
 * @param {string} folder - Thư mục đích trên R2
 * @param {Function} onProgress - Callback để track progress (optional)
 * @returns {Promise<string>} - URL của file đã upload
 */
export const uploadToR2 = async (file, folder = "uploads", onProgress) => {
  try {
    // Bước 1: Lấy presigned URL từ backend
    const { data } = await apiClient.post("/api/get-upload-url", {
      fileName: file.name,
      fileType: file.type,
      folder: folder,
      fileSize: file.size,
    });

    // Bước 2: Upload trực tiếp lên R2 bằng axios nguyên gốc để không bị dính Authorization header
    await axios.put(data.uploadUrl, file, {
      headers: { "Content-Type": file.type },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(progress);
        }
      },
    });

    // Trả về URL public của file
    return data.fileUrl;
  } catch (error) {
    throw error;
  }
};
