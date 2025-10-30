import React, { useState, useContext, useMemo } from "react";
import { AuthContext } from "./authProvider";
import { useFirestore } from "../hooks/useFirestore";
import { db } from "../firebase/config";

export const AppContext = React.createContext();

export default function AppProvider({ children }) {
  const [isAddRoomVisible, setIsAddRoomVisible] = useState(false);
  const [isInviteMemberVisible, setIsInviteMemberVisible] = useState(false);
  const [isProfileVisible, setIsProfileVisible] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [searchText, setSearchText] = useState("");
  const [theme, setTheme] = useState("light"); 

  const { user } = useContext(AuthContext);

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
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
