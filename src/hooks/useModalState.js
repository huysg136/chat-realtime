import { useState } from "react";

export function useModalState() {
  const [isAddRoomVisible, setIsAddRoomVisible] = useState(false);
  const [isInviteMemberVisible, setIsInviteMemberVisible] = useState(false);
  const [isProfileVisible, setIsProfileVisible] = useState(false);
  const [isPendingInviteVisible, setIsPendingInviteVisible] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [isMyReportsVisible, setIsMyReportsVisible] = useState(false);
  const [isUpgradePlanVisible, setIsUpgradePlanVisible] = useState(false);
  const [isFriendsVisible, setIsFriendsVisible] = useState(false);
  const [isPostDetailVisible, setIsPostDetailVisible] = useState(false);
  const [activePostId, setActivePostId] = useState("");

  const resetAllModals = () => {
    setIsAddRoomVisible(false);
    setIsInviteMemberVisible(false);
    setIsProfileVisible(false);
    setIsPendingInviteVisible(false);
    setIsSettingsVisible(false);
    setIsMyReportsVisible(false);
    setIsUpgradePlanVisible(false);
    setIsFriendsVisible(false);
    setIsPostDetailVisible(false);
    setActivePostId("");
  };

  return {
    isAddRoomVisible, setIsAddRoomVisible,
    isInviteMemberVisible, setIsInviteMemberVisible,
    isProfileVisible, setIsProfileVisible,
    isPendingInviteVisible, setIsPendingInviteVisible,
    isSettingsVisible, setIsSettingsVisible,
    isMyReportsVisible, setIsMyReportsVisible,
    isUpgradePlanVisible, setIsUpgradePlanVisible,
    isFriendsVisible, setIsFriendsVisible,
    isPostDetailVisible, setIsPostDetailVisible,
    activePostId, setActivePostId,
    resetAllModals,
  };
}
