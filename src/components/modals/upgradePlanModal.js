import React, { useContext } from "react";
import { Modal, Button } from "antd";
import { AppContext } from "../../context/appProvider";
import { IoCheckmarkCircle, IoCloseCircle, IoInformationCircle, IoFlash, IoDiamond } from "react-icons/io5";
import "./upgradePlanModal.scss";
import UserBadge from "../common/userBadge";
import { planConfigs } from "../../configs/planConfigs";
import { useTranslation } from "react-i18next";

export default function UpgradeModal({ premiumLevel }) {
  const { isUpgradePlanVisible, setIsUpgradePlanVisible } = useContext(AppContext);
  const { t, i18n } = useTranslation();

  const formatPrice = (amount) => {
    if (amount === 0) return "0 VNĐ";
    return new Intl.NumberFormat(i18n.language === 'vi' ? 'vi-VN' : 'en-US').format(amount) + " VNĐ";
  };

  const plans = [
    { key: 'free', title: t('upgrade_modal.plans.free.title'), price: formatPrice(planConfigs.pricesVND.free), label: t('upgrade_modal.plans.free.label'), type: 'default' },
    { key: 'lite', title: t('upgrade_modal.plans.lite.title'), price: formatPrice(planConfigs.pricesVND.lite), label: t('upgrade_modal.plans.lite.label'), type: 'primary' },
    { key: 'pro', title: t('upgrade_modal.plans.pro.title'), price: formatPrice(planConfigs.pricesVND.pro), label: t('upgrade_modal.plans.pro.label'), type: 'primary', popular: true },
    { key: 'max', title: t('upgrade_modal.plans.max.title'), price: formatPrice(planConfigs.pricesVND.max), label: t('upgrade_modal.plans.max.label'), type: 'primary', max: true }
  ];

  const renderValue = (val) => {
    if (typeof val === 'boolean') {
      return val ? (
        <IoCheckmarkCircle className="icon-v" />
      ) : (
        <IoCloseCircle className="icon-x" />
      );
    }

    if (val === 'perk_default') return <UserBadge displayName={t('upgrade_modal.features.perks.free')} premiumLevel="default" size={14} />;
    if (val === 'perk_bronze') return <UserBadge displayName={t('upgrade_modal.features.perks.lite')} premiumLevel="lite" size={14} />;
    if (val === 'perk_gold') return <UserBadge displayName={t('upgrade_modal.features.perks.max')} premiumLevel="max" size={14} />;
    if (val === 'perk_silver') return <UserBadge displayName={t('upgrade_modal.features.perks.pro')} premiumLevel="pro" size={14} />;

    return (
      <span className="status-text" style={{ fontWeight: 500 }}>
        {val}
      </span>
    );
  };

  const features = [
    {
      name: t('upgrade_modal.features.chat_anonymous.name'),
      free: false, lite: false, pro: false, max: true,
      desc: t('upgrade_modal.features.chat_anonymous.desc')
    },
    {
      name: t('upgrade_modal.features.ai_support.name'),
      free: false, lite: false, pro: true, max: true,
      desc: t('upgrade_modal.features.ai_support.desc')
    },
    {
      name: t('upgrade_modal.features.perks.name'),
      free: 'perk_default', lite: 'perk_bronze', pro: 'perk_silver', max: 'perk_gold',
      desc: t('upgrade_modal.features.perks.desc')
    },
    // {
    //   name: t('upgrade_modal.features.ghost_mode.name'),
    //   free: false, lite: false, pro: true, max: true,
    //   desc: t('upgrade_modal.features.ghost_mode.desc')
    // },
    {
      name: t('upgrade_modal.features.file_limit.name'),
      free: planConfigs.fileLimits.free, lite: planConfigs.fileLimits.lite, pro: planConfigs.fileLimits.pro, max: planConfigs.fileLimits.max,
      desc: t('upgrade_modal.features.file_limit.desc')
    },
    {
      name: t('upgrade_modal.features.storage_quota.name'),
      free: planConfigs.storageQuotas.free, lite: planConfigs.storageQuotas.lite, pro: planConfigs.storageQuotas.pro, max: planConfigs.storageQuotas.max,
      desc: t('upgrade_modal.features.storage_quota.desc')
    }
  ];

  return (
    <Modal
      title={null}
      open={isUpgradePlanVisible}
      onCancel={() => setIsUpgradePlanVisible(false)}
      footer={null}
      centered
      width={750}
      className="upgrade-modal"
    >
      <div className="upgrade-container">
        <div className="upgrade-header">
          <div className="max-wrapper">
            <IoDiamond className="header-icon" />
          </div>
          <h2>{t('upgrade_modal.title')}</h2>
        </div>

        <div className="upgrade-content">
          <div className="comparison-section">
            <div className="comparison-grid">
              <div className="grid-header">{t('upgrade_modal.table_header.feature')}</div>
              <div className="grid-header text-center">{t('upgrade_modal.table_header.free')}</div>
              <div className="grid-header text-center lite-header">{t('upgrade_modal.table_header.lite')}</div>
              <div className="grid-header text-center pro-header">{t('upgrade_modal.table_header.pro')}</div>
              <div className="grid-header text-center max-header">{t('upgrade_modal.table_header.max')}</div>

              {features.map((f, i) => (
                <React.Fragment key={i}>
                  <div className="feature-info-cell">
                    <span className="feature-name">{f.name}</span>
                    <span className="feature-desc">{f.desc}</span>
                  </div>
                  <div className="feature-status">{renderValue(f.free)}</div>
                  <div className="feature-status lite-col">{renderValue(f.lite)}</div>
                  <div className="feature-status pro-col">{renderValue(f.pro)}</div>
                  <div className="feature-status max-col">{renderValue(f.max, true)}</div>
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="pricing-section">
            <div className="pricing-grid">
              {plans.map((plan) => (
                <div key={plan.key} className={`price-card ${plan.popular ? 'active' : ''} ${plan.max ? 'max-card' : ''} ${plan.key === 'lite' ? 'lite-card' : ''}`}>
                  {plan.popular && <div className="badge-popular">{t('upgrade_modal.plans.hot_badge')}</div>}
                  {plan.key === 'lite' && <div className="badge-lite">{t('upgrade_modal.plans.lite.title')}</div>}
                  {plan.max && <div className="badge-max"><IoFlash /> {t('upgrade_modal.plans.vip_badge')}</div>}
                  <div className="plan-title">{plan.title}</div>
                  <div className={`plan-price ${plan.max ? 'max-price' : plan.key === 'lite' ? 'lite-price' : ''}`}>{plan.price}</div>
                  <div className="plan-desc">{plan.label}</div>
                  <Button
                    type={plan.type}
                    block
                    className={`select-btn ${plan.max ? 'btn-max' : plan.key === 'lite' ? 'btn-lite' : plan.popular ? 'btn-popular' : ''}`}
                    disabled={premiumLevel === plan.key ||
                      (premiumLevel === 'max' && (plan.key === 'pro' || plan.key === 'lite' || plan.key === 'free')) ||
                      (premiumLevel === 'pro' && (plan.key === 'lite' || plan.key === 'free')) ||
                      (premiumLevel === 'lite' && plan.key === 'free')}
                  >
                    {premiumLevel === plan.key
                      ? t('upgrade_modal.plans.current')
                      : (plan.max ? t('upgrade_modal.plans.upgrade_vip') : t('upgrade_modal.plans.select'))
                    }
                  </Button>
                </div>
              ))}
            </div>

            <div className="payment-note">
              <IoInformationCircle className="note-icon" />
              <div className="note-content">
                <p className="note-text">{t('upgrade_modal.payment_note')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}