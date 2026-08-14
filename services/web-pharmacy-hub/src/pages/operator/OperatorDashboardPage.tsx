/**
 * OperatorDashboardPage — Pharmacy-Hub 운영자 홈
 *
 * WO-O4O-OPERATOR-CROSSSERVICE-SCREEN-CENSUS-AND-PHARMACYHUB-UX-COMMONIZATION-V1
 *
 * 기존 `/operator` 는 RoleEntryPage placeholder("후속 WO 예정 기능" 목록)였다.
 * 이를 제거하고, **실제 구현된 운영자 기능만**으로 공통 5-Block 대시보드
 * (`OperatorDashboardLayout` @o4o/operator-ux-core)를 구성한다.
 *
 * 실재 기능 = 가입 신청 승인·반려 (service_memberships) 하나뿐이다.
 *   - KPI / Action Queue / Quick Action 은 모두 이 업무의 **실데이터**로만 만든다.
 *   - 미구현 업무를 가짜 카드로 만들지 않는다 (WO §2).
 *   - AI Summary · Activity Log 는 Pharmacy-Hub 백엔드에 원천이 없으므로 비운다
 *     (공통 Block 은 빈 배열이면 렌더하지 않거나 "없음"을 표시한다).
 *
 * 데이터 원천: GET /pharmacy-hub/operator/memberships (기존 승인 콘솔과 동일 endpoint).
 * 상태별 건수는 목록 응답의 pagination.total 을 사용한다 — 신규 API 를 만들지 않는다.
 */

import { useCallback, useEffect, useState } from 'react';
import { OperatorDashboardLayout, type OperatorDashboardConfig } from '@o4o/operator-ux-core';
import { fetchMembershipStatusCount } from '../../lib/membershipConsoleClient';
import { BRAND } from '../../config/service';

interface StatusCounts {
  pending: number;
  active: number;
  rejected: number;
}

export default function OperatorDashboardPage() {
  const [counts, setCounts] = useState<StatusCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pending, active, rejected] = await Promise.all([
        fetchMembershipStatusCount('pending'),
        fetchMembershipStatusCount('active'),
        fetchMembershipStatusCount('rejected'),
      ]);
      setCounts({ pending, active, rejected });
    } catch (e: any) {
      // 조회 실패를 0 으로 삼키지 않는다 — 빈 대시보드는 "신청 없음"과 구분돼야 한다.
      setError(e?.message ?? '가입 신청 현황을 불러오지 못했습니다.');
      setCounts(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600" />
      </div>
    );
  }

  if (error || !counts) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 mb-4">{error ?? '데이터를 불러올 수 없습니다.'}</p>
        <button
          onClick={load}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium text-slate-700 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  const config: OperatorDashboardConfig = {
    kpis: [
      {
        key: 'pending',
        label: '승인 대기',
        value: counts.pending,
        status: counts.pending > 0 ? 'warning' : 'neutral',
        link: '/operator/memberships',
      },
      { key: 'active', label: '승인 완료', value: counts.active, link: '/operator/memberships' },
      { key: 'rejected', label: '반려', value: counts.rejected, link: '/operator/memberships' },
    ],
    actionQueue: counts.pending > 0
      ? [{ id: 'memberships-pending', label: '가입 신청 승인 대기', count: counts.pending, link: '/operator/memberships' }]
      : [],
    activityLog: [],
    quickActions: [
      { id: 'memberships', label: '가입 신청 관리', link: '/operator/memberships' },
    ],
    aboveBlocks: (
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h1 className="mb-1 text-lg font-semibold text-slate-800">{BRAND.name} 운영자</h1>
        <p className="m-0 text-sm text-slate-500">
          현재 운영자 영역의 업무는 <strong className="font-semibold text-slate-700">가입 신청 승인·반려</strong> 입니다.
          공급자 ↔ 약국 간 상품 거래와 공급자 콘텐츠 전달에는 운영자가 개입하지 않습니다.
        </p>
      </section>
    ),
  };

  return <OperatorDashboardLayout config={config} />;
}
