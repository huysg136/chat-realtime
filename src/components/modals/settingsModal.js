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

const { Option } = Select;

export default function SettingsModal() {
  const { isSettingsVisible, setIsSettingsVisible } = useContext(AppContext);
  const { user, setUser } = useContext(AuthContext);

  const [theme, setTheme] = useState(user?.theme || "system");
  const [language, setLanguage] = useState(user?.language || "vi");
  const [allowGroupInvite, setAllowGroupInvite] = useState(user?.allowGroupInvite ?? true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(user?.showOnlineStatus ?? true);
  const [activeMenu, setActiveMenu] = useState("account");

  const text = {
    vi: {
      title: "Cài đặt",
      menuAccount: "Tài khoản",
      menuInterface: "Giao diện",
      themeLabel: "Chủ đề giao diện",
      light: "Sáng",
      dark: "Tối",
      system: "Theo hệ thống",
      languageLabel: "Ngôn ngữ",
      allowGroupInviteLabel: "Cho phép người khác thêm vào nhóm",
      allowGroupInviteDesc: {
        on: "Mọi người có thể thêm bạn trực tiếp vào nhóm.",
        off: "Nếu ai thêm bạn, bạn sẽ nhận lời mời trong phần ‘Lời mời đang chờ’, và bạn có thể quyết định có tham gia hay không."
      },
      allowOnlineStatusLabel: "Hiển thị trạng thái trực tuyến",
      allowOnlineStatusDesc: {
        on: "Mọi người có thể thấy bạn đang trực tuyến.",
        off: "Mọi người sẽ không thấy bạn đang trực tuyến."
      },
      cancel: "Hủy",
      save: "Lưu",
    },
    en: {
      title: "Settings",
      menuAccount: "Account",
      menuInterface: "Interface",
      themeLabel: "Theme",
      light: "Light",
      dark: "Dark",
      system: "System",
      languageLabel: "Language",
      allowGroupInviteLabel: "Allow others to add me to groups",
      allowGroupInviteDesc: {
        on: "People can add you directly to groups.",
        off: "If someone adds you, you'll receive an invite in 'Pending Invites' and can decide whether to join."
      },
      allowOnlineStatusLabel: "Show online status",
      allowOnlineStatusDesc: {
        on: "People can see you are online.",
        off: "People won't see that you are online."
      },
      cancel: "Cancel",
      save: "Save",
    },
    // zh: {
    //   title: "设置",
    //   menuAccount: "账户",
    //   menuInterface: "界面",
    //   themeLabel: "主题",
    //   light: "浅色",
    //   dark: "深色",
    //   system: "系统",
    //   languageLabel: "语言",
    //   allowGroupInviteLabel: "允许他人将我添加到群组",
    //   allowGroupInviteDesc: {
    //     on: "人们可以直接将您添加到群组。",
    //     off: '如果有人添加您，您将在"待处理邀请"中收到邀请，并可以决定是否加入。'
    //   },
    //   allowOnlineStatusLabel: "显示在线状态",
    //   allowOnlineStatusDesc: {
    //     on: "人们可以看到您在线。",
    //     off: "人们看不到您在线。"
    //   },
    //   cancel: "取消",
    //   save: "保存",
    // },
    // es: {
    //   title: "Configuración",
    //   menuAccount: "Cuenta",
    //   menuInterface: "Interfaz",
    //   themeLabel: "Tema",
    //   light: "Claro",
    //   dark: "Oscuro",
    //   system: "Sistema",
    //   languageLabel: "Idioma",
    //   allowGroupInviteLabel: "Permitir que otros me agreguen a grupos",
    //   allowGroupInviteDesc: {
    //     on: "Las personas pueden agregarte directamente a grupos.",
    //     off: "Si alguien te agrega, recibirás una invitación en 'Invitaciones pendientes' y podrás decidir si unirte."
    //   },
    //   allowOnlineStatusLabel: "Mostrar estado en línea",
    //   allowOnlineStatusDesc: {
    //     on: "Las personas pueden ver que estás en línea.",
    //     off: "Las personas no podrán ver que estás en línea."
    //   },
    //   cancel: "Cancelar",
    //   save: "Guardar",
    // },
    // fr: {
    //   title: "Paramètres",
    //   menuAccount: "Compte",
    //   menuInterface: "Interface",
    //   themeLabel: "Thème",
    //   light: "Clair",
    //   dark: "Sombre",
    //   system: "Système",
    //   languageLabel: "Langue",
    //   allowGroupInviteLabel: "Autoriser les autres à m'ajouter aux groupes",
    //   allowGroupInviteDesc: {
    //     on: "Les gens peuvent vous ajouter directement aux groupes.",
    //     off: "Si quelqu'un vous ajoute, vous recevrez une invitation dans 'Invitations en attente' et pourrez décider de rejoindre ou non."
    //   },
    //   allowOnlineStatusLabel: "Afficher le statut en ligne",
    //   allowOnlineStatusDesc: {
    //     on: "Les gens peuvent voir que vous êtes en ligne.",
    //     off: "Les gens ne pourront pas voir que vous êtes en ligne."
    //   },
    //   cancel: "Annuler",
    //   save: "Enregistrer",
    // },
    // ar: {
    //   title: "الإعدادات",
    //   menuAccount: "الحساب",
    //   menuInterface: "الواجهة",
    //   themeLabel: "السمة",
    //   light: "فاتح",
    //   dark: "داكن",
    //   system: "النظام",
    //   languageLabel: "اللغة",
    //   allowGroupInviteLabel: "السماح للآخرين بإضافتي إلى المجموعات",
    //   allowGroupInviteDesc: {
    //     on: "يمكن للأشخاص إضافتك مباشرة إلى المجموعات.",
    //     off: "إذا أضافك أحد، ستتلقى دعوة في 'الدعوات المعلقة' ويمكنك أن تقرر الانضمام أم لا."
    //   },
    //   allowOnlineStatusLabel: "عرض حالة الاتصال",
    //   allowOnlineStatusDesc: {
    //     on: "يمكن للآخرين رؤية أنك متصل.",
    //     off: "لن يرى الآخرون أنك متصل."
    //   },
    //   cancel: "إلغاء",
    //   save: "حفظ",
    // },
  };

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
          setLanguage(data.language || "vi");
          setAllowGroupInvite(data.allowGroupInvite ?? true);
          setShowOnlineStatus(data.showOnlineStatus ?? true);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchUserSettings();
  }, [isSettingsVisible, user]);

  const handleCancel = () => {
    setIsSettingsVisible(false);
    setActiveMenu("account");
  };

  const handleSaveSettings = async (updates) => {
    if (!user?.uid) return;
    try {
      const docId = await getUserDocIdByUid(user.uid);
      if (!docId) {
        toast.error("Không tìm thấy tài khoản");
        return;
      }
      await updateDocument("users", docId, updates);
      setUser((prev) => ({ ...prev, ...updates }));
    } catch (error) {
      toast.error("Lưu cài đặt thất bại");
    }
  };

  const handleThemeChange = (value) => {
    setTheme(value);
    handleSaveSettings({ theme: value });
  };

  const handleLanguageChange = (value) => {
    setLanguage(value);
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
      title={text[language].title}
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
            <span>{text[language].menuAccount}</span>
          </div>
          <div
            className={`settings-menu-item ${activeMenu === "interface" ? "active" : ""}`}
            onClick={() => setActiveMenu("interface")}
          >
            <FiMonitor className="menu-icon" />
            <span>{text[language].menuInterface}</span>
          </div>
        </div>

        <div className="settings-content">
          <Card className="settings-card" style={{ borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", border: "none" }} bodyStyle={{ padding: 24 }}>
            {activeMenu === "account" && (
              <div>
                {/* Allow Group Invite */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontWeight: 600 }}>{text[language].allowGroupInviteLabel}</div>
                  <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>
                    {allowGroupInvite ? text[language].allowGroupInviteDesc.on : text[language].allowGroupInviteDesc.off}
                  </div>
                  <Switch checked={allowGroupInvite} onChange={handleAllowGroupInviteChange} style={{ marginTop: 4 }} />
                </div>

                {/* Show Online Status */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontWeight: 600 }}>{text[language].allowOnlineStatusLabel}</div>
                  <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>
                    {showOnlineStatus ? text[language].allowOnlineStatusDesc.on : text[language].allowOnlineStatusDesc.off}
                  </div>
                  <Switch checked={showOnlineStatus} onChange={handleShowOnlineStatusChange} style={{ marginTop: 4 }} />
                </div>
              </div>
            )}

            {activeMenu === "interface" && (
              <div>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>{text[language].themeLabel}</div>
                  <div className="modal-select">
                    <Select value={theme} onChange={handleThemeChange} style={{ width: "100%" }}>
                      <Option value="light"><BsSunFill style={{ color: "#facc15", marginRight: 6 }} />{text[language].light}</Option>
                      <Option value="dark"><BsMoonStarsFill style={{ color: "#3b82f6", marginRight: 6 }} />{text[language].dark}</Option>
                      <Option value="system"><BsLaptop style={{ color: "#6b7280", marginRight: 6 }} />{text[language].system}</Option>
                    </Select>
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>{text[language].languageLabel}</div>
                  <div className="modal-select">
                    <Select value={language} onChange={handleLanguageChange} style={{ width: "100%" }}>
                      <Option value="vi"><ReactCountryFlag countryCode="VN" svg style={{ width: "1.3em", height: "1.3em", borderRadius: "50%", marginRight: 8 }} />Tiếng Việt</Option>
                      <Option value="en"><ReactCountryFlag countryCode="US" svg style={{ width: "1.3em", height: "1.3em", borderRadius: "50%", marginRight: 8 }} />English</Option>
                      {/* <Option value="zh"><ReactCountryFlag countryCode="CN" svg style={{ width: "1.3em", height: "1.3em", borderRadius: "50%", marginRight: 8 }} />中文</Option>
                      <Option value="es"><ReactCountryFlag countryCode="ES" svg style={{ width: "1.3em", height: "1.3em", borderRadius: "50%", marginRight: 8 }} />Español</Option>
                      <Option value="fr"><ReactCountryFlag countryCode="FR" svg style={{ width: "1.3em", height: "1.3em", borderRadius: "50%", marginRight: 8 }} />Français</Option>
                      <Option value="ar"><ReactCountryFlag countryCode="SA" svg style={{ width: "1.3em", height: "1.3em", borderRadius: "50%", marginRight: 8 }} />العربية</Option> */}
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
