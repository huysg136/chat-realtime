import './App.css';
import { BrowserRouter, Routes } from 'react-router-dom';
import './i18n/config';
import { useContext, useEffect } from 'react';
import { ref, set } from 'firebase/database';
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import AuthProvider, { AuthContext } from './context/authProvider';
import AppProvider from './context/appProvider';
import useApplyTheme from './hooks/useApplyTheme';
import { rtdb } from './firebase/config';
import { getUserDocIdByUid } from './firebase/services';

import { renderPublicRoutes, renderUserRoutes, renderAdminRoutes } from './routes/router';

import ModalManager from './context/modalManager';

function ThemeWrapper({ children }) {
  const { user } = useContext(AuthContext);
  useApplyTheme(user?.theme);

  useEffect(() => {
    const updateStatus = async (isOnline) => {
      if (!user) return;

      const userDocId = await getUserDocIdByUid(user.uid);
      if (!userDocId) return;

      const statusRef = ref(rtdb, `userStatuses/${userDocId}`);
      const now = Date.now();

      try {
        await set(statusRef, {
          lastOnline: now,
          lastHeartbeat: now,
          isOnline,
        });
      } catch (error) {
        console.error('Error updating status:', error);
      }
    };

    const handleOffline = () => updateStatus(false);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        updateStatus(false);
      } else {
        updateStatus(true);
      }
    };

    window.addEventListener("beforeunload", handleOffline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user]);

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {renderPublicRoutes()}
      {renderUserRoutes()}
      {renderAdminRoutes()}
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <ThemeWrapper>
            <ToastContainer
              position="top-right"
              autoClose={2000}
              toastClassName="small-toast"
            />
            <AppRoutes />
            <ModalManager />
          </ThemeWrapper>
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;