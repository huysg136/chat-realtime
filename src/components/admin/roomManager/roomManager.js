import { useEffect, useState, useContext } from "react";
import { db } from "../../../firebase/config";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { decryptMessage } from "../../../firebase/services";
import NoAccess from "../noAccess/noAccess";
import { AuthContext } from "../../../context/authProvider";
import { FiCopy } from "react-icons/fi";
import { Table, Spin } from "antd";
import { toast } from "react-toastify";
import "./roomManager.scss";

export default function RoomManager() {
  const { user: currentUser } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState([]);
  const [uidToName, setUidToName] = useState({});
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [filters, setFilters] = useState({
    id: "",
    kind: "",
    membersSort: "",
    createdAt: "",
  });

  const isSameDate = (date1, date2) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  useEffect(() => {
    setLoading(true);
    let usersLoaded = false;
    let roomsLoaded = false;
    const unsubscribeUsers = onSnapshot(collection(db, "users"), (snap) => {
      const map = {};
      snap.docs.forEach((u) => {
        const data = u.data();
        map[data.uid] = data.displayName || "Ẩn danh";
      });
      setUidToName(map);
      usersLoaded = true;
      if (usersLoaded && roomsLoaded) setLoading(false);
    });

    const q = query(collection(db, "rooms"), orderBy("createdAt", "desc"));
    const unsubscribeRooms = onSnapshot(q, (snap) => {
      const roomList = snap.docs.map((docSnap) => {
        const data = docSnap.data();

        const formatTime = (t) =>
          t?.toDate
            ? t.toDate().toLocaleString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })
            : "N/A";

        const ownerUid =
          data.roles?.find((r) => r.role === "owner")?.uid || "Không rõ";

        const lastMsg = data.lastMessage
          ? (() => {
            let text = data.lastMessage.text || "";
            try {
              text = decryptMessage(text, data.secretKey || "");
              if (!text) text = "[Không thể giải mã]";
            } catch (e) {
              text = "[Lỗi giải mã]";
            }
            return `${data.lastMessage.displayName || "Ẩn danh"}: ${text}`;
          })()
          : "Chưa có tin nhắn";

        return {
          id: docSnap.id,
          name: data.name || "Không tên",
          kind:
            data.kind === "group" || data.type === "group"
              ? "Nhóm"
              : data.kind === "private" || data.type === "private"
                ? "Riêng tư"
                : "N/A",
          createdBy: data.displayName || data.createdBy || "Ẩn danh",
          ownerUid,
          members: data.members || [],
          roles: data.roles || [],
          createdAt: formatTime(data.createdAt),
          updatedAt: formatTime(data.updatedAt),
          lastMessage: lastMsg,
          secretKey: data.secretKey || "",
        };
      });
      setRooms(roomList);
      roomsLoaded = true;
      if (usersLoaded && roomsLoaded) setLoading(false);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeRooms();
    };
  }, []);

  if (!currentUser?.permissions?.canManageRooms && currentUser.role !== "admin") {
    return <NoAccess />;
  }

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

  const filteredRooms = rooms
    .filter((room) =>
      room.id.toLowerCase().includes(filters.id.toLowerCase())
    )
    .filter((room) => (filters.kind ? room.kind === filters.kind : true))
    .filter((room) => {
      if (!filters.createdAt) return true;
      const filterDate = new Date(filters.createdAt);
      const roomDate = new Date(room.createdAt);
      return isSameDate(filterDate, roomDate);
    })
    .sort((a, b) => {
      if (filters.membersSort === "asc") return a.members.length - b.members.length;
      if (filters.membersSort === "desc") return b.members.length - a.members.length;
      return 0;
    });

  const columns = [
    {
      title: "ID phòng",
      dataIndex: "id",
      key: "id",
      render: (uid) => (
        <span
          className="copyable"
          onClick={() => {
            navigator.clipboard.writeText(uid);
            toast.info("Đã sao chép UID", { autoClose: 1200 });
          }}
        >
          <span className="text">
            {uid}
          </span>
          <FiCopy className="copy-icon" size={15} />
        </span>
      ),
    },
    {
      title: "Loại phòng",
      dataIndex: "kind",
      key: "kind",
    },
    {
      title: "Thành viên",
      dataIndex: "members",
      key: "members",
      render: (members) => members.length,
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
    },
    {
      title: "Hành động",
      key: "actions",
      render: (_, record) => (
        <div className="actions">
          <button className="view-btn" onClick={() => setSelectedRoom(record)}>
            👁 Xem chi tiết
          </button>
          {/* <button className="ban-btn" onClick={() => handleBan(record.id)}>
            🚫 Ban
          </button> */}
        </div>
      ),
    },
  ];

  return (
    <div className="room-manager">
      <div className="filters">
        <input
          type="text"
          placeholder="ID phòng..."
          value={filters.id}
          onChange={(e) => setFilters({ ...filters, id: e.target.value })}
        />
        <select
          value={filters.kind}
          onChange={(e) => setFilters({ ...filters, kind: e.target.value })}
        >
          <option value="">Tất cả loại</option>
          <option value="Nhóm">Nhóm</option>
          <option value="Riêng tư">Riêng tư</option>
        </select>
        <div className="members-sort">
          <button
            onClick={() => {
              const nextSort =
                filters.membersSort === ""
                  ? "asc"
                  : filters.membersSort === "asc"
                    ? "desc"
                    : "";
              setFilters({ ...filters, membersSort: nextSort });
            }}
          >
            Thành viên{" "}
            {filters.membersSort === "asc"
              ? "↑"
              : filters.membersSort === "desc"
                ? "↓"
                : ""}
          </button>
        </div>
        <input
          type="date"
          value={filters.createdAt}
          onChange={(e) => setFilters({ ...filters, createdAt: e.target.value })}
        />
      </div>

      <Table
        columns={columns}
        dataSource={filteredRooms}
        rowKey="id"
        pagination={{ pageSize: 10 }}
      />

      {selectedRoom && (
        <div className="room-modal">
          <div className="room-modal-content">
            <h3>
              {selectedRoom.kind === "Riêng tư"
                ? "Chi tiết cuộc trò chuyện riêng tư"
                : `Chi tiết phòng: ${selectedRoom.name}`}
            </h3>
            <p><strong>ID phòng:</strong> {selectedRoom.id}</p>
            <p><strong>Loại:</strong> {selectedRoom.kind}</p>
            {selectedRoom.kind !== "Riêng tư" && (
              <p><strong>Chủ phòng:</strong> {uidToName[selectedRoom.ownerUid] || "Ẩn danh"}</p>
            )}
            {selectedRoom.kind === "Riêng tư" ? (
              <p><strong>Người tham gia:</strong> {selectedRoom.members.map(m => uidToName[m] || m).join(" và ")}</p>
            ) : (
              <>
                <p><strong>Thành viên ({selectedRoom.members.length}):</strong></p>
                <ul>
                  {selectedRoom.members.map((m, i) => (
                    <li key={i}>
                      {uidToName[m] || m}{" "}
                      <span className="role">
                        ({selectedRoom.roles.find((r) => r.uid === m)?.role || "member"})
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <p><strong>Ngày tạo:</strong> {selectedRoom.createdAt}</p>
            <p><strong>Thời gian tin nhắn cuối:</strong> {selectedRoom.updatedAt}</p>
            <div className="modal-actions">
              <button onClick={() => setSelectedRoom(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
