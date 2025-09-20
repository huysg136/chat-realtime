import React from "react";
import styled from "styled-components";
import { Avatar } from "antd";
import { useFirestore } from "../../hooks/useFirestore";
import { AuthContext } from "../../context/authProvider"; 
import { AppContext } from "../../context/appProvider";

const RoomListWrapper = styled.div`
  display: flex;
  flex-direction: column;
  background: #fff; 
  height: 100%;
  overflow-y: auto;
`;

const RoomItem = styled.div`
  display: flex;
  align-items: center;
  padding: 12px 16px;
  gap: 12px;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);

  &:hover {
    background: rgba(0, 0, 0, 0.05);
  }
`;

const RoomInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .room-name {
    font-size: 16px;
    font-weight: 500;
    color: black;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .last-message {
    font-size: 14px;
    color: #757575;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const RoomTime = styled.span`
  font-size: 12px;
  color: #757575;
  white-space: nowrap;
`;

export default function RoomList() {
  // const { user } = React.useContext(AuthContext);

  // const roomsCondition = React.useMemo(
  //   () => ({
  //     fieldName: "members",
  //     operator: "array-contains",
  //     compareValue: user?.uid,
  //   }),
  //   [user?.uid]
  // );

  // const rooms = useFirestore("rooms", roomsCondition);

  const { rooms } = React.useContext(AppContext);

  return (
    <RoomListWrapper>
      {rooms.map((room) => (
        <RoomItem key={room.id}>
          <Avatar src={room.avatar? room.avatar : "https://images.spiderum.com/sp-images/9ae85f405bdf11f0a7b6d5c38c96eb0e.jpeg"} size={40}>
            {room.name?.charAt(0)?.toUpperCase()}
          </Avatar>
          <RoomInfo>
            <p className="room-name">{room.name}</p>
            <p className="last-message">{room.lastMessage || "No messages yet"}</p>
          </RoomInfo>
          <RoomTime>
            {room.updatedAt
              ? new Date(room.updatedAt.seconds * 1000).toLocaleTimeString()
              : ""}
          </RoomTime>
        </RoomItem>
      ))}
    </RoomListWrapper>
  );
}
