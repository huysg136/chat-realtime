import React, { useContext, useState, useEffect } from 'react';
import { Modal, Input, Avatar, Spin, Checkbox, Button } from 'antd';
import { AppContext } from '../../context/appProvider';
import { AuthContext } from '../../context/authProvider';
import { collection, query, where, orderBy, limit, getDocs, doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import debounce from 'lodash/debounce';

export default function InviteMemberModal() {
  const { isInviteMemberVisible, setIsInviteMemberVisible, selectedRoomId } = useContext(AppContext);
  const { user } = useContext(AuthContext);
  const uid = user?.uid;

  const [searchText, setSearchText] = useState('');
  const [options, setOptions] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [currentMembers, setCurrentMembers] = useState([]); // lưu uid
  const [selectedMembers, setSelectedMembers] = useState([]); // lưu full user object

  // Lấy danh sách thành viên hiện tại khi modal mở
  useEffect(() => {
    const fetchCurrentMembers = async () => {
      if (!selectedRoomId) return;
      try {
        const roomRef = doc(db, "rooms", selectedRoomId);
        const roomSnap = await getDoc(roomRef);
        const roomData = roomSnap.data();
        setCurrentMembers(roomData?.members || []);
      } catch (error) {
        //console.error("Error fetching room members:", error);
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
      .filter(u => u.uid !== uid && !currentMembers.includes(u.uid)); // loại bỏ user hiện tại & thành viên đã có
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
    if (!selectedRoomId || selectedMembers.length === 0) return;

    try {
      const roomRef = doc(db, "rooms", selectedRoomId);
      const roomSnap = await getDoc(roomRef);
      const existingMembers = roomSnap.data()?.members || [];
      const newMemberIds = selectedMembers.map(u => u.uid);
      const updatedMembers = Array.from(new Set([...existingMembers, ...newMemberIds]));
      await updateDoc(roomRef, { members: updatedMembers });

      // Cập nhật state local
      setCurrentMembers(updatedMembers);
      setSelectedMembers([]);
      setSearchText('');
      setOptions([]);
      setIsInviteMemberVisible(false);
    } catch (error) {
      //console.error("Error updating room members:", error);
    }
  };

  const handleCancel = () => {
    setSelectedMembers([]);
    setSearchText('');
    setOptions([]);
    setIsInviteMemberVisible(false);
  };

  const filteredOptions = options.filter(u => !selectedMembers.find(s => s.uid === u.uid));

  return (
    <Modal
      title="Mời thêm thành viên"
      open={isInviteMemberVisible}
      onCancel={handleCancel}
      footer={null}
    >
      <div style={{ marginBottom: 10 }}>
        <Input
          placeholder="Tìm kiếm người dùng..."
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
        Thêm vào nhóm
      </Button>
    </Modal>
  );
}
