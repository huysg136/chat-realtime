import React, { useMemo, useContext, useState, useEffect } from "react";
import { Avatar, Dropdown, Menu } from "antd";
import { FaReply, FaRegCopy, FaShareSquare } from "react-icons/fa";
import { MoreOutlined, UndoOutlined } from "@ant-design/icons";
import { AppContext } from "../../../context/appProvider";
import MediaRenderer from "./MediaRenderer";
import { db } from "../../../firebase/config";
import { doc, onSnapshot } from "firebase/firestore";
import { getUserDocIdByUid } from "../../../firebase/services";
import "./message.scss";
import { toast } from "react-toastify";

const ReplyPreview = ({ replyTo, isOwn }) => {
  if (!replyTo) return null;
  return (
    <div className={`reply-preview-in-message ${isOwn ? "own" : ""}`}>
      <span className="reply-label">Trả lời {replyTo.displayName}:</span>
      <p className="reply-text">{replyTo.text || replyTo.decryptedText}</p>
    </div>
  );
};

export default function Message({
  text,
  displayName: initialDisplayName,
  photoURL: initialPhoto,
  isOwn,
  replyTo,
  onReply,
  onRevoke,
  kind,
  uid,
}) {
  const { rooms, selectedRoomId } = useContext(AppContext);
  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === selectedRoomId),
    [rooms, selectedRoomId]
  );
  const isPrivate = selectedRoom?.type === "private";

  const [displayName, setDisplayName] = useState(initialDisplayName || "Unknown");
  const [photoURL, setPhotoURL] = useState(initialPhoto || null);

  useEffect(() => {
    if (!uid) return;
    let unsubscribe = null;

    getUserDocIdByUid(uid).then((docId) => {
      if (!docId) return;
      unsubscribe = onSnapshot(doc(db, "users", docId), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setDisplayName(data.displayName || initialDisplayName);
          setPhotoURL(data.photoURL || initialPhoto);
        }
      });
    });

    return () => unsubscribe?.();
  }, [uid, initialDisplayName, initialPhoto]);

  const handleReply = () => {
    if (onReply)
      onReply({ id: Date.now().toString(), decryptedText: text, displayName });
  };

  const handleRevoke = () => {
    if (onRevoke) onRevoke();
  };

  const handleCopy = async () => {
    try {
      if (text) {
        await navigator.clipboard.writeText(text);
        toast.success("Đã sao chép tin nhắn");
      }
    } catch (err) {
      console.error("Copy failed:", err);
      toast.error("Không thể sao chép tin nhắn.");
    }
  };

  const isRevoked = text === "[Tin nhắn đã được thu hồi]";

  const menu = (
    <Menu>
      <Menu.Item key="copy" onClick={handleCopy} icon={<FaRegCopy />}>
        Copy tin nhắn
      </Menu.Item>
      <Menu.Item key="share" icon={<FaShareSquare />} >
        Chuyển tiếp
      </Menu.Item>
      {isOwn && (
        <>
          <Menu.Divider />
          <Menu.Item 
            key="revoke" 
            onClick={handleRevoke} 
            icon={<UndoOutlined style={{ color: "#ff4d4f" }} />} 
          >
            <span style={{color: "#ff4d4f"}}>Thu hồi</span>
          </Menu.Item>
        </>
      )}
    </Menu>
  );

  const defaultAvatar =
    "https://images.spiderum.com/sp-images/9ae85f405bdf11f0a7b6d5c38c96eb0e.jpeg";

  const isMediaWithoutBubble = kind === "picture" || kind === "video";

  return (
    <div className={`message-row ${isOwn ? "own" : ""}`}>
      {!isOwn && (
        <Avatar src={photoURL || defaultAvatar} size={28} className="message-avatar" />
      )}

      <div className="message-content">
        {!isPrivate && !isOwn && isMediaWithoutBubble && (
          <span className="message-name" style={{ paddingLeft: "4px" }}>
            {displayName}
          </span>
        )}

        {isMediaWithoutBubble && <ReplyPreview replyTo={replyTo} isOwn={isOwn} />}

        {isMediaWithoutBubble ? (
          <MediaRenderer
            kind={kind}
            content={text}
            fileName={text.split("/").pop().slice(14)}
            isOwn={isOwn}
            isRevoked={isRevoked}
          />
        ) : (
          <div className={`message-bubble ${isRevoked ? "revoked" : ""}`}>
            {!isPrivate && !isOwn && <span className="message-name">{displayName}</span>}
            <ReplyPreview replyTo={replyTo} isOwn={isOwn} />
            <MediaRenderer
              kind={kind}
              content={text}
              fileName={text.split("/").pop().slice(14)}
              isOwn={isOwn}
              isRevoked={isRevoked}
            />
          </div>
        )}
      
        <div
          className={`message-hover ${
            isOwn && isRevoked
              ? "own-revoked"
              : !isOwn && isRevoked
              ? "revoked-other"
              : ""
          }`}
        >
          <FaReply onClick={handleReply} />
          {!isRevoked && (
            <Dropdown 
              overlay={menu} 
              trigger={["click"]} 
              placement={isOwn ? "leftTop" : "rightTop"} 
            >
              <MoreOutlined />
            </Dropdown>
          )}
        </div>
      </div>
    </div>
  );
}
