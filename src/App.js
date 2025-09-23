import './App.css';
import ChatRoom from './components/chatRoom';
import Login from './components/login';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthProvider from './context/authProvider';
import AppProvider from './context/appProvider';
import AddRoomModal from './components/modals/addRoomModal';
import { PrivateRoute } from './context/privateRoute';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route 
              path="/" 
              element={
                <PrivateRoute>
                  <ChatRoom />
                </PrivateRoute>
              } 
            />
          </Routes>
          <AddRoomModal />
        </AppProvider>
      </AuthProvider>
    </BrowserRouter> 
  );
}

export default App;
