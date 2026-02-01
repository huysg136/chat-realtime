// src/hooks/useUserData.js
import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";
import { getUserDocIdByUid } from "../firebase/services";

const defaultAvatar = "https://images.spiderum.com/sp-images/9ae85f405bdf11f0a7b6d5c38c96eb0e.jpeg";

export function useUserData(uid) {
  const [role, setRole] = useState();
  const [displayName, setDisplayName] = useState();
  const [photoURL, setPhotoURL] = useState(defaultAvatar);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    } 
    let unsubscribe;
    const fetchDocIdAndSubscribe = async () => {
      setLoading(true);
      const docId = await getUserDocIdByUid(uid);
      if (!docId) {
        setLoading(false);
        return;
      } 
      // tạo ref đến document
      const userRef = doc(db, "users", docId);
      // lắng nghe document realtime
      unsubscribe = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setDisplayName(data.displayName);
          setRole(data.role);
          setPhotoURL(data.photoURL || defaultAvatar);
        }
        setLoading(false);
      });
    };

    void fetchDocIdAndSubscribe();

    // hủy subscribe khi component unmount
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [uid]); 

  return { role, photoURL, displayName, loading };
}