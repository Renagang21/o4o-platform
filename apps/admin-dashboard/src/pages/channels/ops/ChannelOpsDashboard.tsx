/**
 * ChannelOpsDashboard Page
 * WO-P6-CHANNEL-OPS-DASHBOARD-P0
 *
 * Admin dashboard for monitoring channel operations status.
 * Combines heartbeat and playback log data for a unified view.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { authClient } from '@o4o/auth-client';
import ChannelOpsTable, { type ChannelOpsData } from './ChannelOpsTable';
import ChannelDetailDrawer from './ChannelDetailDrawer';
import type { OnlineStatus } from './ChannelStatusBadge';

interface ChannelOpsResponse {
  success: boolean;
  data: ChannelOpsData[];
  summary: {
    total: number;
    online: number;
    offline: number;
    maintenance: number;
    unknown: number;
  };
  thresholdSec: number;
  checkedAt: string;
}

// Auto-refresh interval (30 seconds)
const AUTO_REFRESH_INTERVAL_MS = 30000;

export default function ChannelOpsDashboard() {
  const [data, setData] = useState<ChannelOpsData[]>([]);
  const [summary, setSummary] = useState<ChannelOpsResponse['summary'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Filters
  const [serviceKeyFilter, setServiceKeyFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<OnlineStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  // Detail drawer
  const [selectedChannel, setSelectedChannel] = useState<ChannelOpsData | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Fetch channel ops data
  const fetchChannelOps = useCallback(async () => {
    try {
      setError(null);

      const params = new URLSearchParams();
      if (serviceKeyFilter) params.set('serviceKey', serviceKeyFilter);

      const url = `/api/v1/admin/channels/ops${params.toString() ? `?${params}` : ''}`;
      const response = await authClient.api.get<ChannelOpsResponse>(url);

      if (response.success) {
        setData(response.data);
        setSummary(response.summary);
        setLastUpdated(new Date(response.checkedAt));
      } else {
        throw new Error('Failed to fetch channel operations data');
      }
    } catch (err) {
      console.error('Failed to fetch channel ops:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [serviceKeyFilter]);

  // Initial load
  useEffect(() => {
    fetchChannelOps();
  }, [fetchChannelOps]);

  // Auto-refresh
  useEffect(() => {
    const timer = setInterval(() => {
      fetchChannelOps();
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [fetchChannelOps]);

  // Filter data client-side
  const filteredData = data.filter((channel) => {
    if (statusFilter && channel.onlineStatus !== statusFilter) return false;
    if (typeFilter && channel.type !== typeFilter) return false;
    return true;
  });

  // Handle row click
  const handleRowClick = (channel: ChannelOpsData) => {
    setSelectedChannel(channel);
    setDrawerOpen(true);
  };

  // Handle drawer close
  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setSelectedChannel(null);
  };

  // Handle manual refresh
  const handleRefresh = () => {
    setLoading(true);
    fetchChannelOps();
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>Channel Operations</h1>
            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '14px' }}>
              Monitor channel health and playback status
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {lastUpdated && (
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={handleRefresh}
              disabled={loading}
              style={{
                padding: '8px 16px',
                backgroundColor: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <SummaryCard label="Total Channels" value={summary.total} color="#374151" />
          <SummaryCard label="Online" value={summary.online} color="#10b981" />
          <SummaryCard label="Offline" value={summary.offline} color="#ef4444" />
          <SummaryCard label="Maintenance" value={summary.maintenance} color="#f59e0b" />
          <SummaryCard label="Unknown" value={summary.unknown} color="#6b7280" />
        </div>
      )}

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '16px',
          flexWrap: 'wrap',
        }}
      >
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as OnlineStatus | '')}
          style={selectStyle}
        >
          <option value="">All Status</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
          <option value="maintenance">Maintenance</option>
          <option value="unknown">Unknown</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={selectStyle}
        >
          <option value="">All Types</option>
          <option value="tv">TV</option>
          <option value="kiosk">Kiosk</option>
          <option value="signage">Signage</option>
          <option value="web">Web</option>
        </select>

        <input
          type="text"
          placeholder="Service Key"
          value={serviceKeyFilter}
          onChange={(e) => setServiceKeyFilter(e.target.value)}
          style={{
            ...selectStyle,
            width: '150px',
          }}
        />

        {(statusFilter || typeFilter || serviceKeyFilter) && (
          <button
            onClick={() => {
              setStatusFilter('');
              setTypeFilter('');
              setServiceKeyFilter('');
            }}
            style={{
              padding: '8px 12px',
              backgroundColor: 'transparent',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#6b7280',
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div
          style={{
            padding: '16px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#991b1b',
            marginBottom: '16px',
          }}
        >
          {error}
        </div>
      )}

      {/* Table */}
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
        }}
      >
        <ChannelOpsTable
          data={filteredData}
          onRowClick={handleRowClick}
          loading={loading && data.length === 0}
        />
      </div>

      {/* Result Count */}
      {!loading && (
        <div style={{ marginTop: '12px', fontSize: '14px', color: '#6b7280' }}>
          Showing {filteredData.length} of {data.length} channels
        </div>
      )}

      {/* Detail Drawer */}
      <ChannelDetailDrawer
        channel={selectedChannel}
        open={drawerOpen}
        onClose={handleDrawerClose}
      />
    </div>
  );
}

// Helper Components
function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: '#fff',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
      }}
    >
      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '28px', fontWeight: 600, color }}>{value}</div>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: '8px 12px',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '14px',
  backgroundColor: '#fff',
  cursor: 'pointer',
  minWidth: '120px',
};
