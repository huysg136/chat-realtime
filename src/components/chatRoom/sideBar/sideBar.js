import React from 'react';
import { Row, Col } from 'antd';
import RoomList from '../roomList/roomList';
import Searching from '../searching/searching';
import './sideBar.scss';

export default function SideBar() {
  return (
    <div className="sidebar-wrapper">
      <Row>
        <Col span={24}><Searching /></Col>
        <Col span={24}><RoomList /></Col>
      </Row>
    </div>
  );
}
