/**
 * KpaOperatorDashboard — 5-Block 통합 Operator 대시보드
 *
 * WO-O4O-OPERATOR-UX-KPA-A-PILOT-V1:
 *   @o4o/operator-ux-core 기반 5-Block 구조로 전환.
 *   "콘텐츠 흐름형" — Activity Log + Quick Actions 강조.
 *
 * WO-O4O-KPA-A-ADMIN-ROLE-SPLIT-V1:
 *   Admin/Operator 역할별 UI 차등 적용.
 *   5-Block 구조 유지, Adapter 레벨에서 역할 분기.
 *
 * WO-O4O-OPERATOR-KPA-MIGRATION-V1:
 *   Config builder를 operatorConfig.ts로 분리.
 *   Dashboard 컴포넌트는 fetch + state + render만 담당.
 *
 * Block 구조:
 *  [1] KPI Grid       — 콘텐츠, 포럼, 사이니지, 가입대기 (+Admin: 회원수, 서비스신청)
 *  [2] AI Summary     — 상태 기반 인사이트 (LLM 미호출)
 *  [3] Action Queue   — 즉시 처리 항목 (+Admin: 권한요청, 정책점검)
 *  [4] Activity Log   — 최근 콘텐츠/포럼/사이니지 활동 (핵심)
 *  [5] Quick Actions  — Hub 기능 흡수 (+Admin: 회원관리, 서비스승인, 정책설정)
 *
 * WO-KPA-A-OPERATOR-DASHBOARD-REFINE-V1:
 *   KPA-a 운영 업무 기준 5-Block 정비. 상품 신청 fetch 추가.
 *
 * API 재사용: operatorApi.getSummary() + apiClient (members, product-applications)
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { OperatorDashboardLayout, type OperatorDashboardConfig } from '@o4o/operator-ux-core';
import { operatorApi } from '../../api/operator';
import { apiClient } from '../../api/client';
import { useAuth, getAccessToken } from '../../contexts/AuthContext';
import { ROLES } from '../../lib/role-constants';
import { buildKpaOperatorConfig, type KpaExtendedData } from './operatorConfig';

const PLATFORM_API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export default function KpaOperatorDashboard() {
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes(ROLES.KPA_ADMIN) ?? false;

  const [config, setConfig] = useState<OperatorDashboardConfig | null>(null);
  const [extData, setExtData] = useState<KpaExtendedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Promise.allSettled: 개별 실패로 전체가 중단되지 않음
      const token = getAccessToken();
      const storeHeaders: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const fetches: Promise<any>[] = [
        operatorApi.getSummary(),
        apiClient.get('/members', { status: 'pending', pageSize: 1 }),
        apiClient.get('/pharmacy-requests/pending', { limit: 1 }),
        // WO-O4O-STORE-HUB-OPERATOR-INTEGRATION-V1: Store stats
        // WO-O4O-OPERATOR-CONSOLE-SERVICEKEY-ALIGNMENT-V1: serviceKey 명시 (F6 Boundary Policy platform admin 400 차단).
        fetch(`${PLATFORM_API_BASE}/api/v1/operator/stores?limit=1&serviceKey=kpa-society`, { headers: storeHeaders }).then(r => r.ok ? r.json() : null),
        // WO-KPA-A-OPERATOR-DASHBOARD-REFINE-V1: 상품 신청 통계
        apiClient.get('/operator/product-applications/stats'),
      ];
      // WO-O4O-KPA-A-ADMIN-ROLE-SPLIT-V1: Admin용 추가 데이터 fetch
      if (isAdmin) {
        fetches.push(
          apiClient.get('/members', { pageSize: 1 }),
          apiClient.get('/organization-join-requests/pending', { limit: 1 }),
        );
      }

      const results = await Promise.allSettled(fetches);

      const summaryRes = results[0].status === 'fulfilled' ? results[0].value : null;
      const membersRes = results[1].status === 'fulfilled' ? results[1].value : null;
      const pharmacyReqRes = results[2].status === 'fulfilled' ? results[2].value : null;
      const storeRes = results[3].status === 'fulfilled' ? results[3].value : null;
      const productAppStatsRes = results[4].status === 'fulfilled' ? results[4].value : null;
      const totalMembersRes = isAdmin && results[5]?.status === 'fulfilled' ? results[5].value : null;
      const serviceAppsRes = isAdmin && results[6]?.status === 'fulfilled' ? results[6].value : null;

      // Log individual failures
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.error(`[KPA-a Dashboard] fetch[${i}] failed:`, r.reason);
        }
      });

      const extData: KpaExtendedData = {
        summary: summaryRes?.data ?? null,
        pendingMembers: (membersRes as any)?.total ?? (membersRes as any)?.data?.total ?? 0,
        totalMembers: (totalMembersRes as any)?.total ?? (totalMembersRes as any)?.data?.total ?? 0,
        serviceApplicationCount: (serviceAppsRes as any)?.data?.pagination?.total ?? 0,
        pharmacyRequestCount: (pharmacyReqRes as any)?.data?.pagination?.total ?? 0,
        // WO-O4O-STORE-HUB-OPERATOR-INTEGRATION-V1
        storeStats: storeRes?.stats ?? null,
        // WO-KPA-A-OPERATOR-DASHBOARD-REFINE-V1: 상품 신청 대기
        productApplicationPendingCount: (productAppStatsRes as any)?.data?.pending ?? 0,
      };

      setExtData(extData);
      setConfig(buildKpaOperatorConfig(extData, isAdmin));
    } catch (err) {
      console.error('Failed to fetch operator dashboard:', err);
      setError('데이터를 불러오지 못했습니다.');
    }
    setLoading(false);
  }, [isAdmin]);

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

  return (
    <div className="space-y-6">
      {/* WO-O4O-OPERATOR-DASHBOARD-COMMUNITY-STORE-HUB-SPLIT-V1: 2축 운영 네비게이션 */}
      {extData && <AxisNavigationSection extData={extData} />}
      <OperatorDashboardLayout config={config} />
    </div>
  );
}

