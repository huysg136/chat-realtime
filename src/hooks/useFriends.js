import { useState, useEffect, useContext } from "react";
import { db } from "../firebase/config";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { AuthContext } from "../context/authProvider";

/**
 * Real-time hook for friend data.
 *
 * Returns:
 *   friends        — array of { docId, uid (the other user's uid), createdAt }
 *   receivedRequests — pending requests sent TO me
 *   sentRequests   — pending requests sent BY me
 *   loading        — boolean
 */
export function useFriends() {
  const { user } = useContext(AuthContext);
  const myUid = user?.uid;

  const [friends, setFriends] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!myUid) {
      setFriends([]);
      setReceivedRequests([]);
      setSentRequests([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // ── Friends ──────────────────────────────────────────────────────────
    const friendsQ = query(
      collection(db, "friends"),
      where("users", "array-contains", myUid)
    );
    const unsubFriends = onSnapshot(friendsQ, (snap) => {
      const list = snap.docs.map((d) => ({
        docId: d.id,
        uid: (d.data().users || []).find((u) => u !== myUid),
        createdAt: d.data().createdAt,
      })).filter((f) => f.uid);
      setFriends(list);
    });

    // ── Received requests (pending TO me) ────────────────────────────────
    const recvQ = query(
      collection(db, "friendRequests"),
      where("toUid", "==", myUid),
      where("status", "==", "pending")
    );
    const unsubRecv = onSnapshot(recvQ, (snap) => {
      setReceivedRequests(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      );
    });

    // ── Sent requests (pending FROM me) ─────────────────────────────────
    const sentQ = query(
      collection(db, "friendRequests"),
      where("fromUid", "==", myUid),
      where("status", "==", "pending")
    );
    const unsubSent = onSnapshot(sentQ, (snap) => {
      setSentRequests(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      );
      setLoading(false);
    });

    return () => {
      unsubFriends();
      unsubRecv();
      unsubSent();
    };
  }, [myUid]);

  return { friends, receivedRequests, sentRequests, loading };
}
