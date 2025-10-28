import React, { useEffect, useState, useContext } from "react";
import { db } from "../../firebase/config";
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
} from "firebase/firestore";
import { AuthContext } from "../../context/authProvider";
import { toast, ToastContainer } from "react-toastify";
import { FiArrowUp, FiArrowDown, FiSlash, FiUnlock } from "react-icons/fi";
import "react-toastify/dist/ReactToastify.css";
import "./userManager.scss";

// 🔍 Lấy docId từ uid
export const getUserDocIdByUid = async (uid) => {
  try {
    const q = query(collection(db, "users"), where("uid", "==", uid));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].id;
    }
    return null;
  } catch (err) {
    console.error("Error getUserDocIdByUid:", err);
    return null;
  }
};

export default function UsersManager() {
  const { user: currentUser } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [bans, setBans] = useState([]);
  const [loading, setLoading] = useState(true);

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
      await updateDoc(doc(db, "users", docId), { role: nextRole });
      toast.success(
        nextRole === "moderator"
          ? `Đã nâng ${user.displayName} lên moderator`
          : `Đã hạ ${user.displayName} xuống user`
      );
    } catch (err) {
      console.error(err);
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
      console.error(err);
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
      console.error(err);
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

  if (loading) return <p>Đang tải danh sách người dùng...</p>;

  return (
    <div className="user-manager">
      <ToastContainer position="top-center" autoClose={2000} />
      <h2>Quản lý người dùng</h2>
      <table>
        <thead>
          <tr>
            <th>Avatar</th>
            <th>Tên hiển thị</th>
            <th>Email</th>
            <th>Quyền</th>
            <th>Trạng thái</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const banInfo = getBanInfo(u.uid);
            const banData = bans.find((b) => b.id === banInfo.banId);

            return (
              <tr key={u.id}>
                <td>
                  <img src={u.photoURL} alt={u.displayName} width="40" height="40" />
                </td>
                <td>{u.displayName}</td>
                <td>{u.email}</td>
                <td>
                  <strong
                    className={`role-tag ${
                      u.role === "admin"
                        ? "admin"
                        : u.role === "moderator"
                        ? "moderator"
                        : "user"
                    }`}
                  >
                    {u.role || "user"}
                  </strong>
                </td>
                <td>
                  {banInfo.status === "Cấm chat" ? (
                    <span
                      style={{ cursor: "pointer", color: "#f44336", fontWeight: "500" }}
                      onClick={() => showBanDetailModal(banData)}
                    >
                      {banInfo.status} ({banInfo.remainingDays} ngày còn lại)
                    </span>
                  ) : (
                    "Hoạt động"
                  )}
                </td>
                <td>
                  <button
                    className={`btn-edit ${u.role === "moderator" ? "demote" : "promote"}`}
                    onClick={() => handleRoleChange(u)}
                    disabled={
                      u.role === "admin" ||
                      (currentUser.role === "moderator" &&
                        (u.role === "moderator" || u.uid === currentUser.uid))
                    }
                  >
                    {u.role === "moderator" ? (
                      <>
                        <FiArrowDown /> Hạ quyền
                      </>
                    ) : (
                      <>
                        <FiArrowUp /> Nâng quyền
                      </>
                    )}
                  </button>

                  {banInfo.status === "Cấm chat" ? (
                    <button
                      className="btn-unban"
                      onClick={() => unbanUser(banInfo.banId)}
                    >
                      <FiUnlock /> Mở cấm
                    </button>
                  ) : (
                    <button
                      className="btn-ban"
                      onClick={() => showBanModal(u)}
                      disabled={
                        u.role === "admin" ||
                        (currentUser.role === "moderator" &&
                          (u.role === "moderator" || u.uid === currentUser.uid))
                      }
                    >
                      <FiSlash /> Cấm chat
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Modal cấm chat */}
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
                Đóng
              </button>
              <button className="btn-ban" onClick={handleBanOk}>
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal chi tiết ban */}
      {isBanDetailModalVisible && banDetail && (
        <div className="ban-detail-modal">
          <div className="ban-detail-content">
            <h3>Chi tiết ban: {banDetail.displayName}</h3>
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
              {Math.ceil((new Date(banDetail.banEnd) - new Date()) / (1000 * 60 * 60 * 24))}{" "}
              ngày
            </p>
            <div className="modal-actions">
              <button className="btn-close" onClick={handleBanDetailCancel}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
