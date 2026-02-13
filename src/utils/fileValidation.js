import { toast } from "react-toastify";
import { getPremiumLevel } from "./getPremiumLevel";
import { planConfigs, FILE_SIZE_LIMIT } from "../configs/planConfigs";


// format size
export const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

// lấy limit file của user
export const getFileSizeLimit = (user) => {
  const level = getPremiumLevel(user);
  return FILE_SIZE_LIMIT[level] ?? FILE_SIZE_LIMIT.free;
};


/**
 * Validate file trước khi upload
 * @param {File} file
 * @param {Object} user - user object từ AuthContext (có premiumLevel)
 */

export const validateFile = (file, user) => {

  if (!file) {
    toast.error("Không có file nào được chọn");
    return false;
  }

  // Kiểm tra tên file
  if (file.name.length > 255) {
    toast.error("Tên file quá dài (tối đa 255 ký tự)");
    return false;
  }

  // Kiểm tra kích thước theo plan
  const maxSize = getFileSizeLimit(user);
  const level = getPremiumLevel(user);
  const limitLabel = planConfigs.fileLimits[level];

  if (file.size > maxSize) {
    const planLabel = {
      free: "Free",
      lite: "Lite",
      pro: "Pro",
      max: "Max",
    }[level];

    toast.error(
      `File (${formatFileSize(file.size)}) vượt giới hạn ${limitLabel} của gói ${planLabel}!`,
    );

    return false;
  }

  return true;
};