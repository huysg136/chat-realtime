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

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
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
                <PrivateRoute requireAdmin>
                  <AdminLayout />
                </PrivateRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="users" element={<UsersManager />} />
              <Route path="rooms" element={<RoomsManager />} />
              <Route path="announcements" element={<AnnouncementManager />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
            </Route>
          </Routes>
          <AddRoomModal />
          <InviteMemberModal />
          <ProfileModal />
        </AppProvider>
      </AuthProvider>
    </BrowserRouter> 
  );
}

export default App;