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

/** Send a friend request. Returns the new request doc id, or null if already exists. */
export const sendFriendRequest = async (fromUid, toUid) => {
  if (!fromUid || !toUid || fromUid === toUid) return null;

  // Prevent duplicate
  const q = query(
    collection(db, "friendRequests"),
    where("fromUid", "==", fromUid),
    where("toUid", "==", toUid),
    where("status", "==", "pending"),
    limit(1)
  );
  const snap = await getDocs(q);
  if (!snap.empty) return snap.docs[0].id;

  const ref = await addDoc(collection(db, "friendRequests"), {
    fromUid,
    toUid,
    status: "pending",
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

/** Cancel / retract a sent friend request by fromUid+toUid */
export const cancelFriendRequest = async (fromUid, toUid) => {
  const q = query(
    collection(db, "friendRequests"),
    where("fromUid", "==", fromUid),
    where("toUid", "==", toUid),
    where("status", "==", "pending"),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return false;
  await deleteDoc(snap.docs[0].ref);
  return true;
};

/** Accept a friend request by requestId. Creates the friends doc. */
export const acceptFriendRequest = async (requestId, fromUid, myUid) => {
  // Update request status
  await updateDoc(doc(db, "friendRequests", requestId), {
    status: "accepted",
    updatedAt: serverTimestamp(),
  });

  // Create friends relationship (check not already exists)
  const pk = pairKey(fromUid, myUid);
  const fQ = query(
    collection(db, "friends"),
    where("pairKey", "==", pk),
    limit(1)
  );
  const fSnap = await getDocs(fQ);
  if (fSnap.empty) {
    await addDoc(collection(db, "friends"), {
      users: [fromUid, myUid].sort(),
      pairKey: pk,
      createdAt: serverTimestamp(),
    });
  }
  return true;
};

/** Reject a friend request by requestId */
export const rejectFriendRequest = async (requestId) => {
  await updateDoc(doc(db, "friendRequests", requestId), {
    status: "rejected",
    updatedAt: serverTimestamp(),
  });
  return true;
};

/** Remove friendship between two users */
export const unfriend = async (myUid, targetUid) => {
  const pk = pairKey(myUid, targetUid);
  const q = query(
    collection(db, "friends"),
    where("pairKey", "==", pk),
    limit(1)
  );
  const snap = await getDocs(q);
  if (!snap.empty) await deleteDoc(snap.docs[0].ref);
  return true;
};
