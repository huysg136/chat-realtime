import React, { useState, useEffect, useContext } from "react";
import { Button, Dropdown } from "antd";
import { UserAddOutlined, UserDeleteOutlined } from "@ant-design/icons";
import { FaUserFriends } from "react-icons/fa";
import { AuthContext } from "../../context/authProvider";
import { MdCancelScheduleSend } from "react-icons/md";
import { AiOutlineClockCircle, AiOutlineCheck } from "react-icons/ai";
import {
    getFriendshipStatus,
    sendFriendRequest,
    cancelFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    unfriend,
} from "../../services/friendService";
import { FaUserXmark } from "react-icons/fa6";
import { FaUserCheck } from "react-icons/fa";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { collection, query, where, limit, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import "../../components/user/chatPage/friendPanel/friendPanel.scss"

/**
 * Reusable friend action button.
 * Props:
 *   targetUid {string} — the other user's uid
 *   size      {string} — ant design button size ("small" | "middle")
 */
export default function FriendButton({ targetUid, size = "small" }) {
    const { t } = useTranslation();
    const { user } = useContext(AuthContext);
    const myUid = user?.uid;

    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [reqId, setReqId] = useState(null);

    useEffect(() => {
        if (!myUid || !targetUid || myUid === targetUid) return;
        let cancelled = false;

        const fetchStatus = async () => {
            const s = await getFriendshipStatus(myUid, targetUid);
            if (cancelled) return;
            setStatus(s);

            if (s === "pending_received") {
                const q = query(
                    collection(db, "friendRequests"),
                    where("fromUid", "==", targetUid),
                    where("toUid", "==", myUid),
                    where("status", "==", "pending"),
                    limit(1)
                );
                const snap = await getDocs(q);
                if (!snap.empty && !cancelled) setReqId(snap.docs[0].id);
            }
        };

        fetchStatus();
        return () => { cancelled = true; };
    }, [myUid, targetUid]);

    if (!myUid || !targetUid || myUid === targetUid) return null;

    // ── Handlers ────────────────────────────────────────────────────────────

    const handleAdd = async () => {
        setLoading(true);
        try {
            await sendFriendRequest(myUid, targetUid);
            setStatus("pending_sent");
            toast.success(t("friends.sentSuccess"));
        } catch { toast.error(t("friends.actionError")); }
        finally { setLoading(false); }
    };

    const handleCancel = async () => {
        setLoading(true);
        try {
            await cancelFriendRequest(myUid, targetUid);
            setStatus("none");
            toast.info(t("friends.cancelledSuccess"));
        } catch { toast.error(t("friends.actionError")); }
        finally { setLoading(false); }
    };

    const handleAccept = async () => {
        if (!reqId) return;
        setLoading(true);
        try {
            await acceptFriendRequest(reqId, targetUid, myUid);
            setStatus("friends");
            toast.success(t("friends.acceptedSuccess"));
        } catch { toast.error(t("friends.actionError")); }
        finally { setLoading(false); }
    };

    const handleReject = async () => {
        if (!reqId) return;
        setLoading(true);
        try {
            await rejectFriendRequest(reqId);
            setStatus("none");
            toast.info(t("friends.rejectedSuccess"));
        } catch { toast.error(t("friends.actionError")); }
        finally { setLoading(false); }
    };

    const handleUnfriend = async () => {
        setLoading(true);
        try {
            await unfriend(myUid, targetUid);
            setStatus("none");
            toast.info(t("friends.unfriendSuccess"));
        } catch { toast.error(t("friends.actionError")); }
        finally { setLoading(false); }
    };

    // ── Render ──────────────────────────────────────────────────────────────

    if (status === null) return null;

    if (status === "none") {
        return (
            <Button
                size={size}
                className="fb-add"
                icon={<UserAddOutlined />}
                loading={loading}
                onClick={handleAdd}
            >
                {/* {t("friends.addFriend")} */}
            </Button>
        );
    }

    if (status === "pending_sent") {
        return (
            <Button
                size={size}
                className="fb-sent"
                loading={loading}
                icon={<AiOutlineClockCircle />}
                onClick={handleCancel}
            >
                {/* {t("friends.cancelRequest")} */}
            </Button>
        );
    }

    if (status === "pending_received") {
        return (
            <div className="fb-row">
                <Button size={size} className="fb-accept" icon={<FaUserCheck />} loading={loading} onClick={handleAccept}>
                    {/* {t("friends.accept")} */}
                </Button>
                <Button size={size} className="fb-reject" icon={<FaUserXmark />} loading={loading} onClick={handleReject}>
                    {/* {t("friends.reject")} */}
                </Button>
            </div>
        );
    }

    if (status === "friends") {
        return (
            <Dropdown
                menu={{
                    items: [
                        {
                            key: "unfriend",
                            icon: <UserDeleteOutlined />,
                            label: <span style={{ color: "#ff4d4f" }}>{t("friends.unfriend")}</span>,
                            onClick: handleUnfriend,
                        },
                    ],
                }}
                trigger={["click"]}
                placement="bottomRight"
            >
                <Button size={size} className="fb-friends" icon={<AiOutlineCheck />} loading={loading}>
                    {/* {t("friends.alreadyFriends")} */}
                </Button>
            </Dropdown>
        );
    }

    return null;
}