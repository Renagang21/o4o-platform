/**
 * KpaAdminDashboardPage — KPA 관리자 전용 대시보드
 *
 * WO-O4O-KPA-ADMIN-DASHBOARD-CANONICAL-SEPARATION-V1
 *
 * operator dashboard(KpaOperatorDashboardPage) 와 완전 분리된 admin 전용 요약 허브.
 * - 시각 강조: 인디고(#4f46e5) 기반 — operator 블루(#2563eb)와 구분
 * - 구조: 요약 KPI + 승인 대기 목록 + 빠른 이동 링크
 * - 복잡한 5-Block 구조 없이 관리자 역할에 맞는 간결한 허브 형태 제공
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Users,
  Clock,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { operatorApi, type DistrictOperatorSummary } from '../../api/operator';

// ─── 빠른 이동 링크 정의 ────────────────────────────────────────────────────

const QUICK_LINKS = [
  {
    label: '회원 관리',
    desc: '가입 신청 승인·반려·정지 처리',
    to: '/operator/members',
    external: true,
  },
  {
    label: '운영 대시보드',
    desc: 'operator 공간에서 운영 현황 확인',
    to: '/operator',
    external: true,
  },
] as const;

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

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

      {/* ── 헤더 ── */}
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

      {/* ── KPI 요약 ── */}
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
      ) : kpis ? (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-500">전체 회원</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{kpis.totalMembers.toLocaleString()}</p>
          </div>
          <div className={`border rounded-xl p-5 ${kpis.pendingApprovals > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Clock className={`w-4 h-4 ${kpis.pendingApprovals > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
              <span className={`text-xs ${kpis.pendingApprovals > 0 ? 'text-amber-700' : 'text-slate-500'}`}>승인 대기</span>
            </div>
            <p className={`text-2xl font-bold ${kpis.pendingApprovals > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
              {kpis.pendingApprovals}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-500">등록 분회</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{kpis.totalBranches}</p>
          </div>
        </div>
      ) : null}

      {/* ── 승인 대기 목록 ── */}
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

      {/* ── 빠른 이동 ── */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">빠른 이동</h2>
        <div className="grid grid-cols-2 gap-3">
          {QUICK_LINKS.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-colors group"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-slate-800 group-hover:text-indigo-700">{link.label}</span>
                  {link.external && <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-indigo-500" />}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{link.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400" />
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
