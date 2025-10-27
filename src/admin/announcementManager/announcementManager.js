import React, { useEffect, useState } from "react";
import { db } from "../../firebase/config";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { Table, Button, Modal, Input, message } from "antd";
import "./announcementManager.scss";

export default function AnnouncementManager() {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");

  const load = async () => {
    const snap = await getDocs(collection(db, "announcements"));
    setList(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    if (!content.trim()) return;
    await addDoc(collection(db, "announcements"), {
      message: content,
      createdAt: serverTimestamp(),
    });
    setContent("");
    setOpen(false);
    load();
    message.success("Đã thêm thông báo");
  };

  const remove = async (id) => {
    await deleteDoc(doc(db, "announcements", id));
    load();
  };

  return (
    <div style={{ padding: 20 }}>
      {/* <h2>Quản lý thông báo</h2> */}
      <Button type="primary" onClick={() => setOpen(true)}>
        + Thêm thông báo
      </Button>
      <Table
        rowKey="id"
        dataSource={list}
        columns={[
          { title: "Nội dung", dataIndex: "message" },
          {
            title: "Hành động",
            render: (_, r) => (
              <Button danger onClick={() => remove(r.id)}>
                Xoá
              </Button>
            ),
          },
        ]}
        style={{ marginTop: 20 }}
      />
      <Modal
        title="Thêm thông báo"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={add}
      >
        <Input.TextArea
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </Modal>
    </div>
  );
}
