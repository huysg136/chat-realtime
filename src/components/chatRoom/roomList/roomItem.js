import React, { useContext, useEffect, useState, useMemo } from "react";
import { Avatar, Dropdown, Menu } from "antd";
import {
  TeamOutlined,
  EllipsisOutlined,
  PushpinOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { AuthContext } from "../../../context/authProvider";
import CircularAvatarGroup from "../../common/circularAvatarGroup";
import { decryptMessage } from "../../../firebase/services";
import {
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../../../firebase/config";
import "./roomList.scss";

export default function RoomItem({
  room,
  users,
  selectedRoomId,
  setSelectedRoomId,
}) {
  const { user } = useContext(AuthContext);
  const [member, setMember] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  useEffect(() => {
    if (!user?.uid || !room?.id) return;

    const memberRef = doc(db, `rooms/${room.id}/members/${user.uid}`);
    const unsubscribe = onSnapshot(memberRef, (docSnap) => {
      setMember(docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null);
    });

    const pinRef = doc(db, `pinned/${user.uid}`);
    const unsubPin = onSnapshot(pinRef, (snap) => {
      const data = snap.data();
      setIsPinned(Array.isArray(data?.rooms) && data.rooms.includes(room.id));
    });

    return () => {
      unsubscribe();
      unsubPin();
    };
  }, [user?.uid, room?.id]);

  const usersById = useMemo(() => {
    const map = {};
    users.forEach((u) => {
      if (u && u.uid) map[String(u.uid).trim()] = u;
    });
    return map;
  }, [users]);

  const toMs = (ts) => {
    if (!ts) return null;
    if (typeof ts === "number") return ts;
    if (ts.seconds) return ts.seconds * 1000;
    if (ts instanceof Date) return ts.getTime();
    if (typeof ts === "string") return Date.parse(ts);
    return null;
  };

  const timeAgo = (timestamp) => {
    const ms = toMs(timestamp);
    if (!ms) return "";
    const diff = Math.floor((Date.now() - ms) / 1000);
    if (diff < 10) return "vừa xong";
    if (diff < 60) return `${diff} giây trước`;
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    if (diff < 172800) return "Hôm qua";
    const d = new Date(ms);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  const str = (v) => (v == null ? "" : String(v).trim());

  const memberUids = Array.isArray(room.members)
    ? room.members
        .map((m) => (typeof m === "string" ? m : m?.uid))
        .filter(Boolean)
    : [];

  const membersData = memberUids
    .map((uid) =>
      users.find((u) => String(u.uid).trim() === String(uid).trim())
    )
    .filter(Boolean);

  const isPrivate = room.type === "private" && membersData.length === 2;
  const isGroup = !isPrivate && (room.type === "group" || membersData.length > 1);

  const lm = room.lastMessage || {};
  const lmUid = str(lm.uid);
  const currentUid = str(user?.uid);
  const isOwnMessage = lmUid ? lmUid === currentUid : false;
  const sender = usersById[lmUid] || null;
  const senderName = isOwnMessage
    ? "Tôi"
    : sender?.displayName || lm.displayName || "Unknown";

  const handleClick = () => {
    setSelectedRoomId?.(room.id);
  };

  const handlePin = async () => {
    const pinRef = doc(db, "pinned", user.uid);
    const docSnap = await getDoc(pinRef);
    let pinnedRooms = docSnap.exists() ? docSnap.data().rooms || [] : [];

    pinnedRooms = pinnedRooms.includes(room.id)
      ? pinnedRooms.filter((r) => r !== room.id)
      : [...pinnedRooms, room.id];

    await setDoc(pinRef, { rooms: pinnedRooms }, { merge: true });
  };

  const handleDelete = async () => {
    if (!window.confirm("Bạn có chắc muốn xóa đoạn hội thoại này?")) return;

    try {
      const messagesRef = collection(db, "messages");
      const q = query(messagesRef, where("roomId", "==", room.id));
      const snapshot = await getDocs(q);

      snapshot.forEach(async (docSnap) => {
        const msg = docSnap.data();
        if (!Array.isArray(msg.visibleFor)) return;

        if (msg.visibleFor.includes(user.uid)) {
          await updateDoc(docSnap.ref, {
            visibleFor: msg.visibleFor.filter((id) => id !== user.uid),
          });
        }
      });

      const roomRef = doc(db, "rooms", room.id);
      const roomSnap = await getDoc(roomRef);
      if (roomSnap.exists()) {
        const lastMessage = roomSnap.data().lastMessage || {};
        if (Array.isArray(lastMessage.visibleFor)) {
          await updateDoc(roomRef, {
            "lastMessage.visibleFor": lastMessage.visibleFor.filter(
              (id) => id !== user.uid
            ),
          });
        }
      }
      setSelectedRoomId(null);
    } catch (err) {}
  };

  const menu = (
    <Menu>
      <Menu.Item key="pin" onClick={handlePin} icon={<PushpinOutlined />}>
        {isPinned ? "Bỏ ghim đoạn chat" : "Ghim đoạn chat"}
      </Menu.Item>
      <Menu.Divider style={{ margin: "0" }} />
      <Menu.Item
        key="delete"
        onClick={handleDelete}
        icon={<DeleteOutlined style={{ color: "#ff4d4f" }} />}
      >
        <span style={{ color: "#ff4d4f", fontWeight: "500" }}>Xóa đoạn chat</span>
      </Menu.Item>
    </Menu>
  );

  return (
    <div
      className={`room-item ${selectedRoomId === room.id ? "active" : ""}`}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="room-avatar">
        {isPrivate ? (
          <Avatar
            src={membersData.find((u) => u.uid !== user?.uid)?.photoURL}
            size={40}
          >
            {(membersData.find((u) => u.uid !== user?.uid)?.displayName || "?")
              .charAt(0)
              .toUpperCase()}
          </Avatar>
        ) : membersData.length === 0 ? (
          <Avatar size={40}>{(room.name || "?").charAt(0).toUpperCase()}</Avatar>
        ) : (
          <div className="room-circular-avatar-wrapper">
            <CircularAvatarGroup
              members={membersData.map((u) => ({
                avatar: u.photoURL,
                name: u.displayName,
              }))}
              maxDisplay={3}
            />
          </div>
        )}
      </div>

      <div className="room-info">
        <p className="room-name">
          {isGroup && <TeamOutlined style={{ marginRight: 8, color: "#8c8c8c" }} />}
          {isPrivate
            ? membersData.find((u) => u.uid !== user?.uid)?.displayName || "No Name"
            : room.name || "No Name"}
        </p>

        {room.lastMessage ? (
          <p className="last-message">
            {lm.isRevoked ? (
              `${senderName}: [Tin nhắn đã được thu hồi]`
            ) : (
              <>
                {senderName}:{" "}
                {(() => {
                  const kind = lm.kind || "text";
                  const decrypted =
                    kind === "text" && room.secretKey
                      ? decryptMessage(lm.text, room.secretKey)
                      : lm.text || lm.content || "";

                  switch (kind) {
                    case "text":
                      return decrypted;
                    case "picture":
                      return "🖼️ [Hình ảnh]";
                    case "video":
                      return "🎬 [Video]";
                    case "file":
                      return "📎 [Tệp]";
                    case "audio":
                      return "🎤 [Tin nhắn thoại]";
                    default:
                      return decrypted;
                  }
                })()}
              </>
            )}
          </p>
        ) : (
          <p className="last-message">Chưa có tin nhắn</p>
        )}
      </div>

      <div className="room-right">
        {isHovered ? (
          <Dropdown overlay={menu} trigger={["click"]} placement="bottomRight">
            <EllipsisOutlined className="more-icon" />
          </Dropdown>
        ) : (
          <>
            <span className="room-time">
              {room.lastMessage?.createdAt ? timeAgo(room.lastMessage.createdAt) : ""}
            </span>
            {isPinned && <PushpinOutlined className="pin-icon pinned" />}
          </>
        )}
      </div>
    </div>
  );
}
