import React, { useContext, useState, useMemo, useEffect } from 'react';
import { Modal, Form, Select, Spin, Avatar } from 'antd';
import { AppContext } from '../../context/appProvider';
import { AuthContext } from '../../context/authProvider';
import { collection, query, where, orderBy, limit, getDocs, doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import debounce from 'lodash/debounce';

/* DebounceSelect Component */
function DebounceSelect({ fetchOptions, debounceTimeout = 300, curMembers = [], currentUserId, ...props }) {
    const [fetching, setFetching] = useState(false);
    const [options, setOptions] = useState([]);

    const debounceFetcher = useMemo(() => {
        const loadOptions = (value) => {
            setOptions([]);
            setFetching(true);
            fetchOptions(value, curMembers, currentUserId).then(newOptions => {
                setOptions(newOptions);
                setFetching(false);
            });
        };
        return debounce(loadOptions, debounceTimeout);
    }, [fetchOptions, debounceTimeout, curMembers, currentUserId]);

    return (
        <Select
            labelInValue
            filterOption={false}
            onSearch={debounceFetcher}
            notFoundContent={fetching ? <Spin size="small" /> : null}
            {...props}   // các prop khác như mode, style
        >
            {options.map(opt => (
                <Select.Option
                    key={opt.value}
                    value={opt.value}
                    title={opt.label}
                    disabled={opt.disabled}
                >
                    <Avatar size="small" src={opt.photoURL} style={{ marginRight: 5 }} />
                    {opt.label}
                    {opt.disabled && <span style={{ color: '#999', fontSize: 12 }}> (Đã trong nhóm)</span>}
                </Select.Option>
            ))}
        </Select>
    );
}

/* Fetch Users from Firestore */
async function fetchUserList(search, curMembers = [], currentUserId) {
    if (!search) return [];

    const q = query(
        collection(db, "users"),
        where("keywords", "array-contains", search),
        orderBy("displayName"),
        limit(20)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs
        .map(doc => {
            const data = doc.data();
            return {
                label: data.displayName,
                value: data.uid,
                photoURL: data.photoURL,
                disabled: curMembers.includes(data.uid),
            };
        })
        .filter(opt => opt.value !== currentUserId); // loại bỏ user hiện tại
}

/* InviteMemberModal */
export default function InviteMemberModal() {
    const { isInviteMemberVisible, setIsInviteMemberVisible, selectedRoomId, selectedRoom } = useContext(AppContext);
    const { user } = useContext(AuthContext);
    const uid = user?.uid;

    const [form] = Form.useForm();
    const [currentMembers, setCurrentMembers] = useState([]);

    // Lấy danh sách thành viên hiện tại khi modal mở hoặc selectedRoom thay đổi
    useEffect(() => {
        const fetchCurrentMembers = async () => {
            if (selectedRoomId && isInviteMemberVisible) {
                try {
                    const roomRef = doc(db, "rooms", selectedRoomId);
                    const roomSnap = await getDoc(roomRef);
                    const roomData = roomSnap.data();
                    setCurrentMembers(roomData?.members || []);
                } catch (error) {
                    console.error("Error fetching current members:", error);
                    setCurrentMembers(selectedRoom?.members || []);
                }
            }
        };
        fetchCurrentMembers();
    }, [selectedRoomId, isInviteMemberVisible, selectedRoom]);

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            if (!selectedRoomId || !values.members || values.members.length === 0) return;

            const roomRef = doc(db, "rooms", selectedRoomId);

            // Lấy lại danh sách thành viên từ database để đảm bảo cập nhật mới nhất
            const roomSnap = await getDoc(roomRef);
            const currentRoomData = roomSnap.data();
            const existingMembers = currentRoomData?.members || [];

            // Thêm các thành viên mới
            const newMemberIds = values.members.map(val => val.value);
            const updatedMembers = Array.from(new Set([...existingMembers, ...newMemberIds]));

            await updateDoc(roomRef, { members: updatedMembers });

            // Cập nhật state local
            setCurrentMembers(updatedMembers);
            form.resetFields();
            setIsInviteMemberVisible(false);
        } catch (error) {
            console.error("Error updating room members:", error);
        }
    };

    const handleCancel = () => {
        form.resetFields();
        setIsInviteMemberVisible(false);
    };

    return (
        <Modal
            title="Mời thêm thành viên"
            open={isInviteMemberVisible}
            onOk={handleOk}
            onCancel={handleCancel}
        >
            <Form form={form} layout="vertical">
                <Form.Item name="members" label="Tên người dùng">
                    <DebounceSelect
                        mode="multiple"
                        placeholder="Nhập tên người dùng"
                        fetchOptions={fetchUserList}
                        curMembers={currentMembers}
                        currentUserId={uid}
                        style={{ width: '100%' }}
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
}
