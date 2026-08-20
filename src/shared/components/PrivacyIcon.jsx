import React from 'react';
import { IoEarth } from "react-icons/io5";
import { FaUsers, FaLock } from "react-icons/fa";

export const PRIVACY_CONFIG = {
    public: {
        icon: IoEarth,
        color: '#3b82f6',
        label: 'Công khai',
        sizeOffset: 1,
    },
    friends: {
        icon: FaUsers,
        color: '#10b981',
        label: 'Bạn bè',
        sizeOffset: 0,
    },
    private: {
        icon: FaLock,
        color: '#f59e0b',
        label: 'Chỉ mình tôi',
        sizeOffset: -1,
    }
};

export default function PrivacyIcon({ privacy, size = 14, color, style, ...props }) {
    const config = PRIVACY_CONFIG[privacy] || PRIVACY_CONFIG.public;
    const IconComponent = config.icon;

    const finalColor = color !== undefined ? color : config.color;
    const finalStyle = { ...style };
    if (finalColor) {
        finalStyle.color = finalColor;
    }

    return (
        <>
            <div style={{ marginRight: '3px' }}>•</div>
            <IconComponent
                size={size + (config.sizeOffset || 0)}
                style={finalStyle}
                title={config.label}
                {...props}
            />
        </>
    );
}
