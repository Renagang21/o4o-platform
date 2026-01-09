/**
 * Ops Metrics Dashboard
 *
 * WO-NEXT-OPS-METRICS-P0: Unified operations dashboard for platform-wide health monitoring
 *
 * Purpose: Allow operators to quickly determine if intervention is needed.
 * This is NOT an analytics dashboard - it's an operational judgment tool.
 *
 * Key Features:
 * - Platform health summary (services, channels, CMS)
 * - Channel status overview (online/offline/maintenance)
 * - CMS operational risks (empty slots, locked slots, expired content)
 * - Operations status indicators (automated vs manual attention)
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Monitor,
  Layers,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Lock,
  RefreshCw,
  Wifi,
  WifiOff,
  Settings,
  Eye,
} from 'lucide-react';
import { authClient } from '@o4o/auth-client';

// Types for metrics response
interface ChannelMetrics {
  total: number;
  online: number;
  offline: number;
  maintenance: number;
  unknown: number;
}

interface CmsMetrics {
  lockedSlots: number;
  emptyCriticalSlots: number;
  expiredContents: number;
  draftOnlyAreas: number;
  criticalSlotKeys: string[];
}

interface OpsStatus {
  automated: number;
  manualAttention: number;
  contractControlled: number;
}

interface HealthIndicators {
  channelsHealthy: boolean;
  cmsHealthy: boolean;
  noManualAttentionNeeded: boolean;
}

interface MetricsData {
  services: {
    total: number;
    active: number;
    list: string[];
  };
  channels: ChannelMetrics;
  cms: CmsMetrics;
  opsStatus: OpsStatus;
  health: {
    status: 'healthy' | 'warning' | 'critical';
    indicators: HealthIndicators;
  };
  lastUpdatedAt: string;
}

interface MetricsResponse {
  success: boolean;
  data: MetricsData;
  thresholdSec: number;
}

// Health status colors
const healthColors = {
  healthy: 'bg-green-100 text-green-800 border-green-200',
  warning: 'bg-amber-100 text-amber-800 border-amber-200',
  critical: 'bg-red-100 text-red-800 border-red-200',
};

const healthBgColors = {
  healthy: 'bg-green-50',
  warning: 'bg-amber-50',
  critical: 'bg-red-50',
};

export default function OpsMetricsDashboard() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authClient.api.get<MetricsResponse>('/admin/ops/metrics');

      if (response.data.success) {
        setMetrics(response.data.data);
        setLastRefresh(new Date());
      } else {
        setError('Failed to fetch metrics');
      }
    } catch (err: any) {
      console.error('Failed to fetch ops metrics:', err);
      setError(err.message || 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchMetrics();
    }, 60000);

    return () => clearInterval(interval);
  }, [autoRefresh, fetchMetrics]);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (loading && !metrics) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-5 h-5" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchMetrics}
            className="mt-2 text-sm text-red-600 hover:text-red-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  const { channels, cms, opsStatus, health, services } = metrics;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ops Metrics</h1>
          <p className="text-sm text-gray-500 mt-1">
            Platform operational health at a glance
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Auto-refresh toggle */}
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300"
            />
            Auto-refresh
          </label>
          {/* Last updated */}
          {lastRefresh && (
            <span className="text-xs text-gray-500">
              Updated: {formatTime(lastRefresh.toISOString())}
            </span>
          )}
          {/* Refresh button */}
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Overall Health Banner */}
      <div
        className={`rounded-lg border p-4 ${healthColors[health.status]}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {health.status === 'healthy' && <CheckCircle className="w-6 h-6" />}
            {health.status === 'warning' && <AlertTriangle className="w-6 h-6" />}
            {health.status === 'critical' && <XCircle className="w-6 h-6" />}
            <div>
              <h2 className="font-semibold text-lg">
                {health.status === 'healthy' && 'All Systems Operational'}
                {health.status === 'warning' && 'Attention Required'}
                {health.status === 'critical' && 'Immediate Action Needed'}
              </h2>
              <p className="text-sm opacity-80">
                {health.status === 'healthy' && 'No intervention needed at this time'}
                {health.status === 'warning' && 'Some items may need your attention'}
                {health.status === 'critical' && 'Critical issues detected - please review'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {health.indicators.channelsHealthy && (
              <span className="px-2 py-1 text-xs rounded bg-white/50">Channels OK</span>
            )}
            {health.indicators.cmsHealthy && (
              <span className="px-2 py-1 text-xs rounded bg-white/50">CMS OK</span>
            )}
            {health.indicators.noManualAttentionNeeded && (
              <span className="px-2 py-1 text-xs rounded bg-white/50">Automated</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Services */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-3">
            <Activity className="w-5 h-5" />
            <span className="font-medium">Services</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{services.active}</div>
          <div className="text-sm text-gray-500 mt-1">Active services</div>
          {services.list.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {services.list.map((s) => (
                <span key={s} className="px-2 py-0.5 text-xs bg-gray-100 rounded">
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Total Channels */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-3">
            <Monitor className="w-5 h-5" />
            <span className="font-medium">Channels</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{channels.total}</div>
          <div className="text-sm text-gray-500 mt-1">Total registered</div>
        </div>

        {/* Locked Slots */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-3">
            <Lock className="w-5 h-5" />
            <span className="font-medium">Locked Slots</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{cms.lockedSlots}</div>
          <div className="text-sm text-gray-500 mt-1">Contract controlled</div>
        </div>

        {/* Operations Status */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-3">
            <Settings className="w-5 h-5" />
            <span className="font-medium">Ops Status</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{opsStatus.automated}</div>
          <div className="text-sm text-gray-500 mt-1">Fully automated</div>
        </div>
      </div>

      {/* Channel Status Section */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Monitor className="w-5 h-5" />
          Channel Status Overview
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Online */}
          <div className={`rounded-lg p-4 ${channels.online > 0 ? 'bg-green-50' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Wifi className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">Online</span>
            </div>
            <div className="text-2xl font-bold text-green-800">{channels.online}</div>
          </div>

          {/* Offline */}
          <div className={`rounded-lg p-4 ${channels.offline > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <WifiOff className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-700">Offline</span>
            </div>
            <div className="text-2xl font-bold text-red-800">{channels.offline}</div>
            {channels.offline > 0 && (
              <div className="text-xs text-red-600 mt-1">Needs attention</div>
            )}
          </div>

          {/* Maintenance */}
          <div className={`rounded-lg p-4 ${channels.maintenance > 0 ? 'bg-amber-50' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Settings className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-700">Maintenance</span>
            </div>
            <div className="text-2xl font-bold text-amber-800">{channels.maintenance}</div>
          </div>

          {/* Unknown */}
          <div className={`rounded-lg p-4 ${channels.unknown > 0 ? 'bg-gray-100' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Unknown</span>
            </div>
            <div className="text-2xl font-bold text-gray-800">{channels.unknown}</div>
            {channels.unknown > 0 && (
              <div className="text-xs text-gray-600 mt-1">No heartbeat</div>
            )}
          </div>
        </div>
      </div>

      {/* CMS Operational Risks */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Layers className="w-5 h-5" />
          CMS Operational Risks
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Empty Critical Slots */}
          <div
            className={`rounded-lg p-4 ${
              cms.emptyCriticalSlots > 0 ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Empty Critical Slots</span>
              {cms.emptyCriticalSlots > 0 && (
                <AlertTriangle className="w-4 h-4 text-red-600" />
              )}
            </div>
            <div
              className={`text-2xl font-bold ${
                cms.emptyCriticalSlots > 0 ? 'text-red-700' : 'text-gray-800'
              }`}
            >
              {cms.emptyCriticalSlots}
            </div>
            {cms.emptyCriticalSlots > 0 && (
              <div className="text-xs text-red-600 mt-1">
                Hero/banner slots without content
              </div>
            )}
          </div>

          {/* Expired Content */}
          <div
            className={`rounded-lg p-4 ${
              cms.expiredContents > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Expired Content</span>
              {cms.expiredContents > 0 && <Clock className="w-4 h-4 text-amber-600" />}
            </div>
            <div
              className={`text-2xl font-bold ${
                cms.expiredContents > 0 ? 'text-amber-700' : 'text-gray-800'
              }`}
            >
              {cms.expiredContents}
            </div>
            {cms.expiredContents > 0 && (
              <div className="text-xs text-amber-600 mt-1">
                Published content past expiry
              </div>
            )}
          </div>

          {/* Locked Slots */}
          <div className="rounded-lg p-4 bg-blue-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Contract Locked</span>
              <Lock className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-700">{cms.lockedSlots}</div>
            <div className="text-xs text-blue-600 mt-1">Protected by agreement</div>
          </div>
        </div>

        {/* Critical Slot Keys */}
        {cms.criticalSlotKeys.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="text-xs text-gray-500 mb-2">Monitored Critical Slots:</div>
            <div className="flex flex-wrap gap-2">
              {cms.criticalSlotKeys.map((key) => (
                <span key={key} className="px-2 py-1 text-xs bg-gray-100 rounded font-mono">
                  {key}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Operations Automation Status */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Automation vs Manual
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Fully Automated */}
          <div className="rounded-lg p-4 bg-green-50">
            <div className="text-sm font-medium text-green-700 mb-2">Fully Automated</div>
            <div className="text-2xl font-bold text-green-800">{opsStatus.automated}</div>
            <div className="text-xs text-green-600 mt-1">
              Online + Content Ready
            </div>
          </div>

          {/* Manual Attention */}
          <div
            className={`rounded-lg p-4 ${
              opsStatus.manualAttention > 0
                ? 'bg-amber-50 border border-amber-200'
                : 'bg-gray-50'
            }`}
          >
            <div className="text-sm font-medium text-amber-700 mb-2">Manual Attention</div>
            <div
              className={`text-2xl font-bold ${
                opsStatus.manualAttention > 0 ? 'text-amber-800' : 'text-gray-800'
              }`}
            >
              {opsStatus.manualAttention}
            </div>
            <div className="text-xs text-amber-600 mt-1">
              Offline / Empty / Issues
            </div>
          </div>

          {/* Contract Controlled */}
          <div className="rounded-lg p-4 bg-blue-50">
            <div className="text-sm font-medium text-blue-700 mb-2">Contract Controlled</div>
            <div className="text-2xl font-bold text-blue-800">
              {opsStatus.contractControlled}
            </div>
            <div className="text-xs text-blue-600 mt-1">
              Locked by Agreement
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions (if issues exist) */}
      {(channels.offline > 0 || cms.emptyCriticalSlots > 0 || cms.expiredContents > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="font-semibold text-amber-800 mb-3">Recommended Actions</h3>
          <ul className="space-y-2 text-sm text-amber-700">
            {channels.offline > 0 && (
              <li className="flex items-center gap-2">
                <WifiOff className="w-4 h-4" />
                Check {channels.offline} offline channel(s) - may need device restart or network check
              </li>
            )}
            {cms.emptyCriticalSlots > 0 && (
              <li className="flex items-center gap-2">
                <Layers className="w-4 h-4" />
                {cms.emptyCriticalSlots} critical slot(s) need content assignment
              </li>
            )}
            {cms.expiredContents > 0 && (
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Review {cms.expiredContents} expired content item(s)
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
