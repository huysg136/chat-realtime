import React, { useEffect, useState, useRef } from "react";
import {
  Card,
  Row,
  Col,
  Statistic,
  Spin,
  message,
  Radio,
  Select,
} from "antd";
import {
  UserOutlined,
  MessageOutlined,
  TeamOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from "@ant-design/icons";
import { db } from "../../firebase/config";
import { collection, getDocs } from "firebase/firestore";
import { format } from "date-fns";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import "./dashboard.scss";
import { toast } from "react-toastify";

ChartJS.register(
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement
);

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    users: 0,
    rooms: 0,
    messages: 0,
    newUsersToday: 0,
    newUsersYesterday: 0,
  });

  const [chartData, setChartData] = useState({
    users: null,
    messages: null,
    rooms: null,
    activeHour: null,
  });

  const [ranges, setRanges] = useState({
    users: 30,
    messages: 30,
    rooms: 30,
  });

  const [chartTypes, setChartTypes] = useState({
    users: "line",
    messages: "line",
    rooms: "line",
    hours: "bar",
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const [usersSnap, roomsSnap, messagesSnap] = await Promise.all([
          getDocs(collection(db, "users")),
          getDocs(collection(db, "rooms")),
          getDocs(collection(db, "messages")),
        ]);

        const users = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const rooms = roomsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const messages = messagesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const usersWithDate = users.filter((u) => u.createdAt);
        const messagesWithDate = messages.filter((m) => m.createdAt);
        const roomsWithDate = rooms.filter((r) => r.createdAt);

        const isDarkTheme = document.body.classList.contains('theme-dark');
        const brightenHex = (hex, amount) => {
          const num = parseInt(hex.slice(1), 16);
          const r = Math.min(255, (num >> 16) + amount);
          const g = Math.min(255, ((num >> 8) & 0x00FF) + amount);
          const b = Math.min(255, (num & 0x0000FF) + amount);
          return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
        };
        const generateChartData = (dataList, label, color, range) => {
          const labels = [];
          const dataPoints = [];
          for (let i = range - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dayStr = format(date, "yyyy-MM-dd");
            const count = dataList.filter(
              (d) =>
                format(d.createdAt.toDate?.() || new Date(), "yyyy-MM-dd") ===
                dayStr
            ).length;
            labels.push(format(date, "dd/MM"));
            dataPoints.push(count);
          }
          const brighterColor = isDarkTheme ? brightenHex(color, 80) : color;
          return {
            labels,
            datasets: [
              {
                label,
                data: dataPoints,
                borderColor: brighterColor,
                backgroundColor: brighterColor + "CC",
                tension: 0.3,
                fill: true,
              },
            ],
          };
        };

        const userChart = generateChartData(
          usersWithDate,
          `Người dùng mới (${ranges.users} ngày)`,
          "#1890ff",
          ranges.users
        );
        const msgChart = generateChartData(
          messagesWithDate,
          `Tin nhắn mới (${ranges.messages} ngày)`,
          "#fa8c16",
          ranges.messages
        );
        const roomChart = generateChartData(
          roomsWithDate,
          `Phòng chat mới (${ranges.rooms} ngày)`,
          "#52c41a",
          ranges.rooms
        );

        // === BIỂU ĐỒ GIỜ HOẠT ĐỘNG ===
        const hours = Array(24).fill(0);
        messagesWithDate.forEach((m) => {
          const hour = m.createdAt?.toDate().getHours();
          if (hour !== undefined) hours[hour]++;
        });
        const activeHourChart = {
          labels: hours.map((_, i) => `${i}:00`),
          datasets: [
            {
              label: "Tin nhắn theo giờ",
              data: hours,
              backgroundColor: isDarkTheme ? "rgba(255,149,182,0.6)" : "rgba(255,99,132,0.4)",
              borderColor: isDarkTheme ? "#ffb3c7" : "#ff6384",
            },
          ],
        };

        const today = format(new Date(), "yyyy-MM-dd");
        const yesterday = format(new Date(Date.now() - 86400000), "yyyy-MM-dd");
        const todayUsers = usersWithDate.filter(
          (u) =>
            format(u.createdAt.toDate?.() || new Date(), "yyyy-MM-dd") === today
        ).length;
        const yesterdayUsers = usersWithDate.filter(
          (u) =>
            format(u.createdAt.toDate?.() || new Date(), "yyyy-MM-dd") ===
            yesterday
        ).length;

        setStats({
          users: usersSnap.size,
          rooms: roomsSnap.size,
          messages: messagesSnap.size,
          newUsersToday: todayUsers,
          newUsersYesterday: yesterdayUsers,
        });

        setChartData({
          users: userChart,
          messages: msgChart,
          rooms: roomChart,
          activeHour: activeHourChart,
        });
      } catch (err) {
        toast.error("Không thể tải dữ liệu dashboard.");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [ranges]);

  const calcGrowth = (today, yesterday) => {
    if (yesterday === 0) return today > 0 ? 100 : 0;
    return (((today - yesterday) / yesterday) * 100).toFixed(1);
  };

  if (loading)
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '400px' 
    }}>
      <Spin size="large" />
    </div>
  );

  const growth = calcGrowth(stats.newUsersToday, stats.newUsersYesterday);

  const renderChart = (type, data, options) =>
    type === "bar" ? (
      <Bar data={data} options={options} />
    ) : (
      <Line data={data} options={options} />
    );

  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: { y: { beginAtZero: true } },
    plugins: {
      legend: { position: "bottom" },
      tooltip: { mode: "index", intersect: false },
    },
  };

  return (
    <div className="dashboard">
      {/* === HEADER === */}
      <Row gutter={16} className="dashboard__stats">
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Tổng người dùng" value={stats.users} prefix={<UserOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Tổng phòng chat" value={stats.rooms} prefix={<MessageOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Tổng tin nhắn" value={stats.messages} prefix={<MessageOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Người dùng mới hôm nay"
              value={stats.newUsersToday}
              prefix={<TeamOutlined />}
              suffix={
                <span className={growth >= 0 ? "growth-up" : "growth-down"}>
                  {growth >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {Math.abs(growth)}%
                </span>
              }
            />
          </Card>
        </Col>
      </Row>

      {/* === CÁC BIỂU ĐỒ CHÍNH === */}
      {[
        { key: "users", title: "Người dùng mới" },
        { key: "messages", title: "Tin nhắn mới" },
        { key: "rooms", title: "Phòng chat mới" },
      ].map(({ key, title }) => (
        <Card
          key={key}
          title={title}
          extra={
            <>
              <Radio.Group
                value={ranges[key]}
                onChange={(e) => setRanges({ ...ranges, [key]: e.target.value })}
              >
                <Radio.Button value={7}>7 ngày</Radio.Button>
                <Radio.Button value={30}>30 ngày</Radio.Button>
              </Radio.Group>
              <Select
                value={chartTypes[key]}
                onChange={(v) => setChartTypes({ ...chartTypes, [key]: v })}
                options={[
                  { value: "line", label: "Line" },
                  { value: "bar", label: "Bar" },
                ]}
                className="chart-select"
              />
            </>
          }
          className="dashboard__card"
        >
          {renderChart(chartTypes[key], chartData[key], baseOptions)}
        </Card>
      ))}

      {/* === GIỜ HOẠT ĐỘNG === */}
      <Card
        title="Giờ hoạt động của người dùng"
        extra={
          <Select
            value={chartTypes.hours}
            onChange={(v) => setChartTypes({ ...chartTypes, hours: v })}
            options={[
              { value: "bar", label: "Bar" },
              { value: "line", label: "Line" },
            ]}
            className="chart-select"
          />
        }
        className="dashboard__card"
      >
        {renderChart(chartTypes.hours, chartData.activeHour, baseOptions)}
      </Card>
    </div>
  );
}
