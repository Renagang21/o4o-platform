/**
 * Settlement Summary Cards Component
 * Phase SETTLE-UI: Summary cards for settlement dashboard
 */

import React from 'react';
import { DollarSign, CheckCircle, FileText } from 'lucide-react';
import type { SettlementSummary } from '../types/settlement';

interface SettlementSummaryCardsProps {
  settlements: SettlementSummary[];
  loading?: boolean;
}

export const SettlementSummaryCards: React.FC<SettlementSummaryCardsProps> = ({
  settlements,
  loading = false,
}) => {
  // Calculate metrics
  const calculateMetrics = () => {
    // 1. Unpaid amount (status = pending or processing)
    const unpaidAmount = settlements
      .filter((s) => s.status === 'pending' || s.status === 'processing')
      .reduce((sum, s) => {
        const amount = parseFloat(s.payableAmount || s.net_payout_amount?.toString() || '0');
        return sum + amount;
      }, 0);

    // 2. Recent 3 months paid amount (status = paid, within last 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const recentPaidAmount = settlements
      .filter((s) => {
        if (s.status !== 'paid') return false;
        const paidDate = new Date(s.paidAt || s.paid_at || s.updatedAt || s.updated_at || '');
        return paidDate >= threeMonthsAgo;
      })
      .reduce((sum, s) => {
        const amount = parseFloat(s.payableAmount || s.net_payout_amount?.toString() || '0');
        return sum + amount;
      }, 0);

    // 3. Settlement count (total filtered settlements)
    const settlementCount = settlements.length;

    return {
      unpaidAmount,
      recentPaidAmount,
      settlementCount,
    };
  };

  const { unpaidAmount, recentPaidAmount, settlementCount } = calculateMetrics();

  // Format currency
  const formatCurrency = (amount: number): string => {
    return `₩ ${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Card 1: Unpaid Amount */}
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-600">미지급 정산액</h3>
          <DollarSign className="w-5 h-5 text-orange-500" />
        </div>
        <p className="text-2xl font-bold text-gray-900">{formatCurrency(unpaidAmount)}</p>
        <p className="text-xs text-gray-500 mt-1">
          대기 중 + 처리 중 정산 합계
        </p>
      </div>

      {/* Card 2: Recent 3 Months Paid Amount */}
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-600">최근 3개월 지급 완료</h3>
          <CheckCircle className="w-5 h-5 text-green-500" />
        </div>
        <p className="text-2xl font-bold text-gray-900">{formatCurrency(recentPaidAmount)}</p>
        <p className="text-xs text-gray-500 mt-1">
          최근 3개월 지급 완료 정산 합계
        </p>
      </div>

      {/* Card 3: Settlement Count */}
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-600">정산 건수</h3>
          <FileText className="w-5 h-5 text-blue-500" />
        </div>
        <p className="text-2xl font-bold text-gray-900">{settlementCount.toLocaleString()}건</p>
        <p className="text-xs text-gray-500 mt-1">
          현재 필터 조건 기준
        </p>
      </div>
    </div>
  );
};

export default SettlementSummaryCards;
