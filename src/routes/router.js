import React, { Suspense, lazy } from 'react';
import { Route } from 'react-router-dom';
import { Spin } from 'antd';
import PrivateRoute from './privateRoute';
import { ROUTERS } from '../utils/router';
import ReportManager from '../components/admin/reportManager/reportManager';

// Lazy load components
const ChatRoom = lazy(() => import('../pages/user/landingPage/landingPage'));
const Login = lazy(() => import('../components/login'));
const MaintenancePage = lazy(() => import('../pages/user/maintenancePage/maintenancePage'));
const AdminLayout = lazy(() => import('../pages/admin/adminLayout/adminLayout'));
const Dashboard = lazy(() => import('../components/admin/dashboard/dashboard'));
const UsersManager = lazy(() => import('../components/admin/userManager/userManager'));
const RoomsManager = lazy(() => import('../components/admin/roomManager/roomManager'));
const AnnouncementManager = lazy(() => import('../components/admin/announcementManager/announcementManager'));
const AdminSettings = lazy(() => import('../components/admin/adminSettings/adminSettings'));
const ModPermissionManager = lazy(() => import('../components/admin/modPermissionManager/modPermissionManager'));

// Loading Fallback
const Loading = () => (
  <div className="flex justify-center items-center h-screen">
    <Spin size="large" />
  </div>
);

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
      <Suspense fallback={<Loading />}>
        <Login />
      </Suspense>
    ),
  },
  {
    path: ROUTERS.USER.MAINTENANCE,
    element: (
      <Suspense fallback={<Loading />}>
        <MaintenancePage />
      </Suspense>
    ),
  },
];

// User Routes
export const userRoutes = [
  {
    path: ROUTERS.USER.HOME,
    element: (
      <Suspense fallback={<Loading />}>
        <PrivateRoute>
          <ChatRoom />
        </PrivateRoute>
      </Suspense>
    ),
  },
];

// Admin Routes - Using ROUTERS constants
export const adminRoutes = {
  path: ROUTERS.ADMIN.DASHBOARD,
  element: (
    <Suspense fallback={<Loading />}>
      <PrivateRoute requireAdmin requirePermission="canAccessAdminPage">
        <AdminLayout />
      </PrivateRoute>
    </Suspense>
  ),
  children: [
    {
      index: true,
      element: (
        <Suspense fallback={<Loading />}>
          <Dashboard />
        </Suspense>
      ),
    },
    {
      path: getRelativePath(ROUTERS.ADMIN.USERS, ROUTERS.ADMIN.DASHBOARD),
      element: (
        <Suspense fallback={<Loading />}>
          <UsersManager />
        </Suspense>
      ),
    },
    {
      path: getRelativePath(ROUTERS.ADMIN.ROOMS, ROUTERS.ADMIN.DASHBOARD),
      element: (
        <Suspense fallback={<Loading />}>
          <RoomsManager />
        </Suspense>
      ),
    },
    {
      path: getRelativePath(ROUTERS.ADMIN.REPORTS, ROUTERS.ADMIN.DASHBOARD),
      element: (
        <Suspense fallback={<Loading />}>
          <ReportManager />
        </Suspense>
      ),
    },
    {
      path: getRelativePath(ROUTERS.ADMIN.ANNOUNCEMENTS, ROUTERS.ADMIN.DASHBOARD),
      element: (
        <Suspense fallback={<Loading />}>
          <AnnouncementManager />
        </Suspense>
      ),
    },
    {
      path: getRelativePath(ROUTERS.ADMIN.SETTINGS, ROUTERS.ADMIN.DASHBOARD),
      element: (
        <Suspense fallback={<Loading />}>
          <AdminSettings />
        </Suspense>
      ),
    },
    {
      path: getRelativePath(ROUTERS.ADMIN.MOD_PERMISSIONS, ROUTERS.ADMIN.DASHBOARD),
      element: (
        <Suspense fallback={<Loading />}>
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
    <Route key={index} path={route.path} element={route.element} />
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