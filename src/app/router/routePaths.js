export const adminPath = "/admin/";

export const ROUTERS = {
  USER: {
    HOME: "/",
    DIRECT: "/direct/inbox",
    CHAT: "/direct/t/:roomId",
    LOGIN: "/login",
    MAINTENANCE: "/maintenance",
    PROFILE: "/profile/:uid",
  },

  ADMIN: {
    DASHBOARD: `${adminPath}`,
    USERS: `${adminPath}manage-users`,
    ROOMS: `${adminPath}manage-rooms`,
    REPORTS: `${adminPath}manage-reports`,
    ANNOUNCEMENTS: `${adminPath}manage-announcements`,
    SETTINGS: `${adminPath}manage-app-settings`,
    MOD_PERMISSIONS: `${adminPath}manage-mod-permissions`,
  },
};
