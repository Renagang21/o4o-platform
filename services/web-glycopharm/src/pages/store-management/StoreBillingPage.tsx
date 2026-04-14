/**
 * StoreBillingPage - 정산/인보이스
 * WO-STORE-BILLING-FOUNDATION-V1
 *
 * 공통 UI 프레임:
 * [1] KPI 3블록 (이번 달 매출 / 예상 수수료 / 정산 예정)
 * [2] 최근 정산 내역
 *
 * GlycoPharm 수수료율: 5%
 * Orders API에서 monthlyRevenue 계산
 */

import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { pharmacyApi } from '@/api/pharmacy';

const COMMISSION_RATE = 0.05; // 5%

interface BillingSummary {
  monthlyRevenue: number;
  commissionRate: number;
  commissionAmount: number;
  payoutAmount: number;
}

/** mock 정산 내역 — 실 정산 API 연동 전 */
const MOCK_HISTORY = [
  { period: '2026-02', status: '정산 예정' as const },
  { period: '2026-01', status: '정산 예정' as const },
];

export default function StoreBillingPage() {
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadBilling = useCallback(async () => {
    setLoading(true);
    try {
      const res = await pharmacyApi.getOrders({ status: 'delivered', pageSize: 100 });
      const deliveredOrders = res.success && res.data ? res.data.items : [];

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyRevenue = deliveredOrders
        .filter(o => new Date(o.createdAt) >= monthStart)
        .reduce((sum, o) => sum + o.totalAmount, 0);

      const commissionAmount = Math.round(monthlyRevenue * COMMISSION_RATE);
      const payoutAmount = monthlyRevenue - commissionAmount;

      setSummary({
        monthlyRevenue,
        commissionRate: COMMISSION_RATE,
        commissionAmount,
        payoutAmount,
      });
    } catch {
      setSummary({
        monthlyRevenue: 0,
        commissionRate: COMMISSION_RATE,
        commissionAmount: 0,
        payoutAmount: 0,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBilling();
  }, [loadBilling]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">정산/인보이스</h1>
        <p className="text-slate-500 text-sm">매출 정산 현황과 내역을 확인합니다</p>
      </div>

      {/* [1] KPI 3블록 */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <p className="text-xs font-medium text-slate-500">이번 달 매출</p>
            <p className="mt-1 text-2xl font-bold text-blue-600">
              {summary ? `₩${summary.monthlyRevenue.toLocaleString()}` : '—'}
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <p className="text-xs font-medium text-slate-500">
              예상 수수료 ({(COMMISSION_RATE * 100).toFixed(0)}%)
            </p>
            <p className="mt-1 text-2xl font-bold text-amber-600">
              {summary ? `₩${summary.commissionAmount.toLocaleString()}` : '—'}
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <p className="text-xs font-medium text-slate-500">정산 예정 금액</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">
              {summary ? `₩${summary.payoutAmount.toLocaleString()}` : '—'}
            </p>
          </div>
        </div>
      )}

      {/* [2] 최근 정산 내역 */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-3">정산 내역</h2>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Table Header */}
          <div className="flex px-4 py-2.5 border-b border-slate-100 bg-slate-50">
            <span className="flex-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">기간</span>
            <span className="flex-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">상태</span>
            <span className="flex-1 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">금액</span>
          </div>
          {/* Rows */}
          {MOCK_HISTORY.map((row) => (
            <div key={row.period} className="flex px-4 py-3 border-b border-slate-50">
              <span className="flex-1 text-sm text-slate-700">{row.period}</span>
              <span className="flex-1">
                <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-amber-50 text-amber-600">
                  {row.status}
                </span>
              </span>
              <span className="flex-1 text-sm text-slate-700 text-right font-semibold">
                {row.period === currentMonth() && summary
                  ? `₩${summary.payoutAmount.toLocaleString()}`
                  : '₩0'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 안내 */}
      <div className="p-4 bg-slate-50 rounded-xl">
        <p className="text-xs text-slate-500 leading-relaxed">
          정산 금액은 완료된 주문의 매출 합계에서 수수료를 차감한 금액입니다.
          실제 정산은 익월 10일 이후 처리됩니다.
        </p>
      </div>
    </div>
  );
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
