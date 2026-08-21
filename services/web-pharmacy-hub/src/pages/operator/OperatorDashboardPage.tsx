/**
 * OperatorDashboardPage — Pharmacy-Hub 운영자 홈
 *
 * WO-O4O-OPERATOR-CROSSSERVICE-SCREEN-CENSUS-AND-PHARMACYHUB-UX-COMMONIZATION-V1 (최초)
 * WO-O4O-PHARMACYHUB-OPERATOR-COMMUNITY-AND-COMMON-CAPABILITY-FULL-ADOPTION-V1 (재구성)
 *
 * 공통 5-Block 대시보드(`OperatorDashboardLayout` @o4o/operator-ux-core)를
 * **실제 채택한 capability 의 실데이터만**으로 구성한다.
 *
 *   가입·회원 운영 : service_memberships   (GET /pharmacy-hub/operator/memberships)
 *   커뮤니티 운영  : forum_category_requests / forum 삭제 요청
 *                    (GET /forum/operator/{requests,delete-requests}/pending-count?serviceCode=pharmacy-hub)
 *   운영 활동 로그 : action_logs           (GET /operator/analytics/actions)
 *
 * 규칙:
 *   - 매장 HUB 운영 블록은 가져오지 않는다 (Pharmacy-Hub 운영자는 거래에 개입하지 않는다).
 *   - 미구현 업무를 가짜 카드로 만들지 않는다.
 *   - 조회 실패를 0 으로 삼키지 않는다. 다만 **부가 블록(커뮤니티·활동 로그)의 실패가
 *     대시보드 전체를 막지 않도록** 블록 단위로 degrade 시키고 배너로 알린다.
 *     가입 승인 현황은 이 화면의 주 지표이므로 실패 시 전체 오류 화면을 유지한다.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  OperatorDashboardLayout,
  type OperatorDashboardConfig,
  type ActivityItem,
} from '@o4o/operator-ux-core';
import { fetchMembershipStatusCount } from '../../lib/membershipConsoleClient';
import { forumOperatorApi } from '../../services/forumApi';
import { api } from '../../lib/apiClient';
import { BRAND } from '../../config/service';

interface StatusCounts {
  pending: number;
  active: number;
  rejected: number;
}

interface ForumCounts {
  requestsPending: number;
  deletePending: number;
}

/** action_logs.action_key -> 사람이 읽는 문구. 미등록 key 는 원문을 그대로 보여준다. */
const ACTION_LABELS: Record<string, string> = {
  member_approve: '가입 신청 승인',
  member_reject: '가입 신청 반려',
  'service_legal:update': '법정정보 설정 변경',
  'service_legal:create': '법정정보 설정 등록',
};

/** `{count}` 또는 `{data:{count}}` 두 형태를 모두 받는다 (공통 forum 라우트가 섞여 있다). */
function readCount(payload: any): number {
  const raw = payload?.data?.count ?? payload?.count;
  return typeof raw === 'number' ? raw : 0;
}

