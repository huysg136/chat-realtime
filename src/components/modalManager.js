import React, { lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { useModalStore } from '../stores/useModalStore';
import { useAuthStore } from '../stores/useAuthStore';
import { ROUTERS } from '../configs/router';

// Lazy load modals
const AddRoomModal = lazy(() => import('./modals/addRoomModal'));
const InviteMemberModal = lazy(() => import('./modals/inviteMemberModal'));
const ProfileModal = lazy(() => import('./modals/profileModal'));
const PendingInvitesModal = lazy(() => import('./modals/pendingInvitesModal'));
const SettingsModal = lazy(() => import('./modals/settingsModal'));
const AnnouncementModal = lazy(() => import('./modals/announcementModal'));
const MyReportsModal = lazy(() => import('./modals/myReportsModal'));
const UpgradePlanModal = lazy(() => import('./modals/upgradePlanModal'));
const PostDetailModal = lazy(() => import('./modals/postDetailModal'));

export default function ModalManager() {
    const isAddRoomVisible = useModalStore((state) => state.isAddRoomVisible);
    const isInviteMemberVisible = useModalStore((state) => state.isInviteMemberVisible);
    const isProfileVisible = useModalStore((state) => state.isProfileVisible);
    const isPendingInviteVisible = useModalStore((state) => state.isPendingInviteVisible);
    const isSettingsVisible = useModalStore((state) => state.isSettingsVisible);
    const isAnnouncementVisible = useModalStore((state) => state.isAnnouncementVisible);
    const isMyReportsVisible = useModalStore((state) => state.isMyReportsVisible);
    const isUpgradePlanVisible = useModalStore((state) => state.isUpgradePlanVisible);
    const isPostDetailVisible = useModalStore((state) => state.isPostDetailVisible);

    const user = useAuthStore((state) => state.user);
    const location = useLocation();

    if (location.pathname === ROUTERS.USER.MAINTENANCE) {
        return null;
    }

    return (
        <Suspense fallback={null}>
            {isAddRoomVisible && <AddRoomModal />}
            {isInviteMemberVisible && <InviteMemberModal />}
            {isProfileVisible && <ProfileModal />}
            {isPendingInviteVisible && <PendingInvitesModal />}
            {isSettingsVisible && <SettingsModal />}
            {isAnnouncementVisible && <AnnouncementModal />}
            {isMyReportsVisible && <MyReportsModal />}
            {isUpgradePlanVisible && <UpgradePlanModal premiumLevel={user?.premiumLevel} />}
            {isPostDetailVisible && <PostDetailModal />}
        </Suspense>
    );
}
