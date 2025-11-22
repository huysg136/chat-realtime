import React, { useContext, useState, useEffect, useMemo } from 'react';
import { Modal, Input, Avatar, Spin, Checkbox, Button } from 'antd';
import { AppContext } from '../../context/appProvider';
import { AuthContext } from '../../context/authProvider';
import { collection, query, where, orderBy, limit, getDocs, getDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { addDocument } from '../../firebase/services';
import debounce from 'lodash/debounce';
import './inviteMemberModal.scss';

export default function InviteMemberModal() {
  const { isInviteMemberVisible, setIsInviteMemberVisible, selectedRoomId, rooms, users } = useContext(AppContext);
  const { user } = useContext(AuthContext);
  const uid = user?.uid;

  const [searchText, setSearchText] = useState('');
  const [options, setOptions] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [currentMembers, setCurrentMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);

  // Reset modal & fetch current members
  useEffect(() => {
    const fetchCurrentMembers = async () => {
      if (!selectedRoomId) return;
      try {
        const roomRef = doc(db, "rooms", selectedRoomId);
        const roomSnap = await getDoc(roomRef);
        const roomData = roomSnap.data();
        setCurrentMembers(roomData?.members || []);
      } catch {
        setCurrentMembers([]);
      }
    };

    if (isInviteMemberVisible) {
      fetchCurrentMembers();
      setSearchText('');
      setSelectedMembers([]);
      setOptions([]);
      setFetching(false);
    }
  }, [isInviteMemberVisible, selectedRoomId]);

  // SEARCH USERS BY USERNAME
  const fetchUserList = async (text) => {
    setFetching(true);
    try {
      let q;
      if (text) {
        q = query(
          collection(db, "users"),
          where("username", ">=", text.toLowerCase()),
          where("username", "<=", text.toLowerCase() + "\uf8ff"),
          orderBy("username"),
          limit(50)
        );
      } else {
        q = query(
          collection(db, "users"),
          orderBy("username"),
          limit(50)
        );
      }
      const snapshot = await getDocs(q);
      const usersList = snapshot.docs
        .map(doc => ({
          uid: doc.data().uid,
          displayName: doc.data().displayName,
          photoURL: doc.data().photoURL,
          username: doc.data().username || ''
        }))
        .filter(u => u.uid !== uid); // loại bỏ chính user
      setOptions(usersList);
    } catch {
      setOptions([]);
    } finally {
      setFetching(false);
    }
  };

  const debounceFetcher = debounce(fetchUserList, 300);
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchText(value);
    debounceFetcher(value);
  };

  const handleToggleMember = (userObj) => {
    if (currentMembers.includes(userObj.uid)) return; // đã trong nhóm thì disable
    setSelectedMembers(prev => {
      const exists = prev.find(u => u.uid === userObj.uid);
      if (exists) return prev.filter(u => u.uid !== userObj.uid);
      return [...prev, userObj];
    });
  };

  const handleOk = async () => {
    if (!selectedRoomId || selectedMembers.length === 0) return;
    try {
      const roomRef = doc(db, "rooms", selectedRoomId);
      const roomSnap = await getDoc(roomRef);
      const existingMembers = roomSnap.data()?.members || [];
      const newMemberIds = selectedMembers.map(u => u.uid);
      const updatedMembers = Array.from(new Set([...existingMembers, ...newMemberIds]));
      await updateDoc(roomRef, { members: updatedMembers });
      setCurrentMembers(updatedMembers);
      const lastMsg = roomSnap.data()?.lastMessage;
      if (lastMsg && Array.isArray(lastMsg.visibleFor)) {
        const updatedLastVisibleFor = Array.from(
          new Set([...lastMsg.visibleFor, ...newMemberIds])
        );
        await updateDoc(roomRef, {
          "lastMessage.visibleFor": updatedLastVisibleFor,
        });
      }

      const actor = { uid: user.uid, name: user.displayName, photoURL: user.photoURL };
      for (const member of selectedMembers) {
        const fullMember = users.find(u => u.uid === member.uid) || member;
        const target = { uid: fullMember.uid, name: fullMember.displayName || "Thành viên", photoURL: fullMember.photoURL || null };

        await addDocument("messages", {
          uid: "system",
          roomId: selectedRoomId,
          kind: "system",
          action: "add_member",
          actor,
          target,
          visibleFor: updatedMembers,
          createdAt: new Date(),
        });
      }
      setSelectedMembers([]);
      setSearchText('');
      setOptions([]);
      setIsInviteMemberVisible(false);
    } catch {}
  };

  const handleCancel = () => {
    setSelectedMembers([]);
    setSearchText('');
    setOptions([]);
    setIsInviteMemberVisible(false);
  };

  // --- Suggested Users ---
  const suggestedUsers = useMemo(() => {
    if (!uid || searchText) return [];
    return users
      .filter(u => u.uid !== uid && !currentMembers.includes(u.uid))
      .slice(0, 20);
  }, [users, uid, searchText, currentMembers]);

  // --- Recent Chats ---
  const recentChats = useMemo(() => {
    if (!uid || searchText) return [];
    return rooms
      .filter(r => r.members.includes(uid) && r.type === "private")
      .sort((a, b) => (b.updatedAt?.toDate?.() || 0) - (a.updatedAt?.toDate?.() || 0))
      .map(r => {
        const otherUid = r.members.find(m => m !== uid);
        const otherUser = users.find(u => u.uid === otherUid);
        return {
          uid: otherUid,
          displayName: otherUser?.displayName || r.name,
          photoURL: otherUser?.photoURL || r.avatar,
          username: otherUser?.username || ''
        };
      });
  }, [rooms, uid, users, searchText]);

  const displayUsers = searchText ? options : (recentChats.length > 0 ? recentChats : suggestedUsers);

  return (
    <Modal
      title="Mời thêm thành viên"
      open={isInviteMemberVisible}
      onCancel={handleCancel}
      footer={null}
      className="invite-member-modal"
      centered
      bodyStyle={{ maxHeight: '80vh', padding: '5px', display: 'flex', flexDirection: 'column' }}
    >
      {/* Search */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ marginBottom: 6, fontWeight: 600 }}>Tìm kiếm theo Quik ID</div>
        <Input
          placeholder="Tìm kiếm người dùng theo Quik ID..."
          value={searchText}
          onChange={handleSearchChange}
        />
      </div>

      {/* Header gợi ý */}
      {!searchText && (
        <div style={{ marginBottom: 6, fontWeight: 600 }}>
          {recentChats.length > 0 ? 'Trò chuyện gần đây' : 'Gợi ý'}
        </div>
      )}

      {/* User list */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
        {fetching && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
            <Spin size="small" />
          </div>
        )}

        {displayUsers.map(user => {
          const isMember = currentMembers.includes(user.uid);
          return (
            <UserItem
              key={user.uid}
              userObj={user}
              selectedMembers={selectedMembers}
              handleToggleMember={handleToggleMember}
              isMember={isMember}
            />
          );
        })}
      </div>

      {/* Selected Members */}
      {selectedMembers.length > 0 && (
        <div style={{ flexShrink: 0, maxHeight: 150, overflowY: 'auto', marginTop: 10, paddingRight: '10px' }}>
          <div style={{ fontWeight: 500 }}>Đã chọn:</div>
          {selectedMembers.map(user => (
            <UserItem
              key={user.uid}
              userObj={user}
              selectedMembers={selectedMembers}
              handleToggleMember={handleToggleMember}
              isSelected
            />
          ))}
        </div>
      )}

      {/* Button */}
      <Button
        type="primary"
        block
        disabled={selectedMembers.length === 0}
        onClick={handleOk}
        style={{ marginTop: 10, flexShrink: 0 }}
      >
        Thêm vào nhóm
      </Button>
    </Modal>
  );
}

// --- User Item Component ---
const UserItem = ({ userObj, selectedMembers, handleToggleMember, isSelected, isMember }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      padding: '5px 0',
      cursor: isMember ? 'not-allowed' : 'pointer',
      opacity: isMember ? 0.5 : 1
    }}
    onClick={() => !isMember && handleToggleMember(userObj)}
  >
    <Avatar src={userObj.photoURL} size={32} style={{ marginRight: 10 }} />
    <div style={{ flex: 1 }}>
      <div style={{ fontWeight: 500 }}>{userObj.displayName}</div>
      <div style={{ fontSize: 12, color: 'gray' }}>@{userObj.username}</div>
    </div>
    {isMember ? (
      <span style={{ fontSize: 12, color: 'gray' }}>Đã trong nhóm</span>
    ) : (
      <Checkbox checked={!!selectedMembers.find(u => u.uid === userObj.uid) || isSelected} />
    )}
  </div>
);
