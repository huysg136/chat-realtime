import './App.css';
import { BrowserRouter, Routes } from 'react-router-dom';
import './i18n/config';
import { useContext } from 'react';
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import AuthProvider, { AuthContext } from './context/authProvider';
import AppProvider from './context/appProvider';
import useApplyTheme from './hooks/useApplyTheme';

import { renderPublicRoutes, renderUserRoutes, renderAdminRoutes, renderNotFoundRoute } from './routes/router';

import ModalManager from './context/modalManager';
import useUserPresence from './hooks/useUserPresence';

function ThemeWrapper({ children }) {
  const { user } = useContext(AuthContext);

  useApplyTheme(user?.theme);
  useUserPresence(user);

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {renderPublicRoutes()}
      {renderUserRoutes()}
      {renderAdminRoutes()}
      {renderNotFoundRoute()}
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