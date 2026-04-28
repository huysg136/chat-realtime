import React, { useState, useEffect, useContext, useRef } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import LeftSide from "../../components/user/leftSide/leftSide";
import { AiOutlineSearch, AiOutlineBell, AiOutlineCloseCircle } from "react-icons/ai";
import logoQuik from "../../images/logo_quik.png";
import { AppContext } from "../../context/appProvider";
import { Avatar } from "antd";
import UserMenu from "../../components/user/userMenu/userMenu";
import "./landingPage.scss";
import { ROUTERS } from "../../configs/router";
import { AuthContext } from "../../context/authProvider";
import { db } from "../../firebase/config";
import { collection, query, where, onSnapshot, getDocs } from "firebase/firestore";

const LandingPage = () => {
  const location = useLocation();
  const isHomePage = location.pathname === "/" || location.pathname.startsWith("/p/");
  const isProfilePage = location.pathname.startsWith("/profile");
  const isExpandedPage = isHomePage || isProfilePage;
  const { users, setIsActiveTab, setIsPostDetailVisible, setActivePostId } = useContext(AppContext);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const [feedSearchQuery, setFeedSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const isSearchTriggered = useRef(false);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const notifDropdownRef = useRef(null);


  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "notifications"),
      where("receiverUid", "==", user.uid),
      where("isRead", "==", false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const fetchUnreadCount = async () => {
    if (!user?.uid) return;
    try {
      const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";
      const res = await fetch(`${API_BASE_URL}/api/friends/notifications/unread-count?uid=${user.uid}`);
      const data = await res.json();
      if (data.success) {
        setUnreadCount(data.count);
      }
    } catch (error) {
      console.error("Fetch unread count failed:", error);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
  }, [user?.uid]);

  useEffect(() => {
    if (!showNotifDropdown || !user?.uid) return;

    const q = query(
      collection(db, "notifications"),
      where("receiverUid", "==", user.uid)
    );

    // Dùng getDocs thay vì onSnapshot để tiết kiệm request khi đang mở dropdown
    const fetchNotifs = async () => {
      try {
        const snapshot = await getDocs(q);
        const notifs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        notifs.sort((a, b) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA;
        });
        setNotifications(notifs);
      } catch (error) {
        console.error("Fetch notifications failed:", error);
      }
    };

    fetchNotifs();
  }, [showNotifDropdown, user?.uid]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target)) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAllAsRead = async () => {
    if (!user?.uid) return;
    try {
      const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";
      await fetch(`${API_BASE_URL}/api/friends/notifications/read-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid }),
      });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
    }
  };

  const handleNotificationClick = async (notif) => {
    try {
      const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";
      await fetch(`${API_BASE_URL}/api/friends/notifications/${notif.id}/read?uid=${user.uid}`, {
        method: "PATCH",
      });
      if (!notif.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
      }
    } catch (error) {
    }

    setShowNotifDropdown(false);
    if (notif.type === "friend_request" || notif.type === "friend_accepted") {
      setIsActiveTab("friends");
      navigate(ROUTERS.USER.DIRECT);
    } else if (notif.type === "post_like" || notif.type === "post_comment" || notif.type === "comment_like") {
      if (notif.postId) {
        setActivePostId(notif.postId);
        setIsPostDetailVisible(true);
        window.history.pushState(null, "", `/p/${notif.postId}`);
      }
    }
  };


  const triggerFeedSearch = (query) => {
    isSearchTriggered.current = true;
    setFeedSearchQuery(query);
    if (location.pathname !== "/") {
      navigate(ROUTERS.USER.HOME);
    }
  };

  // Clear search on tab/route change
  useEffect(() => {
    if (isSearchTriggered.current) {
      isSearchTriggered.current = false;
      return;
    }
    setSearchInput("");
    setFeedSearchQuery("");
    setShowDropdown(false);
  }, [location.pathname]);

  // Filter users for dropdown
  useEffect(() => {
    if (!searchInput.trim()) {
      setFilteredUsers([]);
      setShowDropdown(false);
      return;
    }

    const cleanSearch = searchInput.toLowerCase().replace(/^@/, '');
    const filtered = users.filter(u =>
      u.displayName?.toLowerCase().includes(cleanSearch) ||
      u.username?.toLowerCase().includes(cleanSearch)
    );
    setFilteredUsers(filtered.slice(0, 5)); // Limit to 5 results
    setShowDropdown(true);
  }, [searchInput, users]);

  const handleUserClick = (user) => {
    setSearchInput("");
    setShowDropdown(false);
    navigate(`/profile/${user.uid}`);
  };

  return (
    <div className={`landing-layout ${isExpandedPage ? 'landing-layout--expanded' : ''}`}>
      {isExpandedPage && (
        <div className="landing-layout__top-bar">
          <div className="landing-layout__logo" onClick={() => navigate(ROUTERS.USER.HOME)}>
            <img src={logoQuik} alt="Quik Logo" className="landing-layout__logo-img" />
            <span>Quik</span>
          </div>
          <div className="landing-layout__search-wrapper">
            <AiOutlineSearch className="search-icon" />
            <input
              type="text"
              placeholder="Tìm kiếm trên Quik"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                if (!e.target.value.trim()) {
                  setFeedSearchQuery("");
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  triggerFeedSearch(searchInput);
                  setShowDropdown(false);
                }
              }}
              onFocus={() => searchInput.trim() && setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            />

            {searchInput && (
              <AiOutlineCloseCircle
                className="clear-search-icon"
                onClick={() => {
                  setSearchInput("");
                  setFeedSearchQuery("");
                  setShowDropdown(false);
                }}
                style={{
                  cursor: "pointer",
                  color: "#65676b",
                  fontSize: "18px",
                  marginLeft: "auto",
                  paddingRight: "5px",
                  flexShrink: 0
                }}
              />
            )}

            {showDropdown && filteredUsers.length > 0 && (
              <div className="search-dropdown">
                {filteredUsers.map(u => (
                  <div
                    key={u.uid}
                    className="search-dropdown__item"
                    onClick={() => handleUserClick(u)}
                  >
                    <Avatar src={u.photoURL} size={32} />
                    <span className="search-dropdown__name">{u.displayName}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="landing-layout__user-menu">
            <div
              className="notification-bell-wrapper"
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              style={{ position: "relative", cursor: "pointer", display: "flex", alignItems: "center" }}
            >
              <AiOutlineBell className="notification-bell" />
              {unreadCount > 0 && (
                <span className="notification-badge">{unreadCount}</span>
              )}
            </div>

            {showNotifDropdown && (
              <div className="notification-dropdown" ref={notifDropdownRef}>
                <div className="notification-dropdown__header">
                  <h3>Thông báo</h3>
                  <span className="mark-all-read" onClick={handleMarkAllAsRead}>
                    Đánh dấu tất cả đã đọc
                  </span>
                </div>
                <div className="notification-dropdown__list">
                  {notifications.length === 0 ? (
                    <div className="notification-dropdown__empty">
                      Không có thông báo nào
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`notification-dropdown__item ${!n.isRead ? "unread" : ""}`}
                        onClick={() => handleNotificationClick(n)}
                      >
                        <Avatar src={n.senderPhoto} size={40} />
                        <div className="notification-dropdown__item-content">
                          <p>
                            <strong>{n.senderName}</strong>{" "}
                            {n.type === "friend_request"
                              ? "đã gửi cho bạn lời mời kết bạn."
                              : n.type === "friend_accepted"
                                ? "đã chấp nhận lời mời kết bạn."
                                : n.type === "post_like"
                                  ? "đã thích bài viết của bạn."
                                  : n.type === "post_comment"
                                    ? "đã bình luận bài viết của bạn."
                                    : n.type === "comment_like"
                                      ? "đã thích bình luận của bạn."
                                      : "tương tác với bạn."}
                          </p>
                          <span className="notification-time">
                            {n.createdAt?.seconds
                              ? new Date(n.createdAt.seconds * 1000).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })
                              : "Mới đây"}
                          </span>
                        </div>
                        {!n.isRead && <span className="unread-dot"></span>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <UserMenu showChevron={true} />
          </div>

        </div>
      )}

      <div className="landing-layout__body">
        <div
          className="landing-layout__sidebar-wrapper"
          style={{
            width: isExpandedPage ? '240px' : '64px',
            flexShrink: 0,
            transition: 'width 0.3s ease',
            background: '#ffffff'
          }}
        >
          <LeftSide isExpanded={isExpandedPage} />
        </div>

        <div className="landing-layout__content">
          <Outlet context={{ feedSearchQuery, setSearchInput, setFeedSearchQuery, triggerFeedSearch }} />
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
