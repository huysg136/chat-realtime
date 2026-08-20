import React, { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import LoadingScreen from '../../shared/components/LoadingScreen';
import PrivateRoute from './PrivateRoute';
import { ROUTERS } from './routePaths';
import ReportManager from '../../features/admin/pages/ReportsPage';
import LandingPage from '../layouts/UserLayout';
import FeedPage from '../../features/feed/pages/FeedPage';

const ChatRoom = lazy(() => import('../../features/chat/pages/ChatRoomPage'));
const ProfilePage = lazy(() => import('../../features/profile/pages/ProfilePage'));
const Login = lazy(() => import('../../features/auth/pages/LoginPage'));
const MaintenancePage = lazy(() => import('../../features/system/pages/MaintenancePage'));
const AdminLayout = lazy(() => import('../../features/admin/layout/AdminLayout'));
const Dashboard = lazy(() => import('../../features/admin/pages/DashboardPage'));
const UsersManager = lazy(() => import('../../features/admin/pages/UsersPage'));
const RoomsManager = lazy(() => import('../../features/admin/pages/RoomsPage'));
const AnnouncementManager = lazy(() => import('../../features/admin/pages/AnnouncementsPage'));
const AdminSettings = lazy(() => import('../../features/admin/pages/SettingsPage'));
const ModPermissionManager = lazy(() => import('../../features/admin/pages/ModeratorPermissionsPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));

// Helper function to extract relative path from absolute path
// Example: "/admin/users" → "users"
const getRelativePath = (absolutePath, basePath) => {
  return absolutePath.replace(basePath + '/', '');
};

// Public Routes
export const publicRoutes = [
  {
    path: ROUTERS.USER.LOGIN,
    element: (
      <Suspense fallback={<LoadingScreen />}>
        <Login />
      </Suspense>
    ),
  },
  {
    path: ROUTERS.USER.MAINTENANCE,
    element: (
      <Suspense fallback={<LoadingScreen />}>
        <MaintenancePage />
      </Suspense>
    ),
  },
];

// userRoutes
export const userRoutes = [
  {
    path: "/",
    element: (
      <PrivateRoute>
        <LandingPage />
      </PrivateRoute>
    ),
    children: [
      {
        index: true,
        element: <FeedPage />,
      },
      {
        path: "p/:postId",
        element: <FeedPage />,
      },
      {
        path: ROUTERS.USER.CHAT,
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <ChatRoom />
          </Suspense>
        ),
      },
      {
        path: getRelativePath(ROUTERS.USER.DIRECT, "/"),
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <ChatRoom />
          </Suspense>
        ),
      },
      {
        path: getRelativePath(ROUTERS.USER.PROFILE, "/"),
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <ProfilePage />
          </Suspense>
        ),
      }
    ],
  },
];

// Admin Routes - Using ROUTERS constants
export const adminRoutes = {
  path: ROUTERS.ADMIN.DASHBOARD,
  element: (
    <Suspense fallback={<LoadingScreen />}>
      <PrivateRoute requireAdmin requirePermission="canAccessAdminPage">
        <AdminLayout />
      </PrivateRoute>
    </Suspense>
  ),
  children: [
    {
      index: true,
      element: (
        <Suspense fallback={<LoadingScreen />}>
          <Dashboard />
        </Suspense>
      ),
    },
    {
      path: getRelativePath(ROUTERS.ADMIN.USERS, ROUTERS.ADMIN.DASHBOARD),
      element: (
        <Suspense fallback={<LoadingScreen />}>
          <UsersManager />
        </Suspense>
      ),
    },
    {
      path: getRelativePath(ROUTERS.ADMIN.ROOMS, ROUTERS.ADMIN.DASHBOARD),
      element: (
        <Suspense fallback={<LoadingScreen />}>
          <RoomsManager />
        </Suspense>
      ),
    },
    {
      path: getRelativePath(ROUTERS.ADMIN.REPORTS, ROUTERS.ADMIN.DASHBOARD),
      element: (
        <Suspense fallback={<LoadingScreen />}>
          <ReportManager />
        </Suspense>
      ),
    },
    {
      path: getRelativePath(ROUTERS.ADMIN.ANNOUNCEMENTS, ROUTERS.ADMIN.DASHBOARD),
      element: (
        <Suspense fallback={<LoadingScreen />}>
          <AnnouncementManager />
        </Suspense>
      ),
    },
    {
      path: getRelativePath(ROUTERS.ADMIN.SETTINGS, ROUTERS.ADMIN.DASHBOARD),
      element: (
        <Suspense fallback={<LoadingScreen />}>
          <AdminSettings />
        </Suspense>
      ),
    },
    {
      path: getRelativePath(ROUTERS.ADMIN.MOD_PERMISSIONS, ROUTERS.ADMIN.DASHBOARD),
      element: (
        <Suspense fallback={<LoadingScreen />}>
          <ModPermissionManager />
        </Suspense>
      ),
    },
  ],
};

// Render Public Routes
export const renderPublicRoutes = () => {
  return publicRoutes.map((route, index) => (
    <Route key={index} path={route.path} element={route.element} />
  ));
};

// Render User Routes
export const renderUserRoutes = () => {
  return userRoutes.map((route, index) => (
    <Route key={index} path={route.path} element={route.element}>
      {route.children && route.children.map((child, childIndex) => {
        if (child.index) {
          return <Route key={childIndex} index element={child.element} />;
        }
        return <Route key={childIndex} path={child.path} element={child.element} />;
      })}
    </Route>
  ));
};

// Render Admin Routes
export const renderAdminRoutes = () => {
  return (
    <Route path={adminRoutes.path} element={adminRoutes.element}>
      {adminRoutes.children.map((child, index) => {
        if (child.index) {
          return <Route key={index} index element={child.element} />;
        }
        return <Route key={index} path={child.path} element={child.element} />;
      })}
    </Route>
  );
};

// Render 404 Not Found Route (catch-all)
export const renderNotFoundRoute = () => (
  <Route
    path="*"
    element={
      <Suspense fallback={<LoadingScreen />}>
        <NotFoundPage />
      </Suspense>
    }
  />
);

export default function AppRouter() {
  return (
    <Routes>
      {renderPublicRoutes()}
      {renderUserRoutes()}
      {renderAdminRoutes()}
      {renderNotFoundRoute()}
    </Routes>
  );
}
