import { useEffect, useState, useContext } from "react";
import { Table, Switch, Space, Tag, Tooltip, Avatar } from "antd";
import { db } from "../../../firebase/config";
import { collection, query, where, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { toast } from "react-toastify";
import { AuthContext } from "../../../context/authProvider";
import NoAccess from "../noAccess/noAccess";
import "./modPermissionManager.scss";

export default function ModPermissionManager() {
  const { user: currentUser } = useContext(AuthContext);
  const [mods, setMods] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "moderator"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        permissions: {},
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
    { key: "canManageReports", label: "Quản lý báo cáo" },
    { key: "canManageAnnouncements", label: "Quản lý thông báo" },
    { key: "canToggleMaintenance", label: "Bật/Tắt bảo trì" },
  ];

  const permissionDescriptions = {
    canAccessAdminPage: "Cho phép moderator truy cập trang Admin",
    canManageUsers: "Cho phép quản lý người dùng",
    canManageRooms: "Cho phép quản lý phòng chat",
    canManageReports: "Cho phép quản lý báo cáo",
    canManageAnnouncements: "Cho phép quản lý thông báo",
    canToggleMaintenance: "Cho phép bật/tắt chế độ bảo trì"
  };

  const handleTogglePermission = async (mod, permissionKey, value) => {
    try {
      const ref = doc(db, "users", mod.id);
      if (permissionKey === "canAccessAdminPage" && value === false) {
        await updateDoc(ref, {
          "permissions.canAccessAdminPage": false,
          "permissions.canManageUsers": false,
          "permissions.canManageRooms": false,
          "permissions.canManageReports": false,
          "permissions.canManageAnnouncements": false,
          "permissions.canToggleMaintenance": false,
        });
      } else {
        await updateDoc(ref, {
          [`permissions.${permissionKey}`]: value,
        });
      }

    } catch (err) {
      toast.error("Không thể cập nhật quyền");
    }
  };

  const columns = [
    {
      title: "STT",
      key: "index",
      render: (_, __, index) => index + 1,
      width: 60,
      fixed: "left",
    },
    {
      title: "Avatar",
      dataIndex: "photoURL",
      key: "avatar",
      width: 80,
      fixed: "left",
      render: (photoURL, record) => (
        <Avatar src={photoURL} size="large">{!photoURL && record.displayName?.charAt(0)?.toUpperCase()}</Avatar>
      )
    },
    {
      title: "Tên hiển thị",
      dataIndex: "displayName",
      key: "displayName",
      fixed: "left",
      render: (name, record) => (
        <Space direction="vertical" size={0}>
          <strong>{name}</strong>
          <Tooltip title={record.email}>
            <Tag color="blue" style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", padding: "0 6px" }}>
              {record.email}
            </Tag>
          </Tooltip>
        </Space>
      ),
      width: 220,
    },
    ...permissionKeys.map((perm) => ({
      title: perm.label,
      dataIndex: ["permissions", perm.key],
      align: "center",
      width: 140,
      render: (_, record) => (
        <Tooltip title={permissionDescriptions[perm.key]}>
          <Switch
            checked={!!record.permissions?.[perm.key]}
            onChange={(checked) => handleTogglePermission(record, perm.key, checked)}
            checkedChildren="Bật"
            unCheckedChildren="Tắt"
          />
        </Tooltip>
      )
    }))
  ];

  return (
    <div className="mod-permission-manager">
      <strong>Admin có thể bật/tắt quyền thao tác cho từng moderator tại đây.</strong>
      <Table
        rowKey="id"
        dataSource={mods}
        columns={columns}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 900 }}
        style={{ marginTop: 20 }}
      />
    </div>
  );
}
