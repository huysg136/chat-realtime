import React from 'react';
import Searching from '../searching/searching';
import RoomList from '../roomList/roomList';
import './sideBar.scss';

export default function SideBar() {
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
