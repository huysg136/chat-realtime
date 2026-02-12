import { useEffect, useState, useContext } from "react";
import { db } from "../../../firebase/config";
import {
  collection, onSnapshot, deleteDoc, doc,
  updateDoc, getDocs, query, where, addDoc, deleteField
} from "firebase/firestore";
import { AuthContext } from "../../../context/authProvider";
import { toast } from "react-toastify";
import {
  FiArrowUp, FiArrowDown, FiSlash, FiUnlock,
  FiInfo, FiCheckCircle, FiCopy, FiEye
} from "react-icons/fi";
import { IoCheckmarkCircle, IoCloseCircle } from "react-icons/io5";
import NoAccess from "../noAccess/noAccess";
import { IoIosCloseCircleOutline } from "react-icons/io";
import { Table, Spin } from "antd";
import "react-toastify/dist/ReactToastify.css";
import "./userManager.scss";
import { formatBytes, getQuotaLimit } from "../../../utils/quota";
import { useUserStatus } from "../../../hooks/useUserStatus";

export const getUserDocIdByUid = async (uid) => {
  try {
    const q = query(collection(db, "users"), where("uid", "==", uid));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) return querySnapshot.docs[0].id;
    return null;
  } catch { return null; }
};

const UserDetailStatus = ({ uid }) => {
  const status = useUserStatus(uid);

  const formatDate = (value) => {
    if (!value) return "—";
    const d = new Date(value);
    return isNaN(d.getTime()) ? "—" : d.toLocaleString("vi-VN");
  };

  if (status?.isOnline) return <span style={{ color: "#52c41a", fontWeight: 500 }}>Online</span>;
  return <span>{formatDate(status?.lastOnline)}</span>;
};

const PREMIUM_CONFIG = {
  free: { 
    label: "Free", 
    color: "#8c8c8c", 
    bg: "rgba(140,140,140,0.1)",
    className: "" 
  },
  lite: { 
    label: "Lite", 
    color: "#a67c52", 
    bg: "rgba(166,124,82,0.1)", 
    className: "text-luxury-bronze" 
  },
  pro: { 
    label: "Pro", 
    color: "#9ea1a6", 
    bg: "rgba(158,161,166,0.1)", 
    className: "text-luxury-silver" 
  },
  max: { 
    label: "Max", 
    color: "#d4af37", 
    bg: "rgba(212,175,55,0.1)", 
    className: "text-luxury-gold" 
  },
};

