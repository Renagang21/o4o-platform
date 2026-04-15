/**
 * GlycoPharmOperatorDashboard — 운영자 대시보드
 *
 * WO-GLYCOPHARM-OPERATOR-DASHBOARD-5BLOCK-V1:
 *   KPA 표준 5-Block 구조 정렬.
 *   OperatorDashboardLayout 사용, BusinessBlock 제거.
 *
 * Block 구조:
 *  [1] KPI Grid          — 핵심 지표 (약국·상품·환자·케어)
 *  [2] AI Summary        — CopilotEngine 인사이트
 *  [3] Action Queue      — 즉시 처리 항목
 *  [4] Activity Log      — 최근 활동 타임라인
 *  [5] Quick Actions     — 주요 기능 바로가기
 */

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import {
  OperatorDashboardLayout,
  type OperatorDashboardConfig,
} from '@o4o/operator-ux-core';
import { fetchOperatorDashboard } from '../../api/operatorDashboard';
import { buildGlycoPharmOperatorConfig } from './operatorConfig';
import OperatorAlerts from '../../components/OperatorAlerts';

// ─── Types ──────────────────────────────────────────────────

interface AlertItem {
  id: string;
  type: 'network' | 'commerce' | 'care' | 'system';
  level: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
}

// ─── Main Component ─────────────────────────────────────────

export default function GlycoPharmOperatorDashboard() {
  const [config, setConfig] = useState<OperatorDashboardConfig | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
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
        setConfig(buildGlycoPharmOperatorConfig(data));
        setAlerts((data as any).operatorAlerts ?? []);
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
        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
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

  return (
    <div className="space-y-6">
      {/* Operator Alerts (rule-based, above standard 5-Block) */}
      <OperatorAlerts alerts={alerts} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">운영 대시보드</h1>
          <p className="text-sm text-slate-500 mt-1">
            GlycoPharm 운영 실행 — 신청 처리 · 약국·매장 운영 · 콘텐츠 관리
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </button>
      </div>

      {/* Standard 5-Block Layout: KPI → AI Summary → Action Queue → Activity Log → Quick Actions */}
      <OperatorDashboardLayout config={config} />
    </div>
  );
}
