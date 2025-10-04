import React, { useContext, useMemo } from "react";
import { Avatar } from "antd";
import { TeamOutlined } from "@ant-design/icons";
import { AppContext } from "../../../context/appProvider";
import { AuthContext } from "../../../context/authProvider";
import CircularAvatarGroup from "../../common/circularAvatarGroup";
import { decryptMessage } from "../../../firebase/services";
import "./roomList.scss";

export default function RoomList() {
  const { rooms = [], users = [], selectedRoomId, setSelectedRoomId } = useContext(AppContext);
  const { user } = useContext(AuthContext);

  const usersById = useMemo(() => {
    const map = {};
    users.forEach(u => {
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

  const sortedRooms = [...rooms].sort((a, b) => {
    const aTime = toMs(a.lastMessage?.createdAt) || 0;
    const bTime = toMs(b.lastMessage?.createdAt) || 0;
    return bTime - aTime;
  });

  const str = v => (v == null ? "" : String(v).trim());

  return (
    <div className="room-list-wrapper">
      
      {sortedRooms.map((room) => {
        const memberUids = Array.isArray(room.members)
          ? room.members.map(m => (typeof m === "string" ? m : m?.uid)).filter(Boolean)
          : [];

        const membersData = memberUids
          .map(uid => users.find(u => String(u.uid).trim() === String(uid).trim()))
          .filter(Boolean);

        const isPrivate = room.type === 'private' && membersData.length === 2;

        const isGroup = !isPrivate && (room.type === 'group' || membersData.length > 1);

        const lm = room.lastMessage || {};
        const lmUid = str(lm.uid);
        const currentUid = str(user?.uid);
        const isOwnMessage = lmUid
          ? lmUid === currentUid
          : lm.displayName && user?.displayName
            ? str(lm.displayName) === str(user.displayName)
            : false;

        const sender = lm.uid ? usersById[lmUid] : null;
        const senderName = isOwnMessage
          ? "Tôi"
          : (sender?.displayName || lm.displayName || "Unknown");

        const singleMember = !isPrivate && membersData.length === 1;
        const singleMemberData = singleMember ? membersData[0] : null;

        return (
          <div
            className={`room-item ${selectedRoomId === room.id ? "active" : ""}`}
            key={room.id}
            onClick={() => setSelectedRoomId && setSelectedRoomId(room.id)}
          >
            <div className="room-avatar">
              {isPrivate ? (
                <Avatar
                  src={membersData.find(u => u.uid !== user?.uid)?.photoURL}
                  size={40}
                >
                  {(membersData.find(u => u.uid !== user?.uid)?.displayName || "?").charAt(0).toUpperCase()}
                </Avatar>
              ) : singleMember ? (
                <Avatar
                  className="single-avatar"
                  src={singleMemberData?.photoURL}
                  size={48}
                >
                  {(singleMemberData?.displayName || "?").charAt(0).toUpperCase()}
                </Avatar>
              ) : membersData.length === 0 ? (
                <Avatar size={40}>{(room.name || "?").charAt(0).toUpperCase()}</Avatar>
              ) : (
                <div className="room-circular-avatar-wrapper">
                  <CircularAvatarGroup
                    members={membersData.map(u => ({
                      avatar: u.photoURL || null,
                      name: u.displayName || "?"
                    }))}
                    maxDisplay={3}
                  />
                </div>
              )}
            </div>
            <div className="room-info">
              <p className="room-name">
                {isGroup && (
                  <TeamOutlined style={{ marginRight: 8, color: "#8c8c8c" }} />
                )}
                {isPrivate
                  ? membersData.find(u => u.uid !== user?.uid)?.displayName || "No Name"
                  : room.name || (membersData[0]?.displayName ?? "No Name")}
              </p>

              {room.lastMessage ? (
                <p className="last-message">
                  {senderName}: {room.secretKey ? decryptMessage(lm.text || lm?.content || "", room.secretKey) : (lm.text || lm?.content || "")}
                </p>
              ) : (
                <p className="last-message">Chưa có tin nhắn</p>
              )}
            </div>
            <span className="room-time">
              {room.lastMessage?.createdAt ? timeAgo(room.lastMessage.createdAt) : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}
