/**
 * KpaAdminDashboardPage — KPA 관리자 전용 대시보드
 *
 * WO-O4O-KPA-ADMIN-DASHBOARD-CANONICAL-SEPARATION-V1
 *
 * WO-O4O-KPA-ADMIN-DASHBOARD-ADMIN-UX-CORE-MIGRATION-V1:
 *   독자 JSX 구현 → @o4o/admin-ux-core AdminDashboardLayout 4-Block 정합 (Neture/GP/KCOS 정렬).
 *   - A Structure Snapshot: 활성 회원 / 승인 대기 / 등록 분회 KPI
 *   - B Policy Overview: KPA admin 정책 설정 개념 없음 → 빈 배열(미표시)
 *   - C Governance Alerts: 전용 데이터 소스 없음 → 빈 배열("구조 이상 없음")
 *   - D Structure Actions: 회원 관리 / 운영 대시보드 진입
 *   최근 가입 신청 목록(분회 신청 detail)은 KPA 특수 섹션으로 레이아웃 하단 유지.
 *   operatorApi.getDistrictSummary(10) / AdminAuthGuard / route / 권한 구조 무변경.
 *   indigo 헤더 + kpa:admin 배지(시각 정체성) 유지.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import {
  AdminDashboardLayout,
  type AdminDashboardConfig,
  type StructureMetric,
  type StructureAction,
} from '@o4o/admin-ux-core';
import { operatorApi, type DistrictOperatorSummary } from '../../api/operator';

// ─── Structure Actions (빠른 이동 — Block D) ───────────────────────────────

const STRUCTURE_ACTIONS: StructureAction[] = [
  { id: 'members', label: '회원 관리', link: '/operator/members', icon: '👤', description: '가입 신청 승인·반려·정지 처리' },
  { id: 'operator', label: '운영 대시보드', link: '/operator', icon: '📊', description: 'operator 공간에서 운영 현황 확인' },
];

// ─── 날짜 포맷 ──────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── Component ───────────────────────────────────────────────────────────────

export function KpaAdminDashboardPage() {
  const [summary, setSummary] = useState<DistrictOperatorSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    operatorApi.getDistrictSummary(10)
      .then(res => setSummary(res.data))
      .catch(() => setError('데이터를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  const kpis = summary?.kpis;
  const pendingList = summary?.pendingRequests?.items ?? [];

  // ── admin-ux-core 4-Block config (WO-O4O-KPA-ADMIN-DASHBOARD-ADMIN-UX-CORE-MIGRATION-V1) ──
  // WO-O4O-KPA-ADMIN-DASHBOARD-TOTALMEMBERS-LABEL-FIX-V1:
  //   '활성 회원' = kpa_members.status='active' 만. lifecycle 전체는 회원관리 화면 참조.
  const structureMetrics: StructureMetric[] = kpis
    ? [
        { key: 'active-members', label: '활성 회원', value: kpis.totalMembers, status: 'stable' },
        {
          key: 'pending-approvals',
          label: '승인 대기',
          value: kpis.pendingApprovals,
          status: kpis.pendingApprovals > 0 ? 'attention' : 'stable',
        },
        { key: 'total-branches', label: '등록 분회', value: kpis.totalBranches, status: 'stable' },
      ]
    : [];

  const adminConfig: AdminDashboardConfig = {
    structureMetrics,
    // KPA admin 은 정책 설정(configured/not_configured) 개념 없음 → 빈 배열(미표시)
    policies: [],
    // 전용 거버넌스 경고 데이터 소스 없음 → 빈 배열("구조 이상 없음")
    governanceAlerts: [],
    structureActions: STRUCTURE_ACTIONS,
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

      {/* ── 헤더 (KPA 시각 정체성 — indigo + kpa:admin 배지) ── */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">관리자 대시보드</h1>
          <p className="text-sm text-slate-500">KPA-Society 관리자 전용 공간</p>
        </div>
        <span className="ml-auto inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
          kpa:admin
        </span>
      </div>

      {/* ── 4-Block 표준 레이아웃 (A Snapshot → B Policy → C GovernanceAlerts → D Actions) ── */}
      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      ) : (
        <AdminDashboardLayout config={adminConfig} />
      )}

      {/* ── 최근 가입 신청 목록 (KPA 특수 섹션 — 분회 신청 detail, 레이아웃 외부 유지) ── */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">최근 가입 신청</h2>
          <Link to="/operator/members" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
            전체 보기 <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-8 bg-slate-100 rounded animate-pulse" />)}
          </div>
        ) : pendingList.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400">
            대기 중인 신청이 없습니다
          </div>
        ) : (
          <ul className="divide-y divide-slate-50">
            {pendingList.map((req: any) => (
              <li key={req.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <span className="text-sm font-medium text-slate-800">{req.requested_role || '—'}</span>
                  <span className="ml-2 text-xs text-slate-400">{req.request_type || '가입 신청'}</span>
                </div>
                <span className="text-xs text-slate-400">
                  {req.created_at ? formatDate(req.created_at) : '—'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

    </div>
  );
}
