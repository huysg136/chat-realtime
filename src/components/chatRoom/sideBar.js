import React from 'react'
import { Row, Col } from 'antd'
import UserInfo from './userInfo';
import RoomList from './roomList';
import styled from 'styled-components';

const SideBarStyle = styled.div`
    background-color: #3f0e40;
    color: white;
    height: 100vh;
`;

export default function sideBar() {
  return (
    <div>
        <SideBarStyle>
            <Row>
                <Col span={24}><UserInfo /></Col>
                <Col span={24}><RoomList /></Col>
                <Col span={24}>User List</Col>
            </Row>
        </SideBarStyle>
    </div>
  )
}
