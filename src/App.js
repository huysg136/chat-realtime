import './App.css';
import ChatRoom from './components/chatRoom';
import Login from './components/login';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthProvider from './context/authProvider';
import AppProvider from './context/appProvider';
import AddRoomModal from './components/modals/addRoomModal';
import InviteMemberModal from './components/modals/inviteMemberModal';
import ProfileModal from './components/modals/profileModal';
import PrivateRoute from './routes/privateRoute';
import AdminLayout from './admin/adminLayout/adminLayout';
import Dashboard from './admin/dashboard/dashboard';
import UsersManager from './admin/userManager/userManager';
import RoomsManager from './admin/roomManager/roomManager';
import AnnouncementManager from './admin/announcementManager/announcementManager';
import AdminSettings from './admin/adminSettings/adminSettings';
import MaintenancePage from './components/maintenancePage/maintenancePage';
import SettingsModal from './components/modals/settingsModal';
import AnnouncementModal from './components/modals/announcementModal';
import ModPermissionManager from './admin/modPermissionManager/modPermissionManager';

import useApplyTheme from './hooks/useApplyTheme';
import { AuthContext } from './context/authProvider';
import { useContext, useEffect } from 'react';
import { ref, set } from 'firebase/database';
import { rtdb } from './firebase/config';
import { getUserDocIdByUid } from './firebase/services';

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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
        console.error("Error updating user status:", error);
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

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <ThemeWrapper>
            <ToastContainer position="top-right" autoClose={1500} toastClassName="small-toast"/>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/maintenance" element={<MaintenancePage />} />
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <ChatRoom />
                  </PrivateRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <PrivateRoute requireAdmin requirePermission="canAccessAdminPage">
                    <AdminLayout />
                  </PrivateRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="users" element={<UsersManager />} />
                <Route path="rooms" element={<RoomsManager />} />
                <Route path="announcements" element={<AnnouncementManager />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="mod-permissions" element={<ModPermissionManager />}/>
              </Route>
            </Routes>
            <AddRoomModal />
            <InviteMemberModal />
            <ProfileModal />
            <SettingsModal />
            <AnnouncementModal />
          </ThemeWrapper>
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
