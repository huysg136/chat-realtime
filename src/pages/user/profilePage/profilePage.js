import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, query, where, onSnapshot, getDocs, limit } from "firebase/firestore";
import { db } from "../../../firebase/config";
import { AppContext } from "../../../context/appProvider";
import { AuthContext } from "../../../context/authProvider";
import { addDocument, generateAESKey } from "../../../firebase/services";
import { ROUTERS } from "../../../configs/router";
import PostList from "../../../components/user/feedPage/postList/postList";
import CreatePost from "../../../components/user/feedPage/createPost/createPost";
import { Avatar, Button, Spin, Modal } from "antd";
import Lightbox from "react-image-lightbox";
import UserBadge from "../../../components/common/userBadge";
import "react-image-lightbox/style.css";
import {
  AiOutlineArrowLeft,
  AiOutlineMail,
  AiOutlineUser,
  AiOutlineClockCircle,
  AiOutlineCamera,
  AiOutlineEdit,
  AiOutlineDown,
  AiOutlineMessage,
  AiOutlineUserAdd,
  AiOutlineCheck
} from "react-icons/ai";
import "./profilePage.scss";

export default function ProfilePage() {
  const { uid } = useParams();
  const navigate = useNavigate();
  const { users, setSelectedRoomId, setIsActiveTab } = useContext(AppContext);
  const { user: currentUser } = useContext(AuthContext);
  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [postCount, setPostCount] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);
  const [friendsCount, setFriendsCount] = useState(0);
  const [userPhotos, setUserPhotos] = useState([]);
  const [friendUids, setFriendUids] = useState([]);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);
  const { isProfileVisible, setIsProfileVisible } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState("posts");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handlePostCreated = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    // Nếu có container cuộn nội bộ
    const container = document.querySelector('.profile-container');
    if (container) {
      container.scrollTo(0, 0);
    }
    setActiveTab("posts");
  }, [uid]);

  const isOwner = currentUser?.uid === uid;
  const isFriend = friendUids.includes(currentUser?.uid);

  const handleMessage = async () => {
    if (!currentUser?.uid || !uid) return;
    const pairKey = [currentUser.uid, uid].sort().join("_");
    const q = query(
      collection(db, "rooms"),
      where("type", "==", "private"),
      where("pairKey", "==", pairKey),
      limit(1)
    );
    const snap = await getDocs(q);
    let roomId;
    if (!snap.empty) {
      roomId = snap.docs[0].id;
    } else {
      const docRef = await addDocument("rooms", {
        type: "private",
        members: [currentUser.uid, uid],
        pairKey,
        secretKey: generateAESKey(),
        createdAt: new Date(),
      });
      roomId = docRef.id;
    }
    setSelectedRoomId(roomId);
    setIsActiveTab("message");
    navigate(ROUTERS.USER.CHAT.replace(":roomId", roomId));
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true);
      try {
        const found = users.find((u) => u.uid === uid);
        if (found) {
          setProfileUser(found);
        } else {
          const docRef = doc(db, "users", uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProfileUser({ uid: docSnap.id, ...docSnap.data() });
          }
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      } finally {
        setLoading(false);
      }
    };

    if (uid) {
      fetchUserProfile();
    }
  }, [uid, users]);

  useEffect(() => {
    if (!uid) return;

    // 1. Post count & Photos
    const postsQ = query(collection(db, "posts"), where("uid", "==", uid));
    const unsubPosts = onSnapshot(postsQ, (snap) => {
      setPostCount(snap.size);
      const photos = [];
      snap.docs.forEach((d) => {
        const data = d.data();
        if (data.mediaUrl && data.kind !== "video") {
          photos.push(data.mediaUrl);
        }
      });
      setUserPhotos(photos);
    });

    // 2. Follower count (received friend requests with status='pending')
    const followersQ = query(
      collection(db, "friendRequests"),
      where("toUid", "==", uid),
      where("status", "==", "pending")
    );
    const unsubFollowers = onSnapshot(followersQ, (snap) => {
      setFollowerCount(snap.size);
    });

    // 3. Friends count
    const friendsQ = query(
      collection(db, "friends"),
      where("users", "array-contains", uid)
    );
    const unsubFriends = onSnapshot(friendsQ, (snap) => {
      setFriendsCount(snap.size);
      const fUids = snap.docs.map((d) => {
        const usersArr = d.data().users || [];
        return usersArr.find((u) => u !== uid);
      }).filter(Boolean);
      setFriendUids(fUids);
    });

    return () => {
      unsubPosts();
      unsubFollowers();
      unsubFriends();
    };
  }, [uid]);
  const getJoinDate = (createdAt) => {
    if (!createdAt) return "Tham gia gần đây";
    let date;
    if (createdAt.toDate) {
      date = createdAt.toDate();
    } else if (createdAt.seconds) {
      date = new Date(createdAt.seconds * 1000);
    } else {
      date = new Date(createdAt);
    }
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `Tham gia vào tháng ${month} năm ${year}`;
  };
  if (loading) {
    return (
      <div className="profile-loading">
        <Spin size="large" />
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="profile-not-found">
        <h2>Không tìm thấy người dùng</h2>
        <Button icon={<AiOutlineArrowLeft />} onClick={() => navigate(-1)}>
          Quay lại
        </Button>
      </div>
    );
  }

  const profileFriends = friendUids
    .map((fUid) => users.find((u) => u.uid === fUid))
    .filter(Boolean)
    .slice(0, 6);

  const allProfileFriends = friendUids
    .map((fUid) => users.find((u) => u.uid === fUid))
    .filter(Boolean);

  return (
    <div className="profile-container">
      <div className="profile-header-card">
        <div className="profile-header-content">
          <div className="avatar-section">
            <Avatar size={140} src={profileUser.photoURL} icon={<AiOutlineUser />} className="main-avatar" />
          </div>

          <div className="profile-header-text">
            <h1 className="display-name">
              <UserBadge
                displayName={profileUser.displayName}
                role={profileUser.role}
                premiumLevel={profileUser.premiumLevel}
                premiumUntil={profileUser.premiumUntil}
                size={24}
              />
            </h1>
            <p className="username">@{profileUser.username || "user"}</p>

            <div className="profile-stats">
              <span><strong>{friendsCount}</strong> bạn bè</span>
              <span><strong>{postCount}</strong> bài viết</span>
              <span><strong>{followerCount}</strong> người theo dõi</span>
            </div>
          </div>

          <div className="profile-header-actions">
            {isOwner ? (
              <>
                <Button
                  type="primary"
                  icon={<AiOutlineEdit />}
                  className="edit-profile-btn"
                  onClick={() => setIsProfileVisible(true)}
                >
                  Chỉnh sửa hồ sơ
                </Button>
              </>
            ) : (
              <>
                {isFriend ? (
                  <Button
                    className="friend-status-btn"
                    icon={<AiOutlineCheck />}
                  >
                    Bạn bè
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    className="add-friend-btn"
                    icon={<AiOutlineUserAdd />}
                  >
                    Kết bạn
                  </Button>
                )}
                <Button
                  className="message-btn"
                  icon={<AiOutlineMessage />}
                  onClick={handleMessage}
                >
                  Nhắn tin
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Profile Tabs */}
        <div className="profile-tabs">
          <div className={`tab-item ${activeTab === "posts" ? "active" : ""}`} onClick={() => setActiveTab("posts")}>Bài viết</div>
          <div className={`tab-item ${activeTab === "friends" ? "active" : ""}`} onClick={() => setActiveTab("friends")}>Bạn bè</div>
          <div className={`tab-item ${activeTab === "photos" ? "active" : ""}`} onClick={() => setActiveTab("photos")}>Ảnh</div>
        </div>
      </div>

      {/* Tab Contents */}
      {activeTab === "posts" && (
        <div className="profile-layout-grid">
          {/* Left Column (Intro, Photos, Friends) */}
          <div className="profile-left-col">
            {/* Intro Card */}
            <div className="info-card">
              <h3>Giới thiệu</h3>
              <div className="intro-list">
                {profileUser.email && (
                  <div className="intro-item">
                    <AiOutlineMail className="intro-icon" />
                    <span>Email: <strong>{profileUser.email}</strong></span>
                  </div>
                )}
                <div className="intro-item">
                  <AiOutlineClockCircle className="intro-icon" />
                  <span>{getJoinDate(profileUser.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Photos Card */}
            <div className="info-card">
              <div className="card-header">
                <h3>Ảnh</h3>
                <span
                  className="see-all-link"
                  onClick={() => {
                    if (userPhotos.length > 0) {
                      setPhotoIndex(0);
                      setIsOpen(true);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  Xem tất cả
                </span>
              </div>
              <div className="photos-grid">
                {userPhotos.length > 0 ? (
                  userPhotos.slice(0, 9).map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`User uploaded ${idx}`}
                      className="grid-photo"
                      onClick={() => {
                        setPhotoIndex(idx);
                        setIsOpen(true);
                      }}
                    />
                  ))
                ) : (
                  <div className="no-data-text" style={{ gridColumn: 'span 3', textAlign: 'center', padding: '20px 0', color: '#8c8c8c' }}>
                    Chưa có ảnh nào
                  </div>
                )}
              </div>
            </div>

            {/* Friends Card */}
            <div className="info-card">
              <div className="card-header">
                <div>
                  <h3>Bạn bè</h3>
                  <span className="subtitle">{friendsCount} người bạn</span>
                </div>
                <span
                  className="see-all-link"
                  onClick={() => setIsFriendsModalOpen(true)}
                  style={{ cursor: 'pointer' }}
                >
                  Xem tất cả bạn bè
                </span>
              </div>
              <div className="friends-grid">
                {profileFriends.length > 0 ? (
                  profileFriends.map((f, idx) => (
                    <div key={idx} className="friend-item" onClick={() => navigate(`/profile/${f.uid}`)}>
                      <img src={f.photoURL || "https://images.spiderum.com/sp-images/9ae85f405bdf11f0a7b6d5c38c96eb0e.jpeg"} alt={f.displayName} className="friend-avatar" />
                      <span className="friend-name">{f.displayName}</span>
                    </div>
                  ))
                ) : (
                  <div className="no-data-text" style={{ gridColumn: 'span 3', textAlign: 'center', padding: '20px 0', color: '#8c8c8c' }}>
                    Chưa có bạn bè nào
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column (Create Post, Post List) */}
          <div className="profile-right-col">
            {isOwner && <CreatePost onPostCreated={handlePostCreated} />}
            <div className="profile-posts-wrapper">
              <PostList filterUserId={uid} refreshTrigger={refreshTrigger} />
            </div>
          </div>
        </div>
      )}

      {/* Standalone Tab Contents */}
      {activeTab === "friends" && (
        <div className="profile-tab-content-full">
          <div className="info-card">
            <h3>Bạn bè ({friendsCount})</h3>
            <div className="full-friends-grid">
              {allProfileFriends.length > 0 ? (
                allProfileFriends.map((f, idx) => (
                  <div key={idx} className="full-friend-card" onClick={() => navigate(`/profile/${f.uid}`)}>
                    <Avatar size={80} src={f.photoURL} />
                    <span className="full-friend-name">{f.displayName}</span>
                  </div>
                ))
              ) : (
                <div style={{ padding: '20px', color: '#8c8c8c', textAlign: 'center' }}>
                  Chưa có bạn bè nào
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "photos" && (
        <div className="profile-tab-content-full">
          <div className="info-card">
            <h3>Ảnh</h3>
            <div className="full-photos-grid">
              {userPhotos.length > 0 ? (
                userPhotos.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    className="full-grid-photo"
                    onClick={() => { setPhotoIndex(idx); setIsOpen(true); }}
                    alt={`User post photo ${idx}`}
                  />
                ))
              ) : (
                <div style={{ padding: '20px', color: '#8c8c8c', textAlign: 'center' }}>
                  Chưa có ảnh/video nào
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Image Preview Lightbox */}
      {isOpen && (
        <Lightbox
          mainSrc={userPhotos[photoIndex]}
          nextSrc={userPhotos[(photoIndex + 1) % userPhotos.length]}
          prevSrc={userPhotos[(photoIndex + userPhotos.length - 1) % userPhotos.length]}
          onCloseRequest={() => setIsOpen(false)}
          onMovePrevRequest={() =>
            setPhotoIndex((photoIndex + userPhotos.length - 1) % userPhotos.length)
          }
          onMoveNextRequest={() =>
            setPhotoIndex((photoIndex + 1) % userPhotos.length)
          }
        />
      )}

      {/* Friends Modal */}
      <Modal
        title="Bạn bè"
        open={isFriendsModalOpen}
        onCancel={() => setIsFriendsModalOpen(false)}
        footer={null}
        className="all-friends-modal"
        bodyStyle={{ maxHeight: '400px', overflowY: 'auto' }}
        centered
      >
        <div className="all-friends-list">
          {allProfileFriends.length > 0 ? (
            allProfileFriends.map((f) => (
              <div
                key={f.uid}
                className="all-friends-item"
                onClick={() => {
                  setIsFriendsModalOpen(false);
                  navigate(`/profile/${f.uid}`);
                }}
              >
                <Avatar src={f.photoURL} size={40} />
                <span className="friend-modal-name" style={{ fontWeight: 500 }}>{f.displayName}</span>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#8c8c8c' }}>
              Chưa có bạn bè nào
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
