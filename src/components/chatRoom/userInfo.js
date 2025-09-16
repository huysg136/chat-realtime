import React from 'react'
import { Avatar, Button, Typography } from 'antd'

export default function userInfo() {
  return (
    <div>
        <div>
            <Avatar src="https://i.pravatar.cc/300" />
            <Typography.Text style={{ marginLeft: 5 }}>User Name</Typography.Text>
        </div>
        <button>Log out</button>
    </div>
  )
}
