import React, { useContext, useEffect, useState } from "react";
import { Modal, Card, Select, Switch } from "antd";
import { AppContext } from "../../context/appProvider";
import { AuthContext } from "../../context/authProvider";
import { updateDocument, getUserDocIdByUid } from "../../firebase/services";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ReactCountryFlag from "react-country-flag";
import { BsSunFill, BsMoonStarsFill, BsLaptop } from "react-icons/bs";
import { FiUser, FiMonitor } from "react-icons/fi";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import "./settingsModal.scss";
import { useTranslation } from "react-i18next";

const { Option } = Select;

export default function SettingsModal() {
  const { isSettingsVisible, setIsSettingsVisible } = useContext(AppContext);
  const { user, setUser } = useContext(AuthContext);
  const { t, i18n } = useTranslation();

  const [theme, setTheme] = useState(user?.theme || "system");
  // Initialize language from i18n or user preference
  const [language, setLanguage] = useState(user?.language || i18n.language || "vi");
  const [allowGroupInvite, setAllowGroupInvite] = useState(user?.allowGroupInvite ?? true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(user?.showOnlineStatus ?? true);
  const [activeMenu, setActiveMenu] = useState("account");

  // Sync language with i18n when user opens modal or user data loads
  useEffect(() => {
    if (user?.language && user.language !== i18n.language) {
      i18n.changeLanguage(user.language);
      setLanguage(user.language);
    }
  }, [user?.language, i18n]);

  useEffect(() => {
    if (!isSettingsVisible || !user?.uid) return;

    const fetchUserSettings = async () => {
      try {
        const docId = await getUserDocIdByUid(user.uid);
        if (!docId) return;
        const docSnap = await getDoc(doc(db, "users", docId));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setTheme(data.theme || "system");

          if (data.language) {
            setLanguage(data.language);
            if (data.language !== i18n.language) {
              i18n.changeLanguage(data.language);
            }
          }

          setAllowGroupInvite(data.allowGroupInvite ?? true);
          setShowOnlineStatus(data.showOnlineStatus ?? true);
        }
      } catch (err) {
      }
    };

    fetchUserSettings();
  }, [isSettingsVisible, user, i18n]);

  const handleCancel = () => {
    setIsSettingsVisible(false);
    setActiveMenu("account");
  };

  const handleSaveSettings = async (updates) => {
    if (!user?.uid) return;
    try {
      const docId = await getUserDocIdByUid(user.uid);
      if (!docId) {
        toast.error(t('settings.errors.accountNotFound'));
        return;
      }
      await updateDocument("users", docId, updates);
      setUser((prev) => ({ ...prev, ...updates }));
    } catch (error) {
      toast.error(t('settings.errors.saveFailed'));
    }
  };

  const handleThemeChange = (value) => {
    setTheme(value);
    handleSaveSettings({ theme: value });
  };

  const handleLanguageChange = (value) => {
    setLanguage(value);
    i18n.changeLanguage(value); // Perform immediate language switch
    handleSaveSettings({ language: value });
  };

  const handleAllowGroupInviteChange = (checked) => {
    setAllowGroupInvite(checked);
    handleSaveSettings({ allowGroupInvite: checked });
  };

  const handleShowOnlineStatusChange = (checked) => {
    setShowOnlineStatus(checked);
    handleSaveSettings({ showOnlineStatus: checked });
  };

  return (
    <Modal
      title={t('settings.title')}
      open={isSettingsVisible}
      onCancel={handleCancel}
      footer={null}
      centered
      width={600}
      className="settings-modal"
    >
      <div className="settings-container">
        <div className="settings-sidebar">
          <div
            className={`settings-menu-item ${activeMenu === "account" ? "active" : ""}`}
            onClick={() => setActiveMenu("account")}
          >
            <FiUser className="menu-icon" />
            <span>{t('settings.menuAccount')}</span>
          </div>
          <div
            className={`settings-menu-item ${activeMenu === "interface" ? "active" : ""}`}
            onClick={() => setActiveMenu("interface")}
          >
            <FiMonitor className="menu-icon" />
            <span>{t('settings.menuInterface')}</span>
          </div>
        </div>

        <div className="settings-content">
          <Card className="settings-card" style={{ borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", border: "none" }} bodyStyle={{ padding: 24 }}>
            {activeMenu === "account" && (
              <div>
                {/* Allow Group Invite */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontWeight: 600 }}>{t('settings.allowGroupInviteLabel')}</div>
                  <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>
                    {allowGroupInvite ? t('settings.allowGroupInviteDesc.on') : t('settings.allowGroupInviteDesc.off')}
                  </div>
                  <Switch checked={allowGroupInvite} onChange={handleAllowGroupInviteChange} style={{ marginTop: 4 }} />
                </div>

                {/* Show Online Status */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontWeight: 600 }}>{t('settings.allowOnlineStatusLabel')}</div>
                  <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>
                    {showOnlineStatus ? t('settings.allowOnlineStatusDesc.on') : t('settings.allowOnlineStatusDesc.off')}
                  </div>
                  <Switch checked={showOnlineStatus} onChange={handleShowOnlineStatusChange} style={{ marginTop: 4 }} />
                </div>
              </div>
            )}

            {activeMenu === "interface" && (
              <div>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>{t('settings.themeLabel')}</div>
                  <div className="modal-select">
                    <Select value={theme} onChange={handleThemeChange} style={{ width: "100%" }}>
                      <Option value="light"><BsSunFill style={{ color: "#facc15", marginRight: 6 }} />{t('settings.light')}</Option>
                      <Option value="dark"><BsMoonStarsFill style={{ color: "#3b82f6", marginRight: 6 }} />{t('settings.dark')}</Option>
                      <Option value="system"><BsLaptop style={{ color: "#6b7280", marginRight: 6 }} />{t('settings.system')}</Option>
                    </Select>
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>{t('settings.languageLabel')}</div>
                  <div className="modal-select">
                    <Select value={language} onChange={handleLanguageChange} style={{ width: "100%" }}>
                      <Option value="vi"><ReactCountryFlag countryCode="VN" svg style={{ width: "1.3em", height: "1.3em", borderRadius: "50%", marginRight: 8 }} />Tiếng Việt</Option>
                      <Option value="en"><ReactCountryFlag countryCode="US" svg style={{ width: "1.3em", height: "1.3em", borderRadius: "50%", marginRight: 8 }} />English</Option>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </Modal>
  );
}
