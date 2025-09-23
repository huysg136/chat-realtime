import { Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "./authProvider";
import { Spin } from 'antd';

export function PrivateRoute({ children }) {
  const { user, loading  } = useContext(AuthContext);

  if (loading) return <Spin />;
  // Nếu chưa login → chuyển về /login
  
  if (!user) return <Navigate to="/login" />;

  // Nếu đã login → render nội dung
  return children;
}
