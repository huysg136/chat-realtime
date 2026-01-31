import axios from "axios";

/**
 * Upload file trực tiếp lên R2 qua Presigned URL
 * @param {File} file - File cần upload
 * @param {Function} onProgress - Callback để track progress (optional)
 * @returns {Promise<string>} - URL của file đã upload
 */
export const uploadToR2 = async (file, onProgress) => {
  try {
    // Bước 1: Lấy presigned URL từ backend
    const { data } = await axios.post(
      "https://chat-realtime-be.vercel.app/api/get-upload-url",
      {
        fileName: file.name,
        fileType: file.type,
      }
    );

    // Bước 2: Upload trực tiếp lên R2
    await axios.put(data.uploadUrl, file, {
      headers: {
        "Content-Type": file.type,
      },
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
    console.error("Upload to R2 error:", error);
    throw error;
  }
};