// ─── 2축 운영 네비게이션 카드 ───────────────────────────────────────────────────

function AxisNavigationSection({ extData }: { extData: KpaExtendedData }) {
  const summary = extData.summary;
  const forumPending = summary?.forum?.pendingRequests ?? 0;
  const contentPending = summary?.content?.pendingDraft ?? 0;
  const totalStores = extData.storeStats?.totalStores ?? 0;

  const communityMetrics = [
    { label: '회원 승인', value: extData.pendingMembers, link: '/operator/members', warn: extData.pendingMembers > 0 },
    { label: '포럼 요청', value: forumPending, link: '/operator/forum-management', warn: forumPending > 0 },
    { label: '콘텐츠 대기', value: contentPending, link: '/operator/content', warn: contentPending > 0 },
  ];

  const storeMetrics = [
    { label: '상품 신청', value: extData.productApplicationPendingCount, link: '/operator/product-applications', warn: extData.productApplicationPendingCount > 0 },
    { label: '약국 서비스', value: extData.pharmacyRequestCount, link: '/operator/pharmacy-requests', warn: extData.pharmacyRequestCount > 0 },
    { label: '등록 매장', value: totalStores, link: '/operator/stores', warn: false },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 커뮤니티 운영 */}
      <div className="bg-white rounded-xl border border-blue-100 p-5">
        <div className="flex items-center gap-2 mb-1">
          <span>💬</span>
          <span className="text-sm font-semibold text-slate-800">커뮤니티 운영</span>
        </div>
        <p className="text-xs text-slate-400 mb-3">포럼 · 회원 · 콘텐츠 · LMS · 자료실</p>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {communityMetrics.map((m) => (
            <Link
              key={m.link}
              to={m.link}
              className={`text-center py-2 px-1 rounded-lg text-xs border transition-colors hover:opacity-80 ${
                m.warn ? 'border-amber-200 bg-amber-50' : 'border-slate-100 bg-slate-50'
              }`}
            >
              <div className={`text-lg font-bold ${m.warn ? 'text-amber-600' : 'text-slate-500'}`}>{m.value}</div>
              <div className="text-slate-500 mt-0.5">{m.label}</div>
            </Link>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/operator/forum" className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">포럼 운영</Link>
          <Link to="/operator/members" className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">회원 관리</Link>
          <Link to="/operator/lms" className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">강의 관리</Link>
        </div>
      </div>

      {/* 매장 HUB 운영 */}
      <div className="bg-white rounded-xl border border-emerald-100 p-5">
        <div className="flex items-center gap-2 mb-1">
          <span>🏪</span>
          <span className="text-sm font-semibold text-slate-800">매장 HUB 운영</span>
        </div>
        <p className="text-xs text-slate-400 mb-3">매장 · 이벤트 오퍼 · 사이니지 · 상품 신청</p>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {storeMetrics.map((m) => (
            <Link
              key={m.link}
              to={m.link}
              className={`text-center py-2 px-1 rounded-lg text-xs border transition-colors hover:opacity-80 ${
                m.warn ? 'border-amber-200 bg-amber-50' : 'border-slate-100 bg-slate-50'
              }`}
            >
              <div className={`text-lg font-bold ${m.warn ? 'text-amber-600' : 'text-slate-500'}`}>{m.value}</div>
              <div className="text-slate-500 mt-0.5">{m.label}</div>
            </Link>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/operator/stores" className="text-xs px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors">매장 관리</Link>
          <Link to="/operator/event-offers" className="text-xs px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors">이벤트 오퍼</Link>
          <Link to="/operator/signage/hq-media" className="text-xs px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors">사이니지</Link>
        </div>
      </div>
    </div>
  );
}
