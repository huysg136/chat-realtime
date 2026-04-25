import React, { useContext } from 'react';
import Searching from '../searching/searching';
import RoomList from '../roomList/roomList';
import FriendPanel from '../friendPanel/friendPanel';
import { AppContext } from '../../../../context/appProvider';
import './sideBar.scss';

export default function SideBar() {
  const { isActiveTab } = useContext(AppContext);

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
