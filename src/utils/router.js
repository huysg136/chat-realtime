export const admin_path = "/admin/";

export const ROUTERS = {
  USER: {
    HOME: "/",
    LOGIN: "/login",
    MAINTENANCE: "/maintenance",
  },

  ADMIN: {
    DASHBOARD: `${admin_path}`,
    USERS: `${admin_path}manage-users`,
    ROOMS: `${admin_path}manage-rooms`,
    REPORTS: `${admin_path}manage-reports`,
    ANNOUNCEMENTS: `${admin_path}manage-announcements`,
    SETTINGS: `${admin_path}manage-app-settings`,
    MOD_PERMISSIONS: `${admin_path}manage-mod-permissions`,
  },
};