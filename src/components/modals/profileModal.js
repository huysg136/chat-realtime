import React, { useState, useContext, useEffect, useRef } from 'react';
import { Modal, Avatar, Input, Button, Card, message } from 'antd';
import { EditOutlined, UserOutlined } from '@ant-design/icons';
import { AuthContext } from '../../context/authProvider';
import { AppContext } from '../../context/appProvider';
import { updateDocument, generateKeywords, getUserDocIdByUid } from '../../firebase/services';

const defaultAvatar = "https://images.spiderum.com/sp-images/9ae85f405bdf11f0a7b6d5c38c96eb0e.jpeg";

export default function ProfileModal() {
  const { user, setUser } = useContext(AuthContext);
  const { isProfileVisible, setIsProfileVisible } = useContext(AppContext);

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [isEditingName, setIsEditingName] = useState(false);
  const [loading, setLoading] = useState(false);

  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditingName]);

  const handleEditName = () => {
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    if (!displayName.trim()) {
      message.error('Tên không được để trống');
      return;
    }

    setLoading(true);
    try {
      const trimmedName = displayName.trim();
      const keywords = generateKeywords(trimmedName);

      const docId = await getUserDocIdByUid(user.uid);
      if (!docId) {
        message.error("Không tìm thấy người dùng trong Firestore");
        setLoading(false);
        return;
      }

      const success = await updateDocument("users", docId, {
        displayName: trimmedName,
        keywords,
      });

      if (success) {
        setUser(prev => ({ ...prev, displayName: trimmedName }));
        setIsEditingName(false);
        message.success('Cập nhật tên thành công');
      } else {
        message.error('Không thể cập nhật tên');
      }
    } catch (error) {
      console.error('Error updating display name:', error);
      message.error('Lỗi khi cập nhật tên');
    } finally {
      setLoading(false);
    }
  };



  const handleCancelEdit = () => {
    setDisplayName(user?.displayName || '');
    setIsEditingName(false);
  };

  const handleCancel = () => {
    setIsProfileVisible(false);
    setDisplayName(user?.displayName || '');
    setIsEditingName(false);
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
        {/* Avatar Section */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Avatar
            size={100}
            src={user?.photoURL || defaultAvatar}
            icon={<UserOutlined />}
            style={{ border: '4px solid #f0f0f0' }}
          />
        </div>

        {/* Display Name Section */}
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
                style={{ padding: '14px 10px'}}
                disabled={displayName.trim() === (user?.displayName || '').trim()}
              >
                Lưu
              </Button>
              <Button
                onClick={handleCancelEdit}
                size="small"
                style={{ padding: '14px 10px'}}
              >
                Hủy
              </Button>
            </div>
          ) : (
            <div style={{ fontSize: '16px', padding: '0px 0' }}>
              {displayName || 'Chưa có tên'}
            </div>
          )}
        </div>

        {/* Personal Information Section */}
        <div>
          <div style={{ fontWeight: '600', marginBottom: '8px' }}>Thông tin cá nhân</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: '4px' }}>Email</div>
              <div style={{ fontSize: '14px' }}>{user?.email}</div>
            </div>
          </div>
        </div>
      </Card>
    </Modal>
  );
}
