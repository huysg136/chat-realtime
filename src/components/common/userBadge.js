import React from "react";
import { IoDiamond } from "react-icons/io5";
import { MdVerified } from "react-icons/md"; 
import { checkProUser } from "../../utils/permissions";

export default function UserBadge({ role, premiumLevel, premiumUntil }) {
  const isAdminOrMod = ["admin", "moderator"].includes(role);
  
  const isProUser = checkProUser({ role, premiumLevel, premiumUntil });

  if (!isAdminOrMod && !isProUser) return null;

  const wrapperStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: "3px", 
    margin: "0 0 3px 4px",
    verticalAlign: "middle",
  };

  return (
    <span style={wrapperStyle}>
      {isAdminOrMod && (
        <MdVerified 
          size={14} 
          style={{ color: "#1877F2" }}
        />
      )}

      {isProUser && (
        <IoDiamond 
          size={14} 
          style={{ color: "#FFD700" }} 
        />
      )}
    </span>
  );
}