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
    <span style={wrapperStyle}>
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
      </span>
    </span>
  );
}