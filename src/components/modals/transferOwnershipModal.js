import React from "react";
import { Modal, Select, Avatar, message } from "antd";
import { toast } from 'react-toastify';
import { updateDocument, deleteDocument } from "../../firebase/services";
import "./transferOwnershipModal.scss";

export default function TransferOwnershipModal({
  visible,
  membersData,
  currentUid,
  selectedRoom,
  rolesArray,
  selectedTransferUid,
  setSelectedTransferUid,
  leavingLoading,
  setLeavingLoading,
  onClose,
}) {
  const ownerEntry = rolesArray.find((r) => r.role === "owner");
  const ownerUid = ownerEntry?.uid || (selectedRoom?.members?.[0] && String(selectedRoom.members[0]));

  const transferCandidates = membersData.filter(
    (m) => String(m.uid).trim() !== String(currentUid).trim() && 
           String(m.uid).trim() !== String(ownerUid).trim()
  );

  const transferOwnershipAndLeave = async () => {
    if (!selectedRoom || !currentUid) return;

    setLeavingLoading(true);

    try {
      if (selectedRoom.members.length === 1) {
        // Nếu là người duy nhất => xóa nhóm
        await deleteDocument("rooms", selectedRoom.id);
        toast.success("Bạn đã giải tán nhóm");
        onClose();
        return;
      }

      if (!selectedTransferUid) {
        toast.warning("Vui lòng chọn người nhận quyền trưởng nhóm");
        setLeavingLoading(false);
        return;
      }

      if (String(selectedTransferUid).trim() === String(currentUid).trim()) {
        toast.warning("Không thể chuyển quyền cho chính bạn");
        setLeavingLoading(false);
        return;
      }

      // Cập nhật roles
      const newRolesMap = {};
      (rolesArray || []).forEach((r) => {
        newRolesMap[String(r.uid).trim()] = r.role;
      });

      Object.keys(newRolesMap).forEach((k) => {
        if (newRolesMap[k] === "owner") {
          newRolesMap[k] = "member";
        }
      });

      newRolesMap[String(selectedTransferUid).trim()] = "owner";
      delete newRolesMap[String(currentUid).trim()];

      const newRoles = Object.keys(newRolesMap).map((k) => ({ 
        uid: k, 
        role: newRolesMap[k] 
      }));

      const newMembers = (selectedRoom.members || []).filter(
        (m) => String(m).trim() !== String(currentUid).trim()
      );

      await updateDocument("rooms", selectedRoom.id, {
        members: newMembers,
        roles: newRoles,
      });

      toast.success("Đã chuyển quyền và rời nhóm");
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Chuyển quyền hoặc rời nhóm thất bại, thử lại sau");
    } finally {
      setLeavingLoading(false);
    }
  };

  return (
    <Modal
      title="Chuyển quyền trưởng nhóm và rời"
      open={visible}
      onOk={transferOwnershipAndLeave}
      onCancel={onClose}
      okText={selectedRoom?.members?.length === 1 ? "Giải tán nhóm" : "Chuyển & Rời"}
      cancelText="Hủy"
      confirmLoading={leavingLoading}
      destroyOnHidden
      className="transfer-ownership-modal"
    >
      {selectedRoom?.members?.length === 1 ? (
        <p>Bạn là thành viên duy nhất. Rời nhóm sẽ giải tán nhóm này.</p>
      ) : (
        <>
          <p>Vui lòng chọn thành viên sẽ nhận quyền trưởng nhóm trước khi bạn rời.</p>

          {transferCandidates.length === 0 ? (
            <div>
              <p>Không có thành viên nào phù hợp để chuyển quyền. Bạn không thể rời nhóm ngay bây giờ.</p>
            </div>
          ) : (
            <Select
              style={{ width: "100%" }}
              placeholder="Chọn thành viên"
              value={selectedTransferUid}
              onChange={(val) => setSelectedTransferUid(val)}
              optionLabelProp="label"
            >
              {transferCandidates.map((c) => (
                <Select.Option key={c.uid} value={c.uid} label={c.displayName || c.uid}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Avatar src={c.photoURL} size={24}>
                      {(c.displayName || "?").charAt(0).toUpperCase()}
                    </Avatar>
                    <span>{c.displayName || c.uid}</span>
                  </div>
                </Select.Option>
              ))}
            </Select>
          )}
        </>
      )}
    </Modal>
  );
}
