/**
 * KCosmeticsOperatorDashboard — 5-Block 통합 Operator 대시보드
 *
 * WO-O4O-OPERATOR-UX-K-COSMETICS-PILOT-V1:
 *   @o4o/operator-ux-core 기반 5-Block 구조로 전환.
 *   기존 API 데이터(OperatorDashboardSummary)를 OperatorDashboardConfig로 변환.
 *
 * WO-O4O-OPERATOR-COSMETICS-MIGRATION-V1:
 *   Config builder를 operatorConfig.ts로 분리.
 *   Dashboard 컴포넌트는 fetch + state + render만 담당.
 *
 * Block 구조:
 *  [1] KPI Grid       — 핵심 수치 (매장, 주문, 매출, 신규가입)
 *  [2] AI Summary     — 운영 인사이트 (상태 기반)
 *  [3] Action Queue   — 즉시 처리 항목
 *  [4] Activity Log   — 최근 주문/입점신청
 *  [5] Quick Actions  — 빠른 작업 카드
 */

import { useState, useEffect, useCallback } from 'react';
import { OperatorDashboardLayout, type OperatorDashboardConfig } from '@o4o/operator-ux-core';
import { operatorApi } from '@/services/operatorApi';
import { buildKCosmeticsOperatorConfig } from './operatorConfig';

export default function KCosmeticsOperatorDashboard() {
  const [config, setConfig] = useState<OperatorDashboardConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await operatorApi.getDashboardSummary();
      if (data) {
        setConfig(buildKCosmeticsOperatorConfig(data));
      } else {
        setError('데이터를 불러올 수 없습니다.');
      }
    } catch (err) {
      console.error('Failed to fetch operator dashboard:', err);
      setError('데이터를 불러오지 못했습니다.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600" />
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 mb-4">{error || '데이터를 불러올 수 없습니다.'}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium text-slate-700 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return <OperatorDashboardLayout config={config} />;
}
