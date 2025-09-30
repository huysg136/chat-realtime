import React, { useContext, useState, useMemo } from 'react';
import { Modal, Form, Input, Select, Spin, Avatar } from 'antd';
import { AppContext } from '../../context/appProvider';
import { AuthContext } from '../../context/authProvider';
import { addDocument } from '../../firebase/services';
import debounce from 'lodash/debounce';
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";

/* DebounceSelect Component */
function DebounceSelect({ fetchOptions, debounceTimeout = 300, curMembers = [], ...props }) {
    const [fetching, setFetching] = useState(false);
    const [options, setOptions] = useState([]);

    const debounceFetcher = useMemo(() => {
        const loadOptions = (value) => {
            setOptions([]);
            setFetching(true);
            fetchOptions(value, curMembers).then(newOptions => {
                setOptions(newOptions);
                setFetching(false);
            });
        };
        return debounce(loadOptions, debounceTimeout);
    }, [fetchOptions, debounceTimeout, curMembers]);

    return (
        <Select
            labelInValue
            filterOption={false}
            onSearch={debounceFetcher}
            notFoundContent={fetching ? <Spin size="small" /> : null}
            {...props}
        >
            {options.map(opt => (
                <Select.Option 
                    key={opt.value} 
                    value={opt.value} 
                    disabled={curMembers.includes(opt.value)}
                    title={opt.label}
                >
                    <Avatar size="small" src={opt.photoURL} style={{ marginRight: 5 }} />
                    {opt.label} {curMembers.includes(opt.value) ? "(Bạn)" : ""}
                </Select.Option>
            ))}
        </Select>
    );
}

/* Fetch Users from Firestore */
async function fetchUserList(search, curMembers = []) {
    if (!search) return [];
    const q = query(
        collection(db, "users"),
        where("keywords", "array-contains", search),
        orderBy("displayName"),
        limit(20)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs
        .map(doc => ({
            label: doc.data().displayName,
            value: doc.data().uid,
            photoURL: doc.data().photoURL
        }))
        .filter(opt => !curMembers.includes(opt.value));
}

/* AddRoomModal */
export default function AddRoomModal() {
    const { isAddRoomVisible, setIsAddRoomVisible } = useContext(AppContext);
    const { user } = useContext(AuthContext);
    const uid = user?.uid;

    const [form] = Form.useForm();
    const [hasSelected, setHasSelected] = useState(false);

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            if (!uid) return;

            // Người tạo + thành viên được chọn
            const members = Array.from(new Set([
                uid,
                ...(values.members || []).map(m => m.value)
            ]));

            await addDocument('rooms', {
                name: values.name,
                description: values.description || '',
                members
            });

            form.resetFields();
            setHasSelected(false);
            setIsAddRoomVisible(false);
        } catch (err) {
            console.error("Error creating room:", err);
        }
    };

    const handleCancel = () => {
        form.resetFields();
        setHasSelected(false);
        setIsAddRoomVisible(false);
    };

    const onValuesChange = (_, allValues) => {
        setHasSelected((allValues.members || []).length > 0);
    };

    return (
        <Modal
            title="Tạo nhóm"
            open={isAddRoomVisible}
            onOk={handleOk}
            onCancel={handleCancel}
            okButtonProps={{ disabled: false }}
        >
            <Form
                form={form}
                layout="vertical"
                onValuesChange={onValuesChange}
            >
                <Form.Item label="Tên nhóm" name="name" rules={[{ required: true, message: 'Nhập tên nhóm' }]}>
                    <Input placeholder="Nhập tên nhóm" />
                </Form.Item>
                <Form.Item label="Mô tả" name="description">
                    <Input.TextArea placeholder="Nhập mô tả" />
                </Form.Item>
                <Form.Item label="Mời thành viên" name="members">
                    <DebounceSelect
                        mode="multiple"
                        placeholder="Nhập tên người dùng..."
                        fetchOptions={fetchUserList}
                        curMembers={[uid]}
                        style={{ width: '100%' }}
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
}
