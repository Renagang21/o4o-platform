/**
 * Phase 2.4 – Operations Dashboard
 * Main page integrating all monitoring components
 */

import React, { useState } from 'react';
import { SystemOverview } from './SystemOverview';
import { CommissionStats } from './CommissionStats';
import { WebhookStatus } from './WebhookStatus';
import { BatchJobPanel } from './BatchJobPanel';
import { PartnerStats } from './PartnerStats';

export default function OperationsDashboard() {
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [showCommissionStats, setShowCommissionStats] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Operations Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Real-time monitoring of system performance, webhooks, batch jobs, and partner analytics
        </p>
      </div>

      {/* Grid Layout: 2×2 for main components */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Left: System Overview */}
        <div>
          <SystemOverview />
        </div>

        {/* Top Right: Webhook Status */}
        <div>
          <WebhookStatus />
        </div>

        {/* Bottom Left: Batch Job Panel */}
        <div>
          <BatchJobPanel />
        </div>

        {/* Bottom Right: Commission Stats or Partner Selector */}
        <div>
          {showCommissionStats ? (
            <CommissionStats partnerId={selectedPartnerId} />
          ) : (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Commission Trends</h2>
              <div className="text-center py-12 text-gray-500">
                <p className="mb-4">Select a partner to view commission trends</p>
                <input
                  type="text"
                  placeholder="Enter Partner ID (UUID)"
                  className="border rounded px-3 py-2 w-full max-w-md mb-3"
                  value={selectedPartnerId}
                  onChange={(e) => setSelectedPartnerId(e.target.value)}
                />
                <button
                  onClick={() => {
                    if (selectedPartnerId.trim()) {
                      setShowCommissionStats(true);
                    } else {
                      alert('Please enter a valid Partner ID');
                    }
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                  disabled={!selectedPartnerId.trim()}
                >
                  Load Commission Stats
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Full-width section: Partner Stats Table */}
      <div className="mb-6">
        <PartnerStats />
      </div>

      {/* Footer info */}
      <div className="bg-white rounded-lg shadow p-4 text-center text-xs text-gray-500">
        <p>
          🔄 Data auto-refreshes every 60 seconds • Cache TTL: 60s • Last deployed:{' '}
          {new Date().toLocaleString()}
        </p>
        <p className="mt-1">
          Phase 2.4 – Operations Dashboard • Built with React Query + Recharts
        </p>
      </div>
    </div>
  );
}
