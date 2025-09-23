import { Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "./authProvider";

export function PrivateRoute({ children }) {
  const { user } = useContext(AuthContext);

  // Nếu chưa login → chuyển về /login
  if (!user) return <Navigate to="/login" />;

  // Nếu đã login → render nội dung
  return children;
}
