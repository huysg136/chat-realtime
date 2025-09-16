import React from "react";
import { Row, Col } from "antd";
import SideBar from "../chatRoom/sideBar";   

export default function ChatRoom() {
    return <div>
        <Row>
            <Col span={6}><SideBar /></Col>
            <Col span={18}>Message List</Col>
        </Row>
    </div>;
}