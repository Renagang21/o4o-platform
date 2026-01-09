/**
 * ChannelOpsTable Component
 * WO-P6-CHANNEL-OPS-DASHBOARD-P0
 *
 * Displays channel operations status in a table format.
 */

import React from 'react';
import ChannelStatusBadge, { type OnlineStatus } from './ChannelStatusBadge';

export interface ChannelOpsData {
  channelId: string;
  name: string;
  code: string | null;
  type: string;
  serviceKey: string | null;
  organizationId: string | null;
  channelStatus: string;
  onlineStatus: OnlineStatus;
  slotKey: string;
  location: string | null;
  lastHeartbeatAt: string | null;
  uptimeSec: number | null;
  playerVersion: string | null;
  deviceType: string | null;
  platform: string | null;
  ipAddress: string | null;
  lastPlayedContent: {
    contentId: string;
    playedAt: string;
    durationSec: number;
    completed: boolean;
  } | null;
}

interface ChannelOpsTableProps {
  data: ChannelOpsData[];
  onRowClick?: (channel: ChannelOpsData) => void;
  loading?: boolean;
}

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return '-';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

function formatUptime(seconds: number | null): string {
  if (seconds === null) return '-';

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    tv: 'TV',
    kiosk: 'Kiosk',
    signage: 'Signage',
    web: 'Web',
  };
  return labels[type] || type;
}

export default function ChannelOpsTable({ data, onRowClick, loading }: ChannelOpsTableProps) {
  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
        Loading...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
        No channels found
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <th style={thStyle}>Channel</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Service</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Last Heartbeat</th>
            <th style={thStyle}>Uptime</th>
            <th style={thStyle}>Slot</th>
            <th style={thStyle}>Last Content</th>
            <th style={thStyle}>Device</th>
          </tr>
        </thead>
        <tbody>
          {data.map((channel) => (
            <tr
              key={channel.channelId}
              onClick={() => onRowClick?.(channel)}
              style={{
                borderBottom: '1px solid #e5e7eb',
                cursor: onRowClick ? 'pointer' : 'default',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => {
                if (onRowClick) e.currentTarget.style.backgroundColor = '#f9fafb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <td style={tdStyle}>
                <div>
                  <div style={{ fontWeight: 500 }}>{channel.name}</div>
                  {channel.code && (
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{channel.code}</div>
                  )}
                </div>
              </td>
              <td style={tdStyle}>
                <span
                  style={{
                    padding: '2px 8px',
                    fontSize: '11px',
                    backgroundColor: '#e5e7eb',
                    borderRadius: '4px',
                  }}
                >
                  {getTypeLabel(channel.type)}
                </span>
              </td>
              <td style={tdStyle}>
                <span style={{ color: '#6b7280' }}>{channel.serviceKey || '-'}</span>
              </td>
              <td style={tdStyle}>
                <ChannelStatusBadge status={channel.onlineStatus} size="sm" />
              </td>
              <td style={tdStyle}>
                <span style={{ color: '#6b7280' }}>
                  {formatRelativeTime(channel.lastHeartbeatAt)}
                </span>
              </td>
              <td style={tdStyle}>
                <span style={{ color: '#6b7280' }}>{formatUptime(channel.uptimeSec)}</span>
              </td>
              <td style={tdStyle}>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    color: '#4b5563',
                  }}
                >
                  {channel.slotKey}
                </span>
              </td>
              <td style={tdStyle}>
                {channel.lastPlayedContent ? (
                  <div>
                    <div
                      style={{
                        fontSize: '12px',
                        maxWidth: '150px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {channel.lastPlayedContent.contentId.slice(0, 8)}...
                    </div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>
                      {formatRelativeTime(channel.lastPlayedContent.playedAt)}
                    </div>
                  </div>
                ) : (
                  <span style={{ color: '#9ca3af' }}>-</span>
                )}
              </td>
              <td style={tdStyle}>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  {channel.deviceType || '-'}
                  {channel.platform && ` / ${channel.platform}`}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '12px 16px',
  textAlign: 'left',
  fontWeight: 600,
  color: '#374151',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  verticalAlign: 'middle',
};
