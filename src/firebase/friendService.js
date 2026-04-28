import {
  db
} from "./config";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
  limit,
  orderBy,
} from "firebase/firestore";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Sorted pair key so [A,B] === [B,A] */
const pairKey = (uid1, uid2) => [uid1, uid2].sort().join("_");

// ─── Read ────────────────────────────────────────────────────────────────────

/**
 * Returns the friendship status between two users.
 * @returns {"none"|"pending_sent"|"pending_received"|"friends"}
 */
export const getFriendshipStatus = async (myUid, targetUid) => {
  if (!myUid || !targetUid || myUid === targetUid) return "none";

  // Check friends
  const fQ = query(
    collection(db, "friends"),
    where("users", "array-contains", myUid),
    limit(20)
  );
  const fSnap = await getDocs(fQ);
  const isFriend = fSnap.docs.some((d) => {
    const users = d.data().users || [];
    return users.includes(targetUid);
  });
  if (isFriend) return "friends";

  // Check outgoing pending request
  const sentQ = query(
    collection(db, "friendRequests"),
    where("fromUid", "==", myUid),
    where("toUid", "==", targetUid),
    where("status", "==", "pending"),
    limit(1)
  );
  const sentSnap = await getDocs(sentQ);
  if (!sentSnap.empty) return "pending_sent";

  // Check incoming pending request
  const recvQ = query(
    collection(db, "friendRequests"),
    where("fromUid", "==", targetUid),
    where("toUid", "==", myUid),
    where("status", "==", "pending"),
    limit(1)
  );
  const recvSnap = await getDocs(recvQ);
  if (!recvSnap.empty) return "pending_received";

  return "none";
};

/** Fetch friend uids of a user */
export const getFriendUids = async (myUid) => {
  const q = query(
    collection(db, "friends"),
    where("users", "array-contains", myUid)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const users = d.data().users || [];
    return users.find((u) => u !== myUid);
  }).filter(Boolean);
};

// ─── Write ───────────────────────────────────────────────────────────────────

const getApiBaseUrl = () => {
  return process.env.REACT_APP_API_BASE_URL || "http://localhost:3000";
};

/** Send a friend request. Returns the new request doc id, or null if already exists. */
export const sendFriendRequest = async (fromUid, toUid) => {
  if (!fromUid || !toUid || fromUid === toUid) return null;

  try {
    const response = await fetch(`${getApiBaseUrl()}/api/friends/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromUid, toUid }),
    });
    const data = await response.json();
    return data.success ? data.requestId : null;
  } catch (error) {
    return null;
  }
};

/** Cancel / retract a sent friend request by fromUid+toUid */
export const cancelFriendRequest = async (fromUid, toUid) => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/friends/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromUid, toUid }),
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    return false;
  }
};

/** Accept a friend request by requestId. Creates the friends doc. */
export const acceptFriendRequest = async (requestId, fromUid, myUid) => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/friends/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, fromUid, myUid }),
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    return false;
  }
};

/** Reject a friend request by requestId */
export const rejectFriendRequest = async (requestId) => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/friends/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId }),
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    return false;
  }
};

/** Remove friendship between two users */
export const unfriend = async (myUid, targetUid) => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/friends/unfriend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ myUid, targetUid }),
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    return false;
  }
};

