import axios from "axios";

/**
 * Upload file trực tiếp lên R2 qua Presigned URL
 * @param {File} file - File cần upload
 * @param {Function} onProgress - Callback để track progress (optional)
 * @returns {Promise<string>} - URL của file đã upload
 */
export const uploadToR2 = async (file, onProgress) => {
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL
  try {
    // Bước 1: Lấy presigned URL từ backend
    const { data } = await axios.post(
      `${API_BASE_URL}/api/get-upload-url`,
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
    throw error;
  }
};