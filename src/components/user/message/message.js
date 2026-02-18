import React, { useMemo, useContext, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Avatar, Dropdown, Menu } from "antd";
import { FaRegCopy, FaImage, FaDownload, FaShareSquare, FaReply, FaVideo } from "react-icons/fa";
import { MoreOutlined, UndoOutlined } from "@ant-design/icons";
import { AppContext } from "../../../context/appProvider";
import { AuthContext } from "../../../context/authProvider";
import MediaRenderer from "./MediaRenderer";
import { db } from "../../../firebase/config";
import { doc, onSnapshot, collection, query, where } from "firebase/firestore";
import {
  sendMessageToRoom,
  encryptMessage,
} from "../../../firebase/services";
import ForwardMessageModal from "../../modals/forwardMessageModal";
import "./message.scss";
import { toast } from "react-toastify";
import { MdReportProblem } from "react-icons/md";
import ReportModal from "../../modals/reportModal";

const getVisibleFor = (selectedRoom) => {
  if (!selectedRoom) return [];

  const currentMembers = selectedRoom.members || [];

  if (
    !selectedRoom.lastMessage ||
    !Array.isArray(selectedRoom.lastMessage.visibleFor)
  ) {
    return currentMembers;
  }

  const merged = Array.from(
    new Set([...selectedRoom.lastMessage.visibleFor, ...currentMembers])
  );

  return merged;
};

const ReplyPreview = ({ replyTo, isOwn }) => {
  const { t } = useTranslation();
  const [isRepliedRevoked, setIsRepliedRevoked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!replyTo?.id) {
      setLoading(false);
      return;
    }


    const messageRef = doc(db, "messages", replyTo.id);

    const unsubscribe = onSnapshot(messageRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setIsRepliedRevoked(data.isRevoked === true);
      }
      setLoading(false);
    }, (error) => {
      setLoading(false);
    });

    return () => unsubscribe();
  }, [replyTo?.id]);

  if (!replyTo) return null;

  const renderReplyContent = (t) => {
    if (isRepliedRevoked) {
      return <p className="reply-text">[{t('roomList.revoked')}]</p>;
    }

    const kind = replyTo.kind || "text";
    const text = replyTo.text || replyTo.decryptedText || "";

    if (kind === "picture" && !isRepliedRevoked) {
      return (
        <div className="reply-media">
          <img
            src={text}
            alt="reply-img"
            style={{
              maxWidth: 60,
              maxHeight: 60,
              height: "auto",
              width: "auto",
              objectFit: "cover",
              borderRadius: 6,
              marginTop: 2,
            }}
          />
        </div>
      );
    }

    if (kind === "video" && !isRepliedRevoked) {
      return (
        <div className="reply-media">
          <video
            src={text}
            style={{
              maxWidth: 60,
              maxHeight: 60,
              height: "auto",
              width: "auto",
              borderRadius: 6,
              objectFit: "cover",
              marginTop: 2,
            }}
            muted
          />
        </div>
      );
    }

    return (
      <p className="reply-text">
        {(() => {
          switch (kind) {
            case "video":
              return (
                <>
                  🎬 [{t('chatInput.media.video')}]
                  {replyTo.fileName ? ` (${replyTo.fileName})` : ""}
                </>
              );
            case "file":
              return (
                <>
                  📎 [{t('chatInput.media.file')}]
                  {replyTo.fileName ? ` (${replyTo.fileName})` : ""}
                </>
              );
            case "audio":
            case "voice":
              return <>🎤 [{t('chatInput.media.voice')}]</>;
            default:
              return text || `[${t('searching.message')}]`;
          }
        })()}
      </p>
    );
  };


  return (
    <div className={`reply-preview-in-message ${isOwn ? "own" : ""}`}>
      <span className="reply-label">{t('chatInput.replyTo', { name: replyTo.displayName })}</span>
      {renderReplyContent(t)}
    </div>
  );
};



