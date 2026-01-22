/**
 * DebugPanel
 *
 * Sprint 2-4: Debug panel for development and troubleshooting
 * - Real-time state display
 * - Cache statistics
 * - Network status
 * - Performance metrics
 *
 * Phase 2: Digital Signage Production Upgrade
 */

import { useState } from 'react';

// ============================================================================
// Types
// ============================================================================

interface DebugPanelProps {
  info: Record<string, unknown>;
}

// ============================================================================
// DebugPanel Component
// ============================================================================

export default function DebugPanel({ info }: DebugPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'state' | 'cache' | 'telemetry'>('state');

  return (
    <div className={`debug-panel ${collapsed ? 'collapsed' : ''}`}>
      <div className="debug-header">
        <span className="debug-title">Debug Panel</span>
        <div className="debug-tabs">
          <button
            className={activeTab === 'state' ? 'active' : ''}
            onClick={() => setActiveTab('state')}
          >
            State
          </button>
          <button
            className={activeTab === 'cache' ? 'active' : ''}
            onClick={() => setActiveTab('cache')}
          >
            Cache
          </button>
          <button
            className={activeTab === 'telemetry' ? 'active' : ''}
            onClick={() => setActiveTab('telemetry')}
          >
            Telemetry
          </button>
        </div>
        <button
          className="debug-toggle"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? '▲' : '▼'}
        </button>
      </div>

      {!collapsed && (
        <div className="debug-content">
          {activeTab === 'state' && <StatePanel info={info} />}
          {activeTab === 'cache' && <CachePanel info={info} />}
          {activeTab === 'telemetry' && <TelemetryPanel info={info} />}
        </div>
      )}

      <style>{`
        .debug-panel {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(0, 0, 0, 0.9);
          color: #0f0;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 12px;
          z-index: 1000;
          max-height: 300px;
          overflow: hidden;
          transition: max-height 0.3s ease;
        }

        .debug-panel.collapsed {
          max-height: 32px;
        }

        .debug-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background: rgba(0, 50, 0, 0.5);
          border-bottom: 1px solid #0f0;
        }

        .debug-title {
          font-weight: bold;
        }

        .debug-tabs {
          display: flex;
          gap: 8px;
        }

        .debug-tabs button {
          background: transparent;
          border: 1px solid #0f0;
          color: #0f0;
          padding: 2px 8px;
          cursor: pointer;
          font-family: inherit;
          font-size: inherit;
        }

        .debug-tabs button.active {
          background: #0f0;
          color: #000;
        }

        .debug-toggle {
          background: transparent;
          border: none;
          color: #0f0;
          cursor: pointer;
          font-size: 14px;
        }

        .debug-content {
          padding: 12px;
          overflow-y: auto;
          max-height: 250px;
        }

        .debug-section {
          margin-bottom: 12px;
        }

        .debug-section-title {
          font-weight: bold;
          margin-bottom: 4px;
          color: #0ff;
        }

        .debug-row {
          display: flex;
          gap: 8px;
          padding: 2px 0;
        }

        .debug-label {
          color: #888;
          min-width: 120px;
        }

        .debug-value {
          color: #0f0;
        }

        .debug-value.error {
          color: #f00;
        }

        .debug-value.warning {
          color: #ff0;
        }

        .debug-value.success {
          color: #0f0;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Panel Components
// ============================================================================

function StatePanel({ info }: { info: Record<string, unknown> }) {
  return (
    <div>
      <div className="debug-section">
        <div className="debug-section-title">Player State</div>
        <DebugRow label="State" value={info.state} />
        <DebugRow label="Online" value={info.online} />
        <DebugRow label="Playlist" value={info.playlist} />
        <DebugRow label="Schedule" value={info.schedule} />
        <DebugRow label="Current Item" value={info.currentItem} />
      </div>

      <div className="debug-section">
        <div className="debug-section-title">Queue Status</div>
        {info.queueStatus && typeof info.queueStatus === 'object' ? (
          <>
            <DebugRow label="Total Items" value={(info.queueStatus as Record<string, unknown>).total} />
            <DebugRow label="Preloaded" value={(info.queueStatus as Record<string, unknown>).preloaded} />
            <DebugRow label="Current Index" value={(info.queueStatus as Record<string, unknown>).current} />
          </>
        ) : null}
      </div>
    </div>
  );
}

function CachePanel({ info }: { info: Record<string, unknown> }) {
  const stats = info.cacheStats as any;

  return (
    <div>
      <div className="debug-section">
        <div className="debug-section-title">Cache Statistics</div>
        {stats ? (
          <>
            <DebugRow label="Total Size" value={formatBytes(stats.totalSize)} />
            <DebugRow label="Item Count" value={stats.itemCount} />
            <DebugRow label="Hit Rate" value={formatPercent(stats.hitRate)} />
            <DebugRow label="Miss Rate" value={formatPercent(stats.missRate)} />
            <DebugRow label="Last Cleanup" value={formatTime(stats.lastCleanup)} />
          </>
        ) : (
          <DebugRow label="Status" value="Cache not initialized" />
        )}
      </div>
    </div>
  );
}

function TelemetryPanel({ info }: { info: Record<string, unknown> }) {
  const status = info.telemetryStatus as any;

  return (
    <div>
      <div className="debug-section">
        <div className="debug-section-title">Telemetry Status</div>
        {status ? (
          <>
            <DebugRow label="Player ID" value={status.playerId} />
            <DebugRow label="Uptime" value={`${status.uptimeSec}s`} />
            <DebugRow label="Queue Size" value={status.queueSize} />
            <DebugRow
              label="Last Heartbeat"
              value={status.lastHeartbeatSuccess ? 'Success' : 'Failed'}
              className={status.lastHeartbeatSuccess ? 'success' : 'error'}
            />
          </>
        ) : (
          <DebugRow label="Status" value="Telemetry not initialized" />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

function DebugRow({
  label,
  value,
  className,
}: {
  label: string;
  value: unknown;
  className?: string;
}) {
  const displayValue = value === undefined || value === null
    ? '-'
    : typeof value === 'object'
      ? JSON.stringify(value)
      : String(value);

  return (
    <div className="debug-row">
      <span className="debug-label">{label}:</span>
      <span className={`debug-value ${className || ''}`}>{displayValue}</span>
    </div>
  );
}

// ============================================================================
// Formatters
// ============================================================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatTime(timestamp: number): string {
  if (!timestamp) return 'Never';
  return new Date(timestamp).toLocaleTimeString();
}
