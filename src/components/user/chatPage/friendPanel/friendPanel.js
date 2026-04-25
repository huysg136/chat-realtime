import React, { useContext, useMemo, useState, useCallback, useEffect } from "react";
import { Avatar, Button, Input, Spin, Empty, Tabs, Popconfirm, Badge, ConfigProvider, theme as antTheme } from "antd";
import {
  MessageOutlined,
  SearchOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import { FaUserXmark } from "react-icons/fa6";
import { FaUserMinus, FaUserCheck } from "react-icons/fa";
import { MdCancelScheduleSend } from "react-icons/md";
import debounce from "lodash/debounce";
import { AppContext } from "../../../../context/appProvider";
import { AuthContext } from "../../../../context/authProvider";
import { useFriends } from "../../../../hooks/useFriends";
import {
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  unfriend,
} from "../../../../firebase/friendService";
import { addDocument, generateAESKey } from "../../../../firebase/services";
import {
  collection,
  query,
  where,
  limit,
  getDocs,
  orderBy,
} from "firebase/firestore";
import { db } from "../../../../firebase/config";
import { useNavigate } from "react-router-dom";
import { ROUTERS } from "../../../../configs/router";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import UserBadge from "../../../common/userBadge";
import FriendButton from "../../../common/friendButton";
import "./friendPanel.scss";

function useIsDarkMode() {
  const [isDark, setIsDark] = useState(() =>
    document.body.classList.contains("theme-dark")
  );
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.body.classList.contains("theme-dark"));
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

export default function FriendPanel() {
  const { t } = useTranslation();
  const { users, setSelectedRoomId } = useContext(AppContext);
  const { user } = useContext(AuthContext);
  const { friends, receivedRequests, sentRequests, loading } = useFriends();
  const navigate = useNavigate();
  const isDark = useIsDarkMode();

  const [friendSearch, setFriendSearch] = useState("");
  const [addSearch, setAddSearch] = useState("");
  const [addResults, setAddResults] = useState([]);
  const [addFetching, setAddFetching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  const setItemLoading = (id, val) =>
    setActionLoading((prev) => ({ ...prev, [id]: val }));

  const resolveUser = (uid) => users.find((u) => u.uid === uid) || null;

  const filteredFriends = useMemo(() => {
    if (!friendSearch.trim()) return friends;
    const s = friendSearch.toLowerCase();
    return friends.filter((f) => {
      const u = resolveUser(f.uid);
      return (
        u?.displayName?.toLowerCase().includes(s) ||
        u?.username?.toLowerCase().includes(s)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friends, friendSearch, users]);

  const doSearch = async (text) => {
    const trimmed = text.trim().toLowerCase();
    if (!trimmed) {
      setAddResults([]);
      setHasSearched(false);
      return;
    }
    setAddFetching(true);
    setHasSearched(true);
    try {
      const q = query(
        collection(db, "users"),
        where("username", ">=", trimmed),
        where("username", "<=", trimmed + "\uf8ff"),
        orderBy("username"),
        limit(10)
      );
      const snap = await getDocs(q);
      const list = snap.docs
        .map((d) => ({ uid: d.data().uid, ...d.data() }))
        .filter((u) => u.uid !== user?.uid);
      setAddResults(list);
    } catch {
      setAddResults([]);
    } finally {
      setAddFetching(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(debounce(doSearch, 350), [user?.uid]);

  const handleAddSearchChange = (e) => {
    const val = e.target.value;
    setAddSearch(val);
    debouncedSearch(val);
  };

  const handleAccept = async (req) => {
    setItemLoading(req.id, true);
    try {
      await acceptFriendRequest(req.id, req.fromUid, user.uid);
      toast.success(t("friends.acceptedSuccess"));
    } catch {
      toast.error(t("friends.actionError"));
    } finally {
      setItemLoading(req.id, false);
    }
  };

  const handleReject = async (req) => {
    setItemLoading(req.id + "_r", true);
    try {
      await rejectFriendRequest(req.id);
      toast.info(t("friends.rejectedSuccess"));
    } catch {
      toast.error(t("friends.actionError"));
    } finally {
      setItemLoading(req.id + "_r", false);
    }
  };

  const handleCancelSent = async (req) => {
    setItemLoading(req.id, true);
    try {
      await cancelFriendRequest(req.fromUid, req.toUid);
      toast.info(t("friends.cancelledSuccess"));
    } catch {
      toast.error(t("friends.actionError"));
    } finally {
      setItemLoading(req.id, false);
    }
  };

  const handleUnfriend = async (f) => {
    setItemLoading(f.docId, true);
    try {
      await unfriend(user.uid, f.uid);
      toast.info(t("friends.unfriendSuccess"));
    } catch {
      toast.error(t("friends.actionError"));
    } finally {
      setItemLoading(f.docId, false);
    }
  };

  const handleMessage = async (targetUid) => {
    const pairKey = [user.uid, targetUid].sort().join("_");
    const q = query(
      collection(db, "rooms"),
      where("type", "==", "private"),
      where("pairKey", "==", pairKey),
      limit(1)
    );
    const snap = await getDocs(q);
    let roomId;
    if (!snap.empty) {
      roomId = snap.docs[0].id;
    } else {
      const docRef = await addDocument("rooms", {
        type: "private",
        members: [user.uid, targetUid],
        pairKey,
        secretKey: generateAESKey(),
        createdAt: new Date(),
      });
      roomId = docRef.id;
    }
    setSelectedRoomId(roomId);
    navigate(ROUTERS.USER.DIRECT.replace(":roomId", roomId));
  };

  // ── Tab content — inline JSX, KHÔNG dùng sub-component ────────────────
  // Lý do: define const FriendsTab = () => ... bên trong render
  // → mỗi re-render tạo ra function type mới
  // → React unmount/remount toàn bộ subtree → input mất focus khi gõ

  const friendsTabContent = (
    <>
      <Input
        className="fp-search"
        prefix={<SearchOutlined />}
        placeholder={t("friends.searchFriends")}
        value={friendSearch}
        onChange={(e) => setFriendSearch(e.target.value)}
        allowClear
      />
      {loading ? (
        <div className="fp-center"><Spin /></div>
      ) : filteredFriends.length === 0 ? (
        <Empty
          description={friendSearch ? t("friends.noSearchResult") : t("friends.noFriends")}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          className="fp-empty"
        />
      ) : (
        filteredFriends.map((f) => {
          const u = resolveUser(f.uid);
          return (
            <div className="fp-item" key={f.docId}>
              <Avatar src={u?.photoURL} size={40}>
                {(u?.displayName || "?").charAt(0).toUpperCase()}
              </Avatar>
              <div className="fp-info">
                <UserBadge
                  displayName={u?.displayName || t("friends.unknownUser")}
                  role={u?.role}
                  premiumLevel={u?.premiumLevel}
                  premiumUntil={u?.premiumUntil}
                />
                {u?.username && <span className="fp-username">@{u.username}</span>}
              </div>
              <div className="fp-actions">
                <Button size="small" className="fb-sent" icon={<MessageOutlined />} onClick={() => handleMessage(f.uid)} />
                <Popconfirm
                  title={t("friends.unfriendConfirm")}
                  onConfirm={() => handleUnfriend(f)}
                  okText={t("friends.yes")}
                  cancelText={t("friends.no")}
                >
                  <Button size="small" className="fb-reject" icon={<FaUserMinus />} loading={!!actionLoading[f.docId]} />
                </Popconfirm>
              </div>
            </div>
          );
        })
      )}
    </>
  );

  const receivedTabContent = loading ? (
    <div className="fp-center"><Spin /></div>
  ) : receivedRequests.length === 0 ? (
    <Empty description={t("friends.noReceived")} image={Empty.PRESENTED_IMAGE_SIMPLE} className="fp-empty" />
  ) : (
    receivedRequests.map((req) => {
      const u = resolveUser(req.fromUid);
      return (
        <div className="fp-item" key={req.id}>
          <Avatar src={u?.photoURL} size={40}>
            {(u?.displayName || "?").charAt(0).toUpperCase()}
          </Avatar>
          <div className="fp-info">
            <UserBadge
              displayName={u?.displayName || req.fromUid}
              role={u?.role}
              premiumLevel={u?.premiumLevel}
              premiumUntil={u?.premiumUntil}
            />
            {u?.username && <span className="fp-username">@{u.username}</span>}
          </div>
          <div className="fp-actions">
            <Button size="small" className="fb-accept" loading={!!actionLoading[req.id]} icon={<FaUserCheck />} onClick={() => handleAccept(req)} />
            <Button size="small" className="fb-reject" loading={!!actionLoading[req.id + "_r"]} icon={<FaUserXmark />} onClick={() => handleReject(req)} />
          </div>
        </div>
      );
    })
  );

  const sentTabContent = loading ? (
    <div className="fp-center"><Spin /></div>
  ) : sentRequests.length === 0 ? (
    <Empty description={t("friends.noSent")} image={Empty.PRESENTED_IMAGE_SIMPLE} className="fp-empty" />
  ) : (
    sentRequests.map((req) => {
      const u = resolveUser(req.toUid);
      return (
        <div className="fp-item" key={req.id}>
          <Avatar src={u?.photoURL} size={40}>
            {(u?.displayName || "?").charAt(0).toUpperCase()}
          </Avatar>
          <div className="fp-info">
            <UserBadge
              displayName={u?.displayName || req.toUid}
              role={u?.role}
              premiumLevel={u?.premiumLevel}
              premiumUntil={u?.premiumUntil}
            />
            {u?.username && <span className="fp-username">@{u.username}</span>}
            <span className="fp-hint">{t("friends.waitingAccept")}</span>
          </div>
          <div className="fp-actions">
            <Button size="small" className="fb-reject" icon={<MdCancelScheduleSend />} loading={!!actionLoading[req.id]} onClick={() => handleCancelSent(req)} />
          </div>
        </div>
      );
    })
  );

  const tabItems = [
    {
      key: "friends",
      label: (
        <span>
          {t("friends.tabFriends")}
          {friends.length > 0 && <span className="fp-tab-count">{friends.length}</span>}
        </span>
      ),
      children: friendsTabContent,
    },
    {
      key: "received",
      label: (
        <Badge count={receivedRequests.length} size="small" offset={[6, 0]}>
          <span>{t("friends.tabReceived")}</span>
        </Badge>
      ),
      children: receivedTabContent,
    },
    {
      key: "sent",
      label: (
        <span>
          {t("friends.tabSent")}
          {sentRequests.length > 0 && <span className="fp-tab-count">{sentRequests.length}</span>}
        </span>
      ),
      children: sentTabContent,
    },
  ];

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: {
          colorBgContainer: isDark ? "#1e1e1e" : "#ffffff",
          colorBgElevated: isDark ? "#2a2a2a" : "#ffffff",
        },
      }}
    >
      <div className="friend-panel">

        <div className="fp-header">
          <span className="fp-title">{t("friends.modalTitle")}</span>
        </div>

        <div className="fp-add-section">
          <div className="fp-add-label">
            <UserAddOutlined style={{ marginRight: 6 }} />
            {t("friends.addFriendByQuikId")}
          </div>
          <Input
            className="fp-add-input"
            prefix={<SearchOutlined />}
            placeholder={t("friends.addFriendPlaceholder")}
            value={addSearch}
            onChange={handleAddSearchChange}
            allowClear
            onClear={() => { setAddSearch(""); setAddResults([]); setHasSearched(false); }}
          />

          {addFetching && (
            <div className="fp-center" style={{ padding: "12px 0" }}><Spin size="small" /></div>
          )}
          {!addFetching && hasSearched && addResults.length === 0 && (
            <div className="fp-no-result">{t("friends.noUserFound")}</div>
          )}
          {!addFetching && addResults.length > 0 && (
            <div className="fp-add-results">
              {addResults.map((u) => (
                <div className="fp-item" key={u.uid}>
                  <Avatar src={u.photoURL} size={38}>
                    {(u.displayName || "?").charAt(0).toUpperCase()}
                  </Avatar>
                  <div className="fp-info">
                    <UserBadge
                      displayName={u.displayName || t("friends.unknownUser")}
                      role={u.role}
                      premiumLevel={u.premiumLevel}
                      premiumUntil={u.premiumUntil}
                    />
                    {u.username && <span className="fp-username">@{u.username}</span>}
                  </div>
                  <div className="fp-actions">
                    <FriendButton targetUid={u.uid} size="small" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Tabs
          defaultActiveKey="friends"
          items={tabItems}
          className="fp-tabs"
          size="small"
        />
      </div>
    </ConfigProvider>
  );
}