export default function UsersManager() {
  const { user: currentUser } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [bans, setBans] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    uid: "", username: "", displayName: "", email: "", role: "", status: "", premiumLevel: "",
  });

  const [isBanModalVisible, setIsBanModalVisible] = useState(false);
  const [banDays, setBanDays] = useState(1);
  const [targetUser, setTargetUser] = useState(null);
  const [isBanDetailModalVisible, setIsBanDetailModalVisible] = useState(false);
  const [banDetail, setBanDetail] = useState(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [detailUser, setDetailUser] = useState(null);

  useEffect(() => {
    setLoading(true);
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubBans = onSnapshot(collection(db, "bans"), (snap) => {
      setBans(snap.docs.map((d) => ({ id: d.id, ...d.data(), banEnd: new Date(d.data().banEnd) })));
      setLoading(false);
    });
    return () => { unsubUsers(); unsubBans(); };
  }, []);

  if (!currentUser?.permissions?.canManageUsers && currentUser.role !== "admin") return <NoAccess />;

  const getRemainingTime = (banEnd) => {
    const diffMs = new Date(banEnd) - new Date();
    if (diffMs <= 0) return "0 giây";
    const s = Math.floor(diffMs / 1000);
    if (s < 60) return `${s} giây`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m} phút`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} giờ`;
    return `${Math.floor(h / 24)} ngày`;
  };

  const getBanInfo = (uid) => {
    const ban = bans.find((b) => b.uid === uid && b.banEnd > new Date());
    if (ban) return { status: "Cấm chat", banId: ban.id };
    return { status: "Hoạt động", banId: null };
  };

  const handleRoleChange = async (user) => {
    if (user.role === "admin") { toast.warning("Không thể đổi vai trò admin"); return; }
    if (currentUser.role === "moderator" && (user.role === "moderator" || user.uid === currentUser.uid)) {
      toast.warning("Moderator không được đổi vai trò moderator khác"); return;
    }
    const nextRole = user.role === "user" ? "moderator" : "user";
    const docId = await getUserDocIdByUid(user.uid);
    if (!docId) { toast.error("Không tìm thấy user"); return; }
    try {
      if (nextRole === "moderator") {
        await updateDoc(doc(db, "users", docId), {
          role: nextRole,
          permissions: {
            canAccessAdminPage: true, canManageUsers: false,
            canManageRooms: false, canManageReports: false,
            canManageAnnouncements: false, canToggleMaintenance: false,
          },
        });
        toast.success(`Đã nâng ${user.displayName} lên moderator`);
      } else {
        await updateDoc(doc(db, "users", docId), { role: nextRole, permissions: deleteField() });
        toast.success(`Đã hạ ${user.displayName} xuống user`);
      }
    } catch { toast.error("Đổi role thất bại"); }
  };

  const handleBanOk = async () => {
    if (!targetUser) return;
    const banStart = new Date();
    const banEnd = new Date(banStart.getTime() + banDays * 86400000);
    try {
      await addDoc(collection(db, "bans"), {
        uid: targetUser.uid, displayName: targetUser.displayName,
        email: targetUser.email, role: targetUser.role,
        banStart: banStart.toISOString(), banEnd: banEnd.toISOString(),
      });
      toast.success(`Đã cấm ${targetUser.displayName} ${banDays} ngày`);
    } catch { toast.error("Cấm chat thất bại"); }
    finally { setIsBanModalVisible(false); }
  };

  const unbanUser = async (banDocId) => {
    try { await deleteDoc(doc(db, "bans", banDocId)); toast.success("Đã mở cấm"); }
    catch { toast.error("Mở cấm thất bại"); }
  };

  const handleResetQuota = async (user) => {
    const docId = await getUserDocIdByUid(user.uid);
    if (!docId) return;
    try {
      await updateDoc(doc(db, "users", docId), { quotaUsed: 0 });
      toast.success(`Đã reset quota của ${user.displayName}`);
      setDetailUser(prev => prev ? { ...prev, quotaUsed: 0 } : prev);
    } catch { toast.error("Reset quota thất bại"); }
  };

  const handleGrantPremium = async (targetUsr, level, days) => {
    const docId = await getUserDocIdByUid(targetUsr.uid);
    if (!docId) return;
    const until = days ? new Date(Date.now() + days * 86400000).toISOString() : null;
    try {
      await updateDoc(doc(db, "users", docId), { premiumLevel: level, premiumUntil: until });
      toast.success(`Đã cấp ${level.toUpperCase()} cho ${targetUsr.displayName}`);
      setDetailUser(prev => prev ? { ...prev, premiumLevel: level, premiumUntil: until } : prev);
    } catch { toast.error("Cấp premium thất bại"); }
  };

  const handleRevokePremium = async (targetUsr) => {
    const docId = await getUserDocIdByUid(targetUsr.uid);
    if (!docId) return;
    try {
      await updateDoc(doc(db, "users", docId), { premiumLevel: "free", premiumUntil: null, quotaUsed: 0 });
      toast.success(`Đã thu hồi premium của ${targetUsr.displayName}`);
      setDetailUser(prev => prev ? { ...prev, premiumLevel: "free", premiumUntil: null, quotaUsed: 0 } : prev);
    } catch { toast.error("Thu hồi thất bại"); }
  };

  const copyText = (text) => {
    navigator.clipboard.writeText(text);
    toast.info("Đã sao chép", { autoClose: 1200 });
  };

  const toDate = (value) => {
    if (!value) return null;
    if (value?.toDate) return value.toDate();
    if (value instanceof Date) return value;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  };

  const formatDateShort = (value) => {
    const d = toDate(value);
    if (!d) return "—";
    return d.toLocaleDateString("vi-VN");
  };

  const filteredUsers = users
    .filter((u) => u.uid?.toLowerCase().includes(filters.uid.toLowerCase()))
    .filter((u) => u.username?.toLowerCase().includes(filters.username.toLowerCase()))
    .filter((u) => u.displayName?.toLowerCase().includes(filters.displayName.toLowerCase()))
    .filter((u) => u.email?.toLowerCase().includes(filters.email.toLowerCase()))
    .filter((u) => filters.role ? u.role === filters.role : true)
    .filter((u) => filters.premiumLevel ? u.premiumLevel === filters.premiumLevel : true)
    .filter((u) => {
      if (!filters.status) return true;
      return getBanInfo(u.uid).status === filters.status;
    });

  const columns = [
    {
      title: "Avatar", dataIndex: "photoURL", key: "photoURL", width: 55,
      render: (url, r) => <img src={url} alt={r.displayName} className="user-avatar" />,
    },
    {
      title: "UID", dataIndex: "uid", key: "uid", width: 130,
      render: (uid) => (
        <span className="copyable" onClick={() => copyText(uid)} title={uid}>
          <span className="text">{uid?.slice(0, 6)}...{uid?.slice(-4)}</span>
          <FiCopy className="copy-icon" size={13} />
        </span>
      ),
    },
    {
      title: "Quik ID", dataIndex: "username", key: "username", width: 120,
      render: (v) => (
        <span className="copyable" onClick={() => copyText(v)} title={v}>
          <span className="text">@{v?.length > 10 ? v.slice(0, 10) + "..." : v}</span>
          <FiCopy className="copy-icon" size={13} />
        </span>
      ),
    },
    {
      title: "Tên hiển thị", dataIndex: "displayName", key: "displayName", width: 160,
      render: (v) => (
        <span className="copyable" onClick={() => copyText(v)} title={v}>
          <span className="text">{v?.length > 14 ? v.slice(0, 14) + "..." : v}</span>
          <FiCopy className="copy-icon" size={13} />
        </span>
      ),
    },
    {
      title: "Email", dataIndex: "email", key: "email", width: 180,
      render: (email) => {
        if (!email) return "";
        const display = email.length > 20 ? email.slice(0, 16) + "..." : email;
        return (
          <span className="copyable" onClick={() => copyText(email)} title={email}>
            <span className="text">{display}</span>
            <FiCopy className="copy-icon" size={13} />
          </span>
        );
      },
    },
    {
      title: "Quyền", dataIndex: "role", key: "role", width: 100,
      render: (role) => (
        <strong className={`role-tag ${role}`}>{role || "user"}</strong>
      ),
    },
    {
      title: "Premium",
      key: "premium",
      width: 100,
      render: (_, record) => {
        const level = record.premiumLevel;
        const cfg = PREMIUM_CONFIG[level];
        
        return (
          <span className="premium-badge" style={{ background: cfg.bg }}>
            <strong className={cfg.className} style={{ fontSize: '12px', fontWeight: '500' }}>
              {cfg.label}
            </strong>
          </span>
        );
      },
    },
    {
      title: "Trạng thái", key: "status", width: 120,
      render: (_, record) => {
        const banInfo = getBanInfo(record.uid);
        const banData = bans.find((b) => b.id === banInfo.banId);
        return banInfo.status === "Cấm chat" ? (
          <span className="status-banned" onClick={() => { setBanDetail(banData); setIsBanDetailModalVisible(true); }}>
            {banInfo.status} <FiInfo size={14} />
          </span>
        ) : (
          <span className="status-active">Mở chat <FiCheckCircle size={14} /></span>
        );
      },
    },
    {
      title: "Hành động", key: "actions", width: 160,
      render: (_, record) => {
        const banInfo = getBanInfo(record.uid);
        const canAct = currentUser.role === "admin"
          ? record.role !== "admin"
          : currentUser.role === "moderator" && record.role === "user";
        return (
          <div className="action-btns">
            <button className="btn-detail" onClick={() => { setDetailUser(record); setIsDetailModalVisible(true); }}>
              <FiEye />
            </button>
            <button
              className={`btn-edit ${record.role === "moderator" ? "demote" : "promote"}`}
              onClick={() => handleRoleChange(record)}
              disabled={!canAct}
            >
              {record.role === "moderator" ? <><FiArrowDown /> </> : <><FiArrowUp /></>}
            </button>
            {banInfo.status === "Cấm chat" ? (
              <button className="btn-unban" onClick={() => unbanUser(banInfo.banId)} disabled={!canAct}>
                <FiUnlock />
              </button>
            ) : (
              <button className="btn-ban" onClick={() => { setTargetUser(record); setBanDays(1); setIsBanModalVisible(true); }} disabled={!canAct}>
                <FiSlash />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  if (loading) return (
    <div className="loading-center"><Spin size="large" /></div>
  );

  return (
    <div className="user-manager">
      <div className="filters">
        <input placeholder="UID..." value={filters.uid} onChange={(e) => setFilters({ ...filters, uid: e.target.value })} />
        <input placeholder="Username..." value={filters.username} onChange={(e) => setFilters({ ...filters, username: e.target.value })} />
        <input placeholder="Tên hiển thị..." value={filters.displayName} onChange={(e) => setFilters({ ...filters, displayName: e.target.value })} />
        <input placeholder="Email..." value={filters.email} onChange={(e) => setFilters({ ...filters, email: e.target.value })} />
        <select value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value })}>
          <option value="">Tất cả quyền</option>
          <option value="admin">Admin</option>
          <option value="moderator">Moderator</option>
          <option value="user">User</option>
        </select>
        <select value={filters.premiumLevel} onChange={(e) => setFilters({ ...filters, premiumLevel: e.target.value })}>
          <option value="">Tất cả gói</option>
          <option value="free">Free</option>
          <option value="lite">Lite</option>
          <option value="pro">Pro</option>
          <option value="max">Max</option>
        </select>
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">Tất cả trạng thái</option>
          <option value="Hoạt động">Hoạt động</option>
          <option value="Cấm chat">Cấm chat</option>
        </select>
      </div>

      <Table columns={columns} dataSource={filteredUsers} rowKey="id" pagination={{ pageSize: 10 }} scroll={{ x: 1200 }} />

      {isBanModalVisible && targetUser && (
        <div className="ban-modal">
          <div className="ban-modal-content">
            <h3>Cấm {targetUser.displayName}</h3>
            <label>Số ngày cấm:</label>
            <input type="number" min={1} value={banDays} onChange={(e) => setBanDays(Number(e.target.value))} />
            <div className="modal-actions">
              <button className="btn-close" onClick={() => setIsBanModalVisible(false)}><IoIosCloseCircleOutline /> Hủy</button>
              <button className="btn-ban" onClick={handleBanOk}><FiSlash /> Cấm</button>
            </div>
          </div>
        </div>
      )}

      {isBanDetailModalVisible && banDetail && (
        <div className="ban-detail-modal">
          <div className="ban-detail-content">
            <h3>Chi tiết cấm: <span>{banDetail.displayName}</span></h3>
            <p><strong>Email:</strong> {banDetail.email}</p>
            <p><strong>Quyền:</strong> {banDetail.role}</p>
            <p><strong>Bắt đầu:</strong> {new Date(banDetail.banStart).toLocaleString("vi-VN")}</p>
            <p><strong>Kết thúc:</strong> {new Date(banDetail.banEnd).toLocaleString("vi-VN")}</p>
            <p><strong>Còn lại:</strong> {getRemainingTime(banDetail.banEnd)}</p>
            <div className="modal-actions">
              <button className="btn-close" onClick={() => setIsBanDetailModalVisible(false)}><IoIosCloseCircleOutline /> Đóng</button>
            </div>
          </div>
        </div>
      )}

      {isDetailModalVisible && detailUser && (
        <div className="detail-modal" onClick={() => setIsDetailModalVisible(false)}>
          <div className="detail-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="detail-modal-header">
              <img src={detailUser.photoURL} alt={detailUser.displayName} />
              <div>
                <h3>{detailUser.displayName}</h3>
                <span className={`role-tag ${detailUser.role}`}>{detailUser.role}</span>
                {(() => {
                  const level = detailUser.premiumLevel;
                  const cfg = PREMIUM_CONFIG[level];
                  return (
                    <span className="premium-badge" style={{ background: cfg.bg }}>
                      <strong className={cfg.className} style={{ fontSize: '12px', fontWeight: '500'}}>
                        {cfg.label}
                      </strong>
                    </span>
                  );
                })()}
              </div>
              <button className="btn-close-icon" onClick={() => setIsDetailModalVisible(false)}>
                <IoIosCloseCircleOutline size={24} />
              </button>
            </div>

            <div className="detail-grid">
              <div className="detail-section">
                <h4>Thông tin cơ bản</h4>
                <div className="detail-row">
                  <span>UID</span>
                  <span className="copyable" onClick={() => copyText(detailUser.uid)} title={detailUser.uid}>
                    {detailUser.uid?.slice(0, 8)}... <FiCopy size={12} />
                  </span>
                </div>
                <div className="detail-row">
                  <span>Quik ID</span>
                  <span className="copyable" onClick={() => copyText(detailUser.username)}>
                    @{detailUser.username} <FiCopy size={12} />
                  </span>
                </div>
                <div className="detail-row">
                  <span>Email</span>
                  <span className="copyable" onClick={() => copyText(detailUser.email)}>
                    {detailUser.email} <FiCopy size={12} />
                  </span>
                </div>
                <div className="detail-row">
                  <span>Provider</span>
                  <span className="provider-tag">{detailUser.providerId || "—"}</span>
                </div>
                <div className="detail-row">
                  <span>Online cuối</span>
                  <UserDetailStatus uid={detailUser.uid} />
                </div>
                <div className="detail-row">
                  <span>Ngôn ngữ</span>
                  <span>{detailUser.language || "—"}</span>
                </div>
                <div className="detail-row">
                  <span>Giao diện</span>
                  <span>{detailUser.theme || "—"}</span>
                </div>
              </div>

              <div className="detail-section">
                <h4>Cài đặt & Giới hạn</h4>
                <div className="detail-row">
                  <span>Cho mời nhóm</span>
                  <span className="bool-tag">
                    {detailUser.allowGroupInvite ? <IoCheckmarkCircle className="icon-v" /> : <IoCloseCircle className="icon-x" />}
                  </span>
                </div>
                <div className="detail-row">
                  <span>Hiện online</span>
                  <span className="bool-tag">
                    {detailUser.showOnlineStatus ? <IoCheckmarkCircle className="icon-v" /> : <IoCloseCircle className="icon-x" />}
                  </span>
                </div>
                <div className="detail-row">
                  <span>Bị cấm chat</span>
                  <span className="bool-tag">
                    {detailUser.isBanned ? <IoCheckmarkCircle className="icon-v" /> : <IoCloseCircle className="icon-x" />}
                  </span>
                </div>
                <div className="detail-row">
                  <span>Đổi username</span>
                  <span>{detailUser.usernameChangeCount || 0} lần</span>
                </div>
                <div className="detail-row">
                  <span>Lần đổi cuối</span>
                  <span>
                    {formatDateShort(detailUser.lastUsernameChange) === "—" ? "Chưa đổi" : formatDateShort(detailUser.lastUsernameChange)}
                  </span>
                </div>
              </div>
            </div>

            <div className="detail-section detail-section--full">
              <h4>Quản lý Premium</h4>
              <div className="premium-info-row">
                <div className="detail-row">
                  <span>Gói hiện tại</span>
                  <span>{(detailUser.premiumLevel || "free").toUpperCase()}</span>
                </div>
                <div className="detail-row">
                  <span>Hết hạn</span>
                  <span>
                    {formatDateShort(detailUser.premiumUntil)}
                  </span>
                </div>
              </div>
              {currentUser.role === "admin" && (
                <div className="premium-actions">
                  <button className="btn-grant lite" onClick={() => handleGrantPremium(detailUser, "lite", 30)}>Cấp Lite 30 ngày</button>
                  <button className="btn-grant pro" onClick={() => handleGrantPremium(detailUser, "pro", 30)}>Cấp Pro 30 ngày</button>
                  <button className="btn-grant max" onClick={() => handleGrantPremium(detailUser, "max", 30)}>Cấp Max 30 ngày</button>
                  {detailUser.premiumLevel !== "free" && (
                    <button className="btn-revoke" onClick={() => handleRevokePremium(detailUser)}>Thu hồi Premium</button>
                  )}
                </div>
              )}
            </div>

            <div className="detail-section detail-section--full">
              <h4>Quota lưu trữ</h4>
              {(() => {
                const used = detailUser.quotaUsed || 0;
                const limit = getQuotaLimit(detailUser);
                const pct = Math.min(100, Math.round((used / limit) * 100));
                return (
                  <>
                    <div className="quota-bar-large">
                      <div className="quota-bar-large__track">
                        <div
                          className={`quota-bar-large__fill ${pct >= 90 ? "danger" : pct >= 70 ? "warning" : ""}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="quota-bar-large__info">
                        <span>{formatBytes(used)} đã dùng</span>
                        <span className="quota-pct">{pct}%</span>
                        <span>Giới hạn: {formatBytes(limit)}</span>
                      </div>
                    </div>
                    {currentUser.role === "admin" && (
                      <button className="btn-reset-quota" onClick={() => handleResetQuota(detailUser)}>
                        Reset Quota
                      </button>
                    )}
                  </>
                );
              })()}
            </div>

            <div className="modal-actions">
              <button className="btn-close" onClick={() => setIsDetailModalVisible(false)}>
                <IoIosCloseCircleOutline /> Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}