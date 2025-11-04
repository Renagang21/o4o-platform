/**
 * Commission Stats Component (Phase 2.4)
 * Display 7-day commission trend with LineChart
 */

import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { usePartnerStats } from '../../../hooks/api/useDashboard';

interface CommissionStatsProps {
  partnerId?: string;
}

export function CommissionStats({ partnerId = '' }: CommissionStatsProps) {
  const [selectedPartnerId, setSelectedPartnerId] = useState(partnerId);
  const { data: stats, isLoading, isError, error } = usePartnerStats(selectedPartnerId);

  if (!selectedPartnerId) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Commission Trends</h2>
        <div className="text-center py-12 text-gray-500">
          <p>Please select a partner to view commission trends</p>
          <input
            type="text"
            placeholder="Enter Partner ID (UUID)"
            className="mt-4 border rounded px-3 py-2 w-full max-w-md"
            onChange={(e) => setSelectedPartnerId(e.target.value)}
          />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Commission Trends</h2>
        <div className="text-red-600">
          ❌ Failed to load commission stats: {(error as any)?.message || 'Unknown error'}
        </div>
      </div>
    );
  }

  if (!stats || !stats.trend || stats.trend.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Commission Trends</h2>
        <div className="text-center py-12 text-gray-500">
          <p>No commission data available for this partner</p>
        </div>
      </div>
    );
  }

  const { partner, commissions, revenue, trend } = stats;

  // Format data for chart
  const chartData = trend.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    amount: item.amount,
    count: item.count,
  }));

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Commission Trends</h2>
        <div className="text-sm">
          <span className="text-gray-600">Partner:</span>
          <span className="ml-2 font-medium">{partner.userId}</span>
          <span className={`ml-2 px-2 py-1 rounded text-xs ${
            partner.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {partner.status}
          </span>
          <span className="ml-2 px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
            {partner.tier}
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="border rounded-lg p-3">
          <div className="text-sm text-gray-600">Total Commissions</div>
          <div className="text-2xl font-bold">{commissions.total}</div>
          <div className="text-xs text-gray-500">Confirmation: {commissions.confirmationRate}</div>
        </div>
        <div className="border rounded-lg p-3">
          <div className="text-sm text-gray-600">Total Revenue</div>
          <div className="text-2xl font-bold">
            {Number(revenue.total).toLocaleString()} <span className="text-sm text-gray-600">{revenue.currency}</span>
          </div>
        </div>
        <div className="border rounded-lg p-3">
          <div className="text-sm text-gray-600">Last 7 Days</div>
          <div className="text-2xl font-bold text-blue-600">
            {Number(revenue.last7Days).toLocaleString()} <span className="text-sm text-gray-600">{revenue.currency}</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" style={{ fontSize: '12px' }} />
            <YAxis yAxisId="left" style={{ fontSize: '12px' }} />
            <YAxis yAxisId="right" orientation="right" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="amount"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Amount (KRW)"
              dot={{ r: 4 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="count"
              stroke="#10b981"
              strokeWidth={2}
              name="Count"
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Note */}
      <div className="mt-4 text-xs text-gray-500 text-center">
        Showing 7-day commission trend • Data refreshes every 60 seconds
      </div>
    </div>
  );
}
