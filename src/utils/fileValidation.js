import { toast } from "react-toastify";

// GIỚI HẠN FILE SIZE - 20MB cho TẤT CẢ
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 20MB

// Format file size thành dạng dễ đọc
export const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

// Validate file trước khi upload
export const validateFile = (file) => {
  if (!file) {
    toast.error("Không có file nào được chọn");
    return false;
  }

  // Kiểm tra kích thước - 10MB cho TẤT CẢ file types
  if (file.size > MAX_FILE_SIZE) {
    toast.error(
      `Rất tiếc! File của bạn (${formatFileSize(file.size)}) vượt quá giới hạn 10MB để duy trì hệ thống ổn định.`
    );
    return false;
  }

  // Kiểm tra tên file
  if (file.name.length > 255) {
    toast.error("Tên file quá dài (tối đa 255 ký tự)");
    return false;
  }

  return true;
};