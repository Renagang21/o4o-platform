import React from 'react';
import { useSettlementSummary } from '../../hooks/useSettlements';

/**
 * Settlement Summary Cards Component
 * Displays settlement statistics in card format
 */
export const SettlementSummaryCards: React.FC = () => {
  const { data, isLoading, error } = useSettlementSummary();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg p-6 border border-gray-200 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
            <div className="h-8 bg-gray-300 rounded w-32"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p className="text-red-800 text-sm">정산 요약 정보를 불러오는데 실패했습니다.</p>
      </div>
    );
  }

  const summary = data?.data;

  if (!summary) {
    return null;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: summary.currency || 'KRW',
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total Earnings */}
      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-green-700">총 정산 수익</p>
            <p className="text-2xl font-bold text-green-900">{formatCurrency(summary.totalEarnings)}</p>
            <p className="text-xs text-green-600 mt-1">{summary.completedCount}건 완료</p>
          </div>
          <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>

      {/* Pending Amount */}
      <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-6 border border-yellow-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-yellow-700">대기 중 금액</p>
            <p className="text-2xl font-bold text-yellow-900">{formatCurrency(summary.pendingAmount)}</p>
            <p className="text-xs text-yellow-600 mt-1">{summary.pendingCount}건 대기</p>
          </div>
          <svg className="h-10 w-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>

      {/* Processing Amount */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-700">처리 중 금액</p>
            <p className="text-2xl font-bold text-blue-900">{formatCurrency(summary.processingAmount)}</p>
            <p className="text-xs text-blue-600 mt-1">{summary.processingCount}건 처리중</p>
          </div>
          <svg className="h-10 w-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
      </div>

      {/* Next Settlement */}
      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-purple-700">다음 정산</p>
            {summary.nextScheduledSettlement ? (
              <>
                <p className="text-2xl font-bold text-purple-900">{formatCurrency(summary.nextScheduledSettlement.amount)}</p>
                <p className="text-xs text-purple-600 mt-1">
                  {new Date(summary.nextScheduledSettlement.scheduledAt).toLocaleDateString('ko-KR')}
                </p>
              </>
            ) : (
              <>
                <p className="text-xl font-bold text-purple-900">예정 없음</p>
                <p className="text-xs text-purple-600 mt-1">정산 예정 없음</p>
              </>
            )}
          </div>
          <svg className="h-10 w-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      </div>
    </div>
  );
};
