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
 * API 재사용: operatorApi.getSummary() + apiClient (members, groupbuy)
 */

import { useState, useEffect, useCallback } from 'react';
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
        fetch(`${PLATFORM_API_BASE}/api/v1/operator/stores?limit=1`, { headers: storeHeaders }).then(r => r.ok ? r.json() : null),
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
      const totalMembersRes = isAdmin && results[4]?.status === 'fulfilled' ? results[4].value : null;
      const serviceAppsRes = isAdmin && results[5]?.status === 'fulfilled' ? results[5].value : null;

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
      };

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

  return <OperatorDashboardLayout config={config} />;
}
