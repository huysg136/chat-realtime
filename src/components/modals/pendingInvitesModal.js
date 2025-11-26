import React, { useContext, useMemo } from "react";
import { Modal, Button, Avatar } from "antd";
import { AppContext } from "../../context/appProvider";
import { AuthContext } from "../../context/authProvider";
import { db } from "../../firebase/config";
import { doc, updateDoc } from "firebase/firestore";
import "./pendingInvitesModal.scss"; // import scss

export default function PendingInvitesModal() {
  const { rooms, users, isPendingInviteVisible, setIsPendingInviteVisible } =
    useContext(AppContext);
  const { user } = useContext(AuthContext);
  const uid = user?.uid;

  const pendingRooms = useMemo(
    () =>
      rooms.filter((r) => r.pendingInvites?.some((p) => p.uid === uid)),
    [rooms, uid]
  );

  const handleAccept = async (room) => {
    const pendingInvite = room.pendingInvites.find((p) => p.uid === uid);
    if (!pendingInvite) return;

    const members = Array.from(new Set([...(room.members || []), uid]));
    const roles = [...(room.roles || []), { uid, role: "member" }];
    const pendingInvites = (room.pendingInvites || []).filter(
      (p) => p.uid !== uid
    );

    await updateDoc(doc(db, "rooms", room.id), {
      members,
      roles,
      pendingInvites,
    });
  };

  const handleDecline = async (room) => {
    const pendingInvites = (room.pendingInvites || []).filter(
      (p) => p.uid !== uid
    );
    await updateDoc(doc(db, "rooms", room.id), { pendingInvites });
  };

  return (
    <Modal
      className="pending-invites-modal"
      title="Lời mời tham gia nhóm"
      open={isPendingInviteVisible}
      onCancel={() => setIsPendingInviteVisible(false)}
      footer={null}
      centered
      bodyStyle={{ maxHeight: "70vh", overflowY: "auto", padding: "10px" }}
    >
      {pendingRooms.length === 0 && (
        <div style={{ textAlign: "center", padding: 20, color: "gray" }}>
          Không có lời mời nào.
        </div>
      )}

      {pendingRooms.map((room) => {
        const pendingInvite = room.pendingInvites.find((p) => p.uid === uid);
        const inviter = users.find((u) => u.uid === pendingInvite?.invitedBy);

        return (
          <div
            key={room.id}
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: 12,
              padding: 5,
              borderBottom: "1px solid #f0f0f0",
            }}
          >
            <Avatar
              src={room.avatar || inviter?.photoURL}
              size={40}
              style={{ marginRight: 10 }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500 }}>{room.name}</div>
              <div style={{ fontSize: 12, color: "gray" }}>
                Được mời bởi {inviter?.displayName || "người dùng"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 5 }}>
              <Button
                type="primary"
                size="small"
                onClick={() => handleAccept(room)}
              >
                Chấp nhận
              </Button>
              <Button
                size="small"
                danger
                onClick={() => handleDecline(room)}
              >
                Từ chối
              </Button>
            </div>
          </div>
        );
      })}
    </Modal>
  );
}
