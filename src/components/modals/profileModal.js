import React, { useState, useContext, useEffect, useRef } from 'react';
import { Modal, Avatar, Input, Button, Card } from 'antd';
import { EditOutlined, UserOutlined, CameraOutlined } from '@ant-design/icons';
import { AuthContext } from '../../context/authProvider';
import { AppContext } from '../../context/appProvider';
import { updateDocument, getUserDocIdByUid } from '../../firebase/services';
import { db } from "../../firebase/config";
import { toast } from 'react-toastify';
import axios from "axios";
import 'react-toastify/dist/ReactToastify.css';
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { FiAlertTriangle, FiCheckCircle, FiXCircle, FiRefreshCcw } from "react-icons/fi";
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

  const [lastChange, setLastChange] = useState(null);
  const [changeCount, setChangeCount] = useState(0);

  const nameInputRef = useRef(null);
  const usernameInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Chuẩn hóa username: liền, không dấu, chỉ a-z0-9, tối đa 20 ký tự
  const formatUsername = (name) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "")
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
          setLastChange(data.lastUsernameChange || null);
          setChangeCount(data.usernameChangeCount || 0);

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

  // 🆕 Giới hạn đổi username: 1 lần / 30 ngày, tối đa 5 lần
  const handleSaveUsername = async () => {
    const formatted = formatUsername(username);
    if (!formatted) {
      toast.error('Quik ID không được để trống');
      return;
    }

    setLoading(true);
    try {
      // Kiểm tra username trùng
      const q = query(collection(db, "users"), where("username", "==", formatted));
      const querySnapshot = await getDocs(q);
      const isDuplicate = querySnapshot.docs.some(doc => doc.data().uid !== user.uid);
      if (isDuplicate) {
        toast.error('Quik ID đã tồn tại, vui lòng chọn ID khác');
        setLoading(false);
        return;
      }

      // Kiểm tra giới hạn đổi
      const nowUTC = new Date().toISOString();
      if (lastChange) {
        const lastChange = new Date(lastChange);
        const diffDays = Math.floor((new Date(nowUTC) - lastChange) / (1000 * 60 * 60 * 24));
        if (diffDays < 30) {
          toast.warning(`Bạn chỉ có thể đổi lại sau ${30 - diffDays} ngày nữa.`);
          setLoading(false);
          return;
        }
      }
      if (changeCount >= 5) {
        toast.error('Bạn đã đạt giới hạn 5 lần đổi Quik ID.');
        setLoading(false);
        return;
      }

      // Cập nhật Firestore
      const docId = await getUserDocIdByUid(user.uid);
      if (!docId) return;

      await updateDocument("users", docId, {
        username: formatted,
        lastUsernameChange: nowUTC,
        usernameChangeCount: (changeCount || 0) + 1
      });

      setUsername(formatted);
      setLastChange(nowUTC);
      setChangeCount((prev) => (prev || 0) + 1);
      setUser(prev => ({ ...prev, username: formatted }));

      setIsEditingUsername(false);
      toast.success('Cập nhật Quik ID thành công!');
    } catch (error) {
      console.error(error);
      toast.error('Lỗi khi cập nhật Quik ID');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsProfileVisible(false);
    setDisplayName(user?.displayName || '');
    setUsername(user?.username || '');
    setIsEditingName(false);
    setIsEditingUsername(false);
    setLoading(false);
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post(
        "https://chat-realtime-be.vercel.app/upload",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      const avatarUrl = res.data.url;

      // cập nhật Firestore
      const docId = await getUserDocIdByUid(user.uid);
      await updateDocument("users", docId, { photoURL: avatarUrl });
      setUser((prev) => ({ ...prev, photoURL: avatarUrl }));

      toast.success("Đổi ảnh đại diện thành công!");
    } catch (err) {
      toast.error("Upload ảnh thất bại");
    }
  };


  // 🧮 Tính số ngày còn lại
  const getDaysLeft = () => {
    if (!lastChange) return 0;
    const diffDays = Math.floor((new Date() - new Date(lastChange)) / (1000 * 60 * 60 * 24));
    return diffDays >= 30 ? 0 : 30 - diffDays;
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
              style={{ position: 'absolute', bottom: 0, right: 0, border: 'none' }}
            />
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAvatarChange}
            accept="image/*"
            style={{ display: 'none' }}
          />
        </div>

        {/* Username */}
        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2px' }}>
            <span style={{ fontWeight: '600', marginRight: '8px' }}>Quik ID</span>
            {!isEditingUsername && getDaysLeft() === 0 && changeCount < 5 && (
              <Button
                type="text"
                icon={<EditOutlined />}
                size="small"
                onClick={() => {
                  if (isEditingName) {
                    setDisplayName(user?.displayName || '');
                    setIsEditingName(false);
                  }
                  setIsEditingUsername(true);
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
            <div style={{ fontSize: '14px' }}>
              @{username || 'chưa có username'}
            </div>
          )}

          <div style={{ fontSize: 13, marginTop: 8 }}>
            {changeCount >= 5 ? (
              <div
                style={{
                  color: '#ff4d4f', 
                  borderRadius: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 4,
                  fontWeight: 500,
                  lineHeight: 1.4,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FiXCircle size={16} />
                  <span>
                    Bạn đã đạt giới hạn <b>5 lần đổi Quik ID</b>
                  </span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 400, opacity: 0.9, color: '#ff7875', }}>
                  Vui lòng liên hệ với chúng tôi nếu bạn cần hỗ trợ thêm.
                </div>
              </div>
            ) : (
              <>
                {lastChange && getDaysLeft() > 0 ? (
                  <div
                    style={{
                      color: '#d48806',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <FiAlertTriangle size={14} />
                    <span>Có thể đổi lại Quik ID sau <b>{getDaysLeft()} ngày</b></span>
                  </div>
                ) : (
                  null
                )}
                {/* <div
                  style={{
                    color: '#555',
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginLeft: 2,
                  }}
                >
                  <FiRefreshCcw size={14} />
                  <span>
                    Số lần đổi còn lại: <b>{5 - changeCount}</b> / 5
                  </span>
                </div> */}
              </>
            )}
          </div>
        </div>

        {/* Display Name */}
        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2px' }}>
            <span style={{ fontWeight: '600', marginRight: '8px' }}>Tên hiển thị</span>
            {!isEditingName && (
              <Button
                type="text"
                icon={<EditOutlined />}
                size="small"
                onClick={() => {
                  if (isEditingUsername) {
                    setUsername(user?.username || '');
                    setIsEditingUsername(false);
                  }
                  setIsEditingName(true);
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
            <div style={{ fontSize: '14px' }}>{displayName || 'Chưa có tên'}</div>
          )}
        </div>

        {/* Email */}
        <div>
          <div style={{ fontWeight: '600', marginBottom: '2px' }}>Email</div>
          <div style={{ fontSize: '14px' }}>{user?.email}</div>
        </div>
      </Card>
    </Modal>
  );
}
