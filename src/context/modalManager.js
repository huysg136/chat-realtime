import React, { lazy, Suspense, useContext } from 'react';
import { AppContext } from './appProvider';

// Lazy load modals
const AddRoomModal = lazy(() => import('../components/modals/addRoomModal'));
const InviteMemberModal = lazy(() => import('../components/modals/inviteMemberModal'));
const ProfileModal = lazy(() => import('../components/modals/profileModal'));
const PendingInvitesModal = lazy(() => import('../components/modals/pendingInvitesModal'));
const SettingsModal = lazy(() => import('../components/modals/settingsModal'));
const AnnouncementModal = lazy(() => import('../components/modals/announcementModal'));

export default function ModalManager() {
    const {
        isAddRoomVisible,
        isInviteMemberVisible,
        isProfileVisible,
        isPendingInviteVisible,
        isSettingsVisible,
        isAnnouncementVisible
    } = useContext(AppContext);

    // Render nothing if no modal is active (check logic below if you want stricter control, 
    // but React lazy + conditional rendering is usually enough)

    return (
        <Suspense fallback={null}>
            {isAddRoomVisible && <AddRoomModal />}
            {isInviteMemberVisible && <InviteMemberModal />}
            {isProfileVisible && <ProfileModal />}
            {isPendingInviteVisible && <PendingInvitesModal />}
            {isSettingsVisible && <SettingsModal />}
            {isAnnouncementVisible && <AnnouncementModal />}
        </Suspense>
    );
}
