import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageOutlined, RocketOutlined } from '@ant-design/icons';
import { ROUTERS } from '../../../configs/router';
import './explorePage.scss';
import { useTranslation } from 'react-i18next';

export default function HomePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="home-page-container">
      <div className="coming-soon-content">
        <div className="icon-wrapper">
          <RocketOutlined className="no-access-icon" />
        </div>

        <h1 className="main-title text-luxury-gold">Coming Soon</h1>

        <p className="description">
          Không gian kết nối và chia sẻ những khoảnh khắc thú vị đang được hoàn thiện. 
          <br />
          <span>Sắp ra mắt:</span> Hệ thống theo dõi bạn bè, bài viết và tương tác thời gian thực.
        </p>
        <div className="action-buttons">
          <button className="primary-btn" onClick={() => navigate(ROUTERS.USER.HOME)}> 
            <MessageOutlined className="btn-icon" />
            <span>Đi đến Nhắn tin</span>
          </button>
        </div>

        <div className="footer-credit">
          © {new Date().getFullYear()} {t('login.footer')} <span className="author-name">Thái Gia Huy</span> · quik.id.vn
        </div>
      </div>
    </div>
  );
}