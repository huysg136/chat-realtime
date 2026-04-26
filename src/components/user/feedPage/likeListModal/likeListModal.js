import React, { useContext } from "react";
import { Modal, List, Avatar } from "antd";
import { AppContext } from "../../../../context/appProvider";
import UserBadge from "../../../common/userBadge";
import "./likeListModal.scss";

export default function LikeListModal({ visible, onClose, uids }) {
    const { users } = useContext(AppContext);

    const likedUsers = (uids || [])
        .map(uid => users.find(u => u.uid === uid))
        .filter(Boolean);

    return (
        <Modal
            title="Lượt thích"
            open={visible}
            onCancel={onClose}
            footer={null}
            className="like-list-modal"
            width={400}
        >
            <List
                dataSource={likedUsers}
                renderItem={(user) => (
                    <List.Item className="like-list-item">
                        <List.Item.Meta
                            avatar={
                                <Avatar src={user.photoURL} size={40}>
                                    {!user.photoURL && user.displayName?.charAt(0).toUpperCase()}
                                </Avatar>
                            }
                            title={
                                <span className="like-list-item__name">
                                    <UserBadge
                                        displayName={user.displayName}
                                        role={user.role}
                                        premiumLevel={user.premiumLevel}
                                        premiumUntil={user.premiumUntil}
                                        size={15}
                                    />
                                </span>
                            }
                        />
                    </List.Item>
                )}
                locale={{ emptyText: "Chưa có lượt thích nào." }}
            />
        </Modal>
    );
}
