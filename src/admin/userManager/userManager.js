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
import { Modal, Input } from "antd";
import "react-toastify/dist/ReactToastify.css";
import { FiArrowUp, FiArrowDown } from "react-icons/fi"; // tăng/hạ quyền
import { FiSlash, FiUnlock } from "react-icons/fi"; // cấm / mở cấm
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

  const handleRoleChange = async (targetUser) => {
    if (targetUser.role === "admin") {
      toast.warning("Không thể đổi vai trò admin");
      return;
    }

    if (
      currentUser.role === "moderator" &&
      (targetUser.role === "moderator" || targetUser.uid === currentUser.uid)
    ) {
      toast.warning("Moderator không được đổi vai trò moderator khác hoặc chính mình");
      return;
    }

    const nextRole = targetUser.role === "user" ? "moderator" : "user";
    const docId = await getUserDocIdByUid(targetUser.uid);
    if (!docId) {
      toast.error("Không tìm thấy user trong Firestore");
      return;
    }

    try {
      await updateDoc(doc(db, "users", docId), { role: nextRole });
      if (nextRole === "moderator") {
        toast.success(`Đã nâng ${targetUser.displayName} lên moderator`);
      } else {
        toast.success(`Đã hạ ${targetUser.displayName} xuống user`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Đổi role thất bại");
    }
  };

  // Modal ban
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
      toast.success(`Đã ban ${targetUser.displayName} trong ${banDays} ngày`);
    } catch (err) {
      console.error(err);
      toast.error("Ban thất bại");
    } finally {
      setIsBanModalVisible(false);
    }
  };

  const handleBanCancel = () => setIsBanModalVisible(false);

  const unbanUser = async (banDocId) => {
    try {
      await deleteDoc(doc(db, "bans", banDocId));
      toast.success("Đã mở ban thành công");
    } catch (err) {
      console.error(err);
      toast.error("Mở ban thất bại");
    }
  };

  const getBanInfo = (uid) => {
    const ban = bans.find((b) => b.uid === uid && b.banEnd > new Date());
    if (ban) {
      const remainingDays = Math.ceil((ban.banEnd - new Date()) / (1000 * 60 * 60 * 24));
      return { status: "Bị cấm", remainingDays, banId: ban.id };
    }
    return { status: "Hoạt động", remainingDays: 0 };
  };

  if (loading) return <p>Đang tải danh sách người dùng...</p>;

  return (
    <div className="user-manager">
      <ToastContainer position="top-center" autoClose={2000} />
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
                  {banInfo.status}
                  {banInfo.remainingDays > 0 && ` (${banInfo.remainingDays} ngày còn lại)`}
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
                    {u.role === "moderator" ? <><FiArrowDown /> Hạ quyền</> : <><FiArrowUp /> Nâng quyền</>}
                  </button>

                  {banInfo.status === "Bị cấm" ? (
                    <button className="btn-unban" onClick={() => unbanUser(banInfo.banId)}>
                      <FiUnlock /> Mở ban
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
                      <FiSlash /> Ban
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <Modal
        title={`Cấm ${targetUser?.displayName}`}
        visible={isBanModalVisible}
        onOk={handleBanOk}
        onCancel={handleBanCancel}
      >
        <label>Số ngày ban:</label>
        <Input
          type="number"
          min={1}
          value={banDays}
          onChange={(e) => setBanDays(Number(e.target.value))}
        />
      </Modal>
    </div>
  );
}
