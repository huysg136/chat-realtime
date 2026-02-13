import { getPremiumLevel } from "./getPremiumLevel";
import { QUOTA_LIMIT } from "../configs/planConfigs";

// check quota limit của user
export function getQuotaLimit(user) {
  const level = getPremiumLevel(user);
  return QUOTA_LIMIT[level] ?? QUOTA_LIMIT.free;
}

// check user còn đủ quota để upload không
export function hasEnoughQuota(user, fileSizeBytes) {
  const used = user.quotaUsed || 0;
  const limit = getQuotaLimit(user);
  return used + fileSizeBytes <= limit;
}

// tính % quota của user đã dùng
export function getQuotaPercent(user) {
  const used = user.quotaUsed || 0;
  const limit = getQuotaLimit(user);
  // vượt limit thì 100%
  if (used > 0 && (limit <= 0 || used >= limit)) {
    return 100;
  }
  if (limit === 0) return 0;
  // tính %
  const percent = (used / limit) * 100;
  // parseFloat để trả về number not string
  return Math.min(100, parseFloat(percent.toFixed(2))); 
}

// format bytes -> kb/mb/gb
export function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 MB";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// cộng quota sau khi user upload
export async function increaseQuota(userDocId, fileSizeBytes) {
  const { db } = await import("../firebase/config");
  const { doc, updateDoc, increment } = await import("firebase/firestore");

  await updateDoc(doc(db, "users", userDocId), {
    quotaUsed: increment(fileSizeBytes),
  });
}

// giảm quota khi user xóa file (chưa sử dụng)
export async function decreaseQuota(userDocId, fileSizeBytes) {
  const { db } = await import("../firebase/config");
  const { doc, updateDoc, increment } = await import("firebase/firestore");

  await updateDoc(doc(db, "users", userDocId), {
    quotaUsed: increment(-fileSizeBytes),
  });
}