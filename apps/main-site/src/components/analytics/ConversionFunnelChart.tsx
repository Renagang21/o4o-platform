/**
 * Conversion Funnel Chart Component
 * Phase 7: Funnel visualization with 4 stages (Clicks → Conversions → Commission → Payment)
 */

import React from 'react';
import type { FunnelResponse } from '../../services/analyticsApi';

interface ConversionFunnelChartProps {
  data: FunnelResponse['data'] | undefined;
  loading: boolean;
}

export const ConversionFunnelChart: React.FC<ConversionFunnelChartProps> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <div className="h-4 bg-gray-200 rounded w-32 mb-4 animate-pulse"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || !data.stages) {
    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">전환 퍼널</h3>
        <div className="flex items-center justify-center h-64 text-gray-400">
          <div className="text-center">
            <svg className="h-12 w-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-sm">데이터가 없습니다</p>
          </div>
        </div>
      </div>
    );
  }

  const { stages } = data;
  const maxValue = stages[0]?.value || 1;

  // Color scheme for each stage
  const colors = [
    { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-700', bar: 'bg-blue-500' },
    { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-700', bar: 'bg-green-500' },
    { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-700', bar: 'bg-purple-500' },
    { bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-700', bar: 'bg-yellow-500' }
  ];

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">전환 퍼널</h3>

      <div className="space-y-3">
        {stages.map((stage, index) => {
          const widthPercent = maxValue > 0 ? (stage.value / maxValue) * 100 : 0;
          const colorScheme = colors[index % colors.length];

          return (
            <div key={stage.name} className="relative">
              {/* Funnel Bar */}
              <div
                className={`${colorScheme.bg} ${colorScheme.border} border rounded-lg p-4 transition-all hover:shadow-md`}
                style={{ width: `${Math.max(widthPercent, 15)}%` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm font-medium ${colorScheme.text}`}>
                        {stage.label}
                      </span>
                      <span className="text-xs text-gray-500">
                        {stage.rate.toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {stage.value.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Dropoff indicator (except for first stage) */}
              {index > 0 && stage.dropoff !== undefined && (
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-red-50 text-red-600 text-xs px-2 py-1 rounded border border-red-200">
                  -{stage.dropoff.toLocaleString()} ({stage.dropoffRate?.toFixed(1)}% 이탈)
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-gray-200 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-500 mb-1">전환율 (CVR)</p>
          <p className="text-lg font-semibold text-gray-900">
            {stages[1]?.rate.toFixed(2)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">확정 커미션</p>
          <p className="text-lg font-semibold text-gray-900">
            ₩{data.totals.confirmedCommission.amount.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">정산 완료</p>
          <p className="text-lg font-semibold text-gray-900">
            ₩{data.totals.paid.amount.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">정산 비율</p>
          <p className="text-lg font-semibold text-gray-900">
            {stages[3] && data.totals.confirmedCommission.count > 0
              ? ((data.totals.paid.count / data.totals.confirmedCommission.count) * 100).toFixed(1)
              : '0.0'}%
          </p>
        </div>
      </div>
    </div>
  );
};
