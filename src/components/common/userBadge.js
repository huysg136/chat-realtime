import React from "react";
import { IoDiamond } from "react-icons/io5";
import { MdVerified } from "react-icons/md";
import { checkProUser } from "../../utils/checkPro";
import { checkMaxUser } from "../../utils/checkMax";
import { checkLiteUser } from "../../utils/checkLite";

export default function UserBadge({ displayName, role, premiumLevel, premiumUntil, size = 14 }) {
  const isAdminOrMod = ["admin", "moderator"].includes(role);
  const userParams = { premiumLevel, premiumUntil };

  const isLiteUser = checkLiteUser(userParams);
  const isProUser = checkProUser(userParams);
  const isMaxUser = checkMaxUser(userParams);

  const wrapperStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    verticalAlign: "middle",
    background: 'transparent',
  };

  return (
    <div style={wrapperStyle}>
      <span
        className={
          isMaxUser
            ? "text-luxury-gold"
            : isProUser
              ? "text-luxury-silver"
              : isLiteUser
                ? "text-luxury-bronze"
                : ""
        }
        style={{ fontSize: `${size}px`, fontWeight: "600", lineHeight: "1.2" }}
      >
        {displayName}
      </span>

      <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
        {isAdminOrMod && (
          <MdVerified size={14} style={{ color: "#1877F2" }} />
        )}

        {/* {isMaxUser ? (
          <>
            <svg width="0" height="0" style={{ position: "absolute" }}>
              <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop stopColor="#bf953f" offset="0%" />
                <stop stopColor="#fcf6ba" offset="25%" />
                <stop stopColor="#b38728" offset="50%" />
                <stop stopColor="#fbf5b7" offset="75%" />
                <stop stopColor="#aa771c" offset="100%" />
              </linearGradient>
            </svg>
            <IoDiamond 
              size={14} 
              className="icon-max-shimmer"
              style={{ fill: "url(#gold-gradient)" }} 
            />
          </>
        ) : isProUser ? (
          <IoDiamond 
            size={14} 
            style={{ color: "#BFC1C2", filter: "drop-shadow(0 0 3px rgba(255, 255, 255, 0.6))" }} 
          />
        ) : null} */}
      </span>
    </div>
  );
}