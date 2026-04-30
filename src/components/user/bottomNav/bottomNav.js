import React, { useContext, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  AiFillHome, AiOutlineHome,
  AiFillMessage, AiOutlineMessage,
  AiOutlineTeam
} from "react-icons/ai";
import { FaUser, FaRegUser } from "react-icons/fa6";
import { HiUserGroup, HiOutlineUserGroup } from "react-icons/hi2";
import { AuthContext } from "../../../context/authProvider";
import { AppContext } from "../../../context/appProvider";
import { ROUTERS } from "../../../configs/router";
import { useFriends } from "../../../hooks/useFriends";
import "./bottomNav.scss";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const { selectedRoomId: roomId, setSelectedRoomId, setIsActiveTab } = useContext(AppContext);
  const { receivedRequests } = useFriends();
  const [active, setActive] = useState("home");

  useEffect(() => {
    if (location.pathname === ROUTERS.USER.HOME || location.pathname.startsWith("/p/")) {
      setActive("home");
    } else if (location.pathname === ROUTERS.USER.DIRECT || location.pathname.startsWith("/direct/t")) {
      setActive((prev) => (prev === "friends" ? "friends" : "message"));
    } else if (location.pathname.startsWith("/profile")) {
      setActive("profile");
    } else if (location.pathname.startsWith("/direct")) {
      setActive("message");
    } else {
      setActive(""); // Clear active state for other pages (like Admin)
    }
  }, [location.pathname]);

  const navItems = [
    {
      key: "home",
      icon: active === "home" ? <AiFillHome /> : <AiOutlineHome />,
      onClick: () => {
        setActive("home");
        setSelectedRoomId(null);
        navigate(ROUTERS.USER.HOME);
      }
    },
    {
      key: "message",
      icon: active === "message" ? <AiFillMessage /> : <AiOutlineMessage />,
      onClick: () => {
        setActive("message");
        setIsActiveTab("message");
        if (roomId) {
          navigate(ROUTERS.USER.CHAT.replace(":roomId", roomId));
        } else {
          navigate(ROUTERS.USER.DIRECT);
        }
      }
    },
    {
      key: "friends",
      icon: active === "friends" ? <HiUserGroup /> : <HiOutlineUserGroup />,
      badge: receivedRequests.length,
      onClick: () => {
        setActive("friends");
        setIsActiveTab("friends");
        if (roomId) {
          navigate(ROUTERS.USER.CHAT.replace(":roomId", roomId));
        } else {
          navigate(ROUTERS.USER.DIRECT);
        }
      }
    },
    {
      key: "profile",
      icon: active === "profile" ? <FaUser /> : <FaRegUser />,
      onClick: () => {
        setActive("profile");
        if (user?.uid) {
          navigate(`/profile/${user.uid}`);
        }
      }
    }
  ];

  return (
    <div className="bottom-nav">
      {navItems.map((item) => (
        <div
          key={item.key}
          className={`bottom-nav__item ${active === item.key ? "active" : ""}`}
          onClick={item.onClick}
        >
          <div className="bottom-nav__icon-wrapper">
            {item.icon}
            {item.badge > 0 && (
              <span className="bottom-nav__badge">
                {item.badge > 9 ? "9+" : item.badge}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default BottomNav;
