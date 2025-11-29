import React, { useContext, useEffect, useState } from "react";
import { Modal, Button } from "antd";
import { AppContext } from "../../context/appProvider";
import { AuthContext } from "../../context/authProvider";
import { db } from "../../firebase/config";
import { collection, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { addDocument } from "../../firebase/services";
import CircularAvatarGroup from "../common/circularAvatarGroup";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import "./pendingInvitesModal.scss";

export default function PendingInvitesModal() {
  const { users, isPendingInviteVisible, setIsPendingInviteVisible } = useContext(AppContext);
  const { user } = useContext(AuthContext);
  const uid = user?.uid;

  const [pendingInvites, setPendingInvites] = useState([]);
  const [inviteRooms, setInviteRooms] = useState({});

  useEffect(() => {
    if (!uid || !isPendingInviteVisible) return;

    const fetchPendingInvites = async () => {
      try {
        const q = query(
          collection(db, "groupInvites"),
          where("uid", "==", uid),
          where("status", "==", "pending")
        );
        const snapshot = await getDocs(q);
        const invites = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const now = new Date();
        const autoDeclinePromises = invites.map(async (invite) => {
          if (invite.createdAt?.toDate) {
            const createdAt = invite.createdAt.toDate();
            const diffDays = (now - createdAt) / (1000 * 60 * 60 * 24); 
            if (diffDays > 30) { 
              await deleteDoc(doc(db, "groupInvites", invite.id));
              return null; 
            }
          }
          return invite; 
        });

        const filteredInvites = (await Promise.all(autoDeclinePromises)).filter(Boolean);
        setPendingInvites(filteredInvites);

        const roomData = {};
        await Promise.all(
          invites.map(async invite => {
            const roomSnap = await getDoc(doc(db, "rooms", invite.roomId));
            if (roomSnap.exists()) roomData[invite.roomId] = roomSnap.data();
          })
        );
        setInviteRooms(roomData);
      } catch (err) {
        console.error("Fetch pending invites failed:", err);
        setPendingInvites([]);
      }
    };

    fetchPendingInvites();
  }, [uid, isPendingInviteVisible]);

  const handleAccept = async (invite) => {
    try {
      const roomRef = doc(db, "rooms", invite.roomId);
      const roomSnap = await getDoc(roomRef);
      const roomData = roomSnap.data() || {};

      const members = Array.from(new Set([...(roomData.members || []), uid]));
      const roles = [...(roomData.roles || []), { uid, role: "member" }];

      await updateDoc(roomRef, { members, roles });
      await deleteDoc(doc(db, "groupInvites", invite.id));

      setPendingInvites(prev => prev.filter(i => i.id !== invite.id));
      setInviteRooms(prev => {
        const copy = { ...prev };
        delete copy[invite.roomId];
        return copy;
      });

      const actor = { uid: uid, name: user.displayName, photoURL: user.photoURL };
      const targetUser = users.find(u => u.uid === invite.invitedBy);
      const target = { 
        uid: targetUser?.uid, 
        name: targetUser?.displayName || targetUser?.username || "Unknown", 
        photoURL: targetUser?.photoURL || null 
      };

      await addDocument("messages", {
        uid: "system",
        roomId: invite.roomId,
        kind: "system",
        action: "accept_invite",
        actor,  
        target,    
        visibleFor: members,
        createdAt: new Date(),
      });

    } catch (err) {
      console.error("Accept invite failed:", err);
    }
  };

  const handleDecline = async (invite) => {
    try {
      await deleteDoc(doc(db, "groupInvites", invite.id));
      setPendingInvites(prev => prev.filter(i => i.id !== invite.id));
      setInviteRooms(prev => {
        const copy = { ...prev };
        delete copy[invite.roomId];
        return copy;
      });
    } catch (err) {
      console.error("Decline invite failed:", err);
    }
  };

  return (
    <Modal
      className="pending-invites-modal"
      title="Lời mời tham gia nhóm"
      open={isPendingInviteVisible}
      onCancel={() => setIsPendingInviteVisible(false)}
      footer={null}
      centered
      bodyStyle={{ maxHeight: "600px", overflowY: "auto", padding: "10px" }}
      width={600}
    >
      {pendingInvites.length === 0 && (
        <div className="pending-invites-empty">Không có lời mời nào.</div>
      )}

      {pendingInvites.map((invite) => {
        const room = inviteRooms[invite.roomId];
        const inviter = users.find(u => u.uid === invite.invitedBy);
        const memberUids = Array.isArray(room?.members)
          ? room.members.map((m) => (typeof m === "string" ? m : m?.uid)).filter(Boolean)
          : [];

        const membersData = memberUids
          .map((uid) => users.find((u) => String(u.uid).trim() === String(uid).trim()))
          .filter(Boolean);

        return (
          <div key={invite.id} className="pending-invite-item">
            <CircularAvatarGroup
              members={membersData.map((u) => ({ avatar: u.photoURL, name: u.displayName }))}
              maxDisplay={3}
              className="pending-invite-avatars"
            />
            <div className="pending-invite-info">
              <div className="pending-invite-name">{room?.name || "Nhóm không xác định"}</div>
              <div className="pending-invite-inviter">
                Được mời bởi <span style={{fontWeight: "500"}}>{inviter?.displayName}</span> (@{inviter?.username}) 
              </div>
              <div className="pending-invite-time">
                {invite?.createdAt?.toDate
                  ? `${formatDistanceToNow(invite.createdAt.toDate(), { addSuffix: true, locale: vi })}`
                  : ""}
              </div>
            </div>
            <div className="pending-invite-actions">
              <Button
                type="primary"
                size="small"
                onClick={() => handleAccept(invite)}
              >
                Tham gia
              </Button>
              <Button
                size="small"
                danger
                onClick={() => handleDecline(invite)}
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
