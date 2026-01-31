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

// Admin Routes
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
      path: "users",
      element: (
        <Suspense fallback={<Loading />}>
          <UsersManager />
        </Suspense>
      ),
    },
    {
      path: "rooms",
      element: (
        <Suspense fallback={<Loading />}>
          <RoomsManager />
        </Suspense>
      ),
    },
    {
      path: "reports",
      element: (
        <Suspense fallback={<Loading />}>
          <ReportManager />
        </Suspense>
      ),
    },
    {
      path: "announcements",
      element: (
        <Suspense fallback={<Loading />}>
          <AnnouncementManager />
        </Suspense>
      ),
    },
    {
      path: "settings",
      element: (
        <Suspense fallback={<Loading />}>
          <AdminSettings />
        </Suspense>
      ),
    },
    {
      path: "mod-permissions",
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