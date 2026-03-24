/**
 * AdminDashboardPage — 4-Block 통합 Admin 대시보드
 *
 * WO-O4O-LEGACY-ADMIN-DASHBOARD-SUNSET-V1:
 *   /operator/dashboard 5-Block 데이터를 4-Block AdminDashboardConfig로 변환.
 *   Legacy admin/dashboard/summary 엔드포인트 제거 후 전환.
 *
 * Block 구조:
 *  [A] Structure Snapshot — KPIs → StructureMetrics 변환
 *  [B] Policy Overview   — ActionQueue → PolicyItems 변환
 *  [C] Governance Alerts  — AiSummary → GovernanceAlerts 변환
 *  [D] Structure Actions  — QuickActions → StructureActions 변환
 *
 * API: dashboardApi.getOperatorDashboard()
 */

import { useState, useEffect, useCallback } from 'react';
import {
  AdminDashboardLayout,
  type AdminDashboardConfig,
  type StructureMetric,
  type PolicyItem,
  type GovernanceAlert,
  type StructureAction,
} from '@o4o/admin-ux-core';
import { dashboardApi, type OperatorDashboardData } from '../../lib/api';

// ─── 5-Block → 4-Block Transformer ───
// WO-O4O-OPERATOR-UI-UNIFICATION-V1: 통합 레이아웃으로 링크 변환 불필요

function buildAdminConfig(data: OperatorDashboardData): AdminDashboardConfig {
  // Block A: KPIs → Structure Metrics
  const structureMetrics: StructureMetric[] = data.kpis.map((kpi) => ({
    key: kpi.key,
    label: kpi.label,
    value: kpi.value,
    status: kpi.status === 'warning' ? 'attention' as const
      : kpi.status === 'critical' ? 'critical' as const
      : 'stable' as const,
  }));

  // Block B: ActionQueue → Policies (링크를 admin 경로로 변환)
  const policies: PolicyItem[] = data.actionQueue.map((action) => ({
    key: action.id,
    label: action.label,
    status: action.count > 0 ? 'partial' as const : 'configured' as const,
    link: action.link,
  }));

  // Block C: AiSummary → Governance Alerts (링크를 admin 경로로 변환)
  const governanceAlerts: GovernanceAlert[] = (data.aiSummary ?? []).map((item) => ({
    id: item.id,
    message: item.message,
    level: item.level as 'info' | 'warning' | 'critical',
    link: item.link,
  }));

  // Block D: QuickActions → Structure Actions (링크를 admin 경로로 변환)
  const structureActions: StructureAction[] = data.quickActions.map((action) => ({
    id: action.id,
    label: action.label,
    link: action.link!,
    icon: action.icon,
  }));

  return { structureMetrics, policies, governanceAlerts, structureActions };
}

// ─── Component ───

export default function AdminDashboardPage() {
  const [config, setConfig] = useState<AdminDashboardConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dashboardApi.getOperatorDashboard();
      if (data) setConfig(buildAdminConfig(data));
    } catch (err) {
      console.error('Failed to fetch admin dashboard:', err);
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

  return <AdminDashboardLayout config={config} />;
}
