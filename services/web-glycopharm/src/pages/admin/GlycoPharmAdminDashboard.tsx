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
 * WO-O4O-GLYCOPHARM-ADMIN-DASHBOARD-LAYOUT-WRAPPER-V1:
 *   admin-ux-core 블록 개별 렌더링 → AdminDashboardLayout wrapper 적용 (Neture 정합).
 *   4-Block 표준(A:Snapshot → B:Policy → C:GovernanceAlerts → D:Actions) 구조로 정렬.
 *   누락돼 있던 C(GovernanceAlerts) 블록 채움(현재 데이터 없음 → 빈 배열, "구조 이상 없음").
 *   Phase 2 Finance/Governance/Network 섹션은 레이아웃 하단에 유지(공통 추출은 후속 WO).
 *
 * Block 구조:
 *  AdminDashboardLayout: A Structure Snapshot → B Policy Overview → C Governance Alerts → D Structure Actions
 *  [+] Finance        — 정산·청구 리포트·인보이스 진입점 (Phase 2, 레이아웃 외부 유지)
 *  [+] Governance     — 역할·권한 관리 진입점 (Phase 2)
 *  [+] Network        — 약국 네트워크·회원 구조 진입점 (Phase 2)
 *
 * API: fetchOperatorDashboard() → Admin 관점으로 재매핑
 */

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Loader2,
  DollarSign,
  FileText,
  Receipt,
  FileBarChart,
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
import { fetchOperatorDashboard } from '@/api/operatorDashboard';
import type { OperatorDashboardConfig, KpiItem } from '@o4o/operator-ux-core';

// ─── Admin KPI 선택 (Operator와 다른 관점) ──────────────────

