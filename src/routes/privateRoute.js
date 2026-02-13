import { useContext } from "react";
import { Navigate } from "react-router-dom";
import LoadingScreen from '../components/common/loadingScreen';
import { AuthContext } from "../context/authProvider";
import { AppContext } from "../context/appProvider";
import { ROUTERS } from "../configs/router";

export default function PrivateRoute({
  children,
  requireAdmin = false,
  requirePermission = null
}) {
  const { user, isLoading: isAuthLoading } = useContext(AuthContext);
  const { isMaintenance } = useContext(AppContext);

  // Loading state
  if (isAuthLoading) {
    return <LoadingScreen fullScreen />;
  }

  // Not authenticated
  if (!user) {
    return <Navigate to={ROUTERS.USER.LOGIN} replace />;
  }

  // Check admin/moderator BEFORE rendering children
  const isAdminOrMod = ["admin", "moderator"].includes(user.role);

  if (requireAdmin && !isAdminOrMod) {
    return <Navigate to={ROUTERS.USER.HOME} replace />;
  }

  // Check specific permission
  if (requirePermission && user.role !== "admin" && !user.permissions?.[requirePermission]) {
    return <Navigate to={ROUTERS.USER.HOME} replace />;
  }

  // Maintenance mode (non-admin/moderator)
  if (isMaintenance && !isAdminOrMod) {
    return <Navigate to={ROUTERS.USER.MAINTENANCE} replace />;
  }

  return children;
}