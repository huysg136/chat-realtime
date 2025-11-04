import React, { useContext, useState, useEffect } from 'react';
import { Modal, Input, Avatar, Spin, Checkbox, Button } from 'antd';
import { AppContext } from '../../context/appProvider';
import { AuthContext } from '../../context/authProvider';
import { collection, query, where, orderBy, limit, getDocs, doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import debounce from 'lodash/debounce';
import './inviteMemberModal.scss';

export default function InviteMemberModal() {
  const { isInviteMemberVisible, setIsInviteMemberVisible, selectedRoomId } = useContext(AppContext);
  const { user } = useContext(AuthContext);
  const uid = user?.uid;

  const [searchText, setSearchText] = useState('');
  const [options, setOptions] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [currentMembers, setCurrentMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);

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

  // --- SEARCH USERS BY USERNAME ---
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
      const users = snapshot.docs
        .map(doc => ({
          uid: doc.data().uid,
          displayName: doc.data().displayName,
          photoURL: doc.data().photoURL,
          username: doc.data().username || ''
        }))
        .filter(u => u.uid !== uid); // loại bỏ chính user
      setOptions(users);
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

  const handleToggleMember = (user) => {
    if (currentMembers.includes(user.uid)) return; // không cho chọn nếu đã là thành viên
    setSelectedMembers(prev => {
      if (prev.find(u => u.uid === user.uid)) return prev.filter(u => u.uid !== user.uid);
      return [...prev, user];
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

  const filteredOptions = options; // hiển thị tất cả user, filter chỉ dựa vào search

  return (
    <Modal
      title="Mời thêm thành viên"
      open={isInviteMemberVisible}
      onCancel={handleCancel}
      footer={null}
      className="invite-member-modal"
    >
      <div style={{ marginBottom: 10 }}>
        <Input
          placeholder="Tìm kiếm người dùng theo Quik ID..."
          value={searchText}
          onChange={handleSearchChange}
        />
      </div>

      <div style={{ maxHeight: 300, overflowY: 'auto' }}>
        {fetching && <Spin size="small" />}
        {filteredOptions.map(user => {
          const isMember = currentMembers.includes(user.uid);
          return (
            <div
              key={user.uid}
              className="user-item"
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '5px 0',
                cursor: isMember ? 'not-allowed' : 'pointer',
                opacity: isMember ? 0.5 : 1
              }}
              onClick={() => handleToggleMember(user)}
            >
              <Avatar src={user.photoURL} size={32} style={{ marginRight: 10 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>{user.displayName}</div>
                <div style={{ fontSize: 12, color: 'gray' }}>@{user.username}</div>
              </div>
              {isMember ? (
                <span style={{ fontSize: 12, color: 'gray' }}>Đã trong nhóm</span>
              ) : (
                <Checkbox checked={!!selectedMembers.find(u => u.uid === user.uid)} />
              )}
            </div>
          );
        })}
      </div>

      {selectedMembers.length > 0 && (
        <>
          <div className="selected-label" style={{ marginTop: 15, fontWeight: 500 }}>Đã chọn:</div>
          <div style={{ maxHeight: 150, overflowY: 'auto' }}>
            {selectedMembers.map(user => (
              <div
                key={user.uid}
                style={{ display: 'flex', alignItems: 'center', padding: '5px 0', cursor: 'pointer' }}
                onClick={() => handleToggleMember(user)}
              >
                <Avatar src={user.photoURL} size={32} style={{ marginRight: 10 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{user.displayName}</div>
                  <div style={{ fontSize: 12, color: 'gray' }}>@{user.username}</div>
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
        Thêm vào nhóm
      </Button>
    </Modal>
  );
}
