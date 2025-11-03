import React, { useContext, useState, useEffect } from 'react';
import { Modal, Input, Avatar, Spin, Checkbox, Button } from 'antd';
import { AppContext } from '../../context/appProvider';
import { AuthContext } from '../../context/authProvider';
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import debounce from 'lodash/debounce';
import { addDocument, generateAESKey } from '../../firebase/services';
import './addRoomModal.scss';

export default function AddRoomModal() {
  const { isAddRoomVisible, setIsAddRoomVisible, setSelectedRoomId } = useContext(AppContext);
  const { user } = useContext(AuthContext);
  const uid = user?.uid;

  const [searchText, setSearchText] = useState('');
  const [options, setOptions] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [roomName, setRoomName] = useState('');
  const [isRoomNameEdited, setIsRoomNameEdited] = useState(false);

  const ROOM_NAME_MAX = 100;

  useEffect(() => {
    if (!isAddRoomVisible) {
      setSearchText('');
      setSelectedMembers([]);
      setOptions([]);
      setFetching(false);
      setRoomName('');
      setIsRoomNameEdited(false);
    }
  }, [isAddRoomVisible]);

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

    if (defaultName.length > ROOM_NAME_MAX) {
      defaultName = defaultName.slice(0, ROOM_NAME_MAX);
    }

    setRoomName(defaultName);
  }, [selectedMembers, isRoomNameEdited, user]);

  // SEARCH USERS BY USERNAME
  const fetchUserList = async (text) => {
    if (!text) return setOptions([]);
    setFetching(true);
    try {
      const q = query(
        collection(db, "users"),
        where("username", ">=", text.toLowerCase()),
        where("username", "<=", text.toLowerCase() + "\uf8ff"),
        orderBy("username"),
        limit(20)
      );
      const snapshot = await getDocs(q);
      const users = snapshot.docs
        .map(doc => ({
          uid: doc.data().uid,
          displayName: doc.data().displayName,
          photoURL: doc.data().photoURL,
          username: doc.data().username || ''
        }))
        .filter(u => u.uid !== uid);
      setOptions(users);
    } catch (err) {
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
      return [...prev, { ...userObj }];
    });
  };

  const handleRoomNameChange = (e) => {
    setRoomName(e.target.value.slice(0, ROOM_NAME_MAX)); 
    setIsRoomNameEdited(true);
  };

  const handleOk = async () => {
    if (!uid || selectedMembers.length === 0) return;

    const finalRoomName = (roomName && roomName.trim())
      ? roomName.trim().slice(0, ROOM_NAME_MAX)
      : (() => {
          if (selectedMembers.length === 1) return selectedMembers[0].displayName.slice(0, ROOM_NAME_MAX);
          const names = [user?.displayName, ...selectedMembers.map(m => m.displayName)].filter(Boolean).join(', ');
          return names.slice(0, ROOM_NAME_MAX);
        })();

    if (selectedMembers.length === 1) {
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
        const newRoom = { name: finalRoomName, type: 'private', members: [uid, otherUser.uid], avatar: otherUser.photoURL, secretKey: generateAESKey(), roles };
        const docRef = await addDocument('rooms', newRoom);
        room = { id: docRef.id, ...newRoom };
      }
      setSelectedRoomId(room.id);
    } else {
      const members = Array.from(new Set([uid, ...selectedMembers.map(u => u.uid)]));
      const roles = [{ uid, role: 'owner' }, ...selectedMembers.map(m => ({ uid: m.uid, role: 'member' }))];
      const newRoom = { name: finalRoomName, type: 'group', members, secretKey: generateAESKey(), roles };
      const docRef = await addDocument('rooms', newRoom);
      setSelectedRoomId(docRef.id);
    }

    setSearchText('');
    setSelectedMembers([]);
    setOptions([]);
    setFetching(false);
    setRoomName('');
    setIsRoomNameEdited(false);
    setIsAddRoomVisible(false);
  };

  const handleCancel = () => {
    setSearchText('');
    setSelectedMembers([]);
    setOptions([]);
    setFetching(false);
    setRoomName('');
    setIsRoomNameEdited(false);
    setIsAddRoomVisible(false);
  };

  const filteredOptions = options.filter(u => !selectedMembers.find(s => s.uid === u.uid));
  const isPrivateSelection = selectedMembers.length === 1;

  return (
    <Modal
      title="Tin nhắn mới"
      open={isAddRoomVisible}
      onCancel={handleCancel}
      footer={null}
      className="add-room-modal"
    >
      {selectedMembers.length > 1 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ marginBottom: 6, fontWeight: 600 }}>Tên nhóm</div>
          <Input
            // placeholder="Nhập tên nhóm (bỏ trống để lấy tên mặc định)"
            value={roomName}
            onChange={handleRoomNameChange}
            disabled={isPrivateSelection}
            showCount
            maxLength={ROOM_NAME_MAX}
          />
        </div>
      )}

      <div style={{ marginBottom: 10 }}>
        <div style={{ marginBottom: 6, fontWeight: 600 }}>Tìm kiếm theo username</div>
        <Input
          placeholder="Nhập username..."
          value={searchText}
          onChange={handleSearchChange}
        />
      </div>

      <div style={{ maxHeight: 200, overflowY: 'auto' }}>
        {fetching && <Spin size="small" />}
        {filteredOptions.map(userOpt => (
          <div
            key={userOpt.uid}
            style={{ display: 'flex', alignItems: 'center', padding: '5px 0', cursor: 'pointer' }}
            onClick={() => handleToggleMember(userOpt)}
          >
            <Avatar src={userOpt.photoURL} size={32} style={{ marginRight: 10 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500 }}>{userOpt.displayName}</div>
              <div style={{ fontSize: 12, color: 'gray' }}>@{userOpt.username}</div>
            </div>
            <Checkbox checked={!!selectedMembers.find(u => u.uid === userOpt.uid)} />
          </div>
        ))}
      </div>

      {selectedMembers.length > 0 && (
        <>
          <div style={{ marginTop: 15, fontWeight: 500 }}>Đã chọn:</div>
          <div style={{ maxHeight: 150, overflowY: 'auto' }}>
            {selectedMembers.map(member => (
              <div
                key={member.uid}
                style={{ display: 'flex', alignItems: 'center', padding: '5px 0', cursor: 'pointer' }}
                onClick={() => handleToggleMember(member)}
              >
                <Avatar src={member.photoURL} size={32} style={{ marginRight: 10 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{member.displayName}</div>
                  <div style={{ fontSize: 12, color: 'gray' }}>@{member.username}</div>
                </div>
                <Checkbox checked={true} />
              </div>
            ))}
          </div>
        </>
      )}

      <Button
        type="primary"
        block
        disabled={selectedMembers.length === 0}
        onClick={handleOk}
        style={{ marginTop: 10 }}
      >
        {selectedMembers.length <= 1 ? 'Chat' : `Tạo nhóm (${selectedMembers.length + 1} người)`}
      </Button>
    </Modal>
  );
}
