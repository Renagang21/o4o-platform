/**
 * NetureOperatorDashboard — 5-Block Unified Operator Dashboard
 *
 * WO-O4O-OPERATOR-API-ARCHITECTURE-UNIFICATION-V1 (Phase 5)
 *
 * Converted from 9-block Copilot layout to @o4o/operator-ux-core 5-Block standard.
 * Single API call to /api/v1/neture/operator/dashboard returns all data.
 *
 * Block 구조:
 *  [1] KPI Grid       — 활성 약국, 공급사, 상품, 주문, 매출, 콘텐츠
 *  [2] AI Summary     — 상태 기반 인사이트 (승인 대기 등)
 *  [3] Action Queue   — 즉시 처리 항목
 *  [4] Activity Log   — 최근 주문/활동
 *  [5] Quick Actions   — 주요 기능 바로가기
 */

import { useState, useEffect, useCallback } from 'react';
import { OperatorDashboardLayout, type OperatorDashboardConfig } from '@o4o/operator-ux-core';
import { fetchOperatorDashboard } from '../../lib/api/operatorDashboard';
import { buildNetureOperatorConfig } from './operatorConfig';

export default function NetureOperatorDashboard() {
  const [config, setConfig] = useState<OperatorDashboardConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOperatorDashboard();
      if (!data) {
        setError('운영자 권한이 필요하거나 데이터를 불러올 수 없습니다.');
      } else {
        setConfig(buildNetureOperatorConfig(data));
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
