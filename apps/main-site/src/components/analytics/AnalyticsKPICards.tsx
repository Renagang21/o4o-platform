/**
 * Analytics KPI Cards Component
 * Phase 7: Displays 4 main KPI metrics
 */

import React from 'react';
import type { AnalyticsSummaryResponse } from '../../services/analyticsApi';

interface AnalyticsKPICardsProps {
  data: AnalyticsSummaryResponse['data'] | undefined;
  loading: boolean;
}

export const AnalyticsKPICards: React.FC<AnalyticsKPICardsProps> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg p-6 border border-gray-200 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
            <div className="h-8 bg-gray-300 rounded w-32 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-20"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { metrics } = data;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Clicks Card */}
      <div className="bg-white rounded-lg p-6 border border-gray-200 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-600">클릭 수</p>
          <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
        </div>
        <p className="text-2xl font-bold text-gray-900 mb-1">
          {metrics.clicks.value.toLocaleString()}
        </p>
        <div className="flex items-center text-xs">
          {metrics.clicks.changeType === 'increase' ? (
            <svg className="h-3 w-3 text-green-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          ) : metrics.clicks.changeType === 'decrease' ? (
            <svg className="h-3 w-3 text-red-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          ) : null}
          <span className={
            metrics.clicks.changeType === 'increase' ? 'text-green-600' :
            metrics.clicks.changeType === 'decrease' ? 'text-red-600' :
            'text-gray-600'
          }>
            {metrics.clicks.change >= 0 ? '+' : ''}{metrics.clicks.change.toFixed(1)}%
          </span>
          <span className="text-gray-500 ml-1">vs 이전 기간</span>
        </div>
      </div>

      {/* Conversions Card */}
      <div className="bg-white rounded-lg p-6 border border-gray-200 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-600">전환 수</p>
          <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <p className="text-2xl font-bold text-gray-900 mb-1">
          {metrics.conversions.value.toLocaleString()}
        </p>
        <div className="flex items-center text-xs">
          {metrics.conversions.changeType === 'increase' ? (
            <svg className="h-3 w-3 text-green-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          ) : metrics.conversions.changeType === 'decrease' ? (
            <svg className="h-3 w-3 text-red-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          ) : null}
          <span className={
            metrics.conversions.changeType === 'increase' ? 'text-green-600' :
            metrics.conversions.changeType === 'decrease' ? 'text-red-600' :
            'text-gray-600'
          }>
            {metrics.conversions.change >= 0 ? '+' : ''}{metrics.conversions.change.toFixed(1)}%
          </span>
          <span className="text-gray-500 ml-1">vs 이전 기간</span>
        </div>
      </div>

      {/* EPC Card */}
      <div className="bg-white rounded-lg p-6 border border-gray-200 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-600">클릭당 수익 (EPC)</p>
          <svg className="h-5 w-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-2xl font-bold text-gray-900 mb-1">
          ₩{metrics.epc.value.toLocaleString()}
        </p>
        <p className="text-xs text-gray-500">
          전체 클릭 대비 확정 커미션
        </p>
      </div>

      {/* Pending Exposure Card */}
      <div className="bg-white rounded-lg p-6 border border-gray-200 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-600">예정 정산</p>
          <svg className="h-5 w-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-2xl font-bold text-gray-900 mb-1">
          ₩{metrics.pendingExposure.value.toLocaleString()}
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>예정: ₩{metrics.pendingExposure.breakdown.scheduled.toLocaleString()}</span>
          <span>•</span>
          <span>처리중: ₩{metrics.pendingExposure.breakdown.processing.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};
