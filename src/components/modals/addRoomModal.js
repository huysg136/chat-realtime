import React, { useContext, useState, useEffect } from 'react';
import { Modal, Input, Avatar, Spin, Checkbox, Button, Tooltip } from 'antd';
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
  // selectedMembers lưu full object user (không còn isCoOwner nữa)
  const [selectedMembers, setSelectedMembers] = useState([]);

  // suggested users (gợi ý sẵn 5-10 tên)
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [loadingSuggested, setLoadingSuggested] = useState(false);

  // room name state
  const [roomName, setRoomName] = useState('');
  const [isRoomNameEdited, setIsRoomNameEdited] = useState(false);
  const ROOM_NAME_MAX = 100;

  // Reset fields mỗi khi modal đóng
  useEffect(() => {
    if (!isAddRoomVisible) {
      setSearchText('');
      setSelectedMembers([]);
      setOptions([]);
      setFetching(false);
      setRoomName('');
      setIsRoomNameEdited(false);
    } else {
      // khi mở modal, load suggested users
      fetchSuggestedUsers();
    }
  }, [isAddRoomVisible]);

  // Cập nhật roomName mặc định khi selectedMembers thay đổi (nếu chưa edit tay)
  useEffect(() => {
    if (isRoomNameEdited) return; // nếu user đã edit tay thì không override
    if (selectedMembers.length === 0) {
      setRoomName(''); // chưa có tên
      return;
    }
    if (selectedMembers.length === 1) {
      // private -> đặt tên theo người kia
      setRoomName(selectedMembers[0].displayName || '');
    } else {
      // group -> "me, A, B..." hoặc "OwnerName, A, B"
      const participantNames = [user?.displayName, ...selectedMembers.map(m => m.displayName)].filter(Boolean);
      setRoomName(participantNames.join(', '));
    }
  }, [selectedMembers, isRoomNameEdited, user]);

  // Lấy suggested users (10 user đầu theo displayName, loại bỏ chính user)
  const fetchSuggestedUsers = async () => {
    setLoadingSuggested(true);
    try {
      const q = query(
        collection(db, "users"),
        orderBy("displayName"),
        limit(10)
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
      setSuggestedUsers(users);
    } catch (err) {
      setSuggestedUsers([]);
    } finally {
      setLoadingSuggested(false);
    }
  };

  // Debounce search
  const fetchUserList = async (text) => {
    if (!text) return setOptions([]);
    setFetching(true);
    try {
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
      if (exists) {
        // remove
        return prev.filter(u => u.uid !== userObj.uid);
      }
      // add (no isCoOwner flag)
      return [...prev, { ...userObj }];
    });
    // nếu user toggle member (bằng click trên item), không set isRoomNameEdited => tự cập nhật tên mặc định
  };

  // Thêm nhanh từ suggested
  const handleAddSuggested = (userObj) => {
    // nếu đã có thì bỏ (toggle)
    const exists = selectedMembers.find(u => u.uid === userObj.uid);
    if (exists) {
      setSelectedMembers(prev => prev.filter(u => u.uid !== userObj.uid));
    } else {
      setSelectedMembers(prev => [...prev, userObj]);
    }
    // không bật isRoomNameEdited để roomName vẫn tự update (người dùng có thể chỉnh tay sau)
  };

  // Khi user edit tên nhóm -> bật cờ isRoomNameEdited
  const handleRoomNameChange = (e) => {
    setRoomName(e.target.value);
    setIsRoomNameEdited(true);
  };

  const handleOk = async () => {
    if (!uid || selectedMembers.length === 0) return;

    // Ensure roomName fallback
    const finalRoomName = (roomName && roomName.trim()) ? roomName.trim().slice(0, ROOM_NAME_MAX) : (
      selectedMembers.length === 1 ? selectedMembers[0].displayName : [user?.displayName, ...selectedMembers.map(m => m.displayName)].join(', ')
    );

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
        // roles: owner is current user, other is member (no co-owner at creation)
        const roles = [
          { uid, role: 'owner' },
          { uid: otherUser.uid, role: 'member' }
        ];

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
      // Chat group
      // members là list uid (unique)
      const members = Array.from(new Set([uid, ...selectedMembers.map(u => u.uid)]));

      // roles: owner is current user; others default to member (no co-owner at creation)
      const roles = [
        { uid, role: 'owner' },
        ...selectedMembers.map(m => ({ uid: m.uid, role: 'member' }))
      ];

      const newRoom = {
        name: finalRoomName,
        type: 'group',
        members,
        secretKey: generateAESKey(),
        roles
      };
      const docRef = await addDocument('rooms', newRoom);
      setSelectedRoomId(docRef.id);
    }

    // Reset modal
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

  // filter out already selected from search options
  const filteredOptions = options.filter(u => !selectedMembers.find(s => s.uid === u.uid));

  // room name input disabled when private (1 selected) and a name exists
  const isPrivateSelection = selectedMembers.length === 1;

  return (
    <Modal
      title="Tin nhắn mới"
      open={isAddRoomVisible}
      onCancel={handleCancel}
      footer={null}
      className="add-room-modal"
    >
      {/* Room name input */}
      {
        selectedMembers.length > 1 ? (
          <div style={{ marginBottom: 10 }}>
            <div style={{ marginBottom: 6, fontWeight: 600 }}>Tên nhóm</div>
            <Input
              placeholder={selectedMembers.length === 1 ? '' : 'Nhập tên nhóm (bỏ trống để lấy tên mặc định)'}
              // value={roomName}
              onChange={handleRoomNameChange}
              disabled={isPrivateSelection} 
              showCount
              maxLength={ROOM_NAME_MAX}
            />
          </div>
        ) : ''
      }
      

      {/* Suggested users
      <div style={{ marginBottom: 10 }}>
        <div style={{ marginBottom: 6, fontWeight: 600 }}>Gợi ý</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {loadingSuggested ? (
            <Spin size="small" />
          ) : (
            suggestedUsers.length > 0 ? suggestedUsers.map(su => {
              const isSelected = !!selectedMembers.find(u => u.uid === su.uid);
              return (
                <Tooltip key={su.uid} title={su.displayName}>
                  <div
                    onClick={() => handleAddSuggested(su)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 8px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      background: isSelected ? '#e6f7ff' : 'transparent',
                      border: isSelected ? '1px solid #91d5ff' : '1px solid transparent'
                    }}
                  >
                    <Avatar src={su.photoURL} size={28} />
                    <div style={{ maxWidth: 120, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 13 }}>
                      {su.displayName}
                    </div>
                  </div>
                </Tooltip>
              );
            }) : <div style={{ color: 'rgba(0,0,0,0.45)' }}>Không có gợi ý</div>
          )}
        </div>
      </div> */}

      <div style={{ marginBottom: 10 }}>
        <div style={{ marginBottom: 6, fontWeight: 600 }}>Tìm kiếm</div>
        <Input
          placeholder="Nhập tên..."
          value={searchText}
          onChange={handleSearchChange}
        />
      </div>

      <div style={{ maxHeight: 200, overflowY: 'auto' }}>
        {fetching && <Spin size="small" />}
        {filteredOptions.map(userOpt => (
          <div
            key={userOpt.uid}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '5px 0',
              cursor: 'pointer'
            }}
            onClick={() => handleToggleMember(userOpt)}
          >
            <Avatar src={userOpt.photoURL} size={32} style={{ marginRight: 10 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {userOpt.displayName}
              </div>
              {/* <div style={{ fontSize: 12, color: 'gray' }}>@{userOpt.username}</div> */}
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
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '5px 0',
                  cursor: 'pointer'
                }}
                onClick={() => handleToggleMember(member)}
              >
                <Avatar src={member.photoURL} size={32} style={{ marginRight: 10 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{member.displayName}</div>
                </div>
                <div>
                  <Checkbox checked={true} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {
        selectedMembers.length <= 1 ? (
          <Button
            type="primary"
            block
            disabled={selectedMembers.length === 0}
            onClick={handleOk}
            style={{ marginTop: 10 }}
          >
            Chat
          </Button>
        ) :
        (
          <Button
            type="primary"
            block
            disabled={selectedMembers.length === 0}
            onClick={handleOk}
            style={{ marginTop: 10 }}
          >
            {`Tạo nhóm (${selectedMembers.length + 1} người)`}
          </Button>
        )
      }
    </Modal>
  );
}
