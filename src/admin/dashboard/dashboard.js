import React, { useEffect, useState } from "react";
import { Card, Row, Col, Statistic, Table, Spin, message } from "antd";
import {
  UserOutlined,
  MessageOutlined,
  TeamOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from "@ant-design/icons";
import { db } from "../../firebase/config";
import { collection, getDocs } from "firebase/firestore";
import {
  format,
  startOfDay,
  startOfWeek,
  startOfMonth,
  subDays,
  subWeeks,
  subMonths,
} from "date-fns";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import "./dashboard.scss";

ChartJS.register(
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend
);

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    users: 0,
    rooms: 0,
    newUsersToday: 0,
    newUsersWeek: 0,
    newUsersMonth: 0,
    growthToday: 0,
    growthWeek: 0,
    growthMonth: 0,
  });
  const [userData, setUserData] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [growthChartData, setGrowthChartData] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);

        const usersCol = collection(db, "users");
        const roomsCol = collection(db, "rooms");

        const [usersSnap, roomsSnap] = await Promise.all([
          getDocs(usersCol),
          getDocs(roomsCol),
        ]);

        const today = startOfDay(new Date());
        const yesterday = startOfDay(subDays(new Date(), 1));
        const weekStart = startOfWeek(new Date());
        const prevWeekStart = startOfWeek(subWeeks(new Date(), 1));
        const monthStart = startOfMonth(new Date());
        const prevMonthStart = startOfMonth(subMonths(new Date(), 1));

        const users = usersSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        const usersWithDate = users.filter((u) => u.createdAt);

        // === TÍNH NGƯỜI DÙNG MỚI ===
        const newUsersToday = usersWithDate.filter(
          (u) => u.createdAt.toDate() >= today
        ).length;
        const newUsersYesterday = usersWithDate.filter(
          (u) =>
            u.createdAt.toDate() >= yesterday &&
            u.createdAt.toDate() < today
        ).length;

        const newUsersWeek = usersWithDate.filter(
          (u) => u.createdAt.toDate() >= weekStart
        ).length;
        const newUsersPrevWeek = usersWithDate.filter(
          (u) =>
            u.createdAt.toDate() >= prevWeekStart &&
            u.createdAt.toDate() < weekStart
        ).length;

        const newUsersMonth = usersWithDate.filter(
          (u) => u.createdAt.toDate() >= monthStart
        ).length;
        const newUsersPrevMonth = usersWithDate.filter(
          (u) =>
            u.createdAt.toDate() >= prevMonthStart &&
            u.createdAt.toDate() < monthStart
        ).length;

        // === TÍNH % TĂNG TRƯỞNG ===
        const calcGrowth = (current, prev) => {
          if (prev === 0 && current > 0) return 100;
          if (prev === 0 && current === 0) return 0;
          return (((current - prev) / prev) * 100).toFixed(1);
        };

        const growthToday = calcGrowth(newUsersToday, newUsersYesterday);
        const growthWeek = calcGrowth(newUsersWeek, newUsersPrevWeek);
        const growthMonth = calcGrowth(newUsersMonth, newUsersPrevMonth);

        // === DỮ LIỆU BẢNG ===
        const userList = users.map((u) => ({
          key: u.id,
          name: u.displayName || "Unknown",
          email: u.email || "-",
          role: u.role || "user",
          joined: u.createdAt
            ? format(u.createdAt.toDate(), "yyyy-MM-dd")
            : "-",
        }));

        // === BIỂU ĐỒ 30 NGÀY GẦN NHẤT ===
        const labels = [];
        const dataPoints = [];
        for (let i = 29; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dayStr = format(date, "yyyy-MM-dd");
          const count = usersWithDate.filter((u) => {
            const createdAt = u.createdAt?.toDate();
            return createdAt && format(createdAt, "yyyy-MM-dd") === dayStr;
          }).length;
          labels.push(format(date, "MM/dd"));
          dataPoints.push(count);
        }

        // === BIỂU ĐỒ TĂNG TRƯỞNG THEO TUẦN (8 TUẦN) ===
        const weeklyLabels = [];
        const weeklyGrowthData = [];
        for (let i = 7; i >= 0; i--) {
          const start = startOfWeek(subWeeks(new Date(), i));
          const end = startOfWeek(subWeeks(new Date(), i - 1));
          const prevStart = startOfWeek(subWeeks(new Date(), i + 1));

          const currentWeekCount = usersWithDate.filter(
            (u) =>
              u.createdAt.toDate() >= start &&
              (!end || u.createdAt.toDate() < end)
          ).length;

          const prevWeekCount = usersWithDate.filter(
            (u) =>
              u.createdAt.toDate() >= prevStart &&
              u.createdAt.toDate() < start
          ).length;

          const weekLabel = format(start, "dd/MM");
          weeklyLabels.push(weekLabel);
          weeklyGrowthData.push(Number(calcGrowth(currentWeekCount, prevWeekCount)));
        }

        // === CẤU HÌNH BIỂU ĐỒ ===
        setChartData({
          labels,
          datasets: [
            {
              label: "Người dùng mới",
              data: dataPoints,
              borderColor: "#1890ff",
              backgroundColor: "rgba(24, 144, 255, 0.2)",
              tension: 0.3,
              fill: true,
              pointRadius: 4,
              pointHoverRadius: 6,
            },
          ],
        });

        setGrowthChartData({
          labels: weeklyLabels,
          datasets: [
            {
              label: "% tăng trưởng người dùng theo tuần",
              data: weeklyGrowthData,
              borderColor: "#52c41a",
              backgroundColor: "rgba(82, 196, 26, 0.3)",
              tension: 0.3,
              fill: true,
              pointRadius: 4,
              pointHoverRadius: 6,
            },
          ],
        });

        setStats({
          users: usersSnap.size,
          rooms: roomsSnap.size,
          newUsersToday,
          newUsersWeek,
          newUsersMonth,
          growthToday,
          growthWeek,
          growthMonth,
        });
        setUserData(userList);
      } catch (error) {
        console.error("❌ Lỗi khi fetch dữ liệu dashboard:", error);
        message.error("Không thể tải dữ liệu dashboard.");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const renderGrowth = (value) => {
    const val = parseFloat(value);
    const isPositive = val >= 0;
    return (
      <span style={{ color: isPositive ? "#3f8600" : "#cf1322" }}>
        {isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}{" "}
        {Math.abs(val)}%
      </span>
    );
  };

  const userColumns = [
    { title: "Tên", dataIndex: "name", key: "name" },
    { title: "Email", dataIndex: "email", key: "email" },
    { title: "Role", dataIndex: "role", key: "role" },
    { title: "Ngày tham gia", dataIndex: "joined", key: "joined" },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "100px 0" }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Thống kê tổng */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Tổng người dùng"
              value={stats.users}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Tổng phòng chat"
              value={stats.rooms}
              prefix={<MessageOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Người dùng mới hôm nay"
              value={stats.newUsersToday}
              prefix={<TeamOutlined />}
              suffix={renderGrowth(stats.growthToday)}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Người dùng mới tháng này"
              value={stats.newUsersMonth}
              prefix={<TeamOutlined />}
              suffix={renderGrowth(stats.growthMonth)}
            />
          </Card>
        </Col>
      </Row>

      {/* Biểu đồ người dùng mới */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={24}>
          <Card
            title="Người dùng mới (30 ngày gần nhất)"
            style={{ height: 250 }}
          >
            {chartData ? (
              <Line
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: "top" } },
                  scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } },
                  },
                }}
              />
            ) : (
              <p>Không có dữ liệu</p>
            )}
          </Card>
        </Col>
      </Row>

      {/* Biểu đồ tăng trưởng theo tuần */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={24}>
          <Card
            title="% Tăng trưởng người dùng theo tuần (8 tuần gần nhất)"
            style={{ height: 250 }}
          >
            {growthChartData ? (
              <Line
                data={growthChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: "top" } },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: (v) => `${v}%`,
                      },
                    },
                  },
                }}
              />
            ) : (
              <p>Không có dữ liệu biểu đồ tăng trưởng</p>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
