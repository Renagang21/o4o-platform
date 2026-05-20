/**
 * KCosmeticsAdminDashboard — Admin 거버넌스·구조 관리 허브
 *
 * WO-O4O-KCOS-ADMIN-DASHBOARD-DEDICATED-V1:
 *   KCosmeticsOperatorDashboard(5-block) 재사용에서 분리.
 *   admin-ux-core 4-block 구조로 K-Cosmetics Admin 전용 뷰 신설.
 *
 * Block 구조:
 *  [A] Structure Snapshot (KPI) — 플랫폼 구조 지표 (Admin 관점)
 *  [B] Policy Overview (Action Queue) — Admin 점검·처리 항목
 *  [C] Structure Actions (Quick Actions) — 핵심 관리 기능 바로가기
 *  [D] Governance/Network — 역할·권한 + 회원·매장 구조 진입점
 *
 * API: operatorApi.getDashboardSummary() → Admin 관점으로 재매핑
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  RefreshCw,
  Loader2,
  ChevronRight,
  ShieldCheck,
  Store,
  Users,
  type LucideIcon,
} from 'lucide-react';
import {
  StructureSnapshotBlock,
  PolicyOverviewBlock,
  StructureActionBlock,
  type StructureMetric,
  type PolicyItem,
  type StructureAction,
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

// ─── Admin Block 컴포넌트 ─────────────────────────────────────

interface AdminLink {
  label: string;
  path: string;
  icon: LucideIcon;
  description: string;
}

function AdminBlock({
  title,
  description,
  links,
}: {
  title: string;
  description: string;
  links: AdminLink[];
}) {
  return (
    <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="text-base font-semibold text-slate-800">{title}</h2>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <div className="divide-y divide-slate-50">
        {links.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors group"
          >
            <div className="p-1.5 rounded-lg bg-slate-50 group-hover:bg-slate-100 transition-colors">
              <link.icon className="w-4 h-4 text-slate-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-700">{link.label}</div>
              <div className="text-xs text-slate-400">{link.description}</div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
          </Link>
        ))}
      </div>
    </section>
  );
}

const GOVERNANCE_LINKS: AdminLink[] = [
  { label: '역할 관리', path: '/admin/roles', icon: ShieldCheck, description: '역할·권한 구조 정의·관리' },
];

const NETWORK_LINKS: AdminLink[] = [
  { label: '매장 관리', path: '/admin/stores', icon: Store, description: '매장 승인·구조 관리' },
  { label: '회원 관리', path: '/admin/users', icon: Users, description: '회원 조회·구조 관리' },
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
      const result = await operatorApi.getDashboardSummary();
      setData(result);
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

  const structureMetrics = buildStructureMetrics(data.kpis);
  const policies = buildAdminPolicies(data);

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

      {/* Block A: Structure Snapshot (Admin KPI) */}
      <StructureSnapshotBlock items={structureMetrics} />

      {/* Block B: Policy Overview (Admin Action Queue) */}
      <PolicyOverviewBlock items={policies} />

      {/* Block C: Structure Actions (Admin Quick Actions) */}
      <StructureActionBlock items={ADMIN_QUICK_ACTIONS} />

      {/* Block D: Governance + Network — 2열 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AdminBlock
          title="거버넌스 · 권한 관리"
          description="역할과 권한 구조를 관리합니다."
          links={GOVERNANCE_LINKS}
        />
        <AdminBlock
          title="회원 · 매장 구조"
          description="서비스 구조의 핵심 대상을 관리합니다."
          links={NETWORK_LINKS}
        />
      </div>
    </div>
  );
}
