import React, { useMemo, useContext, useState, useEffect } from "react";
import { Avatar, Dropdown, Menu } from "antd";
import { FaRegCopy, FaImage, FaDownload, FaShareSquare, FaReply, FaVideo } from "react-icons/fa";
import { MoreOutlined, UndoOutlined } from "@ant-design/icons";
import { AppContext } from "../../../context/appProvider";
import { AuthContext } from "../../../context/authProvider";
import MediaRenderer from "./MediaRenderer";
import { db } from "../../../firebase/config";
import { doc, onSnapshot, collection, query, where, getDoc  } from "firebase/firestore";
import {
  getUserDocIdByUid,
  sendMessageToRoom,
  encryptMessage,
} from "../../../firebase/services";
import ForwardMessageModal from "../../modals/forwardMessageModal";
import "./message.scss";
import { toast } from "react-toastify";

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
  const [isRepliedRevoked, setIsRepliedRevoked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!replyTo?.id) {
      setLoading(false);
      return;
    }


    const messageRef = doc(db, "messages", replyTo.id);
    
    getDoc(messageRef).then((docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setIsRepliedRevoked(data.isRevoked === true);
      }
      setLoading(false);
    }).catch((error) => {
      setLoading(false);
    });

    const unsubscribe = onSnapshot(messageRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setIsRepliedRevoked(data.isRevoked === true);
      }
    }, (error) => {
    });

    return () => unsubscribe();
  }, [replyTo?.id]);

  if (!replyTo) return null;

  const renderReplyContent = () => {
    if (isRepliedRevoked) {
      return <p className="reply-text">[Tin nhắn đã được thu hồi]</p>;
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
                  🎬 [Video]
                  {replyTo.fileName ? ` (${replyTo.fileName})` : ""}
                </>
              );
            case "file":
              return (
                <>
                  📎 [Tệp]
                  {replyTo.fileName ? ` (${replyTo.fileName})` : ""}
                </>
              );
            case "audio":
            case "voice":
              return <>🎤 [Tin nhắn thoại]</>;
            default:
              return text || "[Tin nhắn]";
          }
        })()}
      </p>
    );
  };

  return (
    <div className={`reply-preview-in-message ${isOwn ? "own" : ""}`}>
      <span className="reply-label">Trả lời {replyTo.displayName}:</span>
      {renderReplyContent()}
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
}) {
  const { rooms, selectedRoomId, users } = useContext(AppContext);
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

  useEffect(() => {
    if (!uid) return;

    const q = query(collection(db, "bans"), where("uid", "==", uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bans = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        banEnd: doc.data().banEnd?.toDate ? doc.data().banEnd.toDate() : new Date(doc.data().banEnd),
      }));

      const activeBan = bans.find((ban) => ban.banEnd > new Date());
      setBanInfo(activeBan || null);
    });

    return () => unsubscribe();
  }, [uid]);

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
        //toast.success("Đã mở file để tải");
      }
      else {
        await navigator.clipboard.writeText(text);
        toast.success("Đã sao chép tin nhắn");
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

      if (successCount) toast.success(`Đã chia sẻ thành công`);
      if (errorCount) toast.error(`Lỗi khi chia sẻ`);

      setIsForwardModalVisible(false);
    } catch {
      toast.error("Lỗi chia sẻ tin nhắn");
    } finally {
      setForwarding(false);
    }
  };

  const isRevoked = text === "[Tin nhắn đã được thu hồi]";
  const isMediaWithoutBubble = kind === "picture" || kind === "video";
  const defaultAvatar =
    "https://images.spiderum.com/sp-images/9ae85f405bdf11f0a7b6d5c38c96eb0e.jpeg";

  const menu = (
    <Menu>
      {kind !== "audio" && (
        <>
          {kind === "picture" ? (
            <Menu.Item key="open-image" onClick={handleCopy} icon={<FaImage />}>
              Mở ảnh
            </Menu.Item>
          ) : kind === "video" ? (
            <Menu.Item key="open-video" onClick={handleCopy} icon={<FaVideo />}>
              Mở video
            </Menu.Item>
          ) : kind === "file" ? (
            <Menu.Item key="download" onClick={handleCopy} icon={<FaDownload />}>
              Lưu về máy
            </Menu.Item>
          ) : (
            <Menu.Item key="copy-text" onClick={handleCopy} icon={<FaRegCopy />}>
              Copy tin nhắn
            </Menu.Item>
          )}
        </>
      )}
      <Menu.Item key="share" onClick={handleForward} icon={<FaShareSquare />}>
        Chia sẻ tin nhắn
      </Menu.Item>
      

      {isOwn ? (
        <>
          <Menu.Divider style={{margin: "0"}}/>
          <Menu.Item
            key="revoke"
            onClick={handleRevoke}
            icon={<UndoOutlined style={{ color: "#ff4d4f"}} />}
          >
            <span style={{ color: "#ff4d4f", fontWeight: "500" }}>Thu hồi</span>
          </Menu.Item>
        </>
      ) : (
        null
      )}
    </Menu>
  );

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
            {
              !isBanned ? (
                <>
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
    </>
  );
}