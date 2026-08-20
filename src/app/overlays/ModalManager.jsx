import React, { lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { useModalStore } from './modal.store';
import { useAuthStore } from '../../features/auth/store/auth.store';
import { ROUTERS } from '../router/routePaths';

// Lazy load modals
const AddRoomModal = lazy(() => import('../../features/chat/components/modals/AddRoomModal'));
const InviteMemberModal = lazy(() => import('../../features/chat/components/modals/InviteMemberModal'));
const ProfileModal = lazy(() => import('../../features/profile/components/ProfileModal'));
const PendingInvitesModal = lazy(() => import('../../features/chat/components/modals/PendingInvitesModal'));
const SettingsModal = lazy(() => import('../../features/settings/components/SettingsModal'));
const AnnouncementModal = lazy(() => import('../../features/notifications/components/AnnouncementModal'));
const MyReportsModal = lazy(() => import('../../features/reports/components/MyReportsModal'));
const UpgradePlanModal = lazy(() => import('../../features/billing/components/UpgradePlanModal'));
const PostDetailModal = lazy(() => import('../../features/feed/components/postDetail/PostDetailModal'));

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
