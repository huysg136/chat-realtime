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
      <p>Vui lòng liên hệ quản trị viên nếu bạn nghĩ đây là lỗi.</p>
      <button onClick={() => navigate(-1)}>Quay lại</button>
    </div>
  );
}