export default function OperatorDashboardPage() {
  const [counts, setCounts] = useState<StatusCounts | null>(null);
  const [forum, setForum] = useState<ForumCounts | null>(null);
  const [activity, setActivity] = useState<ActivityItem[] | null>(null);
  const [degraded, setDegraded] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDegraded([]);
    const failed: string[] = [];

    // 주 지표 — 실패하면 전체 오류 화면
    let membership: StatusCounts | null = null;
    try {
      const [pending, active, rejected] = await Promise.all([
        fetchMembershipStatusCount('pending'),
        fetchMembershipStatusCount('active'),
        fetchMembershipStatusCount('rejected'),
      ]);
      membership = { pending, active, rejected };
    } catch (e: any) {
      setError(e?.message ?? '가입 신청 현황을 불러오지 못했습니다.');
      setCounts(null);
      setLoading(false);
      return;
    }

    // 부가 블록 — 블록 단위 degrade
    let forumCounts: ForumCounts | null = null;
    try {
      const [reqRes, delRes] = await Promise.all([
        forumOperatorApi.getPendingCount(),
        forumOperatorApi.getDeletePendingCount(),
      ]);
      forumCounts = { requestsPending: readCount(reqRes), deletePending: readCount(delRes) };
    } catch {
      failed.push('커뮤니티 처리 대기');
    }

    let activityItems: ActivityItem[] | null = null;
    try {
      const res = await api.get('/operator/analytics/actions', { params: { limit: 8 } });
      const rows: any[] = res.data?.data?.actions ?? res.data?.data?.items ?? res.data?.data ?? [];
      activityItems = (Array.isArray(rows) ? rows : []).map((row) => ({
        id: String(row.id),
        message:
          (ACTION_LABELS[row.action_key] ?? row.action_key) +
          (row.status === 'failed' ? ' (실패)' : ''),
        timestamp: row.created_at,
      }));
    } catch {
      failed.push('운영 활동 로그');
    }

    setCounts(membership);
    setForum(forumCounts);
    setActivity(activityItems);
    setDegraded(failed);
    setLoading(false);
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

  const kpis: OperatorDashboardConfig['kpis'] = [
    {
      key: 'pending',
      label: '가입 승인 대기',
      value: counts.pending,
      status: counts.pending > 0 ? 'warning' : 'neutral',
      link: '/operator/memberships',
    },
    { key: 'active', label: '승인 완료', value: counts.active, link: '/operator/members' },
    { key: 'rejected', label: '반려', value: counts.rejected, link: '/operator/memberships' },
  ];

  // 커뮤니티 KPI 는 조회에 성공했을 때만 붙인다 (실패를 0 으로 표시하지 않는다).
  if (forum) {
    kpis.push(
      {
        key: 'forum-requests',
        label: '포럼 신청 대기',
        value: forum.requestsPending,
        status: forum.requestsPending > 0 ? 'warning' : 'neutral',
        link: '/operator/forum-requests',
      },
      {
        key: 'forum-deletes',
        label: '삭제 요청 대기',
        value: forum.deletePending,
        status: forum.deletePending > 0 ? 'warning' : 'neutral',
        link: '/operator/forum-delete-requests',
      },
    );
  }

  const actionQueue: OperatorDashboardConfig['actionQueue'] = [];
  if (counts.pending > 0) {
    actionQueue.push({
      id: 'memberships-pending',
      label: '가입 신청 승인 대기',
      count: counts.pending,
      link: '/operator/memberships',
    });
  }
  if (forum && forum.requestsPending > 0) {
    actionQueue.push({
      id: 'forum-requests-pending',
      label: '포럼 개설 신청 심사 대기',
      count: forum.requestsPending,
      link: '/operator/forum-requests',
    });
  }
  if (forum && forum.deletePending > 0) {
    actionQueue.push({
      id: 'forum-deletes-pending',
      label: '게시물 삭제 요청 심사 대기',
      count: forum.deletePending,
      link: '/operator/forum-delete-requests',
    });
  }

  const config: OperatorDashboardConfig = {
    kpis,
    actionQueue,
    activityLog: activity ?? [],
    quickActions: [
      { id: 'memberships', label: '가입 신청 관리', link: '/operator/memberships' },
      { id: 'members', label: '회원 관리', link: '/operator/members' },
      { id: 'forum', label: '포럼 운영', link: '/operator/forum' },
      { id: 'analytics', label: '운영 분석', link: '/operator/analytics' },
    ],
    aboveBlocks: (
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h1 className="mb-1 text-lg font-semibold text-slate-800">{BRAND.name} 운영자</h1>
        <p className="m-0 text-sm text-slate-500">
          가입·회원 운영과 커뮤니티(포럼) 운영을 담당합니다.
          공급자 ↔ 약국 간 상품 거래와 공급자 콘텐츠 전달에는 운영자가 개입하지 않습니다.
        </p>
        {degraded.length > 0 && (
          <p className="mt-3 mb-0 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
            {degraded.join(' · ')} 을(를) 불러오지 못했습니다. 해당 항목은 표시되지 않습니다.
            <button
              onClick={load}
              className="ml-2 underline underline-offset-2 hover:text-amber-900"
            >
              다시 시도
            </button>
          </p>
        )}
      </section>
    ),
  };

  return <OperatorDashboardLayout config={config} />;
}