export default function Message({
  messageId,
  text,
  displayName: initialDisplayName,
  photoURL: initialPhoto,
  isOwn,
  replyTo,
  onReply,
  onRevoke,
  kind,
  uid,
  isBanned,
  action, actor, target,
  transcript,
}) {
  const { rooms, selectedRoomId, users } = useContext(AppContext);
  const { t } = useTranslation();
  const authContext = useContext(AuthContext) || {};
  const user = authContext.user || {};
  const currentUid = user.uid || "";
  const currentPhotoURL = user.photoURL || null;
  const currentDisplayName = user.displayName || "Unknown";

  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === selectedRoomId),
    [rooms, selectedRoomId]
  );
  const isPrivate = selectedRoom?.type === "private";

  const [displayName, setDisplayName] = useState(initialDisplayName || "Unknown");
  const [photoURL, setPhotoURL] = useState(initialPhoto || null);
  const [banInfo, setBanInfo] = useState(null);
  const [isForwardModalVisible, setIsForwardModalVisible] = useState(false);
  const [forwarding, setForwarding] = useState(false);
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);

  useEffect(() => {
    if (uid && users.length > 0) {
      const foundUser = users.find(u => u.uid === uid);
      if (foundUser) {
        setDisplayName(foundUser.displayName || initialDisplayName);
        setPhotoURL(foundUser.photoURL || initialPhoto);
      }
    }
  }, [uid, users, initialDisplayName, initialPhoto]);

  if (kind === 'system') {
    return (
      <MediaRenderer
        kind="system"
        action={action}
        actorUid={actor?.uid}
        targetUid={target?.uid}
        actorPhotoURL={actor?.photoURL}
        targetPhotoURL={target?.photoURL}
        users={users}
      />
    );
  }


  const handleReply = () => {
    if (onReply) {
      onReply({
        id: messageId,
        decryptedText: text,
        displayName,
        kind: kind || "text",
        fileName:
          kind === "picture" || kind === "video" || kind === "file"
            ? text.split("/").pop().slice(14)
            : null,
      });
    }
  };

  const handleRevoke = () => {
    if (onRevoke) onRevoke();
  };

  const handleCopy = async () => {
    try {
      if (!text) return;

      if (kind === "picture" || kind === "video" || kind === "file") {
        const a = document.createElement("a");
        a.href = text;
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      else {
        await navigator.clipboard.writeText(text);
        toast.success(t('message.copySuccess'));
      }
    } catch (err) {
    }
  };

  const handleForward = () => setIsForwardModalVisible(true);
  const handleCancelForward = () => setIsForwardModalVisible(false);

  const handleForwardSubmit = async (selectedRooms) => {
    if (!selectedRooms.length || forwarding) return;

    setForwarding(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const room of selectedRooms) {
        const visibleFor = getVisibleFor(room);
        const messageData = {
          text: room.secretKey ? encryptMessage(text, room.secretKey) : text,
          uid: currentUid,
          photoURL: currentPhotoURL,
          displayName: currentDisplayName,
          kind: kind || "text",
          fileName:
            kind === "picture" || kind === "video"
              ? text.split("/").pop().slice(14)
              : null,
          visibleFor,
        };

        const success = await sendMessageToRoom(room.id, messageData);
        success ? successCount++ : errorCount++;
      }

      if (successCount) toast.success(t('message.shareSuccess'));
      if (errorCount) toast.error(t('message.shareError'));

      setIsForwardModalVisible(false);
    } catch {
      toast.error(t('message.shareErrorGeneral'));
    } finally {
      setForwarding(false);
    }
  };

  const handleReport = () => {
    setIsReportModalVisible(true);
  }

  const isRevoked = text === `[${t('roomList.revoked')}]`;
  const isMediaWithoutBubble = kind === "picture" || kind === "video";
  const defaultAvatar =
    "https://images.spiderum.com/sp-images/9ae85f405bdf11f0a7b6d5c38c96eb0e.jpeg";

  const menuItems = [
    kind !== "audio" && {
      key: kind === "picture" ? "open-image" : kind === "video" ? "open-video" : kind === "file" ? "download" : "copy-text",
      icon: kind === "picture" ? <FaImage /> : kind === "video" ? <FaVideo /> : kind === "file" ? <FaDownload /> : <FaRegCopy />,
      label: kind === "picture" ? t('message.openImage') : kind === "video" ? t('message.openVideo') : kind === "file" ? t('message.download') : t('message.copy'),
      onClick: handleCopy,
    },
    {
      key: "share",
      icon: <FaShareSquare />,
      label: t('message.share'),
      onClick: handleForward,
    },
    kind !== "picture" && kind !== "video" && kind !== "file" && {
      key: "report",
      icon: <MdReportProblem />,
      label: t('message.report'),
      onClick: handleReport,
    },
    isOwn && {
      type: 'divider',
      style: { margin: "0" }
    },
    isOwn && {
      key: "revoke",
      icon: <UndoOutlined style={{ color: "#ff4d4f" }} />,
      label: <span style={{ color: "#ff4d4f", fontWeight: "500" }}>{t('message.revoke')}</span>,
      onClick: handleRevoke,
    }
  ].filter(Boolean);

  return (
    <>
      <div className={`message-row ${isOwn ? "own" : ""}`}>
        {!isOwn && (
          <Avatar
            src={photoURL || defaultAvatar}
            size={28}
            className="message-avatar"
          />
        )}

        <div className="message-content">
          {!isPrivate && !isOwn && isMediaWithoutBubble && (
            <span className="message-name" style={{ paddingLeft: "4px" }}>
              {displayName}
            </span>
          )}

          {isMediaWithoutBubble && (
            <ReplyPreview
              replyTo={replyTo}
              isOwn={isOwn}
            />
          )}

          {isMediaWithoutBubble ? (
            <MediaRenderer
              kind={kind}
              content={text}
              transcript={transcript}
              fileName={text.split("/").pop().slice(14)}
              isOwn={isOwn}
              isRevoked={isRevoked}
            />
          ) : (
            <div className={`message-bubble ${isRevoked ? "revoked" : ""}`}>
              {!isPrivate && !isOwn && (
                <span className="message-name">{displayName}</span>
              )}
              {!isRevoked && (
                <ReplyPreview
                  replyTo={replyTo}
                  isOwn={isOwn}
                />
              )}
              <MediaRenderer
                kind={kind}
                content={text}
                transcript={transcript}
                fileName={text.split("/").pop().slice(14)}
                isOwn={isOwn}
                isRevoked={isRevoked}
              />
            </div>
          )}

          <div
            className={`message-hover ${isOwn && isRevoked
              ? "own-revoked"
              : !isOwn && isRevoked
                ? "revoked-other"
                : ""
              }`}
          >
            {
              !isBanned ? (
                <>
                  <FaReply onClick={handleReply} />
                  {!isRevoked && (
                    <Dropdown
                      menu={{ items: menuItems }}
                      trigger={["click"]}
                      placement={isOwn ? "leftTop" : "rightTop"}
                    >
                      <MoreOutlined />
                    </Dropdown>
                  )}
                </>
              ) : (
                null
              )
            }
          </div>
        </div>
      </div>

      <ForwardMessageModal
        visible={isForwardModalVisible}
        onCancel={handleCancelForward}
        onSubmit={handleForwardSubmit}
        rooms={rooms}
        users={users}
        currentUser={user}
        text={text}
        forwarding={forwarding}
      />

      <ReportModal
        visible={isReportModalVisible}
        onClose={() => setIsReportModalVisible(false)}
        message={{
          id: messageId,
          text: text,
          decryptedText: text,
          displayName: displayName,
          uid: uid,
          kind: kind,
          roomId: selectedRoom?.id,
          transcript: transcript,
        }}
        currentUser={user}
      />
    </>
  );
}