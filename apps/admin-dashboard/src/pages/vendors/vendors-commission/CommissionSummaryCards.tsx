/**
 * CommissionSummaryCards — 4 stat cards for commission overview
 *
 * WO-O4O-VENDORS-ADMIN-PAGES-SPLIT-V1
 * Extracted from VendorsCommissionAdmin.tsx (lines 476-514)
 */

import { DollarSign, CheckCircle, Clock, Percent } from 'lucide-react';

interface CommissionSummaryCardsProps {
  summary: {
    total: number;
    paid: number;
    pending: number;
    avgRate: number;
  };
}

export function CommissionSummaryCards({ summary }: CommissionSummaryCardsProps) {
  return (
    <div className="o4o-stats-cards">
      <div className="stats-card">
        <div className="stats-icon bg-blue-100">
          <DollarSign className="w-6 h-6 text-blue-600" />
        </div>
        <div className="stats-content">
          <div className="stats-label">총 수수료</div>
          <div className="stats-value">{'\u20A9'}{summary.total.toLocaleString()}</div>
        </div>
      </div>
      <div className="stats-card">
        <div className="stats-icon bg-green-100">
          <CheckCircle className="w-6 h-6 text-green-600" />
        </div>
        <div className="stats-content">
          <div className="stats-label">지급 완료</div>
          <div className="stats-value text-green-600">{'\u20A9'}{summary.paid.toLocaleString()}</div>
        </div>
      </div>
      <div className="stats-card">
        <div className="stats-icon bg-yellow-100">
          <Clock className="w-6 h-6 text-yellow-600" />
        </div>
        <div className="stats-content">
          <div className="stats-label">미지급</div>
          <div className="stats-value text-yellow-600">{'\u20A9'}{summary.pending.toLocaleString()}</div>
        </div>
      </div>
      <div className="stats-card">
        <div className="stats-icon bg-purple-100">
          <Percent className="w-6 h-6 text-purple-600" />
        </div>
        <div className="stats-content">
          <div className="stats-label">평균 수수료율</div>
          <div className="stats-value">{summary.avgRate.toFixed(1)}%</div>
        </div>
      </div>
    </div>
  );
}
