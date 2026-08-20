import React from 'react';
import { Spin } from 'antd';

/**
 * Common loading component - centered Spin
 * @param {boolean} fullScreen - true = 100vh, false = 100% parent (default: false)
 */
export default function LoadingScreen({ fullScreen = false }) {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: fullScreen ? '100vh' : '100%',
            width: '100%',
            minHeight: fullScreen ? undefined : '200px',
        }}>
            <Spin size="large" />
        </div>
    );
}
