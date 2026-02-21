import React, { useContext, useState } from "react";
import { Modal, Button } from "antd";
import { AppContext } from "../../context/appProvider";
import {
  IoCheckmarkCircle,
  IoCloseCircle,
  IoInformationCircle,
} from "react-icons/io5";
import "./upgradePlanModal.scss";
import UserBadge from "../common/userBadge";
import { planConfigs } from "../../configs/planConfigs";
import { useTranslation } from "react-i18next";
import { AuthContext } from "../../context/authProvider";

const PLAN_KEYS = ["free", "lite", "pro", "max"];

export default function UpgradeModal() {
  const { isUpgradePlanVisible, setIsUpgradePlanVisible } = useContext(AppContext);
  const { t, i18n } = useTranslation();
  const { user } = useContext(AuthContext);

  const premiumLevel = user?.premiumLevel;
  const [selectedPlan, setSelectedPlan] = useState(premiumLevel);
  const displayName = user?.displayName;

  const formatPrice = (amount) => {
    if (amount === 0) return "0 VNĐ";
    return new Intl.NumberFormat(i18n.language === "vi" ? "vi-VN" : "en-US").format(amount) + " VNĐ";
  };

  const plans = {
    free: {
      key: "free",
      title: t("upgrade_modal.plans.free.title"),
      price: formatPrice(planConfigs.pricesVND.free),
      label: t("upgrade_modal.plans.free.label"),
      nameTag: "perk_default",
      fileLimit: planConfigs.fileLimits.free,
      storage: planConfigs.storageQuotas.free,
      aiSupport: false,
      color: "#9ca3af",
      borderColor: "rgba(156,163,175,0.3)",
    },
    lite: {
      key: "lite",
      title: t("upgrade_modal.plans.lite.title"),
      price: formatPrice(planConfigs.pricesVND.lite),
      label: t("upgrade_modal.plans.lite.label"),
      nameTag: "perk_bronze",
      fileLimit: planConfigs.fileLimits.lite,
      storage: planConfigs.storageQuotas.lite,
      aiSupport: false,
      color: "#cd7f32",
      borderColor: "#b08d57",
      badge: t("upgrade_modal.plans.basic"),
      badgeClass: "badge-lite",
    },
    pro: {
      key: "pro",
      title: t("upgrade_modal.plans.pro.title"),
      price: formatPrice(planConfigs.pricesVND.pro),
      label: t("upgrade_modal.plans.pro.label"),
      nameTag: "perk_silver",
      fileLimit: planConfigs.fileLimits.pro,
      storage: planConfigs.storageQuotas.pro,
      aiSupport: true,
      color: "#BFC1C2",
      borderColor: "#9ca3af",
      badge: t("upgrade_modal.plans.hot_badge"),
      badgeClass: "badge-popular",
    },
    max: {
      key: "max",
      title: t("upgrade_modal.plans.max.title"),
      price: formatPrice(planConfigs.pricesVND.max),
      label: t("upgrade_modal.plans.max.label"),
      nameTag: "perk_gold",
      fileLimit: planConfigs.fileLimits.max,
      storage: planConfigs.storageQuotas.max,
      aiSupport: true,
      color: "#f59e0b",
      borderColor: "#f59e0b",
      badge: `${t("upgrade_modal.plans.vip_badge")}`,
      badgeClass: "badge-max",
    },
  };

  const renderNameTag = (val) => {
    const map = {
      perk_default: { name: displayName , level: "default" },
      perk_bronze: { name: displayName , level: "lite" },
      perk_silver: { name: displayName , level: "pro" },
      perk_gold: { name: displayName , level: "max" },
    };
    const p = map[val];
    return <UserBadge displayName={p.name} premiumLevel={p.level} size={14} />;
  };

  const plan = plans[selectedPlan];

  const featureRows = [
    {
      icon: "🏷️",
      name: t("upgrade_modal.features.perks.name"),
      desc: t("upgrade_modal.features.perks.desc"),
      value: plan.nameTag,
      isNameTag: true,
    },
    {
      icon: "📁",
      name: t("upgrade_modal.features.file_limit.name"),
      desc: t("upgrade_modal.features.file_limit.desc"),
      value: plan.fileLimit,
    },
    {
      icon: "💾",
      name: t("upgrade_modal.features.storage_quota.name"),
      desc: t("upgrade_modal.features.storage_quota.desc"),
      value: plan.storage,
    },
  ];

  const isCurrentPlan = premiumLevel === plan.key;
  const isDowngrade =
    (premiumLevel === "max" && ["pro", "lite", "free"].includes(plan.key)) ||
    (premiumLevel === "pro" && ["lite", "free"].includes(plan.key)) ||
    (premiumLevel === "lite" && plan.key === "free");

  return (
    <Modal
      title={null}
      open={isUpgradePlanVisible}
      onCancel={() => setIsUpgradePlanVisible(false)}
      footer={null}
      centered
      width={640}
      className="upgrade-modal"
    >
      <div className="upgrade-container">
        <div className="upgrade-header">
          <h2>{t("upgrade_modal.title")}</h2>
        </div>

        <div className="upgrade-body">
          <div className="plan-sidebar">
            {PLAN_KEYS.map((key) => {
              const p = plans[key];
              const isCurrent = premiumLevel === key;
              const isSelected = selectedPlan === key;
              return (
                <div
                  key={key}
                  className={`plan-menu-item ${isSelected ? "active" : ""} plan-${key}`}
                  onClick={() => setSelectedPlan(key)}
                >
                  <div className="plan-menu-left">
                    <span className="plan-menu-title">{p.title}</span>
                    {isCurrent && (
                      <span className="current-dot" />
                    )}
                  </div>
                  <span className="plan-menu-price">{p.price}</span>
                </div>
              );
            })}
          </div>

          <div className="plan-detail">
            <div className="detail-header">
              <div className="detail-title-row">
                <span className={`detail-plan-name ${
                  plan.key === 'max' ? 'text-luxury-gold' :
                  plan.key === 'pro' ? 'text-luxury-silver' :
                  plan.key === 'lite' ? 'text-luxury-bronze' : ''
                }`}>
                  {plan.title}
                </span>
                {plan.badge && (
                  <span className={`detail-badge ${plan.badgeClass}`}>{plan.badge}</span>
                )}
              </div>
              <div className="detail-price-row">
                <span className={`detail-price price-${plan.key}`}>{plan.price}</span>
                {plan.key !== "free" && (
                  <span className="detail-per-month">/ tháng</span>
                )}
              </div>
              <p className="detail-label">{plan.label}</p>
            </div>

            <div className="detail-features">
              {featureRows.map((f, i) => (
                <div key={i} className="detail-feature-row">
                  <div className="feature-left">
                    <span className="feature-icon">{f.icon}</span>
                    <div className="feature-text">
                      <span className="feature-name">{f.name}</span>
                      <span className="feature-desc">{f.desc}</span>
                    </div>
                  </div>
                  <div className="feature-value">
                    {f.isBool ? (
                      f.value
                        ? <IoCheckmarkCircle className="icon-v" />
                        : <IoCloseCircle className="icon-x" />
                    ) : f.isNameTag ? (
                      renderNameTag(f.value)
                    ) : (
                      <span className={`value-text value-${plan.key}`}>{f.value}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <Button
              block
              disabled={isCurrentPlan || isDowngrade}
              className={`cta-btn cta-${plan.key}`}
            >
              {isCurrentPlan
                ? t("upgrade_modal.plans.current")
                : t("upgrade_modal.plans.select")}
            </Button>

            <div className="payment-note">
              <IoInformationCircle className="note-icon" />
              <p className="note-text">{t("upgrade_modal.payment_note")}</p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}