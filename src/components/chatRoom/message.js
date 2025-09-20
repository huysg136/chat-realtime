import React from 'react'
import { Avatar, Typography } from 'antd'
import styled from 'styled-components';

const WrapperStyle = styled.div`
    margin-bottom: 10px;

    .author {
        margin-left: 8px;
        font-weight: bold;
    }
    .date {
        margin-left: 10px;
        font-size: 11px;
        color: #a7a7a7;
    }
    .content {
        margin-left: 32px;
    }
`;

export default function message({text, displayName, createdAt, photoURL}) {
  return (
    <WrapperStyle>
        <div>
            <Avatar size="small" src={photoURL}>A</Avatar>
            <Typography.Text className="author">{displayName}</Typography.Text>
            <Typography.Text className="date">{createdAt}</Typography.Text>
        </div>
        <div>
            <Typography.Text className="content">{text}</Typography.Text>
        </div>
    </WrapperStyle>
  )
}
