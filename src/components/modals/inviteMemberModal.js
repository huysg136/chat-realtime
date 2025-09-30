import React, { useContext, useState } from 'react';
import { Modal, Form, Select, Spin, Avatar } from 'antd';
import { AppContext } from '../../context/appProvider';
import { addDocument } from '../../firebase/services';
import { AuthContext } from '../../context/authProvider';
import debounce from 'lodash/debounce';
import { collection, query, where, orderBy, limit, getDocs, doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/config";

function DebounceSelect({ fetchOptions, debounceTimeout = 300, ...props}){
    const [fetching, setFetching] = useState(false);
    const [options, setOptions] = useState([]);

    const debounceFetcher = React.useMemo(() => {
        const loadOptions = (value) => {
            setOptions([]);
            setFetching(true);

            fetchOptions(value, props.curMembers, props.currentUserId).then(newOptions => {
                setOptions(newOptions);
                setFetching(false);
            })
        }

        return debounce(loadOptions, debounceTimeout);
    }, [debounceTimeout, fetchOptions, props.curMembers, props.currentUserId]);
    
    return (
        <Select 
            labelInValue
            filterOption={false}
            onSearch={debounceFetcher}
            notFoundContent={ fetching ? <Spin size="small" /> : null}
            {...props}
        >
            {
                options.map(opt => (
                    <Select.Option 
                        key={opt.value} 
                        value={opt.value} 
                        title={opt.label} 
                        disabled={opt.disabled}
                        style={opt.disabled ? { opacity: 0.5 } : {}}
                    >
                        <Avatar size="small" src={opt.photoURL}></Avatar>
                        {` ${opt.label}`}
                        {opt.disabled && <span style={{ color: '#999', fontSize: '12px' }}> (Đã trong nhóm)</span>}
                    </Select.Option>
                ))
            }
        </Select>
    )
}

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
            const userData = doc.data();
            return {
                label: userData.displayName,
                value: userData.uid,
                photoURL: userData.photoURL,
                disabled: curMembers.includes(userData.uid), // Disable if already a member
            };
        })
        // Filter out current user only
        .filter(opt => opt.value !== currentUserId);
}

export default function InviteMemberModal() {
    const { isInviteMemberVisible, setIsInviteMemberVisible, selectedRoomId, selectedRoom } = useContext(AppContext);
    const { user } = useContext(AuthContext);
    const uid = user?.uid;
    const [form] = Form.useForm();
    const [value, setValue] = useState([]);
    const [currentMembers, setCurrentMembers] = useState([]);

    // Fetch current members when modal opens or selectedRoom changes
    React.useEffect(() => {
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
        const values = await form.validateFields();

        if (!selectedRoomId || !values.members || values.members.length === 0) return;

        const roomRef = doc(db, "rooms", selectedRoomId);
        
        try {
            // Fetch current room data from database to ensure we have latest members list
            const roomSnap = await getDoc(roomRef);
            const currentRoomData = roomSnap.data();
            const currentMembers = currentRoomData?.members || [];
            
            // Add new members to existing members list
            const newMemberIds = values.members.map(val => val.value);
            
            const updatedMembers = Array.from(new Set([
                ...currentMembers, // Current members from database
                ...newMemberIds,   // New members to add
            ]));

            await updateDoc(roomRef, {
                members: updatedMembers
            });

            // Update local state to reflect changes immediately
            setCurrentMembers(updatedMembers);

            form.resetFields();
            setIsInviteMemberVisible(false);
        } catch (error) {
            console.error("Error updating room members:", error);
        }
    };

    const handleCancel = () => {
        // Reset form data
        form.resetFields();
        setIsInviteMemberVisible(false);
    }

    return (
        <Modal title="Mời thêm thành viên" open={isInviteMemberVisible} onOk={handleOk} onCancel={handleCancel}>
            <Form form={form} layout="vertical">
                <Form.Item name="members" label="Tên người dùng">
                    <DebounceSelect
                        mode="multiple"
                        placeholder="Nhập tên người dùng"
                        fetchOptions={fetchUserList}
                        style={{ width: '100%' }}
                        curMembers={currentMembers}
                        currentUserId={uid}
                    />
                </Form.Item>
            </Form>
        </Modal>
    )
}