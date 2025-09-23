import React from "react";
import { Row, Col } from "antd";
import SideBar from "../chatRoom/sideBar/sideBar";   
import ChatWindow from "../chatRoom/chatWindow/chatWindow"
import LeftSide from "./leftSide/leftSide";


export default function ChatRoom() {
    return <div>
        <Row gutter={0} className="chat-room">
            <Col span={1} style={{ borderRight: "1px solid black" }}>
                <LeftSide />
            </Col>
            <Col span={6} style={{ borderRight: "1px solid black" }}>
                <SideBar />
            </Col>
            <Col span={17}>
                <ChatWindow />
            </Col>
        </Row>
    </div>;
}