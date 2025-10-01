import React, { useContext, useMemo } from "react";
import { Avatar } from "antd";
import { AppContext } from "../../../context/appProvider";
import { AuthContext } from "../../../context/authProvider";
import CircularAvatarGroup from "../../common/circularAvatarGroup";
import "./roomList.scss";

export default function RoomList() {
  const { rooms = [], users = [], selectedRoomId, setSelectedRoomId } = useContext(AppContext);
  const { user } = useContext(AuthContext);

  // Map uid -> user
  const usersById = useMemo(() => {
    const map = {};
    users.forEach(u => {
      if (u && u.uid) map[String(u.uid).trim()] = u;
    });
    return map;
  }, [users]);

  // Chuyển timestamp các dạng -> ms
  const toMs = (ts) => {
    if (!ts) return null;
    if (typeof ts === "number") return ts;
    if (ts.seconds) return ts.seconds * 1000;
    if (ts instanceof Date) return ts.getTime();
    if (typeof ts === "string") return Date.parse(ts);
    return null;
  };

  // Hiển thị thời gian
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

  // Sort rooms by lastMessage.createdAt descending
  const sortedRooms = [...rooms].sort((a, b) => {
    const aTime = toMs(a.lastMessage?.createdAt) || 0;
    const bTime = toMs(b.lastMessage?.createdAt) || 0;
    return bTime - aTime;
  });

  return (
    <div className="room-list-wrapper">
      {sortedRooms.map((room) => {
        // Chuẩn hóa member UIDs
        const memberUids = Array.isArray(room.members)
          ? room.members.map(m => (typeof m === "string" ? m : m?.uid)).filter(Boolean)
          : [];

        // Lấy thông tin member từ users
        const membersData = memberUids
        .map(uid => users.find(u => String(u.uid).trim() === String(uid).trim()))
        .filter(Boolean);

        // Check if private room (2 members)
        const isPrivate = room.type === 'private' && membersData.length === 2;

        return (
          <div
            className={`room-item ${selectedRoomId === room.id ? "active" : ""}`}
            key={room.id}
            onClick={() => setSelectedRoomId && setSelectedRoomId(room.id)}
          >
            {/* Avatar phòng / member */}
            <div className="room-avatar">
              {isPrivate ? (
                <Avatar src={membersData.find(u => u.uid !== user?.uid)?.photoURL}>
                  {(membersData.find(u => u.uid !== user?.uid)?.displayName || "?").charAt(0).toUpperCase()}
                </Avatar>
              ) : membersData.length === 0 ? (
                <Avatar>{(room.name || "?").charAt(0).toUpperCase()}</Avatar>
              ) : membersData.length === 1 ? (
                <Avatar src={membersData[0].photoURL}>
                  {(membersData[0].displayName || "?").charAt(0).toUpperCase()}
                </Avatar>
              ) : (
                <CircularAvatarGroup
                  members={membersData.map(u => ({
                    avatar: u.photoURL || null,
                    name: u.displayName || "?"
                  }))}
                />
              )}
            </div>

            {/* Thông tin phòng */}
            <div className="room-info">
              <p className="room-name">
                {isPrivate
                  ? membersData.find(u => u.uid !== user?.uid)?.displayName || "No Name"
                  : room.name || (membersData[0]?.displayName ?? "No Name")}
              </p>
              
              {room.lastMessage ? (
                <p className="last-message">
                  {(() => {
                    const senderUid = room.lastMessage?.uid;
                    const sender = senderUid ? usersById[String(senderUid).trim()] : null;
                    const senderName = sender?.displayName || room.lastMessage?.displayName || "Unknown";
                    const senderPhoto = sender?.photoURL || room.lastMessage?.photoURL || null;

                    return (
                      <>
                        {senderPhoto && (
                          <Avatar
                            size={16}
                            src={senderPhoto}
                            style={{ marginRight: 4 }}
                          />
                        )}
                        {senderName}: {room.lastMessage.text}
                      </>
                    );
                  })()}
                </p>
              ) : (
                <p className="last-message">Chưa có tin nhắn</p>
              )}
            </div>

            {/* Thời gian tin nhắn */}
            <span className="room-time">
              {room.lastMessage?.createdAt ? timeAgo(room.lastMessage.createdAt) : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}