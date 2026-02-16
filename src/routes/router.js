import React, { Suspense, lazy } from 'react';
import { Route } from 'react-router-dom';
import LoadingScreen from '../components/common/loadingScreen';
import PrivateRoute from './privateRoute';
import { ROUTERS } from '../configs/router';
import ReportManager from '../components/admin/report/reportManager';
import LandingPage from '../pages/user/landingPage/landingPage';
import ChatRoom from '../pages/user/landingPage/chatRoom';

const ExplorePage = lazy(() => import('../components/user/explorePage/explorePage'));
const Login = lazy(() => import('../components/login'));
const MaintenancePage = lazy(() => import('../pages/user/maintenancePage/maintenancePage'));
const AdminLayout = lazy(() => import('../pages/admin/adminLayout/adminLayout'));
const Dashboard = lazy(() => import('../components/admin/dashboard/dashboard'));
const UsersManager = lazy(() => import('../components/admin/userManager/userManager'));
const RoomsManager = lazy(() => import('../components/admin/roomManager/roomManager'));
const AnnouncementManager = lazy(() => import('../components/admin/announcementManager/announcementManager'));
const AdminSettings = lazy(() => import('../components/admin/adminSettings/adminSettings'));
const ModPermissionManager = lazy(() => import('../components/admin/modPermissionManager/modPermissionManager'));



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
        element: <ChatRoom />,
      },
      {
        path: ROUTERS.USER.DIRECT,
        element: <ChatRoom />, 
      },
      {
        path: getRelativePath(ROUTERS.USER.EXPLORE, "/"),
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <ExplorePage />
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