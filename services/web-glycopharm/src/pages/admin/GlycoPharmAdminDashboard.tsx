/**
 * GlycoPharmAdminDashboard — Admin 거버넌스·재무·구조 관리 허브
 *
 * WO-O4O-GLYCOPHARM-ADMIN-DASHBOARD-FOUNDATION-V1:
 *   Phase 1 — KPI + Action Queue + Quick Actions 기본 골격
 *
 * WO-O4O-GLYCOPHARM-ADMIN-DASHBOARD-BUSINESS-BLOCKS-V2:
 *   Phase 2 — Admin 사업 운영 블록 추가
 *   [4] Finance       — 정산·청구·인보이스 관리
 *   [5] Governance    — 역할·권한 구조 관리
 *   [6] Network       — 약국 네트워크·회원 구조 관리
 *
 * Block 구조:
 *  [1] Structure Snapshot (KPI) — 플랫폼 구조 지표 (Admin 관점 6개)
 *  [2] Policy Overview (Action Queue) — Admin 점검·처리 항목
 *  [3] Structure Actions (Quick Actions) — 핵심 관리 기능 바로가기 (6개)
 *  [4] Finance        — 정산·청구 리포트·인보이스 진입점
 *  [5] Governance     — 역할·권한 관리 진입점
 *  [6] Network        — 약국 네트워크·회원 구조 진입점
 *
 * API: fetchOperatorDashboard() → Admin 관점으로 재매핑
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  RefreshCw,
  Loader2,
  ChevronRight,
  DollarSign,
  FileText,
  Receipt,
  FileBarChart,
  ShieldCheck,
  Building2,
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
import { fetchOperatorDashboard } from '@/api/operatorDashboard';
import type { OperatorDashboardConfig, KpiItem } from '@o4o/operator-ux-core';

// ─── Admin KPI 선택 (Operator와 다른 관점) ──────────────────

const ADMIN_KPI_KEYS = new Set([
  'active-pharmacies',
  'pending-applications',
  'active-products',
  'total-patients',
  'high-risk-patients',
  'open-care-alerts',
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
  const pendingCount =
    data.actionQueue.find((a) => a.id === 'pending-applications')?.count ?? 0;

  return [
    {
      key: 'pharmacy-network',
      label: '약국 네트워크 승인',
      status: pendingCount > 0 ? ('partial' as const) : ('configured' as const),
      link: '/admin/pharmacies',
    },
    {
      key: 'settlement-management',
      label: '정산 관리',
      status: 'configured' as const,
      link: '/admin/settlements',
    },
    {
      key: 'billing-preview',
      label: '청구 미리보기',
      status: 'configured' as const,
      link: '/admin/billing-preview',
    },
    {
      key: 'invoice-management',
      label: '인보이스 관리',
      status: 'configured' as const,
      link: '/admin/invoices',
    },
    {
      key: 'role-management',
      label: '역할·권한 관리',
      status: 'configured' as const,
      link: '/admin/roles',
    },
  ];
}

// ─── Admin Quick Actions ─────────────────────────────────────

const ADMIN_QUICK_ACTIONS: StructureAction[] = [
  { id: 'users', label: '회원 관리', link: '/admin/users', icon: '👤', description: '회원 조회·관리' },
  { id: 'pharmacies', label: '약국 네트워크', link: '/admin/pharmacies', icon: '🏥', description: '약국 승인·네트워크 관리' },
  { id: 'settlements', label: '정산 관리', link: '/admin/settlements', icon: '💰', description: '정산 처리·내역 조회' },
  { id: 'invoices', label: '인보이스', link: '/admin/invoices', icon: '📄', description: '인보이스 발행·관리' },
  { id: 'roles', label: '역할 관리', link: '/admin/roles', icon: '🛡️', description: '역할·권한 구조 관리' },
  { id: 'settings', label: '설정', link: '/admin/settings', icon: '⚙️', description: '시스템 설정' },
];

// ─── Phase 2: Business Block Definitions ─────────────────────

interface AdminLink {
  label: string;
  path: string;
  icon: LucideIcon;
  description: string;
}

const FINANCE_LINKS: AdminLink[] = [
  { label: '정산 관리', path: '/admin/settlements', icon: DollarSign, description: '정산 처리·내역 조회' },
  { label: '청구 리포트', path: '/admin/reports', icon: FileBarChart, description: '청구 데이터 분석·리포트' },
  { label: '청구 미리보기', path: '/admin/billing-preview', icon: FileText, description: '청구 확정 전 미리보기' },
  { label: '인보이스', path: '/admin/invoices', icon: Receipt, description: '인보이스 발행·관리' },
];

const GOVERNANCE_LINKS: AdminLink[] = [
  { label: '역할 관리', path: '/admin/roles', icon: ShieldCheck, description: '역할·권한 구조 정의·관리' },
];

const NETWORK_LINKS: AdminLink[] = [
  { label: '약국 네트워크', path: '/admin/pharmacies', icon: Building2, description: '약국 승인·네트워크 구조 관리' },
  { label: '회원 관리', path: '/admin/users', icon: Users, description: '회원 조회·구조 관리' },
];

// ─── AdminBlock Component (BusinessBlock 패턴 재사용) ────────

function AdminBlock({
  title,
  description,
  links,
  stats,
}: {
  title: string;
  description: string;
  links: AdminLink[];
  stats?: { label: string; value: number | string }[];
}) {
  return (
    <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="text-base font-semibold text-slate-800">{title}</h2>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>

      {stats && stats.length > 0 && (
        <div className="px-5 py-3 border-b border-slate-100 flex gap-6">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-lg font-bold text-slate-800">{s.value}</div>
              <div className="text-[11px] text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>
      )}

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

// ─── Helper ──────────────────────────────────────────────────

function getKpiValue(kpis: KpiItem[], key: string): number | string | undefined {
  return kpis.find((k) => k.key === key)?.value;
}

// ─── Main Component ──────────────────────────────────────────

export default function GlycoPharmAdminDashboard() {
  const [data, setData] = useState<OperatorDashboardConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchOperatorDashboard();
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

  // Phase 2: Network 블록 요약 수치 (기존 KPI에서 추출)
  const activePharmacies = getKpiValue(data.kpis, 'active-pharmacies');
  const totalPatients = getKpiValue(data.kpis, 'total-patients');
  const pendingApplications = getKpiValue(data.kpis, 'pending-applications');

  const networkStats = [
    ...(activePharmacies != null ? [{ label: '약국 수', value: activePharmacies }] : []),
    ...(totalPatients != null ? [{ label: '회원 수', value: totalPatients }] : []),
    ...(pendingApplications != null && pendingApplications !== 0
      ? [{ label: '입점 대기', value: pendingApplications }]
      : []),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">관리자 대시보드</h1>
          <p className="text-sm text-slate-500 mt-1">
            GlycoPharm 플랫폼 구조·거버넌스·재무 관리
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

      {/* Block 1: Structure Snapshot (Admin KPI) */}
      <StructureSnapshotBlock items={structureMetrics} />

      {/* Block 2: Policy Overview (Admin Action Queue) */}
      <PolicyOverviewBlock items={policies} />

      {/* Block 3: Structure Actions (Admin Quick Actions) */}
      <StructureActionBlock items={ADMIN_QUICK_ACTIONS} />

      {/* Block 4-5: Finance + Governance (Phase 2) — 2열 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Block 4: Finance */}
        <AdminBlock
          title="재무 · 청구 관리"
          description="정산, 청구 자료, 인보이스 흐름을 관리합니다."
          links={FINANCE_LINKS}
        />

        {/* Block 5: Governance */}
        <AdminBlock
          title="거버넌스 · 권한 관리"
          description="역할과 권한 구조를 관리합니다."
          links={GOVERNANCE_LINKS}
        />
      </div>

      {/* Block 6: Network (Phase 2) */}
      <AdminBlock
        title="약국 네트워크 · 회원 구조"
        description="서비스 구조의 핵심 네트워크 대상을 관리합니다."
        links={NETWORK_LINKS}
        stats={networkStats}
      />
    </div>
  );
}
