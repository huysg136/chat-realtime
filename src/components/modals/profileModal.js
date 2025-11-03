import React, { useState, useContext, useEffect, useRef } from 'react';
import { Modal, Avatar, Input, Button, Card } from 'antd';
import { EditOutlined, UserOutlined, CameraOutlined } from '@ant-design/icons';
import { AuthContext } from '../../context/authProvider';
import { AppContext } from '../../context/appProvider';
import { updateDocument, getUserDocIdByUid } from '../../firebase/services';
import { db } from "../../firebase/config";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { doc, onSnapshot, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import "./profileModal.scss";

const defaultAvatar = "https://images.spiderum.com/sp-images/9ae85f405bdf11f0a7b6d5c38c96eb0e.jpeg";
const MAX_USERNAME_LENGTH = 20;

export default function ProfileModal() {
  const { user, setUser } = useContext(AuthContext);
  const { isProfileVisible, setIsProfileVisible } = useContext(AppContext);

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || defaultAvatar);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [loading, setLoading] = useState(false);

  const nameInputRef = useRef(null);
  const usernameInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Chuẩn hóa username: liền, không dấu, chỉ a-z0-9, tối đa 20 ký tự
  const formatUsername = (name) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // bỏ dấu
      .replace(/[^a-z0-9]/g, "")       // bỏ khoảng trắng & ký tự đặc biệt
      .slice(0, MAX_USERNAME_LENGTH);
  };

  useEffect(() => {
    if (!user?.uid) return;
    let unsubscribe = null;

    getUserDocIdByUid(user.uid).then((docId) => {
      if (!docId) return;
      unsubscribe = onSnapshot(doc(db, "users", docId), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setDisplayName(data.displayName || '');
          setUsername(data.username || '');
          setPhotoURL(data.photoURL || defaultAvatar);
          setUser(prev => ({
            ...prev,
            displayName: data.displayName,
            username: data.username,
            photoURL: data.photoURL
          }));
        }
      });
    });

    return () => unsubscribe?.();
  }, [user?.uid, setUser]);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) nameInputRef.current.focus();
    if (isEditingUsername && usernameInputRef.current) usernameInputRef.current.focus();
  }, [isEditingName, isEditingUsername]);

  const handleSaveName = async () => {
    if (!displayName.trim()) {
      toast.error('Tên hiển thị không được để trống');
      return;
    }
    setLoading(true);
    try {
      const trimmedName = displayName.trim();
      const docId = await getUserDocIdByUid(user.uid);
      if (!docId) return;

      await updateDocument("users", docId, { displayName: trimmedName });
      setUser(prev => ({ ...prev, displayName: trimmedName }));
      setIsEditingName(false);
      toast.success('Cập nhật tên hiển thị thành công');
    } catch (error) {
      toast.error('Lỗi khi cập nhật tên hiển thị');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUsername = async () => {
    const formatted = formatUsername(username);
    if (!formatted) {
      toast.error('Username không được để trống');
      return;
    }

    setLoading(true);
    try {
      const q = query(
        collection(db, "users"),
        where("username", "==", formatted)
      );
      const querySnapshot = await getDocs(q);
      
      const isDuplicate = querySnapshot.docs.some(doc => doc.data().uid !== user.uid);
      if (isDuplicate) {
        toast.error('Username đã tồn tại, vui lòng chọn tên khác');
        setLoading(false);
        return;
      }

      const docId = await getUserDocIdByUid(user.uid);
      if (!docId) return;

      await updateDocument("users", docId, { username: formatted });
      setUsername(formatted);
      setUser(prev => ({ ...prev, username: formatted }));
      setIsEditingUsername(false);
      toast.success('Cập nhật username thành công');
    } catch (error) {
      toast.error('Lỗi khi cập nhật username');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsProfileVisible(false);
    setDisplayName(user?.displayName || '');
    setUsername(user?.username || '');
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    toast.info('Chức năng thay đổi ảnh đại diện chưa hoàn thành');
    // Upload lên Storage và update Firestore nếu muốn
  };

  return (
    <Modal
      title="Hồ sơ của tôi"
      open={isProfileVisible}
      onCancel={handleCancel}
      footer={null}
      centered
      width={400}
      className="profile-modal"
    >
      <Card className="profile-card" bodyStyle={{ padding: '24px' }}>
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
              className="camera-button"
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                border: 'none'
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

        {/* Display Name */}
        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
            <span style={{ fontWeight: '600', marginRight: '8px' }}>Tên hiển thị</span>
            {!isEditingName && (
              <Button 
                type="text" 
                icon={<EditOutlined />} 
                size="small" 
                onClick={() => {
                  setIsEditingName(true);
                  setIsEditingUsername(false);
                }}
              />
            )}
          </div>
          {isEditingName ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              <Input
                ref={nameInputRef}
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
                disabled={displayName.trim() === (user?.displayName || '').trim()}
              >
                Lưu
              </Button>
              <Button onClick={() => setIsEditingName(false)}>Hủy</Button>
            </div>
          ) : (
            <div style={{ fontSize: '16px' }}>{displayName || 'Chưa có tên'}</div>
          )}
        </div>

        {/* Username */}
        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
            <span style={{ fontWeight: '600', marginRight: '8px' }}>Username</span>
            {!isEditingUsername && (
              <Button 
                type="text" 
                icon={<EditOutlined />} 
                size="small" 
                onClick={() => {
                  setIsEditingUsername(true);
                  setIsEditingName(false);
                }} 
              />
            )}
          </div>
          {isEditingUsername ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              <Input
                ref={usernameInputRef}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onPressEnter={handleSaveUsername}
                maxLength={MAX_USERNAME_LENGTH}
                style={{ flex: 1 }}
              />
              <Button 
                type="primary" 
                onClick={handleSaveUsername} 
                loading={loading}
                disabled={formatUsername(username) === (user?.username || '')}
                >
                  Lưu
              </Button>
              <Button onClick={() => setIsEditingUsername(false)}>Hủy</Button>
            </div>
          ) : (
            <div style={{ fontSize: '14px', color: '#555' }}>@{username || 'chưa có username'}</div>
          )}
        </div>

        {/* Email */}
        <div>
          <div style={{ fontWeight: '600', marginBottom: '8px' }}>Email</div>
            <div>
              <div style={{ fontSize: '14px' }}>{user?.email}</div>
            </div>
        </div>
      </Card>
    </Modal>
  );
}
