import React from 'react';
import { useNavigate } from 'react-router-dom';
import app from "../firebase/config";
import { getAuth } from "firebase/auth";
import { Spin } from 'antd';

export const AuthContext = React.createContext();
const auth = getAuth(app);

export default function AuthProvider({ children }) {
    const [user, setUser] = React.useState(null);
    const navigate = useNavigate();
    const [ isLoading, setIsLoading ] = React.useState(true);

        React.useEffect(() => {
            const unsubscribe = auth.onAuthStateChanged((user) => {
                if (user) {
                    const { displayName, email, photoURL, uid } = user;
                    setUser({ displayName, email, photoURL, uid });
                    navigate('/');
                    setIsLoading(false);
                } else {
                    navigate('/login');
                    setUser(null);
                    setIsLoading(false);
                }
            });

            return () => unsubscribe();
        }, [navigate]);

    return (
        <AuthContext.Provider value={{ user }}>
            {isLoading ? <Spin /> : children}
        </AuthContext.Provider>
    );
}
