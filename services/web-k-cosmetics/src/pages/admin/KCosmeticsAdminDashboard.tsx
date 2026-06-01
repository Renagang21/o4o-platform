/**
 * KCosmeticsAdminDashboard — Admin 거버넌스·구조 관리 허브
 *
 * WO-O4O-KCOS-ADMIN-DASHBOARD-DEDICATED-V1:
 *   KCosmeticsOperatorDashboard(5-block) 재사용에서 분리.
 *   admin-ux-core 4-block 구조로 K-Cosmetics Admin 전용 뷰 신설.
 *
 * WO-O4O-KCOS-ADMIN-DASHBOARD-LAYOUT-WRAPPER-V1:
 *   admin-ux-core 블록 개별 렌더링 → AdminDashboardLayout wrapper 적용 (Neture/GlycoPharm 정합).
 *   4-Block 표준(A:Snapshot → B:Policy → C:GovernanceAlerts → D:Actions) 구조로 정렬.
 *   누락돼 있던 C(GovernanceAlerts) 블록 채움(현재 데이터 없음 → 빈 배열, "구조 이상 없음").
 *   Governance/Network 섹션은 레이아웃 하단에 유지(공통 추출은 후속 WO).
 *
 * Block 구조:
 *  AdminDashboardLayout: A Structure Snapshot → B Policy Overview → C Governance Alerts → D Structure Actions
 *  [+] Governance/Network — 역할·권한 + 회원·매장 구조 진입점 (레이아웃 외부 유지)
 *
 * API: operatorApi.getDashboardSummary() → Admin 관점으로 재매핑
 */

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Loader2,
  ShieldCheck,
  Store,
  Users,
} from 'lucide-react';
import {
  AdminDashboardLayout,
  AdminLinkBlock,
  type StructureMetric,
  type PolicyItem,
  type StructureAction,
  type AdminDashboardConfig,
  type AdminBlockLink,
} from '@o4o/admin-ux-core';
import { operatorApi } from '@/services/operatorApi';
import type { OperatorDashboardConfig, KpiItem } from '@o4o/operator-ux-core';

// ─── Admin KPI 선택 (Operator와 다른 관점) ──────────────────

const ADMIN_KPI_KEYS = new Set([
  'total-stores',
  'monthly-revenue',
  'active-products',
  'active-orders',
  'cms-published',
]);

function buildStructureMetrics(kpis: KpiItem[]): StructureMetric[] {
  return kpis
    .filter((kpi) => ADMIN_KPI_KEYS.has(kpi.key))
    .map((kpi) => ({
      key: kpi.key,
      label: kpi.label,
      value: kpi.value,
      status:
        kpi.status === 'critical' ? ('critical' as const)
          : kpi.status === 'warning' ? ('attention' as const)
          : ('stable' as const),
    }));
}

// ─── Admin Action Queue (점검·처리 항목) ─────────────────────

function buildAdminPolicies(data: OperatorDashboardConfig): PolicyItem[] {
  const pendingProducts =
    data.actionQueue.find((a) => a.id === 'pending-products')?.count ?? 0;

  return [
    {
      key: 'store-management',
      label: '매장 관리',
      status: 'configured' as const,
      link: '/admin/stores',
    },
    {
      key: 'user-management',
      label: '회원 관리',
      status: 'configured' as const,
      link: '/admin/users',
    },
    {
      key: 'product-approval',
      label: '상품 승인 관리',
      status: pendingProducts > 0 ? ('partial' as const) : ('configured' as const),
      link: '/operator/products?status=PENDING',
    },
    {
      key: 'role-management',
      label: '역할·권한 관리',
      status: 'configured' as const,
      link: '/admin/roles',
    },
    {
      key: 'settings',
      label: '서비스 설정',
      status: 'configured' as const,
      link: '/admin/settings',
    },
  ];
}

// ─── Admin Quick Actions ─────────────────────────────────────

const ADMIN_QUICK_ACTIONS: StructureAction[] = [
  { id: 'users', label: '회원 관리', link: '/admin/users', icon: '👤', description: '회원 조회·관리' },
  { id: 'stores', label: '매장 관리', link: '/admin/stores', icon: '🏪', description: '매장 승인·구조 관리' },
  { id: 'roles', label: '역할 관리', link: '/admin/roles', icon: '🛡️', description: '역할·권한 구조 관리' },
  { id: 'settings', label: '설정', link: '/admin/settings', icon: '⚙️', description: '서비스 정책·설정' },
];

// ─── Admin Block 정의 ─────────────────────────────────────────
// WO-O4O-ADMIN-UX-CORE-ADMIN-BLOCK-EXTRACTION-V1: 로컬 AdminBlock 제거 →
//   공통 AdminLinkBlock(@o4o/admin-ux-core) 사용. icon 은 ReactNode 로 주입.

const ICON_CLS = 'w-4 h-4 text-slate-500';

const GOVERNANCE_LINKS: AdminBlockLink[] = [
  { label: '역할 관리', path: '/admin/roles', icon: <ShieldCheck className={ICON_CLS} />, description: '역할·권한 구조 정의·관리' },
];

const NETWORK_LINKS: AdminBlockLink[] = [
  { label: '매장 관리', path: '/admin/stores', icon: <Store className={ICON_CLS} />, description: '매장 승인·구조 관리' },
  { label: '회원 관리', path: '/admin/users', icon: <Users className={ICON_CLS} />, description: '회원 조회·구조 관리' },
];

// ─── Main Component ──────────────────────────────────────────

export default function KCosmeticsAdminDashboard() {
  const [data, setData] = useState<OperatorDashboardConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // WO-O4O-STORE-DASHBOARD-ORDER-METRICS-SAFE-FALLBACK-V1:
      // operatorApi.getDashboardSummary 가 { config, orderMetricsReady } 로 반환 변경.
      // 본 admin dashboard 는 orderMetricsReady 활용 안 함 (W-future 확장 후보) — config 만 set.
      const result = await operatorApi.getDashboardSummary();
      setData(result.config);
    } catch {
      setError('관리자 권한이 필요하거나 데이터를 불러올 수 없습니다.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !data) {
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

  const adminConfig: AdminDashboardConfig = {
    structureMetrics: buildStructureMetrics(data.kpis),
    policies: buildAdminPolicies(data),
    // GovernanceAlerts: K-Cosmetics admin 전용 거버넌스 경고 데이터 소스 없음 → 빈 배열("구조 이상 없음")
    governanceAlerts: [],
    structureActions: ADMIN_QUICK_ACTIONS,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">관리자 대시보드</h1>
          <p className="text-sm text-slate-500 mt-1">
            K-Cosmetics 플랫폼 구조·거버넌스·서비스 관리
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </button>
      </div>

      {/* 4-Block 표준 레이아웃: A Snapshot → B Policy → C GovernanceAlerts → D Actions */}
      <AdminDashboardLayout config={adminConfig} />

      {/* Governance + Network — 2열 그리드 (레이아웃 외부, 공통 AdminLinkBlock) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AdminLinkBlock
          title="거버넌스 · 권한 관리"
          description="역할과 권한 구조를 관리합니다."
          links={GOVERNANCE_LINKS}
        />
        <AdminLinkBlock
          title="회원 · 매장 구조"
          description="서비스 구조의 핵심 대상을 관리합니다."
          links={NETWORK_LINKS}
        />
      </div>
    </div>
  );
}
