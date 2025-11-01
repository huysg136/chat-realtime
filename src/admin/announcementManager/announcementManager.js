import React, { useEffect, useState, useContext } from "react";
import { db } from "../../firebase/config";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { Table, Button, Modal, Input, Switch, Space } from "antd";
import { EyeOutlined } from "@ant-design/icons";
import "./announcementManager.scss";
import { toast } from "react-toastify";
import { AppContext } from "../../context/appProvider";
import { AuthContext } from "../../context/authProvider";

export default function AnnouncementManager() {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetUids, setTargetUids] = useState("");
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const { user: currentUser } = useContext(AuthContext);

  const { users } = useContext(AppContext);
  

  useEffect(() => {
    const q = query(collection(db, "announcements"), orderBy("lastUpdate", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setList(items);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "announcements"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      clearTimeout(window._sortTimer);
      window._sortTimer = setTimeout(() => {
        const sorted = items.sort((a, b) => {
          const timeA =
            (a.lastUpdate?.seconds || a.createdAt?.seconds || 0) * 1000;
          const timeB =
            (b.lastUpdate?.seconds || b.createdAt?.seconds || 0) * 1000;
          return timeB - timeA;
        });

        setList(sorted);
      }, 1000);
    });

    return () => {
      unsubscribe();
      clearTimeout(window._sortTimer);
    };
  }, []);

  const resetModal = () => {
    setOpen(false);
    setEditing(null);
    setTitle("");
    setContent("");
    setTargetUids("");
  };

  const addOrUpdate = async () => {
    if (!title.trim() || !content.trim()) {
      toast.warning("Vui lòng nhập đầy đủ tiêu đề và nội dung");
      return;
    }

    try {
      const targetUidsArray = targetUids.trim()
        ? targetUids.split(",").map((uid) => uid.trim())
        : null;

      if (editing) {
        await updateDoc(doc(db, "announcements", editing.id), {
          title,
          message: content,
          targetUids: targetUidsArray,
          lastUpdate: serverTimestamp(),
        });
        toast.success("Đã cập nhật thông báo");
      } else {
        await addDoc(collection(db, "announcements"), {
          title,
          message: content,
          isShow: false,
          createdAt: serverTimestamp(),
          lastUpdate: serverTimestamp(),
          targetUids: targetUidsArray,
          hasSeenBy: [],
        });
        toast.success("Đã thêm thông báo");
      }
      resetModal();
    } catch (e) {
      toast.error("Lỗi khi lưu thông báo");
    }
  };

  const remove = async (id) => {
    await deleteDoc(doc(db, "announcements", id));
    toast.success("Đã xoá thông báo");
  };

  const toggleShow = async (id, value) => {
    try {
      if (value) {
        const allDocs = list.filter((x) => x.isShow && x.id !== id);
        for (const docItem of allDocs) {
          await updateDoc(doc(db, "announcements", docItem.id), {
            isShow: false,
            hasSeenBy: [],
          });
        }
      }

      const updateData = {
        isShow: value,
        //lastUpdate: serverTimestamp(),
      };
      if (!value) {
        updateData.hasSeenBy = [];
      }

      await updateDoc(doc(db, "announcements", id), updateData);
      toast.success(value ? "Đã bật thông báo" : "Đã tắt thông báo");
    } catch (e) {
      toast.error("Không thể thay đổi trạng thái thông báo");
    }
  };

  const startEdit = (record) => {
    setEditing(record);
    setTitle(record.title);
    setContent(record.message);
    setTargetUids(record.targetUids ? record.targetUids.join(", ") : "");
    setOpen(true);
  };

  return (
    <div className="announcement-manager">
      <Button type="primary" onClick={() => setOpen(true)} disabled={currentUser.role !== "admin"}>
        + Thêm thông báo
      </Button>

      <Table
        rowKey="id"
        dataSource={list}
        columns={[
          {
            title: "Hiển thị",
            dataIndex: "isShow",
            render: (value, record) => (
              <Switch
                checked={value}
                onChange={(checked) => toggleShow(record.id, checked)}
                disabled={currentUser.role !== "admin"}
              />
            ),
          },
          { title: "Tiêu đề", dataIndex: "title" },
          { title: "Nội dung", dataIndex: "message" },
          {
            title: "Đã xem",
            dataIndex: "hasSeenBy",
            render: (v, record) => (
              <Space>
                <span>{v ? v.length : 0}</span>
                {v && v.length > 0 && (
                  <EyeOutlined
                    style={{ color: "#1890ff", cursor: "pointer" }}
                    onClick={() => {
                      setSelectedAnnouncement(record);
                      setDetailModalOpen(true);
                    }}
                  />
                )}
              </Space>
            ),
          },
          {
            title: "Cập nhật lần cuối",
            dataIndex: "lastUpdate",
            render: (v) =>
              v?.seconds
                ? new Date(v.seconds * 1000).toLocaleString("vi-VN")
                : "-",
          },
          {
            title: "Hành động",
            render: (_, r) => (
              <Space>
                <Button className="btn-edit" onClick={() => startEdit(r)} disabled={currentUser.role !== "admin"}>
                  Sửa
                </Button>
                <Button
                  className="btn-delete"
                  danger
                  onClick={() => remove(r.id)}
                  disabled={currentUser.role !== "admin"}
                >
                  Xoá
                </Button>
              </Space>
            ),
          },
        ]}
        style={{ marginTop: 20 }}
      />

      <Modal
        title={editing ? "Sửa thông báo" : "Thêm thông báo"}
        open={open}
        onCancel={resetModal}
        onOk={addOrUpdate}
        getContainer={false}
      >
        <div className="modal-input">
          <label className="modal-label">Tiêu đề</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nhập tiêu đề thông báo..."
            style={{ marginBottom: 12 }}
          />
          <label className="modal-label">Nội dung</label>
          <Input.TextArea
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Nhập nội dung thông báo..."
            style={{ marginBottom: 12 }}
          />
          <label className="modal-label">
            UIDs mục tiêu (tùy chọn, cách nhau bằng dấu phẩy)
          </label>
          <Input
            value={targetUids}
            onChange={(e) => setTargetUids(e.target.value)}
            placeholder="Ví dụ: uid1, uid2, uid3 (để trống nếu gửi cho tất cả)"
          />
        </div>
      </Modal>

      {detailModalOpen && selectedAnnouncement && (
        <div className="announcement-detail-modal">
          <div className="announcement-detail-content">
            <h3>
              Chi tiết người đã xem: <span>{selectedAnnouncement.title}</span>
            </h3>
            <p>
              <strong>Nội dung:</strong> {selectedAnnouncement.message}
            </p>
            <hr />
            <h5>
              Danh sách người đã xem (
              {selectedAnnouncement.hasSeenBy?.length || 0}):
            </h5>
            <Table
              size="small"
              rowKey="uid"
              dataSource={
                selectedAnnouncement.hasSeenBy?.map((uid) => {
                  const user = users.find((u) => u.uid === uid);
                  return {
                    uid,
                    displayName: user?.displayName || "Unknown",
                    email: user?.email || "Unknown",
                  };
                }) || []
              }
              columns={[
                { title: "UID", dataIndex: "uid", width: 250 },
                { title: "Tên hiển thị", dataIndex: "displayName" },
                { title: "Email", dataIndex: "email" },
              ]}
              pagination={false}
              scroll={{ y: 300 }}
            />
            <div className="modal-actions">
              <button
                className="btn-close"
                onClick={() => {
                  setDetailModalOpen(false);
                  setSelectedAnnouncement(null);
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
