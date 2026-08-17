import { useEffect } from "react";
import { db } from "../firebase/config";
import { doc, collection, query, where, onSnapshot, arrayUnion, updateDoc } from "firebase/firestore";
import { useModalStore } from "../stores/useModalStore";

export function useAnnouncement(user, pathname) {
  const isAnnouncementVisible = useModalStore((s) => s.isAnnouncementVisible);
  const setIsAnnouncementVisible = useModalStore((s) => s.setIsAnnouncementVisible);
  const currentAnnouncement = useModalStore((s) => s.currentAnnouncement);
  const setCurrentAnnouncement = useModalStore((s) => s.setCurrentAnnouncement);

  // Ẩn announcement khi vào trang admin
  useEffect(() => {
    if (pathname && pathname.startsWith("/admin")) {
      setIsAnnouncementVisible(false);
    }
  }, [pathname, setIsAnnouncementVisible]);

  // Lắng nghe announcement chưa xem
  useEffect(() => {
    const isAdminPage = pathname && pathname.startsWith("/admin");
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
  }, [user?.uid, user?.role, pathname, setCurrentAnnouncement, setIsAnnouncementVisible]);

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
