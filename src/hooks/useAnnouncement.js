import { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { doc, collection, query, where, onSnapshot, arrayUnion, updateDoc } from "firebase/firestore";

export function useAnnouncement(user, pathname) {
  const [isAnnouncementVisible, setIsAnnouncementVisible] = useState(false);
  const [currentAnnouncement, setCurrentAnnouncement] = useState(null);

  // Ẩn announcement khi vào trang admin
  useEffect(() => {
    if (pathname.startsWith("/admin")) {
      setIsAnnouncementVisible(false);
    }
  }, [pathname]);

  // Lắng nghe announcement chưa xem
  useEffect(() => {
    const isAdminPage = pathname.startsWith("/admin");
    const isEligibleUser = user?.uid && ["user", "moderator"].includes(user?.role);

    if (!isEligibleUser || isAdminPage) return;

    const q = query(collection(db, "announcements"), where("isShow", "==", true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const announcements = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      const unseenAnnouncement = announcements.find((ann) => {
        const hasSeen = ann.hasSeenBy?.includes(user.uid) || false;
        const isTargeted = ann.targetUids ? ann.targetUids.includes(user.uid) : true;
        return !hasSeen && isTargeted;
      });

      if (unseenAnnouncement) {
        setCurrentAnnouncement(unseenAnnouncement);
        setIsAnnouncementVisible(true);
      } else {
        setCurrentAnnouncement(null);
        setIsAnnouncementVisible(false);
      }
    });

    return () => unsubscribe();
  }, [user?.uid, user?.role, pathname]);

  const markAnnouncementAsSeen = async (announcementId) => {
    if (!user?.uid) return;
    try {
      await updateDoc(doc(db, "announcements", announcementId), {
        hasSeenBy: arrayUnion(user.uid),
      });
    } catch (error) {
      console.error("[useAnnouncement] markAnnouncementAsSeen failed:", error);
    }
  };

  return {
    isAnnouncementVisible,
    setIsAnnouncementVisible,
    currentAnnouncement,
    markAnnouncementAsSeen,
  };
}
