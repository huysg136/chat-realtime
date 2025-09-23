import React, { useContext } from 'react';
import { Modal, Form, Input } from 'antd';
import { AppContext } from '../../context/appProvider';
import { addDocument } from '../../firebase/services';
import { AuthContext } from '../../context/authProvider';

export default function AddRoomModal() {
    const { isAddRoomVisible, setIsAddRoomVisible } = useContext(AppContext);
    const { user } = useContext(AuthContext);
    const uid = user?.uid;
    const [form] = Form.useForm();

    const handleOk = () => {
        if (!uid) return;
        // handle logic OK button
        // add new room chat to firestore
        addDocument('rooms', {...form.getFieldValue(), members: [uid]});

        //reset data form
        form.resetFields();

        setIsAddRoomVisible(false);
    }

    const handleCancel = () => {
        //reset data form
        form.resetFields();

        setIsAddRoomVisible(false);
    }

    return (
        <Modal title="Tạo nhóm" open={isAddRoomVisible} onOk={handleOk} onCancel={handleCancel}>
            <Form form={form} layout="vertical">
                <Form.Item label="Tên nhóm" name="name">   
                    <Input placeholder="Nhập tên nhóm" />
                </Form.Item>
                <Form.Item label="Mô tả" name="description">
                    <Input.TextArea placeholder="Nhập mô tả" />
                </Form.Item>
            </Form>
        </Modal>
    )
}
