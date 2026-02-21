import { useEffect, useState, useContext } from "react";
import { db } from "../../../firebase/config";
import { collection, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc, arrayRemove } from "firebase/firestore";
import { decryptMessage } from "../../../firebase/services";
import NoAccess from "../noAccess/noAccess";
import { AuthContext } from "../../../context/authProvider";
import { FiCopy, FiEye, FiTrash2, FiUserMinus } from "react-icons/fi";
import { FaKey } from "react-icons/fa6";
import { Table, Modal, Avatar } from "antd";
import { toast } from "react-toastify";
import "./roomManager.scss";
import LoadingScreen from '../../common/loadingScreen';
import UserBadge from "../../common/userBadge";
import CircularAvatarGroup from "../../common/circularAvatarGroup";

export default function RoomManager() {
  const { user: currentUser } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState([]);
  const [uidToName, setUidToName] = useState({});
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [deletingRoomId, setDeletingRoomId] = useState(null);
  const [filters, setFilters] = useState({
    id: "",
    name: "",
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
        map[data.uid] = {
          displayName: data.displayName || "Ẩn danh",
          photoURL: data.photoURL,
          username: data.username,
          role: data.role,
          premiumLevel: data.premiumLevel,
          premiumUntil: data.premiumUntil
        };
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

        const ownerUid = data.roles?.find((r) => r.role === "owner")?.uid || "Không rõ";

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

        const isActive = data.updatedAt?.toDate
          ? (new Date() - data.updatedAt.toDate()) / (1000 * 60 * 60 * 24) <= 7
          : false;

        return {
          id: docSnap.id,
          name: data.name || (data.kind === "private" || data.type === "private" ? "" : "Không tên"),
          kind:
            data.kind === "group" || data.type === "group"
              ? "Nhóm"
              : data.kind === "private" || data.type === "private"
                ? "Riêng tư"
                : "N/A",
          ownerUid,
          members: data.members || [],
          roles: data.roles || [],
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : null,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : null,
          lastMessage: lastMsg,
          secretKey: data.secretKey || "",
          isActive,
          avatar: data.avatar || null,
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

  if (loading) return <LoadingScreen />;

  const handleDeleteRoom = (roomId) => {
    Modal.confirm({
      title: "Xác nhận xóa phòng",
      content: "Bạn có chắc muốn xóa phòng này? Hành động không thể hoàn tác.",
      okText: "Xóa",
      okType: "danger",
      cancelText: "Hủy",
      zIndex: 10001,
      onOk: async () => {
        try {
          await deleteDoc(doc(db, "rooms", roomId));
          toast.success("Đã xóa phòng thành công");
          if (selectedRoom?.id === roomId) setSelectedRoom(null);
        } catch {
          toast.error("Xóa phòng thất bại");
        }
      },
    });
  };

  const handleKickMember = async (room, memberUid) => {
    const memberName = uidToName[memberUid]?.displayName || memberUid;
    Modal.confirm({
      title: `Kick ${memberName}?`,
      content: "Thành viên này sẽ bị xóa khỏi nhóm.",
      okText: "Kick",
      okType: "danger",
      cancelText: "Hủy",
      zIndex: 10001,
      onOk: async () => {
        try {
          const roleToRemove = room.roles.find((r) => r.uid === memberUid);
          await updateDoc(doc(db, "rooms", room.id), {
            members: arrayRemove(memberUid),
            roles: arrayRemove(roleToRemove),
          });
          setSelectedRoom((prev) =>
            prev
              ? {
                ...prev,
                members: prev.members.filter((m) => m !== memberUid),
                roles: prev.roles.filter((r) => r.uid !== memberUid),
              }
              : prev
          );
          toast.success(`Đã kick ${memberName}`);
        } catch {
          toast.error("Kick thành viên thất bại");
        }
      },
    });
  };

  const copyText = (text) => {
    navigator.clipboard.writeText(text);
    toast.info("Đã sao chép", { autoClose: 1200 });
  };

  const filteredRooms = rooms
    .filter((room) => room.id.toLowerCase().includes(filters.id.toLowerCase()))
    .filter((room) => room.name.toLowerCase().includes(filters.name.toLowerCase()))
    .filter((room) => (filters.kind ? room.kind === filters.kind : true))
    .filter((room) => {
      if (!filters.createdAt) return true;
      if (!room.createdAt) return false;
      const filterDate = new Date(filters.createdAt);
      return isSameDate(filterDate, room.createdAt);
    })
    .sort((a, b) => {
      if (filters.membersSort === "asc") return a.members.length - b.members.length;
      if (filters.membersSort === "desc") return b.members.length - a.members.length;
      return 0;
    });

  const totalRooms = rooms.length;
  const groupRooms = rooms.filter((r) => r.kind === "Nhóm").length;
  const privateRooms = rooms.filter((r) => r.kind === "Riêng tư").length;

  const columns = [
    {
      title: "ID phòng",
      dataIndex: "id",
      key: "id",
      width: 180,
      render: (uid) => (
        <span className="copyable" onClick={() => copyText(uid)} title={uid}>
          <span className="text">{uid?.slice(0, 8)}...{uid?.slice(-4)}</span>
          <FiCopy className="copy-icon" size={13} />
        </span>
      ),
    },
    {
      title: "Tên phòng",
      dataIndex: "name",
      key: "name",
      width: 180,
      render: (name) => (
        <span title={name}>{name?.length > 20 ? name.slice(0, 20) + "..." : name}</span>
      ),
    },
    {
      title: "Loại phòng",
      dataIndex: "kind",
      key: "kind",
      width: 110,
      render: (kind) => (
        <span className={`kind-tag ${kind === "Nhóm" ? "group" : "private"}`}>{kind}</span>
      ),
    },
    {
      title: "Thành viên",
      dataIndex: "members",
      key: "members",
      width: 100,
      render: (members) => members.length,
    },
    {
      title: "Tin nhắn cuối",
      dataIndex: "lastMessage",
      key: "lastMessage",
      width: 200,
      render: (msg) => (
        <span className="last-msg" title={msg}>
          {msg?.length > 30 ? msg.slice(0, 30) + "..." : msg}
        </span>
      ),
    },
    {
      title: "Cập nhật lần cuối",
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 160,
      render: (date) => date ? date.toLocaleString("vi-VN") : "N/A"
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 160,
      render: (date) => date ? date.toLocaleString("vi-VN") : "N/A"
    },
    {
      title: "Hành động",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <div className="action-btns">
          <button className="btn-detail" onClick={() => setSelectedRoom(record)} title="Xem chi tiết">
            <FiEye />
          </button>
          <button className="btn-delete" onClick={() => handleDeleteRoom(record.id)} title="Xóa phòng">
            <FiTrash2 />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="room-manager">
      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{totalRooms}</div>
          <div className="stat-label">Tổng phòng</div>
        </div>
        <div className="stat-card group">
          <div className="stat-value">{groupRooms}</div>
          <div className="stat-label">Phòng nhóm</div>
        </div>
        <div className="stat-card private">
          <div className="stat-value">{privateRooms}</div>
          <div className="stat-label">Riêng tư</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters">
        <input
          type="text"
          placeholder="ID phòng..."
          value={filters.id}
          onChange={(e) => setFilters({ ...filters, id: e.target.value })}
        />
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
        <div className="members-sort">
          <button
            onClick={() => {
              const nextSort =
                filters.membersSort === "" ? "asc" : filters.membersSort === "asc" ? "desc" : "";
              setFilters({ ...filters, membersSort: nextSort });
            }}
          >
            Thành viên{" "}
            {filters.membersSort === "asc" ? "↑" : filters.membersSort === "desc" ? "↓" : ""}
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
        scroll={{ x: 1200 }}
      />

      {/* Detail Modal */}
      {selectedRoom && (
        <div className="detail-modal" onClick={() => setSelectedRoom(null)}>
          <div className="detail-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="detail-modal-header">
              <div className="header-avatar-area">
                {selectedRoom.kind === "Nhóm" ? (
                  <CircularAvatarGroup
                    members={selectedRoom.members.map((m) => ({
                      avatar: uidToName[m]?.photoURL,
                      name: uidToName[m]?.displayName,
                    }))}
                    size={64}
                    maxDisplay={3}
                  />
                ) : (
                  <Avatar size={64} icon={<FiEye />} />
                )}
              </div>
              <div className="header-info">
                <div className={`kind-tag ${selectedRoom.kind === "Nhóm" ? "group" : "private"}`}>
                  {selectedRoom.kind}
                </div>
                <h3>{selectedRoom.kind === "Riêng tư" ? "Cuộc trò chuyện riêng tư" : selectedRoom.name}</h3>
              </div>
              <button className="btn-close-icon" onClick={() => setSelectedRoom(null)}>✕</button>
            </div>

            <div className="detail-grid">
              <div className="detail-section">
                <h4>Thông tin phòng</h4>
                <div className="detail-row">
                  <span>ID phòng</span>
                  <span className="copyable" onClick={() => copyText(selectedRoom.id)}>
                    {selectedRoom.id?.slice(0, 12)}... <FiCopy size={12} />
                  </span>
                </div>
                <div className="detail-row">
                  <span>Loại</span>
                  <span>{selectedRoom.kind}</span>
                </div>
                {selectedRoom.kind !== "Riêng tư" && (
                  <div className="detail-row">
                    <span>Chủ phòng</span>
                    <span>{uidToName[selectedRoom.ownerUid]?.displayName || "Ẩn danh"}</span>
                  </div>
                )}
                <div className="detail-row">
                  <span>Ngày tạo</span>
                  <span>{selectedRoom.createdAt ? selectedRoom.createdAt.toLocaleString("vi-VN") : "N/A"}</span>
                </div>
                <div className="detail-row">
                  <span>Cập nhật lần cuối</span>
                  <span>{selectedRoom.updatedAt ? selectedRoom.updatedAt.toLocaleString("vi-VN") : "N/A"}</span>
                </div>
              </div>

              <div className="detail-section">
                <h4>Tin nhắn cuối</h4>
                <div className="last-msg-full">{selectedRoom.lastMessage}</div>
              </div>
            </div>

            <div className="detail-section detail-section--full">
              <h4>
                {selectedRoom.kind === "Riêng tư"
                  ? "Người tham gia"
                  : `Thành viên (${selectedRoom.members.length})`}
              </h4>
              <div className="member-list">
                {selectedRoom.members.map((m) => {
                  const role = selectedRoom.roles.find((r) => r.uid === m)?.role || "member";
                  const isOwner = role === "owner";
                  const isCoOwner = role === "co-owner";
                  const isCurrentUser = m === currentUser.uid;
                  const mData = uidToName[m];

                  return (
                    <div className="member-row" key={m}>
                      <div className="member-info">
                        <Avatar src={mData?.photoURL} size="small" style={{ marginRight: 8 }}>
                          {mData?.displayName?.[0]?.toUpperCase()}
                        </Avatar>
                        <UserBadge
                          displayName={mData?.displayName || m}
                          role={mData?.role}
                          premiumLevel={mData?.premiumLevel}
                          premiumUntil={mData?.premiumUntil}
                          size={13}
                        />
                        {isOwner && <FaKey size={12} color="gold" style={{ marginLeft: 6 }} />}
                        {isCoOwner && <FaKey size={12} color="silver" style={{ marginLeft: 6 }} />}
                      </div>
                      {selectedRoom.kind === "Nhóm" && !isOwner && !isCurrentUser && (
                        <button
                          className="btn-kick"
                          onClick={() => handleKickMember(selectedRoom, m)}
                          title="Kick thành viên"
                        >
                          <FiUserMinus size={13} /> Kick
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="btn-delete-room"
                onClick={() => handleDeleteRoom(selectedRoom.id)}
              >
                <FiTrash2 /> Xóa phòng
              </button>
              <button className="btn-close" onClick={() => setSelectedRoom(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}