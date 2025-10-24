import React, { useState } from "react";
import { AuthContext } from "./authProvider";
import { useFirestore } from "../hooks/useFirestore";

export const AppContext = React.createContext();

export default function AppProvider({ children }) {
    const [isAddRoomVisible, setIsAddRoomVisible] = useState(false);
    const [isInviteMemberVisible, setIsInviteMemberVisible] = useState(false);
    const [selectedRoomId, setSelectedRoomId] = useState('');

    const { user } = React.useContext(AuthContext);
    
    const roomsCondition = React.useMemo(
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
        <AppContext.Provider value={{
            rooms,
            users,
            isAddRoomVisible,
            setIsAddRoomVisible,
            selectedRoomId,
            setSelectedRoomId,
            isInviteMemberVisible,
            setIsInviteMemberVisible,
        }}>
            {children}
        </AppContext.Provider>
    );
}
