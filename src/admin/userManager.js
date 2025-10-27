import React, { useEffect, useState } from "react";
import { db } from "../firebase/config";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";

export default function UsersManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    const snapshot = await getDocs(collection(db, "users"));
    setUsers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Bạn có chắc muốn xóa người dùng này không?")) {
      await deleteDoc(doc(db, "users", id));
      fetchUsers();
    }
  };

  const toggleRole = async (id, currentRole) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    await updateDoc(doc(db, "users", id), { role: newRole });
    fetchUsers();
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading) return <p>Đang tải danh sách người dùng...</p>;

  return (
    <div className="user-manager">
      <h2>User Manager</h2>
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
          {users.map((user) => (
            <tr key={user.id}>
              <td>
                <img
                  src={user.photoURL}
                  alt={user.displayName}
                  width="40"
                  height="40"
                />
              </td>
              <td>{user.displayName}</td>
              <td>{user.email}</td>
              <td>
                <strong
                  style={{
                    color: user.role === "admin" ? "#ff4d4f" : "#52c41a",
                  }}
                >
                  {user.role || "user"}
                </strong>
              </td>
              <td>
                <button onClick={() => toggleRole(user.id, user.role)}>
                  🔁 Đổi vai trò
                </button>
                <button onClick={() => handleDelete(user.id)}>🗑 Xóa</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
