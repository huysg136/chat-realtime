import { db } from "../firebase/config";
import {
  collection,
  query,
  where,
  getDocs,
  limit,
} from "firebase/firestore";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Tạo pairKey chuẩn từ 2 uid để [A,B] === [B,A] */
const makePairKey = (uid1, uid2) => [uid1, uid2].sort().join("_");

const getApiBaseUrl = () =>
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Trả về trạng thái bạn bè giữa 2 người dùng.
 * Dùng Promise.all để 3 query chạy SONG SONG thay vì tuần tự.
 * Dùng pairKey để tránh bug limit(20) khi user có nhiều bạn.
 *
 * @returns {"none"|"pending_sent"|"pending_received"|"friends"}
 */
export const getFriendshipStatus = async (myUid, targetUid) => {
  if (!myUid || !targetUid || myUid === targetUid) return "none";

  const key = makePairKey(myUid, targetUid);

  // 3 query chạy song song — nhanh hơn ~3x so với tuần tự
  const [fSnap, sentSnap, recvSnap] = await Promise.all([
    // 1. Kiểm tra đã là bạn chưa (dùng pairKey, chính xác 100%)
    getDocs(
      query(
        collection(db, "friends"),
        where("pairKey", "==", key),
        limit(1)
      )
    ),
    // 2. Kiểm tra mình đã gửi lời mời chưa
    getDocs(
      query(
        collection(db, "friendRequests"),
        where("fromUid", "==", myUid),
        where("toUid", "==", targetUid),
        where("status", "==", "pending"),
        limit(1)
      )
    ),
    // 3. Kiểm tra mình có đang nhận lời mời không
    getDocs(
      query(
        collection(db, "friendRequests"),
        where("fromUid", "==", targetUid),
        where("toUid", "==", myUid),
        where("status", "==", "pending"),
        limit(1)
      )
    ),
  ]);

  if (!fSnap.empty) return "friends";
  if (!sentSnap.empty) return "pending_sent";
  if (!recvSnap.empty) return "pending_received";
  return "none";
};

/** Lấy danh sách uid bạn bè của một user */
export const getFriendUids = async (myUid) => {
  if (!myUid) return [];

  const q = query(
    collection(db, "friends"),
    where("users", "array-contains", myUid)
  );

  const snap = await getDocs(q);
  return snap.docs
    .map((d) => {
      const users = d.data().users || [];
      return users.find((u) => u !== myUid);
    })
    .filter(Boolean);
};

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Gửi lời mời kết bạn.
 * @returns {string|null} requestId nếu thành công, null nếu thất bại
 * @throws {Error} ném lỗi để caller tự quyết định xử lý UI
 */
export const sendFriendRequest = async (fromUid, toUid) => {
  if (!fromUid || !toUid || fromUid === toUid) return null;

  try {
    const res = await fetch(`${getApiBaseUrl()}/api/friends/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromUid, toUid }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    return data.success ? data.requestId : null;
  } catch (error) {
    console.error("[sendFriendRequest] failed:", error);
    throw error;
  }
};

/**
 * Hủy lời mời kết bạn đã gửi.
 * @returns {boolean}
 * @throws {Error}
 */
export const cancelFriendRequest = async (fromUid, toUid) => {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/friends/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromUid, toUid }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    return data.success;
  } catch (error) {
    console.error("[cancelFriendRequest] failed:", error);
    throw error;
  }
};

/**
 * Chấp nhận lời mời kết bạn.
 * @returns {boolean}
 * @throws {Error}
 */
export const acceptFriendRequest = async (requestId, fromUid, myUid) => {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/friends/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, fromUid, myUid }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    return data.success;
  } catch (error) {
    console.error("[acceptFriendRequest] failed:", error);
    throw error;
  }
};

/**
 * Từ chối lời mời kết bạn.
 * @returns {boolean}
 * @throws {Error}
 */
export const rejectFriendRequest = async (requestId) => {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/friends/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    return data.success;
  } catch (error) {
    console.error("[rejectFriendRequest] failed:", error);
    throw error;
  }
};

/**
 * Hủy kết bạn.
 * @returns {boolean}
 * @throws {Error}
 */
export const unfriend = async (myUid, targetUid) => {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/friends/unfriend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ myUid, targetUid }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    return data.success;
  } catch (error) {
    console.error("[unfriend] failed:", error);
    throw error;
  }
};

/**
 * Lấy danh sách gợi ý kết bạn từ backend (đã có cache Redis).
 * @returns {{ success: boolean, suggestions: Array }}
 */
export const getFriendSuggestions = async (uid) => {
  if (!uid) return { success: false, suggestions: [] };

  try {
    const res = await fetch(
      `${getApiBaseUrl()}/api/friends/suggestions?uid=${uid}`
    );

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    return await res.json();
  } catch (error) {
    console.error("[getFriendSuggestions] failed:", error);
    return { success: false, suggestions: [] };
  }
};