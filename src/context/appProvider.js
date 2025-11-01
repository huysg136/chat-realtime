import React, { useState, useContext, useMemo, useEffect } from "react";
import { AuthContext } from "./authProvider";
import { useFirestore } from "../hooks/useFirestore";
import { db } from "../firebase/config";
import { useLocation } from "react-router-dom";
import { doc, onSnapshot, collection, query, where, arrayUnion, updateDoc } from "firebase/firestore";

export const AppContext = React.createContext();

export default function AppProvider({ children }) {
  const [isAddRoomVisible, setIsAddRoomVisible] = useState(false);
  const [isInviteMemberVisible, setIsInviteMemberVisible] = useState(false);
  const [isProfileVisible, setIsProfileVisible] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [searchText, setSearchText] = useState("");
  const [theme, setTheme] = useState("system");
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [isAnnouncementVisible, setIsAnnouncementVisible] = useState(false);
  const [currentAnnouncement, setCurrentAnnouncement] = useState(null);
  const location = useLocation();

  const { user } = useContext(AuthContext);
  
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", "appStatus"), (snap) => {
      const maintenance = snap.exists() ? snap.data().maintenance : false;
      setIsMaintenance(maintenance);
    });

    return () => unsub();
  }, []);

  const roomsCondition = useMemo(
    () => ({
      fieldName: "members",
      operator: "array-contains",
      compareValue: user?.uid,
    }),
    [user?.uid]
  );

  const rooms = useFirestore("rooms", roomsCondition);
  const users = useFirestore("users");

  useEffect(() => {
    if (location.pathname.startsWith("/admin")) {
      setIsAnnouncementVisible(false);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (
      !user?.uid ||
      !["user", "moderator"].includes(user.role) ||
      location.pathname.startsWith("/admin")
    ) {
      return;
    }

    const q = query(collection(db, "announcements"), where("isShow", "==", true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const announcements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const unseenAnnouncement = announcements.find(ann => {
        const hasSeen = ann.hasSeenBy?.includes(user.uid) || false;
        const isTargeted = ann.targetUids ? ann.targetUids.includes(user.uid) : true; 
        console.log(`Announcement ${ann.id}: hasSeen=${hasSeen}, isTargeted=${isTargeted}, isShow=${ann.isShow}`);
        return !hasSeen && isTargeted;
      });


      if (unseenAnnouncement) {
        setCurrentAnnouncement(unseenAnnouncement);
        setIsAnnouncementVisible(true);
      } else {
        setIsAnnouncementVisible(false);
        setCurrentAnnouncement(null);
      }
    });

    return () => unsubscribe();
  }, [user?.uid, user?.role, location.pathname]);

  const markAnnouncementAsSeen = async (announcementId) => {
    if (!user?.uid) return;

    try {
      await updateDoc(doc(db, "announcements", announcementId), {
        hasSeenBy: arrayUnion(user.uid)
      });
    } catch (error) {
    }
  };

  return (
    <AppContext.Provider
      value={{
        rooms,
        users,
        isAddRoomVisible,
        setIsAddRoomVisible,
        selectedRoomId,
        setSelectedRoomId,
        isInviteMemberVisible,
        setIsInviteMemberVisible,
        isProfileVisible,
        setIsProfileVisible,
        isSettingsVisible,
        setIsSettingsVisible,
        searchText,
        setSearchText,
        theme,
        setTheme,
        isMaintenance,
        isAnnouncementVisible,
        setIsAnnouncementVisible,
        currentAnnouncement,
        markAnnouncementAsSeen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
