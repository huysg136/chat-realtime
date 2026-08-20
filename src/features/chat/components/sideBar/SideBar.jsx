import React from 'react';
import Searching from '../searching/Searching';
import RoomList from '../roomList/RoomList';
import FriendPanel from '../friendPanel/FriendPanel';
import { useChatStore } from '../../store/chat.store';
import './sideBar.scss';

export default function SideBar() {
  const isActiveTab = useChatStore((state) => state.isActiveTab);

  if (isActiveTab === 'friends') {
    return (
      <div className="sidebar-wrapper">
        <FriendPanel />
      </div>
    );
  }

  return (
    <div className="sidebar-wrapper">
      <div className="search-wrapper">
        <Searching />
      </div>
      <div className="rooms-wrapper">
        <RoomList />
      </div>
    </div>
  );
}
