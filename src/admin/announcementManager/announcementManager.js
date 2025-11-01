import React, { useEffect, useState } from "react";
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
import "./announcementManager.scss";
import { toast } from "react-toastify";

export default function AnnouncementManager() {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setList(items);
    });

    return () => unsubscribe(); // cleanup khi component unmount
  }, []);

  const resetModal = () => {
    setOpen(false);
    setEditing(null);
    setTitle("");
    setContent("");
  };

  const addOrUpdate = async () => {
    if (!title.trim() || !content.trim()) {
      toast.warning("Vui lòng nhập đầy đủ tiêu đề và nội dung");
      return;
    }

    try {
      if (editing) {
        await updateDoc(doc(db, "announcements", editing.id), {
          title,
          message: content,
        });
        toast.success("Đã cập nhật thông báo");
      } else {
        await addDoc(collection(db, "announcements"), {
          title,
          message: content,
          isShow: false,
          createdAt: serverTimestamp(),
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
          await updateDoc(doc(db, "announcements", docItem.id), { isShow: false });
        }
      }

      await updateDoc(doc(db, "announcements", id), { isShow: value });
      toast.success(value ? "Đã bật hiển thị" : "Đã tắt hiển thị");
    } catch (e) {
      toast.error("Không thể thay đổi trạng thái hiển thị");
    }
  };

  const startEdit = (record) => {
    setEditing(record);
    setTitle(record.title);
    setContent(record.message);
    setOpen(true);
  };

  return (
    <div className="announcement-manager">
      <Button type="primary" onClick={() => setOpen(true)}>
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
              <Switch checked={value} onChange={(checked) => toggleShow(record.id, checked)} />
            ),
          },
          { title: "Tiêu đề", dataIndex: "title" },
          { title: "Nội dung", dataIndex: "message" },
          {
            title: "Ngày tạo",
            dataIndex: "createdAt",
            render: (v) => (v?.seconds ? new Date(v.seconds * 1000).toLocaleString("vi-VN") : "-"),
          },
          {
            title: "Hành động",
            render: (_, r) => (
              <Space>
                <Button className="btn-edit" onClick={() => startEdit(r)}>Sửa</Button>
                <Button className="btn-delete" danger onClick={() => remove(r.id)}>Xoá</Button>
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
          />
        </div>
      </Modal>
    </div>
  );
}
