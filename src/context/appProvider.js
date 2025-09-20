import React from 'react';
import { useNavigate } from 'react-router-dom';
import app from "../firebase/config";
import { getAuth } from "firebase/auth";
import { AuthContext } from './authProvider';
import { useFirestore } from '../hooks/useFirestore';

export const AppContext = React.createContext();

export default function AppProvider({ children }) {
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

    return (
        <AppContext.Provider value={{ rooms }}>
            {children}
        </AppContext.Provider>
    );
}
