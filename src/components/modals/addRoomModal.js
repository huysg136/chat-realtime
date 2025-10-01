import React, { useContext, useState, useEffect, useCallback } from 'react';
import { Modal, Input, Avatar, Spin, Checkbox, Button } from 'antd';
import { AppContext } from '../../context/appProvider';
import { AuthContext } from '../../context/authProvider';
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import debounce from 'lodash/debounce';
import { addDocument } from '../../firebase/services';

export default function AddRoomModal() {
  const { isAddRoomVisible, setIsAddRoomVisible, setSelectedRoomId } = useContext(AppContext);
  const { user } = useContext(AuthContext);
  const uid = user?.uid;

  const [searchText, setSearchText] = useState('');
  const [options, setOptions] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]); // lưu full user object

  // Reset fields mỗi khi modal đóng
  useEffect(() => {
    if (!isAddRoomVisible) {
      setSearchText('');
      setSelectedMembers([]);
      setOptions([]);
      setFetching(false);
    }
  }, [isAddRoomVisible]);

  // Debounce search
  const fetchUserList = async (text) => {
    if (!text) return setOptions([]);
    setFetching(true);
    const q = query(
      collection(db, "users"),
      where("keywords", "array-contains", text),
      orderBy("displayName"),
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
    setFetching(false);
  };

  const debounceFetcher = debounce(fetchUserList, 300);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchText(value);
    debounceFetcher(value);
  };

  const handleToggleMember = (user) => {
    setSelectedMembers(prev => {
      if (prev.find(u => u.uid === user.uid)) {
        return prev.filter(u => u.uid !== user.uid);
      }
      return [...prev, user];
    });
  };

  const handleOk = async () => {
    if (!uid || selectedMembers.length === 0) return;

    if (selectedMembers.length === 1) {
      // Chat private
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
        const newRoom = {
          name: otherUser.displayName,
          type: 'private',
          members: [uid, otherUser.uid],
          avatar: otherUser.photoURL
        };
        const docRef = await addDocument('rooms', newRoom);
        room = { id: docRef.id, ...newRoom };
      }

      setSelectedRoomId(room.id);
    } else {
      // Chat group
      const members = Array.from(new Set([uid, ...selectedMembers.map(u => u.uid)]));
      const roomName = [user.displayName, ...selectedMembers.map(u => u.displayName)].join(', ');

      const newRoom = {
        name: roomName,
        type: 'group',
        members
      };
      const docRef = await addDocument('rooms', newRoom);
      setSelectedRoomId(docRef.id);
    }

    // Reset modal
    setSearchText('');
    setSelectedMembers([]);
    setOptions([]);
    setFetching(false);
    setIsAddRoomVisible(false);
  };

  const handleCancel = () => {
    setSearchText('');
    setSelectedMembers([]);
    setOptions([]);
    setFetching(false);
    setIsAddRoomVisible(false);
  };

  const filteredOptions = options.filter(u => !selectedMembers.find(s => s.uid === u.uid));

  return (
    <Modal
      title="Tin nhắn mới"
      open={isAddRoomVisible}
      onCancel={handleCancel}
      footer={null}
    >
      <div style={{ marginBottom: 10 }}>
        <Input
          placeholder="Tìm kiếm..."
          value={searchText}
          onChange={handleSearchChange}
        />
      </div>

      <div style={{ maxHeight: 200, overflowY: 'auto' }}>
        {fetching && <Spin size="small" />}
        {filteredOptions.map(user => (
          <div
            key={user.uid}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '5px 0',
              cursor: 'pointer'
            }}
            onClick={() => handleToggleMember(user)}
          >
            <Avatar src={user.photoURL} size={32} style={{ marginRight: 10 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500 }}>{user.displayName}</div>
              <div style={{ fontSize: 12, color: 'gray' }}>@{user.username}</div>
            </div>
            <Checkbox checked={selectedMembers.find(u => u.uid === user.uid)} />
          </div>
        ))}
      </div>

      {selectedMembers.length > 0 && (
        <>
          <div style={{ marginTop: 15, fontWeight: 500 }}>Đã chọn:</div>
          <div style={{ maxHeight: 150, overflowY: 'auto' }}>
            {selectedMembers.map(user => (
              <div
                key={user.uid}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '5px 0',
                  cursor: 'pointer'
                }}
                onClick={() => handleToggleMember(user)}
              >
                <Avatar src={user.photoURL} size={32} style={{ marginRight: 10 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{user.displayName}</div>
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
        Chat
      </Button>
    </Modal>
  );
}
