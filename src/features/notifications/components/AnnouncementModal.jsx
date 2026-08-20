import React from "react";
import { Modal, Button } from "antd";
import { BellOutlined } from "@ant-design/icons";
import { useModalStore } from "../../../app/overlays/modal.store";
import { useAuthStore } from "../../auth/store/auth.store";
import { markAnnouncementAsSeen } from "../hooks/useAnnouncement";
import "./announcementModal.scss";

export default function AnnouncementModal() {
  const isAnnouncementVisible = useModalStore((state) => state.isAnnouncementVisible);
  const setIsAnnouncementVisible = useModalStore((state) => state.setIsAnnouncementVisible);
  const currentAnnouncement = useModalStore((state) => state.currentAnnouncement);
  const user = useAuthStore((state) => state.user);

  const handleClose = () => {
    if (currentAnnouncement?.id && user?.uid) {
      markAnnouncementAsSeen(currentAnnouncement.id, user.uid);
    }
    setIsAnnouncementVisible(false);
  };

  return (
    <Modal
      title={
        <div className="announcement-header">
          <div className="announcement-icon-wrapper">
            <BellOutlined className="announcement-icon" />
          </div>
          <div className="announcement-title-info">
            <h3 className="announcement-title">{currentAnnouncement?.title || "Thông báo"}</h3>
            <span className="announcement-subtitle">Thông báo quan trọng từ hệ thống</span>
          </div>
        </div>
      }
      open={isAnnouncementVisible}
      onCancel={handleClose}
      footer={[
        <Button key="close" type="primary" onClick={handleClose}>
          Đã hiểu
        </Button>,
      ]}
      centered
      closable={false}
      width={600}
      className="announcement-modal"
    >
      <div className="announcement-content">
        <div className="announcement-message-wrapper">
          {currentAnnouncement?.message ? (
            <p className="announcement-message">{currentAnnouncement.message}</p>
          ) : (
            <p>Nội dung thông báo...</p>
          )}
        </div>
        {/* <div className="announcement-footer-note">
          <span>💡 Mẹo: Hãy kiểm tra thường xuyên để không bỏ lỡ thông tin quan trọng!</span>
        </div> */}
      </div>
    </Modal>
  );
}
