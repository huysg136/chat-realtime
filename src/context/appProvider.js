import React, { useState, useContext, useMemo, useEffect } from "react";
import { AuthContext } from "./authProvider";
import { useFirestore } from "../hooks/useFirestore";
import { db } from "../firebase/config";
import { doc, onSnapshot } from "firebase/firestore";

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
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
