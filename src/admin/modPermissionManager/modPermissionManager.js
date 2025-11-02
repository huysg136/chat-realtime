import React, { useEffect, useState, useContext } from "react";
import { Table, Switch, Space, Tag } from "antd";
import { db } from "../../firebase/config";
import { collection, query, where, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { toast } from "react-toastify";
import { AppContext } from "../../context/appProvider";
import { AuthContext } from "../../context/authProvider";
import NoAccess from "../noAccess/noAccess";
import "./modPermissionManager.scss";

export default function ModPermissionManager() {
  const { users } = useContext(AppContext);
  const { user: currentUser } = useContext(AuthContext);
  const [mods, setMods] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "moderator"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        permissions: {}, // đảm bảo có object permissions
        ...doc.data()
      }));
      setMods(data);
    });
    return () => unsubscribe();
  }, []);

  if (currentUser?.role !== "admin") {
    return <NoAccess />;
  }

  const permissionKeys = [
    { key: "canAccessAdminPage", label: "Truy cập trang Admin" },
    { key: "canManageUsers", label: "Quản lý người dùng" },
    { key: "canManageRooms", label: "Quản lý phòng chat" },
    { key: "canManageAnnouncements", label: "Quản lý thông báo" },
    { key: "canToggleMaintenance", label: "Bật/Tắt bảo trì" },
  ];

  // Cập nhật quyền
  const handleTogglePermission = async (mod, permissionKey, value) => {
    try {
      await updateDoc(doc(db, "users", mod.id), {
        [`permissions.${permissionKey}`]: value,
      });
      toast.success(`Đã ${value ? "bật" : "tắt"} quyền ${permissionKeys.find(p => p.key === permissionKey).label}`);
    } catch (err) {
      toast.error("Không thể cập nhật quyền");
    }
  };

  const columns = [
    {
      title: "Tên hiển thị",
      dataIndex: "displayName",
      render: (name, record) => (
        <Space>
          <strong>{name}</strong>
          <Tag color="blue">{record.email}</Tag>
        </Space>
      ),
    },
    ...permissionKeys.map((perm) => ({
      title: perm.label,
      dataIndex: ["permissions", perm.key],
      align: "center",
      render: (_, record) => (
        <Switch
          checked={!!record.permissions?.[perm.key]}
          onChange={(checked) => handleTogglePermission(record, perm.key, checked)}
          checkedChildren="Bật"
          unCheckedChildren="Tắt"
        />
      ),
    })),
  ];

  return (
    <div className="mod-permission-manager">
      <strong>Admin có thể bật/tắt quyền thao tác cho từng moderator tại đây.</strong>
      <Table
        rowKey="id"
        dataSource={mods}
        columns={columns}
        pagination={false}
        bordered
        style={{ marginTop: 20 }}
      />
    </div>
  );
}
