/**
 * ChannelStatusBadge Component
 * WO-P6-CHANNEL-OPS-DASHBOARD-P0
 *
 * Displays online status with color-coded badge.
 */

import React from 'react';

export type OnlineStatus = 'ONLINE' | 'OFFLINE' | 'MAINTENANCE' | 'UNKNOWN';

interface ChannelStatusBadgeProps {
  status: OnlineStatus;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<OnlineStatus, { color: string; bgColor: string; label: string }> = {
  ONLINE: { color: '#16a34a', bgColor: '#dcfce7', label: 'Online' },
  OFFLINE: { color: '#dc2626', bgColor: '#fee2e2', label: 'Offline' },
  MAINTENANCE: { color: '#ca8a04', bgColor: '#fef9c3', label: 'Maintenance' },
  UNKNOWN: { color: '#6b7280', bgColor: '#f3f4f6', label: 'Unknown' },
};

const sizeStyles = {
  sm: { padding: '2px 8px', fontSize: '11px' },
  md: { padding: '4px 10px', fontSize: '12px' },
  lg: { padding: '6px 14px', fontSize: '14px' },
};

export default function ChannelStatusBadge({ status, size = 'md' }: ChannelStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.UNKNOWN;
  const sizeStyle = sizeStyles[size];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: sizeStyle.padding,
        fontSize: sizeStyle.fontSize,
        fontWeight: 500,
        color: config.color,
        backgroundColor: config.bgColor,
        borderRadius: '9999px',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: config.color,
          animation: status === 'ONLINE' ? 'pulse 2s infinite' : 'none',
        }}
      />
      {config.label}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </span>
  );
}
