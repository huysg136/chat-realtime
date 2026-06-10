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
    });

    // Bước 2: Upload trực tiếp lên R2 (không cần x-api-key cho R2)
    await apiClient.put(data.uploadUrl, file, {
      baseURL: "", // override baseURL vì đây là URL của R2, không phải backend
      headers: { "Content-Type": file.type, "x-api-key": undefined },
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
