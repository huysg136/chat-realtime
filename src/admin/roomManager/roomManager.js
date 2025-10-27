import React, { useEffect, useState } from "react";
import { db } from "../../firebase/config";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { decryptMessage } from "../../firebase/services";
import "./roomManager.scss";

export default function RoomManager() {
  const [rooms, setRooms] = useState([]);
  const [uidToName, setUidToName] = useState({});
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [filters, setFilters] = useState({
    name: "",
    kind: "",
    owner: "",
    membersSort: "", // 'asc' | 'desc'
    createdAt: "",
  });

  const isSameDate = (date1, date2) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  const fetchUsers = async () => {
    const snapshot = await getDocs(collection(db, "users"));
    const map = {};
    snapshot.docs.forEach((u) => {
      const data = u.data();
      map[data.uid] = data.displayName || "Ẩn danh";
    });
    setUidToName(map);
  };

  const fetchRooms = async () => {
    const snapshot = await getDocs(collection(db, "rooms"));
    const roomList = snapshot.docs.map((docSnap) => {
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
  };

  const handleDelete = async (id) => {
    if (window.confirm("Bạn có chắc muốn xoá phòng này không?")) {
      await deleteDoc(doc(db, "rooms", id));
      fetchRooms();
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRooms();
  }, []);

  const filteredRooms = rooms
    .filter((room) =>
      room.name.toLowerCase().includes(filters.name.toLowerCase())
    )
    .filter((room) =>
      filters.kind ? room.kind === filters.kind : true
    )
    .filter((room) =>
      filters.owner
        ? (uidToName[room.ownerUid] || "")
            .toLowerCase()
            .includes(filters.owner.toLowerCase())
        : true
    )
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

  return (
    <div className="room-manager">
      {/* <h2>Quản lý phòng chat</h2> */}

      <div className="filters">
        <input
          type="text"
          placeholder="Tên phòng..."
          value={filters.name}
          onChange={(e) => setFilters({ ...filters, name: e.target.value })}
        />
        <select
          value={filters.kind}
          onChange={(e) => setFilters({ ...filters, kind: e.target.value })}
        >
          <option value="">Tất cả loại</option>
          <option value="Nhóm">Nhóm</option>
          <option value="Riêng tư">Riêng tư</option>
        </select>
        <input
          type="text"
          placeholder="Chủ sở hữu..."
          value={filters.owner}
          onChange={(e) => setFilters({ ...filters, owner: e.target.value })}
        />
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

      <table className="room-table">
        <thead>
          <tr>
            <th>Tên phòng</th>
            <th>Loại phòng</th>
            <th>Chủ phòng</th>
            <th>Thành viên</th>
            <th>Ngày tạo</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {filteredRooms.map((room) => (
            <tr key={room.id}>
              <td>{room.name}</td>
              <td>{room.kind}</td>
              <td>{uidToName[room.ownerUid] || "Ẩn danh"}</td>
              <td>{room.members.length}</td>
              <td>{room.createdAt}</td>
              <td className="actions">
                <button
                  className="view-btn"
                  onClick={() => setSelectedRoom(room)}
                >
                  👁 Xem
                </button>
                <button
                  className="delete-btn"
                  onClick={() => handleDelete(room.id)}
                >
                  🗑 Xóa
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedRoom && (
        <div className="room-modal">
          <div className="room-modal-content">
            <h3>Chi tiết phòng: {selectedRoom.name}</h3>
            <p>
              <strong>Loại:</strong> {selectedRoom.kind}
            </p>
            <p>
              <strong>Chủ phòng:</strong> {uidToName[selectedRoom.ownerUid] || "Ẩn danh"}
            </p>
            <p>
              <strong>Thành viên ({selectedRoom.members.length}):</strong>
            </p>
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
            <p>
              <strong>Ngày tạo:</strong> {selectedRoom.createdAt}
            </p>
            <p>
              <strong>Thời gian tin nhắn cuối:</strong> {selectedRoom.updatedAt}
            </p>
            <div className="modal-actions">
              <button onClick={() => setSelectedRoom(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
