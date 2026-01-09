/**
 * ChannelDetailDrawer Component
 * WO-P6-CHANNEL-OPS-DASHBOARD-P0
 *
 * Displays detailed channel operations information in a slide-out drawer.
 */

import React from 'react';
import ChannelStatusBadge, { type OnlineStatus } from './ChannelStatusBadge';
import type { ChannelOpsData } from './ChannelOpsTable';

interface ChannelDetailDrawerProps {
  channel: ChannelOpsData | null;
  open: boolean;
  onClose: () => void;
}

function formatDateTime(dateString: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatUptime(seconds: number | null): string {
  if (seconds === null) return '-';

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
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

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: 'Active',
    inactive: 'Inactive',
    suspended: 'Suspended',
  };
  return labels[status] || status;
}

export default function ChannelDetailDrawer({ channel, open, onClose }: ChannelDetailDrawerProps) {
  if (!open || !channel) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          zIndex: 999,
          transition: 'opacity 0.2s',
        }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '480px',
          maxWidth: '100vw',
          backgroundColor: '#fff',
          boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.15)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          transition: 'transform 0.3s',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Channel Details</h2>
            <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#6b7280' }}>
              Operations information
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '8px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: '20px',
              color: '#6b7280',
            }}
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          {/* Channel Info Section */}
          <Section title="Channel Information">
            <InfoRow label="Name" value={channel.name} />
            <InfoRow label="Code" value={channel.code || '-'} />
            <InfoRow label="ID" value={channel.channelId} mono />
            <InfoRow label="Type" value={getTypeLabel(channel.type)} />
            <InfoRow label="Status" value={getStatusLabel(channel.channelStatus)} />
            <InfoRow label="Service Key" value={channel.serviceKey || '-'} />
            <InfoRow label="Organization" value={channel.organizationId || '-'} mono />
          </Section>

          {/* Online Status Section */}
          <Section title="Online Status">
            <div style={{ marginBottom: '12px' }}>
              <ChannelStatusBadge status={channel.onlineStatus} size="md" showLabel />
            </div>
            <InfoRow label="Last Heartbeat" value={formatDateTime(channel.lastHeartbeatAt)} />
            <InfoRow label="Uptime" value={formatUptime(channel.uptimeSec)} />
          </Section>

          {/* Device Info Section */}
          <Section title="Device Information">
            <InfoRow label="Device Type" value={channel.deviceType || '-'} />
            <InfoRow label="Platform" value={channel.platform || '-'} />
            <InfoRow label="Player Version" value={channel.playerVersion || '-'} />
            <InfoRow label="IP Address" value={channel.ipAddress || '-'} mono />
          </Section>

          {/* Content Section */}
          <Section title="Content">
            <InfoRow label="Slot Key" value={channel.slotKey} mono />
            <InfoRow label="Location" value={channel.location || '-'} />
            {channel.lastPlayedContent ? (
              <>
                <InfoRow
                  label="Last Content ID"
                  value={channel.lastPlayedContent.contentId}
                  mono
                />
                <InfoRow
                  label="Played At"
                  value={formatDateTime(channel.lastPlayedContent.playedAt)}
                />
                <InfoRow
                  label="Duration"
                  value={`${channel.lastPlayedContent.durationSec}s`}
                />
                <InfoRow
                  label="Completed"
                  value={channel.lastPlayedContent.completed ? 'Yes' : 'No'}
                />
              </>
            ) : (
              <p style={{ color: '#9ca3af', fontSize: '14px' }}>No playback data available</p>
            )}
          </Section>
        </div>
      </div>
    </>
  );
}

// Helper Components
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <h3
        style={{
          margin: '0 0 12px',
          fontSize: '14px',
          fontWeight: 600,
          color: '#374151',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {title}
      </h3>
      <div
        style={{
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          padding: '16px',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '8px',
        fontSize: '14px',
      }}
    >
      <span style={{ color: '#6b7280', flexShrink: 0 }}>{label}</span>
      <span
        style={{
          color: '#111827',
          fontWeight: 500,
          textAlign: 'right',
          marginLeft: '16px',
          wordBreak: 'break-all',
          fontFamily: mono ? 'monospace' : 'inherit',
          fontSize: mono ? '12px' : '14px',
        }}
      >
        {value}
      </span>
    </div>
  );
}
