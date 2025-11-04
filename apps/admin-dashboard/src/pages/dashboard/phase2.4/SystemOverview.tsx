/**
 * System Overview Component (Phase 2.4)
 * Display system metrics: cache hit rate, memory usage, latency, error rate
 */

import React from 'react';
import { useSystemMetrics } from '../../../hooks/api/useDashboard';

export function SystemOverview() {
  const { data: metrics, isLoading, isError, error, dataUpdatedAt } = useSystemMetrics();

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-red-600">
          ❌ Failed to load system metrics: {(error as any)?.message || 'Unknown error'}
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-gray-500">No system metrics available</div>
      </div>
    );
  }

  const { cache, api } = metrics;

  // Helper to render gauge
  const renderGauge = (value: number, max: number = 100, label: string, color: string) => {
    const percentage = Math.min((value / max) * 100, 100);
    const colorClass =
      percentage >= 80 ? 'bg-red-500' : percentage >= 60 ? 'bg-yellow-500' : 'bg-green-500';

    return (
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium">{label}</span>
          <span className="text-gray-600">
            {value.toFixed(1)}
            {max === 100 ? '%' : 'MB'}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-300 ${color || colorClass}`}
            style={{ width: `${percentage}%` }}
            aria-label={`${label}: ${value}/${max}`}
          ></div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">System Overview</h2>
        <div className="text-xs text-gray-500">
          Updated: {new Date(dataUpdatedAt).toLocaleTimeString()}
        </div>
      </div>

      {/* Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Cache Hit Rate */}
        <div className="border rounded-lg p-4">
          {renderGauge(cache.hitRate * 100, 100, 'Cache Hit Rate', 'bg-blue-500')}
          <div className="mt-3 text-xs text-gray-600 space-y-1">
            <div>L1 (Memory): {(cache.l1HitRate * 100).toFixed(1)}%</div>
            <div>L2 (Redis): {(cache.l2HitRate * 100).toFixed(1)}%</div>
            <div>Circuit Breaker: <span className={`font-medium ${cache.circuitBreakerState === 'CLOSED' ? 'text-green-600' : 'text-red-600'}`}>{cache.circuitBreakerState}</span></div>
          </div>
        </div>

        {/* Memory Usage */}
        <div className="border rounded-lg p-4">
          {renderGauge(api.memory.percentage, 100, 'Memory Usage', '')}
          <div className="mt-3 text-xs text-gray-600 space-y-1">
            <div>Used: {api.memory.used} MB</div>
            <div>Total: {api.memory.total} MB</div>
            <div>Available: {api.memory.total - api.memory.used} MB</div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Cache Errors */}
        <div className="border rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Cache Errors</div>
          <div className={`text-3xl font-bold ${cache.errors > 10 ? 'text-red-600' : 'text-green-600'}`}>
            {cache.errors}
          </div>
          <div className="text-xs text-gray-500 mt-1">Total errors</div>
        </div>

        {/* System Uptime */}
        <div className="border rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Uptime</div>
          <div className="text-3xl font-bold text-blue-600">
            {Math.floor(api.uptime / 3600)}h
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {Math.floor((api.uptime % 3600) / 60)}m {Math.floor(api.uptime % 60)}s
          </div>
        </div>
      </div>

      {/* Health Indicator */}
      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-sm">
        <div className="flex items-center gap-2">
          <span className="text-green-600 font-medium">✓ System Healthy</span>
          <span className="text-gray-600">
            Cache: {cache.memorySize} items • Uptime: {Math.floor(api.uptime / 3600)}h
          </span>
        </div>
      </div>
    </div>
  );
}
