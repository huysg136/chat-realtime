import React, { useState, useContext, useEffect, useRef } from 'react';
import { Modal, Avatar, Input, Button, Card, message } from 'antd';
import { EditOutlined, UserOutlined, CameraOutlined } from '@ant-design/icons';
import { AuthContext } from '../../context/authProvider';
import { AppContext } from '../../context/appProvider';
import { updateDocument, generateKeywords, getUserDocIdByUid } from '../../firebase/services';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const defaultAvatar = "https://images.spiderum.com/sp-images/9ae85f405bdf11f0a7b6d5c38c96eb0e.jpeg";

export default function ProfileModal() {
  const { user, setUser } = useContext(AuthContext);
  const { isProfileVisible, setIsProfileVisible } = useContext(AppContext);

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [isEditingName, setIsEditingName] = useState(false);
  const [loading, setLoading] = useState(false);

  const inputRef = useRef(null);

  const fileInputRef = useRef(null); // Thêm vào đầu component

  const handleFileChange = (e) => {
    // Tạm thời chỉ thông báo
    //toast.info('Chức năng thay đổi ảnh đại diện chưa hoàn thành');
  };

  useEffect(() => {
    if (user?.displayName) {
      setDisplayName(user.displayName);
    }
  }, [user]);

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
      toast.error('Tên không được để trống');
      return;
    }

    setLoading(true);
    try {
      const trimmedName = displayName.trim();
      const keywords = generateKeywords(trimmedName);

      const docId = await getUserDocIdByUid(user.uid);
      if (!docId) {
        //toast.error("Không tìm thấy người dùng trong Firestore");
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
        toast.success('Cập nhật tên thành công');
      } else {
        toast.error('Không thể cập nhật tên');
      }
    } catch (error) {
      console.error('Error updating display name:', error);
      toast.error('Lỗi khi cập nhật tên');
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
        {/* Avatar Section
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Avatar
            size={100}
            src={user?.photoURL || defaultAvatar}
            icon={<UserOutlined />}
            style={{ border: '4px solid #f0f0f0' }}
          />
        </div> */}
        {/* Avatar Section */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <Avatar
              size={100}
              src={user?.photoURL || defaultAvatar}
              icon={<UserOutlined />}
              style={{ border: '4px solid #f0f0f0' }}
            />
            <Button
              type="primary"
              shape="circle"
              icon={<CameraOutlined />}
              size="small"
              // onClick={() => fileInputRef.current.click()}
              onClick={() => toast.info('Chức năng thay đổi ảnh đại diện chưa hoàn thành')}
              loading={loading}
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
        <ToastContainer position="top-center" autoClose={1000} />
      </Card>
    </Modal>
  );
}
