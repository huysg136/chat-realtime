import React from "react";
import { useNavigate } from "react-router-dom";
import { FiLock } from "react-icons/fi";
import "./noAccess.scss";

export default function NoAccess({ message }) {
  const navigate = useNavigate();

  return (
    <div className="no-access">
      <FiLock className="no-access-icon" />
      <h2>{message || "Bạn không có quyền truy cập trang này."}</h2>
      <p>Tài khoản của bạn hiện không có đủ quyền hạn để truy cập trang này. Vui lòng liên hệ <span style={{ fontWeight: 600 }}>admin</span> để được hỗ trợ.</p>
      <button onClick={() => navigate(-1)}>Quay lại</button>
    </div>
  );
}
