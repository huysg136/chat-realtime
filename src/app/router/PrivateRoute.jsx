import { Navigate } from "react-router-dom";
import LoadingScreen from '../../shared/components/LoadingScreen';
import { useAuthStore } from "../../features/auth/store/auth.store";
import { useAppStore } from "../store/app.store";
import { ROUTERS } from "./routePaths";

export default function PrivateRoute({
  children,
  requireAdmin = false,
  requirePermission = null
}) {
  const user = useAuthStore((state) => state.user);
  const isAuthLoading = useAuthStore((state) => state.isLoading);
  const isMaintenance = useAppStore((state) => state.isMaintenance);

  // Loading state
  if (isAuthLoading) {
    return <LoadingScreen fullScreen />;
  }

  // Not authenticated
  if (!user) {
    return <Navigate to={ROUTERS.USER.LOGIN} replace />;
  }

  // Check admin/moderator before rendering children
  const isAdminOrMod = ["admin", "moderator"].includes(user.role);

  if (requireAdmin && !isAdminOrMod) {
    return <Navigate to={ROUTERS.USER.DIRECT} replace />;
  }

  // Check specific permission
  if (requirePermission && user.role !== "admin" && !user.permissions?.[requirePermission]) {
    return <Navigate to={ROUTERS.USER.DIRECT} replace />;
  }

  // Maintenance mode (non-admin/moderator)
  if (isMaintenance && !isAdminOrMod) {
    return <Navigate to={ROUTERS.USER.MAINTENANCE} replace />;
  }

  return children;
}
