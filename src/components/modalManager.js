import React, { lazy, Suspense, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { AppContext } from '../context/appProvider';
import { AuthContext } from '../context/authProvider';
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
    const {
        isAddRoomVisible,
        isInviteMemberVisible,
        isProfileVisible,
        isPendingInviteVisible,
        isSettingsVisible,
        isAnnouncementVisible,
        isMyReportsVisible,
        isUpgradePlanVisible,
        isPostDetailVisible,
    } = useContext(AppContext);
    const { user } = useContext(AuthContext);
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
