import React from 'react';
import { Button, Avatar, Spin } from 'antd';
import { AiOutlinePhone } from "react-icons/ai";
import { MdCallEnd } from "react-icons/md";
import { LoadingOutlined } from '@ant-design/icons';

export default function IncomingCallUI({
  caller,
  onAccept,
  onReject,
}) {
  // Handle loading state
  const isLoading = !caller || caller._isPlaceholder;
  const displayName = isLoading ? 'Đang tải...' : (caller?.displayName || 'Unknown User');
  const photoURL = isLoading ? null : caller?.photoURL;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 99999,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        borderRadius: '16px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        minWidth: '280px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}
    >
      {/* Caller info */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        width: '100%'
      }}>
        {isLoading ? (
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: '2px solid white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.1)'
          }}>
            <Spin indicator={<LoadingOutlined style={{ fontSize: 20, color: 'white' }} spin />} />
          </div>
        ) : (
          <Avatar
            src={photoURL}
            size={48}
            style={{ border: '2px solid white' }}
          >
            {displayName.charAt(0).toUpperCase()}
          </Avatar>
        )}
        <div style={{ flex: 1 }}>
          <div style={{
            color: 'white',
            fontSize: '16px',
            fontWeight: 'bold'
          }}>
            {displayName}
          </div>
          <div style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: '14px'
          }}>
            Cuộc gọi đến...
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{
        display: 'flex',
        gap: '12px',
        width: '100%',
        justifyContent: 'center'
      }}>
        {/* Accept button */}
        <Button
          type="primary"
          size="large"
          onClick={onAccept}
          disabled={isLoading}
          style={{
            height: '56px',
            width: '56px',
            borderRadius: '50%',
            fontSize: '20px',
            backgroundColor: isLoading ? '#666' : '#52c41a',
            borderColor: isLoading ? '#666' : '#52c41a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          <AiOutlinePhone />
        </Button>

        {/* Reject button */}
        <Button
          danger
          type="primary"
          size="large"
          onClick={onReject}
          style={{
            height: '56px',
            width: '56px',
            borderRadius: '50%',
            fontSize: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <MdCallEnd />
        </Button>
      </div>
    </div>
  );
}
