import React, { useState, useContext, useEffect, useRef } from 'react';
import { Modal, Avatar, Input, Button, Card, Progress } from 'antd';
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
import { IoDiamond } from 'react-icons/io5';
import { checkProUser } from "../../utils/checkPro";
import { checkMaxUser } from "../../utils/checkMax";
import { checkLiteUser } from "../../utils/checkLite";
import { getQuotaPercent, getQuotaLimit, formatBytes } from '../../utils/quota';

const defaultAvatar = "https://images.spiderum.com/sp-images/9ae85f405bdf11f0a7b6d5c38c96eb0e.jpeg";
const MAX_USERNAME_LENGTH = 20;

export default function ProfileModal() {
  const { user, setUser } = useContext(AuthContext);
  const { isProfileVisible, setIsProfileVisible, setIsUpgradePlanVisible } = useContext(AppContext);

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

  const isLiteUser = checkLiteUser(user);
  const isProUser = checkProUser(user);
  const isMaxUser = checkMaxUser(user);

  const formatExpiryDate = (date) => {
    if (!date) return t('profile.membership.lifetime');
    return new Date(date).toLocaleString('vi-VN');
  };

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
            ...data,
            premiumUntil: data.premiumUntil?.toDate ? data.premiumUntil.toDate() : data.premiumUntil
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

  const handleSaveUsername = async () => {
    const formatted = formatUsername(username);
    if (!formatted) {
      toast.error(t('profile.messages.usernameEmpty'));
      return;
    }

    setLoading(true);
    try {
      const q = query(collection(db, "users"), where("username", "==", formatted));
      const querySnapshot = await getDocs(q);
      const isDuplicate = querySnapshot.docs.some(doc => doc.data().uid !== user.uid);
      if (isDuplicate) {
        toast.error(t('profile.messages.usernameDuplicate'));
        setLoading(false);
        return;
      }

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

    if (!validateFile(file, user)) {
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
      const avatarUrl = await uploadToR2(file);
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
        <div className="avatar-section">
          <div className="avatar-wrapper">
            <Avatar
              size={100}
              src={photoURL || defaultAvatar}
              icon={<UserOutlined />}
              className="avatar-img"
            />
            <Button
              type="primary"
              shape="circle"
              icon={<CameraOutlined />}
              size="small"
              onClick={() => fileInputRef.current.click()}
              className="camera-button"
              loading={uploadingAvatar}
              disabled={uploadingAvatar}
            />
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAvatarChange}
            accept="image/*"
            className="file-input-hidden"
            disabled={uploadingAvatar}
          />
        </div>

        <div className="field-section">
          <div className="field-header">
            <span className="field-label">Quik ID</span>
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
            <div className="field-edit-row">
              <Input
                ref={usernameInputRef}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onPressEnter={handleSaveUsername}
                maxLength={MAX_USERNAME_LENGTH}
              />
              <Button
                type="primary"
                onClick={handleSaveUsername}
                loading={loading}
                disabled={formatUsername(username) === (user?.username || '')}
              >
                {t('profile.btnSave')}
              </Button>
              <Button onClick={() => setIsEditingUsername(false)}>
                {t('profile.btnCancel')}
              </Button>
            </div>
          ) : (
            <div className="field-value">
              @{username || t('profile.noUsername')}
            </div>
          )}

          <div className="username-warning">
            {changeCount >= 5 ? (
              <div className="warning-limit-reached">
                <div className="warning-limit-title">
                  <FiXCircle size={16} />
                  <span>{t('profile.changeLimitReach')}</span>
                </div>
                <div className="warning-limit-sub">
                  {t('profile.contactSupport')}
                </div>
              </div>
            ) : (
              lastChange && getDaysLeft() > 0 && (
                <div className="warning-wait">
                  <FiAlertTriangle size={14} />
                  <span>{t('profile.waitDays', { count: getDaysLeft() })}</span>
                </div>
              )
            )}
          </div>
        </div>

        <div className="field-section">
          <div className="field-header">
            <span className="field-label">{t('profile.displayName')}</span>
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
            <div className="field-edit-row">
              <Input
                ref={nameInputRef}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onPressEnter={handleSaveName}
                maxLength={50}
              />
              <Button
                type="primary"
                onClick={handleSaveName}
                loading={loading}
                disabled={displayName.trim() === (user?.displayName || '').trim()}
              >
                {t('profile.btnSave')}
              </Button>
              <Button onClick={() => setIsEditingName(false)}>
                {t('profile.btnCancel')}
              </Button>
            </div>
          ) : (
            <div className="field-value">{displayName || t('profile.noName')}</div>
          )}
        </div>

        <div className="field-section">
          <div className="field-label">{t('profile.email')}</div>
          <div className="field-value">{user?.email}</div>
        </div>

        <div className="membership-section">
          <div className="membership-title">
            {t('profile.membership.title')}
            {(isProUser || isMaxUser) && (
              <IoDiamond
                className={isMaxUser ? "max-diamond-icon" : "pro-diamond-icon"}
              />
            )}
          </div>

          <div className="quota-usage-section">
            <div className="quota-usage-header">
              <span className="quota-usage-label">{t('profile.membership.storageQuota')}</span>
              <span className="quota-usage-text">
                {t('profile.membership.usedOf', {
                  used: formatBytes(user?.quotaUsed || 0),
                  limit: formatBytes(getQuotaLimit(user))
                })}
              </span>
            </div>
            <Progress
              percent={getQuotaPercent(user)}
              size="small"
              strokeColor={
                getQuotaPercent(user) > 80 ? '#ef4444' :
                  getQuotaPercent(user) > 50 ? '#f59e0b' :
                    '#10b981'
              }
              trailColor={undefined}
              showInfo={true}
              className="quota-progress"
            />
          </div>

          <div className={`membership-card ${isMaxUser ? 'membership-card--max' :
            isProUser ? 'membership-card--pro' :
              isLiteUser ? 'membership-card--lite' :
                'membership-card--free'
            }`}>
            <div className="membership-info">
              <div className="membership-main">
                <div className={`membership-plan-name ${isMaxUser ? 'membership-plan-name--max' :
                  isProUser ? 'membership-plan-name--pro' :
                    isLiteUser ? 'membership-plan-name--lite' :
                      'membership-plan-name--free'
                  }`}>
                  {isMaxUser ? t('profile.membership.maxPlan') :
                    isProUser ? t('profile.membership.proPlan') :
                      isLiteUser ? t('profile.membership.litePlan') :
                        t('profile.membership.freePlan')}
                </div>
                {(isProUser || isMaxUser || isLiteUser) && (
                  <div className="membership-expiry">
                    {t('profile.membership.expires')}: {formatExpiryDate(user?.premiumUntil)}
                  </div>
                )}
              </div>

              {!isMaxUser && (
                <Button
                  type="primary"
                  size="small"
                  className="upgrade-btn"
                  onClick={() => {
                    setIsProfileVisible(false);
                    setIsUpgradePlanVisible(true);
                  }}
                >
                  {t('profile.membership.upgradeNow')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Modal>
  );
}