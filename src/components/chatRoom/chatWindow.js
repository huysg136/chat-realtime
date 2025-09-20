import { UserAddOutlined } from '@ant-design/icons';
import React from 'react'
import styled from 'styled-components';
import { Button, Avatar, Tooltip, Form, Input } from 'antd';
import Message from '../chatRoom/message';

const HeaderStyle = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  height: 56px;
  padding: 0 16px;
  border-bottom: 1px solid rgb(230, 230, 230);
  background: #fff;

  .header {
    &__info {
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    &__title {
      margin: 0;
      font-weight: bold;
      font-size: 16px;
      line-height: 1.2;
    }

    &__description {
      font-size: 12px;
      color: gray;
      line-height: 1.2;
    }
  }
`;


const ButtonGroupStyle = styled.div`
    display: flex;
    align-items: center;
`;

const WrapperStyle = styled.div`
    height: 100vh;
`;

const ContentStyle = styled.div`
    height: calc(98% - 66px);
    display: flex;
    flex-direction: column;
    padding: 11px;
    justify-content: flex-end;
`;

const FormStyle = styled(Form)`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 2px 2px 2px 0;
    border: 1px solid rgb(230, 230, 230);
    border-radius: 2px;

    .ant-form-item {
        flex: 1;
        margin-bottom: 0;
    }
`;

const MessageListStyle = styled.div`
    max-height: 100%;
    overflow-y: auto;
    margin-bottom: 10px;
    padding-right: 10px;
`;

export default function chatWindow() {
  return (
    <WrapperStyle>
        <HeaderStyle>
            <Avatar src="https://i.pravatar.cc/300" />
            <div className="header__info">
                <p className="header__title">+91 70325 35158</p>
                <span className="header__description">nhấp vào đây để xem thông tin liên hệ</span>
            </div>
            {/* <ButtonGroupStyle>
                <Button icon={<UserAddOutlined />} type="text">Invite</Button>
                <Avatar.Group size="small" maxCount={2}>
                    <Tooltip title="A">
                        <Avatar>A</Avatar>
                    </Tooltip>
                    <Tooltip title="A">
                        <Avatar>B</Avatar>
                    </Tooltip>
                    <Tooltip title="A">
                        <Avatar>C</Avatar>
                    </Tooltip>
                    <Tooltip title="A">
                        <Avatar>D</Avatar>
                    </Tooltip>
                    <Tooltip title="A">
                        <Avatar>E</Avatar>
                    </Tooltip>
                </Avatar.Group>
            </ButtonGroupStyle> */}
        </HeaderStyle>
        <ContentStyle>
            <MessageListStyle>
                <Message
                    text="Hello world"
                    photoURL={null}
                    displayName="Huy"
                    createdAt={Date.now()}
                />
                <Message
                    text="Hello world"
                    photoURL={null}
                    displayName="Huy"
                    createdAt={Date.now()}
                />
                <Message
                    text="Hello world"
                    photoURL={null}
                    displayName="Huy"
                    createdAt={Date.now()}
                />
            </MessageListStyle>
            <FormStyle>
                <Form.Item>
                    <Input placeholder="Nhập tin nhắn" bordered={false} autoComplete="off"/>
                </Form.Item>
                <Button type="primary">Gửi</Button>
            </FormStyle>
        </ContentStyle>
    </WrapperStyle>
  )
}
