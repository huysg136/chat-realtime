import './App.css';
import { BrowserRouter, Routes } from 'react-router-dom';
import './i18n/config';
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import useApplyTheme from './hooks/useApplyTheme';
import { useAuthInit } from './hooks/useAuthInit';
import { useChatSync } from './hooks/useChatSync';
import { useAuthStore } from './stores/useAuthStore';
import LoadingScreen from './components/common/loadingScreen';

import { renderPublicRoutes, renderUserRoutes, renderAdminRoutes, renderNotFoundRoute } from './routes/router';
import ModalManager from './components/modalManager';

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

function AppContent() {
  useAuthInit();
  useChatSync();

  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);

  useApplyTheme(user?.theme);

  if (isLoading) {
    return <LoadingScreen fullScreen />;
  }

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={2000}
        toastClassName="small-toast"
      />
      <AppRoutes />
      <ModalManager />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;