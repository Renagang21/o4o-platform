/**
 * Batch Job Panel (Phase 2.4)
 * Manual batch job trigger and monitoring
 */

import React, { useState } from 'react';
import { useBatchJobTrigger, useOperationsStats } from '../../../hooks/api/useDashboard';

export function BatchJobPanel() {
  const { data: operations, isLoading } = useOperationsStats();
  const triggerMutation = useBatchJobTrigger();
  const [selectedJobType, setSelectedJobType] = useState('commission-auto-confirm');

  const handleTrigger = async () => {
    if (!selectedJobType) return;

    try {
      await triggerMutation.mutateAsync(selectedJobType);
      alert('Batch job triggered successfully!');
    } catch (error: any) {
      alert(`Failed to trigger batch job: ${error.response?.data?.message || error.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">Batch Job Control Panel</h2>

      {/* Batch Job Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="border rounded p-4">
          <div className="text-sm text-gray-600">Total Runs</div>
          <div className="text-2xl font-bold">{operations?.batchJobs.totalRuns || 0}</div>
        </div>
        <div className="border rounded p-4">
          <div className="text-sm text-gray-600">Items Processed</div>
          <div className="text-2xl font-bold">{operations?.batchJobs.itemsProcessed || 0}</div>
        </div>
      </div>

      {/* Last Run Info */}
      <div className="mb-6">
        <div className="text-sm text-gray-600">Last Run</div>
        <div className="text-sm font-medium">
          {operations?.batchJobs.lastRunAt
            ? new Date(operations.batchJobs.lastRunAt).toLocaleString()
            : 'Never'}
        </div>
        <div className="text-sm text-gray-600 mt-2">Next Scheduled</div>
        <div className="text-sm font-medium">
          {operations?.batchJobs.nextScheduledAt
            ? new Date(operations.batchJobs.nextScheduledAt).toLocaleString()
            : 'Daily at 02:00'}
        </div>
      </div>

      {/* Manual Trigger */}
      <div className="border-t pt-4">
        <label className="block text-sm font-medium mb-2">Manual Trigger</label>
        <select
          value={selectedJobType}
          onChange={(e) => setSelectedJobType(e.target.value)}
          className="border rounded px-3 py-2 mb-3 w-full"
          disabled={triggerMutation.isPending}
        >
          <option value="commission-auto-confirm">Commission Auto-Confirm</option>
        </select>

        <button
          onClick={handleTrigger}
          disabled={triggerMutation.isPending}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed w-full"
        >
          {triggerMutation.isPending ? 'Triggering...' : 'Trigger Batch Job Now'}
        </button>

        {triggerMutation.isSuccess && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
            ✅ Batch job triggered successfully!
          </div>
        )}

        {triggerMutation.isError && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
            ❌ {(triggerMutation.error as any)?.response?.data?.message || 'Failed to trigger job'}
          </div>
        )}
      </div>

      {/* Warning */}
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
        ⚠️ Manual trigger will process all pending commissions immediately. Use with caution.
      </div>
    </div>
  );
}
