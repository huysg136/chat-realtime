import React, { useState, useContext, useEffect, useRef } from 'react';
import { Modal, Avatar, Input, Button, Card } from 'antd';
import { EditOutlined, UserOutlined, CameraOutlined } from '@ant-design/icons';
import { AuthContext } from '../../context/authProvider';
import { AppContext } from '../../context/appProvider';
import { updateDocument, generateKeywords, getUserDocIdByUid } from '../../firebase/services';
import { db } from "../../firebase/config";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { doc, onSnapshot, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';

const defaultAvatar = "https://images.spiderum.com/sp-images/9ae85f405bdf11f0a7b6d5c38c96eb0e.jpeg";

export default function ProfileModal() {
  const { user, setUser } = useContext(AuthContext);
  const { isProfileVisible, setIsProfileVisible } = useContext(AppContext);

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [isEditingName, setIsEditingName] = useState(false);
  const [loading, setLoading] = useState(false);

  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!user?.uid) return;
    let unsubscribe = null;

    getUserDocIdByUid(user.uid).then((docId) => {
      if (!docId) return;
      unsubscribe = onSnapshot(doc(db, "users", docId), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setDisplayName(data.displayName || '');
          setPhotoURL(data.photoURL || defaultAvatar);
          setUser(prev => ({ ...prev, displayName: data.displayName, photoURL: data.photoURL }));
        }
      });
    });

    return () => unsubscribe?.();
  }, [user?.uid, setUser]);

  useEffect(() => {
    if (isEditingName && inputRef.current) inputRef.current.focus();
  }, [isEditingName]);

  const handleEditName = () => setIsEditingName(true);

  const handleSaveName = async () => {
    if (!displayName.trim()) {
      toast.error('Tên không được để trống');
      return;
    }

    setLoading(true);
    try {
      const trimmedName = displayName.trim();
      const keywords = generateKeywords(trimmedName);

      const docId = await getUserDocIdByUid(user.uid);
      if (!docId) {
        setLoading(false);
        return;
      }

      const success = await updateDocument("users", docId, {
        displayName: trimmedName,
        keywords,
      });

      if (success) {
        setUser(prev => ({ ...prev, displayName: trimmedName }));

        const roomsRef = collection(db, "rooms");
        const q = query(
          roomsRef,
          where("type", "==", "private"),
          where("members", "array-contains", user.uid)
        );

        const querySnapshot = await getDocs(q);
        const batch = writeBatch(db);

        querySnapshot.forEach((roomDoc) => {
          const roomData = roomDoc.data();
          const otherMemberUid = roomData.members.find(uid => uid !== user.uid);

          if (!otherMemberUid || otherMemberUid === user.uid) return;

          batch.update(doc(db, "rooms", roomDoc.id), { name: trimmedName });
        });

        await batch.commit();

        setIsEditingName(false);
        toast.success('Cập nhật tên thành công và đồng bộ phòng private');
      } else {
        toast.error('Không thể cập nhật tên');
      }
    } catch (error) {
      console.error(error);
      toast.error('Lỗi khi cập nhật tên');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => setIsEditingName(false);

  const handleCancel = () => {
    setIsProfileVisible(false);
    setDisplayName(user?.displayName || '');
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    toast.info('Chức năng thay đổi ảnh đại diện chưa hoàn thành');
    // Bạn có thể upload lên storage và update Firestore ở đây
  };

  return (
    <Modal
      title="Hồ sơ của tôi"
      open={isProfileVisible}
      onCancel={handleCancel}
      footer={null}
      centered
      width={400}
    >
      <Card
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          border: 'none'
        }}
        bodyStyle={{ padding: '24px' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <Avatar
              size={100}
              src={photoURL || defaultAvatar}
              icon={<UserOutlined />}
              style={{ border: '4px solid #f0f0f0' }}
            />
            <Button
              type="primary"
              shape="circle"
              icon={<CameraOutlined />}
              size="small"
              onClick={() => fileInputRef.current.click()}
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                border: 'none',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              }}
            />
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            style={{ display: 'none' }}
          />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
            <span style={{ fontWeight: '600', marginRight: '8px' }}>Tên hiển thị</span>
            {!isEditingName && (
              <Button
                type="text"
                icon={<EditOutlined />}
                size="small"
                onClick={handleEditName}
                style={{ color: '#1890ff' }}
              />
            )}
          </div>
          {isEditingName ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              <Input
                ref={inputRef}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onPressEnter={handleSaveName}
                maxLength={50}
                style={{ flex: 1 }}
              />
              <Button
                type="primary"
                onClick={handleSaveName}
                loading={loading}
                size="small"
                disabled={displayName.trim() === (user?.displayName || '').trim()}
              >
                Lưu
              </Button>
              <Button onClick={handleCancelEdit} size="small">
                Hủy
              </Button>
            </div>
          ) : (
            <div style={{ fontSize: '16px', padding: '0px 0' }}>
              {displayName || 'Chưa có tên'}
            </div>
          )}
        </div>

        <div>
          <div style={{ fontWeight: '600', marginBottom: '8px' }}>Thông tin cá nhân</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: '4px' }}>Email</div>
              <div style={{ fontSize: '14px' }}>{user?.email}</div>
            </div>
          </div>
        </div>

        <ToastContainer position="top-center" autoClose={1000} />
      </Card>
    </Modal>
  );
}
