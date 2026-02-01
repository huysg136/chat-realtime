import { useEffect, useState, useContext } from "react";
import { db } from "../../../firebase/config";
import {
  collection,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  getDocs,
  query,
  where,
  addDoc,
  deleteField
} from "firebase/firestore";
import { AuthContext } from "../../../context/authProvider";
import { toast } from "react-toastify";
import { FiArrowUp, FiArrowDown, FiSlash, FiUnlock, FiInfo, FiCheckCircle, FiCopy } from "react-icons/fi";
import NoAccess from "../noAccess/noAccess";
import { IoIosCloseCircleOutline } from "react-icons/io";
import { Table, Spin } from "antd";
import "react-toastify/dist/ReactToastify.css";
import "./userManager.scss";

export const getUserDocIdByUid = async (uid) => {
  try {
    const q = query(collection(db, "users"), where("uid", "==", uid));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].id;
    }
    return null;
  } catch (err) {
    return null;
  }
};

export default function UsersManager() {
  const { user: currentUser } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [bans, setBans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    uid: "",
    username: "",
    displayName: "",
    email: "",
    role: "",
    status: "",
  });
  

  const [isBanModalVisible, setIsBanModalVisible] = useState(false);
  const [banDays, setBanDays] = useState(1);
  const [targetUser, setTargetUser] = useState(null);

  const [isBanDetailModalVisible, setIsBanDetailModalVisible] = useState(false);
  const [banDetail, setBanDetail] = useState(null);

  const showBanDetailModal = (ban) => {
    setBanDetail(ban);
    setIsBanDetailModalVisible(true);
  };

  const handleBanDetailCancel = () => setIsBanDetailModalVisible(false);

  useEffect(() => {
    setLoading(true);
    const unsubscribeUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      const userList = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setUsers(userList);
    });

    const unsubscribeBans = onSnapshot(collection(db, "bans"), (snapshot) => {
      const banList = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        banEnd: new Date(d.data().banEnd),
      }));
      setBans(banList);
      setLoading(false);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeBans();
    };
  }, []);

  if (!currentUser?.permissions?.canManageUsers && currentUser.role !== "admin") {
    return <NoAccess />;
  }

  const getRemainingTime = (banEnd) => {
    const now = new Date();
    const diffMs = new Date(banEnd) - now;

    if (diffMs <= 0) return "0 giây";

    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return `${diffSec} giây`;

    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} phút`;

    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} giờ`;

    const diffDay = Math.floor(diffHour / 24);
    return `${diffDay} ngày`;
  };

  const handleRoleChange = async (user) => {
    if (user.role === "admin") {
      toast.warning("Không thể đổi vai trò admin");
      return;
    }

    if (
      currentUser.role === "moderator" &&
      (user.role === "moderator" || user.uid === currentUser.uid)
    ) {
      toast.warning("Moderator không được đổi vai trò moderator khác hoặc chính mình");
      return;
    }

    const nextRole = user.role === "user" ? "moderator" : "user";
    const docId = await getUserDocIdByUid(user.uid);
    if (!docId) {
      toast.error("Không tìm thấy user trong Firestore");
      return;
    }

    try {
      if (nextRole === "moderator") {
        await updateDoc(doc(db, "users", docId), {
          role: nextRole,
          permissions: {
            canAccessAdminPage: true,
            canManageUsers: false,
            canManageRooms: false,
            canManageReports: false,
            canManageAnnouncements: false,
            canToggleMaintenance: false,
          },
        });
        toast.success(`Đã nâng ${user.displayName} lên moderator`);
      } else {
        await updateDoc(doc(db, "users", docId), {
          role: nextRole,
          permissions: deleteField(),
        });
        toast.success(`Đã hạ ${user.displayName} xuống user`);
      }
    } catch (err) {
      toast.error("Đổi role thất bại");
    }
  };


  const showBanModal = (user) => {
    setTargetUser(user);
    setBanDays(1);
    setIsBanModalVisible(true);
  };

  const handleBanOk = async () => {
    if (!targetUser) return;
    const banStart = new Date();
    const banEnd = new Date(banStart.getTime() + banDays * 24 * 60 * 60 * 1000);

    try {
      await addDoc(collection(db, "bans"), {
        uid: targetUser.uid,
        displayName: targetUser.displayName,
        email: targetUser.email,
        role: targetUser.role,
        banStart: banStart.toISOString(),
        banEnd: banEnd.toISOString(),
      });
      toast.success(`Đã cấm chat ${targetUser.displayName} trong ${banDays} ngày`);
    } catch (err) {
      toast.error("Cấm chat thất bại");
    } finally {
      setIsBanModalVisible(false);
    }
  };

  const handleBanCancel = () => setIsBanModalVisible(false);

  const unbanUser = async (banDocId) => {
    try {
      await deleteDoc(doc(db, "bans", banDocId));
      toast.success("Đã mở cấm thành công");
    } catch (err) {
      toast.error("Mở cấm thất bại");
    }
  };

  const getBanInfo = (uid) => {
    const ban = bans.find((b) => b.uid === uid && b.banEnd > new Date());
    if (ban) {
      const remainingDays = Math.ceil((ban.banEnd - new Date()) / (1000 * 60 * 60 * 24));
      return { status: "Cấm chat", remainingDays, banId: ban.id };
    }
    return { status: "Hoạt động", remainingDays: 0 };
  };

  const filteredUsers = users
    .filter((user) =>
      user.uid.toLowerCase().includes(filters.uid.toLowerCase())
    )
    .filter((user) =>
      user.username?.toLowerCase().includes(filters.username?.toLowerCase())
    )
    .filter((user) =>
      user.displayName.toLowerCase().includes(filters.displayName.toLowerCase())
    )
    .filter((user) =>
      user.email.toLowerCase().includes(filters.email.toLowerCase())
    )
    .filter((user) => (filters.role ? user.role === filters.role : true))
    .filter((user) => {
      if (!filters.status) return true;
      const banInfo = getBanInfo(user.uid);
      return banInfo.status === filters.status;
    });

  const columns = [
    {
      title: "Avatar",
      dataIndex: "photoURL",
      key: "photoURL",
      width: 50,
      render: (photoURL, record) => (
        <img src={photoURL} alt={record.displayName} width="40" height="40" />
      ),
    },
    {
      title: "UID",
      dataIndex: "uid",
      key: "uid",
      width: 150,
      render: (uid) => (
        <span
          className="copyable"
          title={uid}
          onClick={() => {
            navigator.clipboard.writeText(uid);
            toast.info("Đã sao chép", { autoClose: 1200 });
          }}
        >
          <span className="text">
            {uid.length > 12 ? `${uid.slice(0, 6)}...${uid.slice(-4)}` : uid}
          </span>
          <FiCopy className="copy-icon" size={15} />
        </span>
      ),
    },
    {
      title: "Quik ID",
      dataIndex: "username",
      key: "username",
      width: 150,
      render: (username) => (
        <span
          className="copyable"
          title={username}
          onClick={() => {
            navigator.clipboard.writeText(username);
            toast.info("Đã sao chép", { autoClose: 1200 });
          }}
        >
          <span className="text">
            {username.length > 12 ? `${username.slice(0, 12)}...` : username}
          </span>
          <FiCopy className="copy-icon" size={15} />
        </span>
      ),
    },

    {
      title: "Tên hiển thị",
      dataIndex: "displayName",
      key: "displayName",
      width: 180,
      render: (name) => (
        <span
          className="copyable"
          title={name}
          onClick={() => {
            navigator.clipboard.writeText(name);
            toast.info("Đã sao chép", { autoClose: 1200 });
          }}
        >
          <span className="text">
            {name.length > 15 ? `${name.slice(0, 15)}...` : name}
          </span>
          <FiCopy className="copy-icon" size={15} />
        </span>
      ),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: 200,
      render: (email) => {
        if (!email) return "";
        const [localPart, domainPart] = email.split("@");
        const maxLength = 18;
        let displayEmail = email;
        if (email.length > maxLength) {
          const localDisplay = localPart.length > 12 ? `${localPart.slice(0, 12)}...` : localPart;
          displayEmail = `${localDisplay}@${domainPart}`;
        }
        return (
          <span
            className="copyable"
            title={email}
            onClick={() => {
              navigator.clipboard.writeText(email);
              toast.info("Đã sao chép", { autoClose: 1200 });
            }}
          >
            <span className="text">{displayEmail}</span>
            <FiCopy className="copy-icon" size={15} />
          </span>
        );
      },
    },
    {
      title: "Quyền",
      dataIndex: "role",
      key: "role",
      width: 100,
      render: (role) => (
        <strong
          className={`role-tag ${
            role === "admin"
              ? "admin"
              : role === "moderator"
              ? "moderator"
              : "user"
          }`}
        >
          {role || "user"}
        </strong>
      ),
    },
    {
      title: "Trạng thái",
      key: "status",
      width: 110,
      render: (_, record) => {
        const banInfo = getBanInfo(record.uid);
        const banData = bans.find((b) => b.id === banInfo.banId);
        return banInfo.status === "Cấm chat" ? (
          <span
            style={{
              cursor: "pointer",
              color: "#f44336",
              fontWeight: "400",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
            onClick={() => showBanDetailModal(banData)}
          >
            {banInfo.status} <FiInfo size={16} />
          </span>
        ) : (
          <span
            style={{
              cursor: "default",
              color: "#73d13d",
              fontWeight: "400",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            Mở chat <FiCheckCircle size={16} />
          </span>
        );
      },
    },
    {
      title: "Hành động",
      key: "actions",
      width: 150,
      render: (_, record) => {
        const banInfo = getBanInfo(record.uid);
        return (
          <>
            <button
              className={`btn-edit ${
                record.role === "moderator" ? "demote" : "promote"
              }`}
              onClick={() => handleRoleChange(record)}
              disabled={
                (currentUser.role === "admin" && record.role !== "admin")
                  ? false
                  : (currentUser.role === "moderator" && record.role === "user")
                  ? false
                  : true
              }
            >
              {record.role === "moderator" ? (
                <>
                  <FiArrowDown /> Thu hồi quyền
                </>
              ) : (
                <>
                  <FiArrowUp /> Trao quyền
                </>
              )}
            </button>

            {banInfo.status === "Cấm chat" ? (
              <button
                className="btn-unban"
                onClick={() => unbanUser(banInfo.banId)}
                disabled={
                  (currentUser.role === "admin" && record.role !== "admin")
                    ? false
                    : (currentUser.role === "moderator" && record.role === "user")
                    ? false
                    : true
                }
              >
                <FiUnlock /> Mở cấm
              </button>
            ) : (
              <button
                className="btn-ban"
                onClick={() => showBanModal(record)}
                disabled={
                  (currentUser.role === "admin" && record.role !== "admin")
                    ? false
                    : (currentUser.role === "moderator" && record.role === "user")
                    ? false
                    : true
                }
              >
                <FiSlash /> Cấm chat
              </button>
            )}
          </>
        );
      },
    },
  ];


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

  return (
    <div className="user-manager">
      <div className="filters">
        <input
          type="text"
          placeholder="UID..."
          value={filters.uid}
          onChange={(e) => setFilters({ ...filters, uid: e.target.value })}
        />
        <input
          type="text"
          placeholder="Username..."
          value={filters.username}
          onChange={(e) => setFilters({ ...filters, username: e.target.value })} 
        />
        <input
          type="text"
          placeholder="Tên hiển thị..."
          value={filters.displayName}
          onChange={(e) => setFilters({ ...filters, displayName: e.target.value })}
        />
        <input
          type="text"
          placeholder="Email..."
          value={filters.email}
          onChange={(e) => setFilters({ ...filters, email: e.target.value })}
        />
        <select
          value={filters.role}
          onChange={(e) => setFilters({ ...filters, role: e.target.value })}
        >
          <option value="">Tất cả quyền</option>
          <option value="admin">Admin</option>
          <option value="moderator">Moderator</option>
          <option value="user">User</option>
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="Hoạt động">Hoạt động</option>
          <option value="Cấm chat">Cấm chat</option>
        </select>
      </div>

      <Table
        columns={columns}
        dataSource={filteredUsers}
        rowKey="id"
        pagination={{ pageSize: 10 }}
      />

      {isBanModalVisible && targetUser && (
        <div className="ban-modal">
          <div className="ban-modal-content">
            <h3>Cấm {targetUser.displayName}</h3>
            <label>Số ngày cấm:</label>
            <input
              type="number"
              min={1}
              value={banDays}
              onChange={(e) => setBanDays(Number(e.target.value))}
            />
            <div className="modal-actions">
              <button className="btn-close" onClick={handleBanCancel}>
                <IoIosCloseCircleOutline /> Hủy
              </button>
              <button className="btn-ban" onClick={handleBanOk}>
                <FiSlash /> Cấm
              </button>
            </div>
          </div>
        </div>
      )}

      {isBanDetailModalVisible && banDetail && (
        <div className="ban-detail-modal">
          <div className="ban-detail-content">
            <h3>Chi tiết cấm: <span>{banDetail.displayName}</span></h3>
            <p>
              <strong>Email:</strong> {banDetail.email}
            </p>
            <p>
              <strong>Quyền:</strong> {banDetail.role}
            </p>
            <p>
              <strong>Bắt đầu:</strong> {new Date(banDetail.banStart).toLocaleString()}
            </p>
            <p>
              <strong>Kết thúc:</strong> {new Date(banDetail.banEnd).toLocaleString()}
            </p>
            <p>
              <strong>Còn lại:</strong>{" "}
              {getRemainingTime(banDetail.banEnd)}
            </p>
            <div className="modal-actions">
              <button className="btn-close" onClick={handleBanDetailCancel}>
                <IoIosCloseCircleOutline /> Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
