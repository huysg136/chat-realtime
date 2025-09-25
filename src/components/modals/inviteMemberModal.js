import React, { useContext, useState } from 'react';
import { Modal, Form, Select, Spin, Avatar } from 'antd';
import { AppContext } from '../../context/appProvider';
import { addDocument } from '../../firebase/services';
import { AuthContext } from '../../context/authProvider';
import debounce from 'lodash/debounce';
import { collection, query, where, orderBy, limit, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/config";

function DebounceSelect({ fetchOptions, debounceTimeout = 300, ...props}){
    const [fetching, setFetching] = useState(false);
    const [options, setOptions] = useState([]);

    const debounceFetcher = React.useMemo(() => {
        const loadOptions = (value) => {
            setOptions([]);
            setFetching(true);

            fetchOptions(value, props.curMembers).then(newOptions => {
                setOptions(newOptions);
                setFetching(false);
            })
        }

        return debounce(loadOptions, debounceTimeout);
    }, [debounceTimeout, fetchOptions, props.curMembers]);
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
                    <Select.Option key={opt.value} value={opt.value} title={opt.label}>
                        <Avatar size="small" src={opt.photoURL}></Avatar>
                        {` ${opt.label}`}
                    </Select.Option>
                ))
            }
        </Select>
    )
}

function fetchUserList(search, curMembers) {
  const q = query(
    collection(db, "users"),
    where("keywords", "array-contains", search),
    orderBy("displayName"),
    limit(20)
  );

  return getDocs(q).then((snapshot) => {
    return snapshot.docs.map((doc) => ({
      label: doc.data().displayName,
      value: doc.data().uid,  
      photoURL: doc.data().photoURL,
    })).filter(opt => curMembers.includes(opt.value));;
  });
}

export default function InviteMemberModal() {
    const { isInviteMemberVisible, setIsInviteMemberVisible, selectedRoomId,selectedRoom } = useContext(AppContext);
    const { user } = useContext(AuthContext);
    const uid = user?.uid;
    const [form] = Form.useForm();
    const [ value, setValue ] = useState([]);

    const handleOk = async () => {
        const values = await form.validateFields();

        if (!selectedRoomId) return;

        const roomRef = doc(db, "rooms", selectedRoomId);

        await updateDoc(roomRef, {
            members: Array.from(new Set([
            ...(selectedRoom?.members || []),
            uid,
            ...values.members.map(val => val.value),
            ]))
        });

        form.resetFields();
        setIsInviteMemberVisible(false);
    };



    const handleCancel = () => {
        //reset data form
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
                    curMembers={selectedRoom?.members || []}
                    />
                </Form.Item>
            </Form>
        </Modal>
    )
}
