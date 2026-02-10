import React from "react";
import { MdVerified } from "react-icons/md";

export default function UserBadge({ role }) {
  if (!["admin", "moderator"].includes(role)) return null;

  const wrapperStyle = {
    display: "inline-flex",
    alignItems: "center",       
    marginLeft: 5,
    verticalAlign: "middle",
  };

  const iconStyle = {
    color: "#1877F2", 
    marginBottom: "1px",   
  };

  return (
    <span style={wrapperStyle}>
      <MdVerified size={14} style={iconStyle} />
    </span>
  );
}
