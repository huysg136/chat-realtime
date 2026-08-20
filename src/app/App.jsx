import './App.css';
import { BrowserRouter } from 'react-router-dom';
import '../shared/i18n/config';
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import useApplyTheme from './hooks/useApplyTheme';
import { useAuthInit } from '../features/auth/hooks/useAuthInit';
import { useChatSync } from '../features/chat/hooks/useChatSync';
import { useAuthStore } from '../features/auth/store/auth.store';
import LoadingScreen from '../shared/components/LoadingScreen';

import AppRouter from './router/AppRouter';
import { ROUTER_FUTURE_FLAGS } from './router/routerConfig';
import ModalManager from './overlays/ModalManager';

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
      <AppRouter />
      <ModalManager />
    </>
  );
}

function App() {
  return (
    <BrowserRouter future={ROUTER_FUTURE_FLAGS}>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
