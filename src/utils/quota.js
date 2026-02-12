import { getPremiumLevel } from "./getPremiumLevel";

export const QUOTA_LIMIT = {
  free: 0 * 1024 * 1024,          // 200 MB
  lite: 2 * 1024 * 1024 * 1024,     // 2 GB
  pro: 10 * 1024 * 1024 * 1024,    // 10 GB
  max: 30 * 1024 * 1024 * 1024,    // 30 GB
};

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
  return Math.min(100, Math.round((used / limit) * 100));
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