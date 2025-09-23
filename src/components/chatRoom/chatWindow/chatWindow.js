import React from 'react';
import { Button, Avatar, Form, Input } from 'antd';
import Message from '../message/message';
import { PhoneOutlined, VideoCameraOutlined } from '@ant-design/icons';
import './chatWindow.scss';

export default function ChatWindow() {
  return (
    <div className="chat-window">
      <header className="chat-window__header">
        <Avatar src="https://i.pravatar.cc/300" />
        <div className="header__info">
          <p className="header__title">+91 70325 35158</p>
          <span className="header__description">
            nhấp vào đây để xem thông tin liên hệ
          </span>
        </div>

        <div className="button-group-right">
          <div className="button-group-style">
            <Button type="text" icon={<PhoneOutlined />} />
            <Button type="text" icon={<VideoCameraOutlined />} />
          </div>
        </div>
      </header>

      <div className="chat-window__content">
        <div className="message-list-style">
          <Message text="Hello world" photoURL={null} displayName="Huy" createdAt={Date.now()} />
          <Message text="Hello world" photoURL={null} displayName="Huy" createdAt={Date.now()} />
          <Message text="Hello world" photoURL={null} displayName="Huy" createdAt={Date.now()} />
        </div>

        <Form className="form-style">
          <Form.Item>
            <Input placeholder="Nhập tin nhắn" bordered={false} autoComplete="off" />
          </Form.Item>
          <Button type="primary">Gửi</Button>
        </Form>
      </div>
    </div>
  );
}
