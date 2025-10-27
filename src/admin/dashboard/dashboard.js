import React, { useEffect, useState } from "react";
import { Card, Row, Col, Statistic } from "antd";
import { UserOutlined, MessageOutlined } from "@ant-design/icons";
import { db } from "../../firebase/config";
import { collection, getCountFromServer } from "firebase/firestore";
import "./dashboard.scss";

export default function Dashboard() {
  const [stats, setStats] = useState({ users: 0, rooms: 0 });

  useEffect(() => {
    const fetchCounts = async () => {
      const usersSnap = await getCountFromServer(collection(db, "users"));
      const roomsSnap = await getCountFromServer(collection(db, "rooms"));
      setStats({
        users: usersSnap.data().count,
        rooms: roomsSnap.data().count,
      });
    };
    fetchCounts();
  }, []);

  return (
    <div className="dashboard">
      <Row gutter={16}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Người dùng"
              value={stats.users}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Phòng chat"
              value={stats.rooms}
              prefix={<MessageOutlined />}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
