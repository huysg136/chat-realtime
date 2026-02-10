import React, { useState, useContext, useEffect, useRef } from 'react';
import { Modal, Avatar, Input, Button, Card } from 'antd';
import { EditOutlined, UserOutlined, CameraOutlined } from '@ant-design/icons';
import { AuthContext } from '../../context/authProvider';
import { AppContext } from '../../context/appProvider';
import { updateDocument, getUserDocIdByUid } from '../../firebase/services';
import { db } from "../../firebase/config";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { FiAlertTriangle, FiXCircle } from "react-icons/fi";
import { uploadToR2 } from '../../utils/uploadToR2';
import { validateFile } from '../../utils/fileValidation';
import "./profileModal.scss";
import { useTranslation } from 'react-i18next';

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
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [lastChange, setLastChange] = useState(null);
  const [changeCount, setChangeCount] = useState(0);

  const nameInputRef = useRef(null);
  const usernameInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const { t } = useTranslation();

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
      toast.error(t('profile.messages.nameEmpty'));
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
      toast.success(t('profile.messages.nameUpdateSuccess'));
    } catch (error) {
      toast.error(t('profile.messages.generalError'));
    } finally {
      setLoading(false);
    }
  };

  // giới hạn đổi username: 1 lần / 30 ngày, tối đa 5 lần
  const handleSaveUsername = async () => {
    const formatted = formatUsername(username);
    if (!formatted) {
      toast.error(t('profile.messages.usernameEmpty'));
      return;
    }

    setLoading(true);
    try {
      // Kiểm tra username trùng
      const q = query(collection(db, "users"), where("username", "==", formatted));
      const querySnapshot = await getDocs(q);
      const isDuplicate = querySnapshot.docs.some(doc => doc.data().uid !== user.uid);
      if (isDuplicate) {
        toast.error(t('profile.messages.usernameDuplicate'));
        setLoading(false);
        return;
      }

      // Kiểm tra giới hạn đổi
      const nowUTC = new Date().toISOString();
      if (lastChange) {
        // eslint-disable-next-line no-use-before-define
        const lastChange = new Date(lastChange);
        const diffDays = Math.floor((new Date(nowUTC) - lastChange) / (1000 * 60 * 60 * 24));
        if (diffDays < 30) {
          toast.warning(t('profile.messages.usernameWait', { count: 30 - diffDays }));
          setLoading(false);
          return;
        }
      }
      if (changeCount >= 5) {
        toast.error(t('profile.messages.usernameLimit'));
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
      toast.success(t('profile.messages.usernameSuccess'));
    } catch (error) {
      toast.error(t('profile.messages.generalError'));
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

    if (!validateFile(file)) {
      e.target.value = null;
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error(t('profile.messages.avatarError'));
      e.target.value = null;
      return;
    }

    try {
      setUploadingAvatar(true);

      // Upload lên R2 giống ChatInput
      const avatarUrl = await uploadToR2(file);

      // Cập nhật Firestore
      const docId = await getUserDocIdByUid(user.uid);
      await updateDocument("users", docId, { photoURL: avatarUrl });
      setUser((prev) => ({ ...prev, photoURL: avatarUrl }));

      toast.success(t('profile.messages.avatarSuccess'));
    } catch (err) {
      toast.error(t('profile.messages.generalError'));
    } finally {
      setUploadingAvatar(false);
      e.target.value = null;
    }
  };


  // Tính số ngày còn lại
  const getDaysLeft = () => {
    if (!lastChange) return 0;
    const diffDays = Math.floor((new Date() - new Date(lastChange)) / (1000 * 60 * 60 * 24));
    return diffDays >= 30 ? 0 : 30 - diffDays;
  };

  return (
    <Modal
      title={t('profile.title')}
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
              loading={uploadingAvatar}
              disabled={uploadingAvatar}
            />
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAvatarChange}
            accept="image/*"
            style={{ display: 'none' }}
            disabled={uploadingAvatar}
          />
        </div>

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
                {t('profile.btnSave')}
              </Button>
              <Button onClick={() => setIsEditingUsername(false)}>{t('profile.btnCancel')}</Button>
            </div>
          ) : (
            <div style={{ fontSize: '14px' }}>
              @{username || t('profile.noUsername')}
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
                    {t('profile.changeLimitReach')}
                  </span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 400, opacity: 0.9, color: '#ff7875', }}>
                  {t('profile.contactSupport')}
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
                    <span>{t('profile.waitDays', { count: getDaysLeft() })}</span>
                  </div>
                ) : (
                  null
                )}
              </>
            )}
          </div>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2px' }}>
            <span style={{ fontWeight: '600', marginRight: '8px' }}>{t('profile.displayName')}</span>
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
                {t('profile.btnSave')}
              </Button>
              <Button onClick={() => setIsEditingName(false)}>{t('profile.btnCancel')}</Button>
            </div>
          ) : (
            <div style={{ fontSize: '14px' }}>{displayName || t('profile.noName')}</div>
          )}
        </div>

        <div>
          <div style={{ fontWeight: '600', marginBottom: '2px' }}>{t('profile.email')}</div>
          <div style={{ fontSize: '14px' }}>{user?.email}</div>
        </div>
      </Card>
    </Modal>
  );
}
