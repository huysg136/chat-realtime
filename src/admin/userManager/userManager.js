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
} from "firebase/firestore";
import { AuthContext } from "../../context/authProvider";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Modal } from "antd";
import "./userManager.scss";

// 🔍 Hàm tiện ích lấy docId từ uid
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      const userList = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setUsers(userList);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Đổi role
  const handleRoleChange = async (targetUser) => {
    if (targetUser.role === "admin") {
      toast.warning("❌ Không thể đổi vai trò admin!");
      return;
    }

    if (
      currentUser.role === "moderator" &&
      (targetUser.role === "moderator" || targetUser.uid === currentUser.uid)
    ) {
      toast.warning("⚠️ Moderator không được đổi vai trò moderator khác hoặc chính mình!");
      return;
    }

    const nextRole = targetUser.role === "user" ? "moderator" : "user";
    const docId = await getUserDocIdByUid(targetUser.uid);
    if (!docId) {
      toast.error("Không tìm thấy user trong Firestore!");
      return;
    }

    try {
      await updateDoc(doc(db, "users", docId), { role: nextRole });
      toast.success(`✅ Đã đổi quyền thành ${nextRole}!`);
    } catch (err) {
      console.error(err);
      toast.error("❌ Đổi role thất bại!");
    }
  };

  if (loading) return <p>Đang tải danh sách người dùng...</p>;

  return (
    <div className="user-manager">
      {/* <h2>Quản lý người dùng</h2> */}
      <ToastContainer position="top-center" autoClose={2000} />
      <table>
        <thead>
          <tr>
            <th>Avatar</th>
            <th>Tên hiển thị</th>
            <th>Email</th>
            <th>Quyền</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
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
                <button
                  className="btn-edit"
                  onClick={() => handleRoleChange(u)}
                  disabled={
                    u.role === "admin" ||
                    (currentUser.role === "moderator" &&
                      (u.role === "moderator" || u.uid === currentUser.uid))
                  }
                >
                  🔁 Đổi quyền
                </button>
                <button
                  className="btn-ban"
                  disabled={
                    u.role === "admin" ||
                    (currentUser.role === "moderator" &&
                      (u.role === "moderator" || u.uid === currentUser.uid))
                  }
                >
                  ⛔ Ban
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
