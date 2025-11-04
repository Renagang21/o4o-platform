/**
 * Webhook Status Component (Phase 2.4)
 * Display webhook success rate and failed jobs
 */

import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useOperationsStats, useWebhookRetry } from '../../../hooks/api/useDashboard';

const COLORS = {
  success: '#10b981', // green-500
  failed: '#ef4444', // red-500
};

export function WebhookStatus() {
  const { data: operations, isLoading, isError, error } = useOperationsStats();
  const retryMutation = useWebhookRetry();
  const [showFailedModal, setShowFailedModal] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState('');

  const handleRetry = async (jobId: string) => {
    if (!jobId) {
      alert('Please enter a webhook job ID');
      return;
    }

    try {
      await retryMutation.mutateAsync(jobId);
      alert('Webhook retry triggered successfully!');
      setSelectedJobId('');
    } catch (error: any) {
      alert(`Failed to retry webhook: ${error.response?.data?.message || error.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-48 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-red-600">
          ❌ Failed to load webhook status: {(error as any)?.message || 'Unknown error'}
        </div>
      </div>
    );
  }

  if (!operations) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-gray-500">No webhook data available</div>
      </div>
    );
  }

  const { webhooks } = operations;

  // Prepare chart data
  const chartData = [
    { name: 'Successful', value: webhooks.successful },
    { name: 'Failed', value: webhooks.failed },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Webhook Status</h2>
        <div className={`px-3 py-1 rounded text-sm font-medium ${
          parseFloat(webhooks.successRate) >= 95
            ? 'bg-green-100 text-green-800'
            : parseFloat(webhooks.successRate) >= 80
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {webhooks.successRate} Success Rate
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="border rounded-lg p-3 text-center">
          <div className="text-sm text-gray-600">Total</div>
          <div className="text-2xl font-bold">{webhooks.total}</div>
        </div>
        <div className="border rounded-lg p-3 text-center bg-green-50">
          <div className="text-sm text-gray-600">Successful</div>
          <div className="text-2xl font-bold text-green-600">{webhooks.successful}</div>
        </div>
        <div className="border rounded-lg p-3 text-center bg-red-50">
          <div className="text-sm text-gray-600">Failed</div>
          <div className="text-2xl font-bold text-red-600">{webhooks.failed}</div>
        </div>
      </div>

      {/* Donut Chart */}
      {webhooks.total > 0 ? (
        <div className="h-48 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? COLORS.success : COLORS.failed} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          No webhook data available
        </div>
      )}

      {/* Manual Retry Section */}
      <div className="border-t pt-4">
        <label className="block text-sm font-medium mb-2">Manual Webhook Retry</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            placeholder="Enter Webhook Job ID"
            className="flex-1 border rounded px-3 py-2 text-sm"
            disabled={retryMutation.isPending}
          />
          <button
            onClick={() => handleRetry(selectedJobId)}
            disabled={retryMutation.isPending || !selectedJobId}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
          >
            {retryMutation.isPending ? 'Retrying...' : 'Retry'}
          </button>
        </div>

        {retryMutation.isSuccess && (
          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800">
            ✅ Webhook retry enqueued successfully!
          </div>
        )}

        {retryMutation.isError && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
            ❌ {(retryMutation.error as any)?.response?.data?.message || 'Failed to retry webhook'}
          </div>
        )}
      </div>

      {/* Avg Response Time */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-700">Avg Response Time</span>
          <span className="font-bold text-blue-600">{webhooks.avgResponseTime}ms</span>
        </div>
      </div>
    </div>
  );
}
