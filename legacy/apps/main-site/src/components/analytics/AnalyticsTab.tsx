/**
 * Analytics Tab Component
 * Phase 7: Complete analytics view with KPIs and charts
 */

import React, { useState } from 'react';
import { useAnalyticsSummary, useAnalyticsTimeseries, useAnalyticsFunnel } from '../../hooks/useAnalytics';
import { AnalyticsKPICards } from './AnalyticsKPICards';
import { CommissionTrendChart } from './CommissionTrendChart';
import { ConversionFunnelChart } from './ConversionFunnelChart';

export const AnalyticsTab: React.FC = () => {
  const [dateRange, setDateRange] = useState<'last_7d' | 'last_30d' | 'last_90d'>('last_30d');

  // Calculate date range for timeseries/funnel
  const getDateRange = () => {
    const now = new Date();
    const end = now.toISOString();
    let start: string;

    switch (dateRange) {
      case 'last_7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case 'last_90d':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case 'last_30d':
      default:
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        break;
    }

    return { start, end };
  };

  const { start, end } = getDateRange();

  // Fetch data using React Query hooks
  const summaryQuery = useAnalyticsSummary({ range: dateRange });
  const timeseriesQuery = useAnalyticsTimeseries({
    metric: 'commission',
    interval: 'day',
    from: start,
    to: end
  });
  const funnelQuery = useAnalyticsFunnel({
    from: start,
    to: end
  });

  return (
    <div className="space-y-6">
      {/* Header with date range selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">분석 대시보드</h2>
          <p className="text-gray-600 mt-1">파트너 성과 및 수익 분석</p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">기간:</label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="last_7d">최근 7일</option>
            <option value="last_30d">최근 30일</option>
            <option value="last_90d">최근 90일</option>
          </select>
        </div>
      </div>

      {/* Error handling */}
      {(summaryQuery.error || timeseriesQuery.error || funnelQuery.error) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">분석 데이터를 불러오는데 실패했습니다</span>
          </div>
          <p className="text-sm text-red-700 mt-1">
            {summaryQuery.error?.message || timeseriesQuery.error?.message || funnelQuery.error?.message || '알 수 없는 오류'}
          </p>
        </div>
      )}

      {/* KPI Cards */}
      <AnalyticsKPICards
        data={summaryQuery.data?.data}
        loading={summaryQuery.isLoading}
      />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Commission Trend Chart */}
        <CommissionTrendChart
          data={timeseriesQuery.data?.data}
          loading={timeseriesQuery.isLoading}
        />

        {/* Conversion Funnel Chart */}
        <ConversionFunnelChart
          data={funnelQuery.data?.data}
          loading={funnelQuery.isLoading}
        />
      </div>

      {/* Additional Metrics */}
      {summaryQuery.data?.data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <p className="text-sm text-gray-600 mb-2">전환율 (CVR)</p>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {summaryQuery.data.data.metrics.cvr.value}%
            </p>
            <p className="text-xs text-gray-500">
              클릭 대비 전환 비율
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <p className="text-sm text-gray-600 mb-2">평균 주문 금액 (AOV)</p>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              ₩{summaryQuery.data.data.metrics.aov.value.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">
              전환당 평균 주문 금액
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <p className="text-sm text-gray-600 mb-2">재구매 비율</p>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {summaryQuery.data.data.metrics.returningRatio.value}%
            </p>
            <p className="text-xs text-gray-500">
              {summaryQuery.data.data.metrics.returningRatio.breakdown.returning}명 / {summaryQuery.data.data.metrics.returningRatio.breakdown.total}명
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