// WO-O4O-GLYCOPHARM-ADMIN-DASHBOARD-PATIENT-KPI-WHITELIST-CLEANUP-V1:
//   IR-O4O-GLYCOPHARM-OPERATOR-DASHBOARD-CARE-VOCABULARY-AUDIT-V1 W5a.
//   total-patients / high-risk-patients / open-care-alerts 3개 키 제거.
//   backend STUB pipeline / OperatorAlertMetrics interface / AlertItem.type='care' /
//   OperatorCapability.CARE 는 Care 재도입 정책 (I-α) 결정 전까지 보존.
const ADMIN_KPI_KEYS = new Set([
  'active-pharmacies',
  'pending-applications',
  'active-products',
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

// WO-O4O-GLYCOPHARM-ADMIN-SCOPE-CLEANUP-V1: 약국 네트워크 승인 / 역할·권한 관리 정책 항목 제거
//   (약국 네트워크 → operator, 역할 관리 → O4O 전체 관리자). Finance 항목은 현상 유지.
function buildAdminPolicies(_data: OperatorDashboardConfig): PolicyItem[] {
  return [
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
  ];
}

// ─── Admin Quick Actions ─────────────────────────────────────

// WO-O4O-ADMIN-QUICKACTION-FRONTEND-CONVERGE-V1 (Phase C):
//   admin Structure Actions emoji → lucide-name 정렬. ActionIcon vocabulary 19종 안.
// WO-O4O-GLYCOPHARM-ADMIN-SCOPE-CLEANUP-V1: 약국 네트워크 / 역할 관리 quick action 제거.
//   회원 관리 → '회원 데이터 관리'(조회·삭제·파기 관점).
const ADMIN_QUICK_ACTIONS: StructureAction[] = [
  { id: 'users', label: '회원 데이터 관리', link: '/admin/members', icon: 'users', description: '회원 조회·완전삭제·개인정보 파기 관리' },
  { id: 'settlements', label: '정산 관리', link: '/admin/settlements', icon: 'dollar-sign', description: '정산 처리·내역 조회' },
  { id: 'invoices', label: '인보이스', link: '/admin/invoices', icon: 'file-text', description: '인보이스 발행·관리' },
  { id: 'settings', label: '설정', link: '/admin/settings', icon: 'settings', description: '시스템 설정' },
];

// ─── Phase 2: Business Block Definitions ─────────────────────
// WO-O4O-ADMIN-UX-CORE-ADMIN-BLOCK-EXTRACTION-V1: 로컬 AdminBlock 제거 →
//   공통 AdminLinkBlock(@o4o/admin-ux-core) 사용. icon 은 ReactNode 로 주입.

const ICON_CLS = 'w-4 h-4 text-slate-500';

const FINANCE_LINKS: AdminBlockLink[] = [
  { label: '정산 관리', path: '/admin/settlements', icon: <DollarSign className={ICON_CLS} />, description: '정산 처리·내역 조회' },
  { label: '청구 리포트', path: '/admin/reports', icon: <FileBarChart className={ICON_CLS} />, description: '청구 데이터 분석·리포트' },
  { label: '청구 미리보기', path: '/admin/billing-preview', icon: <FileText className={ICON_CLS} />, description: '청구 확정 전 미리보기' },
  { label: '인보이스', path: '/admin/invoices', icon: <Receipt className={ICON_CLS} />, description: '인보이스 발행·관리' },
];

// WO-O4O-GLYCOPHARM-ADMIN-SCOPE-CLEANUP-V1: Governance(역할 관리) 블록 제거 → O4O 전체 관리자 영역.
//   Network 블록에서 약국 네트워크 제거(→ operator /operator/stores), 회원 데이터 관리만 유지.
const MEMBER_LINKS: AdminBlockLink[] = [
  { label: '회원 데이터 관리', path: '/admin/members', icon: <Users className={ICON_CLS} />, description: '회원 조회·완전삭제·개인정보 파기 관리' },
];

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

  const adminConfig: AdminDashboardConfig = {
    structureMetrics: buildStructureMetrics(data.kpis),
    policies: buildAdminPolicies(data),
    // GovernanceAlerts: GlycoPharm admin 전용 거버넌스 경고 데이터 소스 없음 → 빈 배열("구조 이상 없음")
    governanceAlerts: [],
    structureActions: ADMIN_QUICK_ACTIONS,
  };

  // Phase 2: 회원 구조 블록 요약 수치 (기존 KPI에서 추출)
  // WO-O4O-GLYCOPHARM-ADMIN-SCOPE-CLEANUP-V1: 약국 수/입점 대기(약국 네트워크 지표) 제거 → 회원 수만 유지.
  const totalMembers = getKpiValue(data.kpis, 'total-patients');
  const memberStats = totalMembers != null ? [{ label: '회원 수', value: totalMembers }] : [];

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

      {/* 4-Block 표준 레이아웃: A Snapshot → B Policy → C GovernanceAlerts → D Actions */}
      <AdminDashboardLayout config={adminConfig} />

      {/* Phase 2: Finance + 회원 구조 — 2열 그리드 (레이아웃 외부, 공통 AdminLinkBlock)
       * WO-O4O-GLYCOPHARM-ADMIN-SCOPE-CLEANUP-V1: Governance 블록 제거(역할 관리 → O4O 전체 관리자),
       *   Network → '회원 구조'로 축소(약국 네트워크 제거 → operator /operator/stores). Finance 현상 유지. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Block 4: Finance */}
        <AdminLinkBlock
          title="재무 · 청구 관리"
          description="정산, 청구 자료, 인보이스 흐름을 관리합니다."
          links={FINANCE_LINKS}
        />

        {/* Block 5: 회원 구조 (회원 데이터 관리) */}
        <AdminLinkBlock
          title="회원 구조"
          description="회원 데이터의 보존·삭제·파기 관점에서 관리합니다. 이용중지 등 일상 운영은 operator에서 처리합니다."
          links={MEMBER_LINKS}
          stats={memberStats}
        />
      </div>
    </div>
  );
}
