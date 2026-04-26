import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageOutlined, RocketOutlined } from '@ant-design/icons';
import { ROUTERS } from '../../../../configs/router';
import './comingSoonPage.scss';
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

        <h1 className="main-title text-luxury-gold">{t('explore.title')}</h1>

        <p className="description">
          {t('explore.description')}
          <br />
          <span>{t('explore.comingSoon')}</span> {t('explore.comingSoonDesc')}
        </p>

        <div className="action-buttons">
          <button className="primary-btn" onClick={() => navigate(ROUTERS.USER.HOME)}>
            <MessageOutlined className="btn-icon" />
            <span>{t('explore.goToMessaging')}</span>
          </button>
        </div>
      </div>

      <div className="footer-credit-fixed">
        © {new Date().getFullYear()} {t('login.footer')} <span className="author-name">Thai Gia Huy</span> · quik.id.vn
      </div>
    </div>
  );
}