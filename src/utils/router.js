export const admin_path = "/admin/";

export const ROUTERS = {
  USER: {
    HOME: "/",
    LOGIN: "/login",
    MAINTENANCE: "/maintenance",
  },

  ADMIN: {
    DASHBOARD: `${admin_path}`,
    USERS: `${admin_path}users`,
    ROOMS: `${admin_path}rooms`,
    REPORTS: `${admin_path}reports`,
    ANNOUNCEMENTS: `${admin_path}announcements`,
    SETTINGS: `${admin_path}settings`,
    MOD_PERMISSIONS: `${admin_path}mod-permissions`,
  },
};