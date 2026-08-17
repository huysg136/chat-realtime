import { create } from "zustand";

export const useModalStore = create((set) => ({
  isAddRoomVisible: false,
  isInviteMemberVisible: false,
  isProfileVisible: false,
  isPendingInviteVisible: false,
  isSettingsVisible: false,
  isMyReportsVisible: false,
  isUpgradePlanVisible: false,
  isFriendsVisible: false,
  isPostDetailVisible: false,
  activePostId: "",

  isAnnouncementVisible: false,
  currentAnnouncement: null,

  setIsAddRoomVisible: (isAddRoomVisible) => set({ isAddRoomVisible }),
  setIsInviteMemberVisible: (isInviteMemberVisible) => set({ isInviteMemberVisible }),
  setIsProfileVisible: (isProfileVisible) => set({ isProfileVisible }),
  setIsPendingInviteVisible: (isPendingInviteVisible) => set({ isPendingInviteVisible }),
  setIsSettingsVisible: (isSettingsVisible) => set({ isSettingsVisible }),
  setIsMyReportsVisible: (isMyReportsVisible) => set({ isMyReportsVisible }),
  setIsUpgradePlanVisible: (isUpgradePlanVisible) => set({ isUpgradePlanVisible }),
  setIsFriendsVisible: (isFriendsVisible) => set({ isFriendsVisible }),
  setIsPostDetailVisible: (isPostDetailVisible) => set({ isPostDetailVisible }),
  setActivePostId: (activePostId) => set({ activePostId }),
  setIsAnnouncementVisible: (isAnnouncementVisible) => set({ isAnnouncementVisible }),
  setCurrentAnnouncement: (currentAnnouncement) => set({ currentAnnouncement }),

  resetAllModals: () =>
    set({
      isAddRoomVisible: false,
      isInviteMemberVisible: false,
      isProfileVisible: false,
      isPendingInviteVisible: false,
      isSettingsVisible: false,
      isMyReportsVisible: false,
      isUpgradePlanVisible: false,
      isFriendsVisible: false,
      isPostDetailVisible: false,
      isAnnouncementVisible: false,
      currentAnnouncement: null,
      activePostId: "",
    }),
}));
