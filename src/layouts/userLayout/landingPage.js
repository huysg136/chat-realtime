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

const LandingPage = () => {
  const location = useLocation();
  const isHomePage = location.pathname === "/";
  const isProfilePage = location.pathname.startsWith("/profile");
  const isExpandedPage = isHomePage || isProfilePage;
  const { users } = useContext(AppContext);
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const [feedSearchQuery, setFeedSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const isSearchTriggered = useRef(false);

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
            <AiOutlineBell className="notification-bell" />
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
