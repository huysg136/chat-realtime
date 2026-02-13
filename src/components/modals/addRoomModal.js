import React, { useContext, useState, useEffect, useMemo } from 'react';
import { Modal, Input, Avatar, Spin, Checkbox, Button } from 'antd';
import { AppContext } from '../../context/appProvider';
import { AuthContext } from '../../context/authProvider';
import { collection, query, where, orderBy, limit, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import debounce from 'lodash/debounce';
import { addDocument, generateAESKey } from '../../firebase/services';
import './addRoomModal.scss';
import UserBadge from '../common/userBadge';

export default function AddRoomModal() {
  const { isAddRoomVisible, setIsAddRoomVisible, setSelectedRoomId, rooms, users } = useContext(AppContext);
  const { user } = useContext(AuthContext);
  const uid = user?.uid;

  const [searchText, setSearchText] = useState('');
  const [options, setOptions] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [currentMembers, setCurrentMembers] = useState([]);
  const [roomName, setRoomName] = useState('');
  const [isRoomNameEdited, setIsRoomNameEdited] = useState(false);
  const ROOM_NAME_MAX = 100;

  useEffect(() => {
    if (!isAddRoomVisible) resetModal();
  }, [isAddRoomVisible]);

  const resetModal = () => {
    setSearchText('');
    setSelectedMembers([]);
    setOptions([]);
    setFetching(false);
    setRoomName('');
    setIsRoomNameEdited(false);
    setCurrentMembers([]);
  };

  // Fetch current members if editing existing room (optional)
  useEffect(() => {
    if (!isAddRoomVisible) return;
    const fetchCurrentMembers = async () => {
      if (!currentMembers.length && rooms) {
        const room = rooms.find(r => r.id === setSelectedRoomId);
        if (room) setCurrentMembers(room.members || []);
      }
    };
    fetchCurrentMembers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAddRoomVisible, rooms, setSelectedRoomId]);

  // Auto-generate room name
  useEffect(() => {
    if (isRoomNameEdited) return;
    if (selectedMembers.length === 0) {
      setRoomName('');
      return;
    }
    let defaultName = '';
    if (selectedMembers.length === 1) {
      defaultName = selectedMembers[0].displayName || '';
    } else {
      const participantNames = [user?.displayName, ...selectedMembers.map(m => m.displayName)].filter(Boolean);
      defaultName = participantNames.join(', ');
    }
    if (defaultName.length > ROOM_NAME_MAX) defaultName = defaultName.slice(0, ROOM_NAME_MAX);
    setRoomName(defaultName);
  }, [selectedMembers, isRoomNameEdited, user]);

  // SEARCH USERS
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
          limit(20)
        );
      } else {
        q = query(collection(db, "users"), orderBy("username"), limit(20));
      }
      const snapshot = await getDocs(q);
      const usersList = snapshot.docs
        .map(doc => ({
          uid: doc.data().uid,
          displayName: doc.data().displayName,
          photoURL: doc.data().photoURL,
          username: doc.data().username || '',
          premiumLevel: doc.data().premiumLevel,
          premiumUntil: doc.data().premiumUntil,
          role: doc.data().role
        }))
        .filter(u => u.uid !== uid && !currentMembers.includes(u.uid));
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
    setSelectedMembers(prev => {
      const exists = prev.find(u => u.uid === userObj.uid);
      if (exists) return prev.filter(u => u.uid !== userObj.uid);
      return [...prev, userObj];
    });
  };

  const handleRoomNameChange = (e) => {
    setRoomName(e.target.value.slice(0, ROOM_NAME_MAX));
    setIsRoomNameEdited(true);
  };

  // Handle create chat / group
  const handleOk = async () => {
    if (!uid || selectedMembers.length === 0) return;

    const finalRoomName = roomName?.trim()
      ? roomName.trim().slice(0, ROOM_NAME_MAX)
      : (() => {
        if (selectedMembers.length === 1) return selectedMembers[0].displayName.slice(0, ROOM_NAME_MAX);
        return [user?.displayName, ...selectedMembers.map(m => m.displayName)]
          .filter(Boolean)
          .join(', ')
          .slice(0, ROOM_NAME_MAX);
      })();

    if (selectedMembers.length === 1) {
      // PRIVATE CHAT
      const otherUser = selectedMembers[0];
      const q = query(
        collection(db, 'rooms'),
        where('type', '==', 'private'),
        where('members', 'array-contains', uid),
        limit(20)
      );
      const snapshot = await getDocs(q);
      let room = null;
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.members.includes(otherUser.uid) && data.members.length === 2) {
          room = { id: doc.id, ...data };
        }
      });
      if (!room) {
        const roles = [{ uid, role: 'owner' }, { uid: otherUser.uid, role: 'member' }];
        const newRoom = {
          name: finalRoomName,
          type: 'private',
          members: [uid, otherUser.uid],
          avatar: otherUser.photoURL,
          secretKey: generateAESKey(),
          roles
        };
        const docRef = await addDocument('rooms', newRoom);
        room = { id: docRef.id, ...newRoom };
      }
      setSelectedRoomId(room.id);
    } else {
      // GROUP
      const members = [uid];
      const roles = [{ uid, role: 'owner' }];
      const newRoom = { name: finalRoomName, type: 'group', members: [...members], secretKey: generateAESKey(), roles };
      const docRef = await addDocument('rooms', newRoom);
      const actor = { uid: user.uid, name: user.displayName, photoURL: user.photoURL };

      await addDocument("messages", {
        uid: "system",
        roomId: docRef.id,
        kind: "system",
        action: "create_group",
        actor,
        target: actor,
        visibleFor: members,
        createdAt: new Date(),
      });

      for (const member of selectedMembers) {
        const fullMember = users.find(u => u.uid === member.uid) || member;

        if (fullMember.allowGroupInvite === true) {
          newRoom.members.push(fullMember.uid);
          roles.push({ uid: fullMember.uid, role: 'member' });

          const target = { uid: fullMember.uid, name: fullMember.displayName || "Thành viên", photoURL: fullMember.photoURL || null };
          await addDocument("messages", {
            uid: "system",
            roomId: docRef.id,
            kind: "system",
            action: "add_member",
            actor,
            target,
            visibleFor: newRoom.members,
            createdAt: new Date(),
          });
        } else {
          try {
            const q = query(
              collection(db, "groupInvites"),
              where("uid", "==", fullMember.uid),
              where("roomId", "==", docRef.id),
              where("status", "==", "pending"),
              limit(1)
            );
            const snapshot = await getDocs(q);
            if (snapshot.empty) {
              await addDocument("groupInvites", {
                uid: fullMember.uid,
                invitedBy: user.uid,
                roomId: docRef.id,
                status: "pending",
                createdAt: new Date(),
              });
            }
          } catch (err) {
          }
        }
      }

      await updateDoc(doc(db, "rooms", docRef.id), {
        members: newRoom.members,
        roles
      });

      setSelectedRoomId(docRef.id);
    }

    resetModal();
    setIsAddRoomVisible(false);
  };

  const handleCancel = () => {
    resetModal();
    setIsAddRoomVisible(false);
  };

  const filteredOptions = options.filter(u => !selectedMembers.find(s => s.uid === u.uid));
  const isPrivateSelection = selectedMembers.length === 1;

  const suggestedUsers = useMemo(() => {
    if (!uid || searchText) return [];
    return users.filter(u => u.uid !== uid && !currentMembers.includes(u.uid)).slice(0, 20);
  }, [users, uid, searchText, currentMembers]);

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
          username: otherUser?.username || '',
          premiumLevel: otherUser?.premiumLevel,
          premiumUntil: otherUser?.premiumUntil,
          role: otherUser?.role
        };
      });
  }, [rooms, uid, users, searchText]);

  const displayUsers = searchText ? filteredOptions : (recentChats.length > 0 ? recentChats : suggestedUsers);

  return (
    <Modal
      title="Tin nhắn mới"
      open={isAddRoomVisible}
      onCancel={handleCancel}
      footer={null}
      className="add-room-modal"
      centered
      bodyStyle={{ maxHeight: '80vh', padding: '5px', display: 'flex', flexDirection: 'column' }}
    >
      {/* Header + Room name */}
      {selectedMembers.length > 1 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ marginBottom: 6, fontWeight: 600 }}>Tên nhóm</div>
          <Input
            value={roomName}
            onChange={handleRoomNameChange}
            disabled={isPrivateSelection}
            placeholder="Tên nhóm (mặc định là các thành viên được chọn)"
            showCount
            maxLength={ROOM_NAME_MAX}
          />
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ marginBottom: 6, fontWeight: 600 }}>Tìm kiếm theo Quik ID</div>
        <Input placeholder="Nhập Quik ID..." value={searchText} onChange={handleSearchChange} />
      </div>

      {/* User List */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
        {!searchText && (
          <div style={{ marginBottom: 6, fontWeight: 600 }}>
            {recentChats.length > 0 ? 'Trò chuyện gần đây' : 'Gợi ý'}
          </div>
        )}
        {fetching && <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><Spin size="small" /></div>}

        {displayUsers.map(user => {
          const isMember = currentMembers.includes(user.uid);
          return (
            <UserItem
              key={user.uid}
              userObj={user}
              selectedMembers={selectedMembers}
              handleToggleMember={handleToggleMember}
              isSelected={!!selectedMembers.find(u => u.uid === user.uid)}
              isMember={isMember}
            />
          );
        })}
      </div>

      {/* Selected Members */}
      {selectedMembers.length > 0 && (
        <div style={{ flexShrink: 0, maxHeight: 150, overflowY: 'auto', marginTop: 10, paddingRight: '10px' }}>
          <div style={{ fontWeight: 500 }}>Đã chọn:</div>
          {selectedMembers.map(member => (
            <UserItem
              key={member.uid}
              userObj={member}
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
        {selectedMembers.length <= 1 ? 'Chat' : `Tạo nhóm (${selectedMembers.length + 1} người)`}
      </Button>
    </Modal>
  );
}

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
      <UserBadge displayName={userObj.displayName} role={userObj.role} premiumLevel={userObj.premiumLevel} premiumUntil={userObj.premiumUntil} />
      <div style={{ fontSize: 12, color: 'gray' }}>@{userObj.username}</div>
    </div>
    {isMember ? (
      <span style={{ fontSize: 12, color: 'gray' }}>Đã trong nhóm</span>
    ) : (
      <Checkbox checked={!!selectedMembers.find(u => u.uid === userObj.uid) || isSelected} />
    )}
  </div>
);
