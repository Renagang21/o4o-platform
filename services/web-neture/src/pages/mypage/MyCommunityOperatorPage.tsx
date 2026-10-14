import { CommunityMemberListControls } from '../../components/community/CommunityMemberListControls';
import type { CommunityMemberPagination } from '../../lib/api/communityMemberList';
/**
 * MyCommunityOperatorPage — 내가 운영하는 커뮤니티의 가입 신청 심사
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1
 *
 * 개별 커뮤니티의 가입 심사는 그 커뮤니티 운영자가 한다(Admin · 커뮤니티 서비스 관리자가 아니다).
 * `/mypage` 는 neture.co.kr · community.neture.co.kr 공용 경로라 두 호스트 모두에서 열린다.
 *
 * 목록은 세션 사용자가 **운영자로 있는 커뮤니티만** 온다(`GET /communities/operating`).
 * 심사 요청은 매번 backend 개체 운영자 가드가 다시 판정한다 — 다른 커뮤니티 slug 를 넣어도 403 이다.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { MyPageAuthRequired, MyPageLayout, MyPageLoadingState } from '@o4o/account-ui';
import { useAuth } from '../../contexts';
import { useLoginModal } from '../../contexts/LoginModalContext';
import {
  approveJoinRequest,
  changeCommunityMember,
  listCommunityMemberHistory,
  type CommunityMembershipChange,
  type JoinRequestStatus,
  canApproveJoin,
  communityOperatorErrorMessage,
  listJoinRequests,
  listOperatedCommunities,
  rejectJoinRequest,
  type JoinRequestRow,
  type OperatedCommunity,
} from '../../lib/api/communityOperator';
import { useLatestRequest } from '../../hooks/useLatestRequest';
import { getNetureMyPageNavItems } from './navItems';

const SERVICE_STATUS_LABEL: Record<string, string> = {
  active: '이용 중',
  pending: '신청 중',
  suspended: '이용 정지',
  rejected: '반려',
  withdrawn: '탈퇴',
};

function JoinRequestsPanel({
  community,
  onChanged,
}: Readonly<{ community: OperatedCommunity; onChanged: () => void }>) {
  const [history, setHistory] = useState<CommunityMembershipChange[] | null>(null);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [pagination, setPagination] = useState<CommunityMemberPagination | null>(null);
  const [status, setStatus] = useState<JoinRequestStatus>('pending');
  const [rows, setRows] = useState<JoinRequestRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const processing = useRef(false);
  const beginList = useLatestRequest(`${community.slug}:${status}:${q}:${page}:${pageSize}`);
  const beginHistory = useLatestRequest(`${community.slug}:${status}:${q}:${page}:${pageSize}`);
  const beginAction = useLatestRequest(community.slug);

  const load = useCallback(() => {
    const current = beginList();
    setRows(null);
    setError(null);
    listJoinRequests(community.slug, status, { q, page, pageSize })
      .then(result => { if (current()) { setRows(result.rows); setPagination(result.pagination); setPage(result.pagination.page); } })
      .catch(e => { if (current()) setError(communityOperatorErrorMessage(e, '가입 신청 목록을 불러오지 못했습니다.')); });
  }, [community.slug, status, q, page, pageSize, beginList]);

  useEffect(() => { setHistory(null); setNotice(null); load(); }, [load]);

  const act = async (row: JoinRequestRow, kind: 'approve' | 'reject' | 'suspend' | 'restore' | 'withdraw') => {
    if (processing.current) return;
    let reason: string | null = null;
    if (kind !== 'approve') {
      const input = window.prompt(kind === 'reject' ? '거절 사유를 입력하세요(선택).' : '처리 사유를 입력하세요. 개인정보는 입력하지 마세요.');
      if (input === null) return;
      reason = input.trim() || null;
      if (kind !== 'reject' && !reason) { setError('처리 사유를 입력하세요.'); return; }
    }
    processing.current = true;
    const current = beginAction();
    setBusyId(row.id);
    setNotice(null);
    setError(null);
    try {
      if (kind === 'approve') await approveJoinRequest(community.slug, row.id);
      else if (kind === 'reject') await rejectJoinRequest(community.slug, row.id, reason);
      else await changeCommunityMember(community.slug, row.id, kind, reason!);
      if (!current()) return;
      setHistory(null);
      beginHistory();
      setNotice(kind === 'approve' ? `${row.name ?? '신청자'} 님의 가입을 승인했습니다.` : kind === 'reject' ? '가입 신청을 거절했습니다.' : '회원 상태를 변경했습니다.');
      load();
      onChanged();
    } catch (e) {
      if (current()) setError(communityOperatorErrorMessage(e, kind === 'approve' ? '가입 승인에 실패했습니다.' : kind === 'reject' ? '가입 거절에 실패했습니다.' : '회원 상태 변경에 실패했습니다.'));
    } finally {
      processing.current = false;
      if (current()) setBusyId(null);
    }
  };

  const showHistory = async (row: JoinRequestRow) => {
    if (processing.current) return;
    const current = beginHistory();
    setHistory(null);
    setError(null);
    try { const changes = await listCommunityMemberHistory(community.slug, row.id); if (current()) setHistory(changes); }
    catch (e) { if (current()) setError(communityOperatorErrorMessage(e, '변경 이력을 불러오지 못했습니다.')); }
  };

  return (
    <section className="mt-4 text-sm">
      <CommunityMemberListControls q={q} status={status} pageSize={pageSize} pagination={pagination}
        busy={busyId !== null} loading={rows === null}
        statuses={[{ value: 'pending', label: '가입 대기' }, { value: 'active', label: '활성' }, { value: 'suspended', label: '정지' }, { value: 'rejected', label: '반려' }, { value: 'withdrawn', label: '탈퇴' }]}
        onFilter={filter => { if (processing.current) return; setRows(null); setPagination(null); setQ(filter.q); setStatus(filter.status as JoinRequestStatus); setPageSize(filter.pageSize); setPage(1); if (filter.q === q && filter.status === status && filter.pageSize === pageSize && page === 1) load(); }}
        onPage={next => { if (processing.current) return; setRows(null); setPage(next); }} />
      {history && <div className="mt-3 rounded border p-3">
        <div className="flex justify-between"><strong>회원 변경 이력 (최근 50건)</strong><button type="button" onClick={() => { beginHistory(); setHistory(null); }}>닫기</button></div>
        {history.length === 0 && <p>변경 이력이 없습니다.</p>}
        {history.map(h => <p key={h.id} className="mt-2 text-xs">
          {new Date(h.created_at).toLocaleString('ko-KR')} · {h.actor_name ?? '시스템'} ·
          {h.before_role ?? '-'} → {h.after_role} · {h.before_status ?? '-'} → {h.after_status}
          {h.reason && <span className="block">{h.reason}</span>}
        </p>)}
      </div>}
      {notice && <p role="status" className="mt-2 text-green-700">{notice}</p>}
      {error && <div><p role="alert" className="mt-2 text-red-600">{error}</p><button type="button" className="min-h-11 rounded border px-3 py-2" disabled={busyId !== null} onClick={load}>다시 조회</button></div>}
      {rows === null && !error && <p className="mt-3 text-gray-500">불러오는 중입니다…</p>}
      {rows && rows.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                <th className="py-2">이름</th>
                <th className="py-2">이메일</th>
                <th className="py-2">서비스 이용</th>
                <th className="py-2">역할</th><th className="py-2">신청일</th>
                <th className="py-2 text-right">처리</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-100">
                  <td className="py-2 text-gray-800">{r.name ?? '-'}</td>
                  <td className="py-2 text-gray-600">{r.emailMasked ?? '-'}</td>
                  <td className="py-2 text-gray-600">
                    {r.serviceMembershipStatus ? SERVICE_STATUS_LABEL[r.serviceMembershipStatus] ?? r.serviceMembershipStatus : '미가입'}
                  </td>
                  <td className="py-2">{r.role === 'admin' ? 'Admin' : r.role === 'operator' ? 'Operator' : '회원'}</td>
                  <td className="py-2 text-gray-600">{new Date(r.createdAt).toLocaleDateString('ko-KR')}</td>
                  <td className="whitespace-nowrap py-2 text-right">
                    {r.status === 'pending' && (<>
                    <button
                      type="button"
                      disabled={busyId !== null || !canApproveJoin(r)}
                      title={canApproveJoin(r) ? undefined : '서비스 가입이 비활성 상태입니다. 서비스 회원 관리에서 처리한 뒤 승인해 주세요.'}
                      onClick={() => act(r, 'approve')}
                      className="rounded bg-primary-600 px-3 py-1 text-xs text-white disabled:opacity-50"
                    >
                      승인
                    </button>
                    <button
                      type="button"
                      disabled={busyId !== null}
                      onClick={() => act(r, 'reject')}
                      className="ml-2 rounded border border-gray-300 px-3 py-1 text-xs text-gray-700 disabled:opacity-50"
                    >
                      거절
                    </button>
                    </>)}
                    {community.canRestrictMembers && <button type="button" className="ml-2 rounded border px-3 py-1 text-xs" disabled={busyId !== null} onClick={() => showHistory(r)}>이력</button>}
                    {community.canRestrictMembers && (r.status === 'active' || r.status === 'suspended') && (<>
                      <button type="button" disabled={busyId !== null} onClick={() => act(r, r.status === 'active' ? 'suspend' : 'restore')}
                        className="rounded border px-3 py-1 text-xs disabled:opacity-50">{r.status === 'active' ? '정지' : '정지 해제'}</button>
                      <button type="button" disabled={busyId !== null} onClick={() => act(r, 'withdraw')}
                        className="ml-2 rounded border border-red-300 px-3 py-1 text-xs text-red-700 disabled:opacity-50">커뮤니티 탈퇴</button>
                    </>)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows?.length === 0 && <p className="mt-3 text-gray-500">검색 조건에 맞는 회원이 없습니다.</p>}
    </section>
  );
}

export default function MyCommunityOperatorPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { openLoginModal } = useLoginModal();
  const [communities, setCommunities] = useState<OperatedCommunity[] | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const beginList = useLatestRequest(user?.id ?? '');

  const load = useCallback(() => {
    setError(null);
    const current = beginList();
    listOperatedCommunities()
      .then((list) => {
        if (!current()) return;
        setCommunities(list);
        setLoadedFor(user?.id ?? null);
        setSelected((cur) => (cur && list.some((c) => c.slug === cur) ? cur : list[0]?.slug ?? ''));
      })
      .catch(e => { if (current()) setError(communityOperatorErrorMessage(e, '운영 중인 커뮤니티를 불러오지 못했습니다.')); });
  }, [beginList, user?.id]);

  useEffect(() => {
    setCommunities(null);
    setSelected('');
    if (isAuthenticated) load();
  }, [isAuthenticated, load]);

  const layout = (children: ReactNode, roles: readonly string[] = []) => (
    <MyPageLayout
      title="커뮤니티 회원 관리"
      breadcrumb={[{ label: '홈', href: '/' }, { label: 'My Home', href: '/mypage' }, { label: '커뮤니티 회원 관리' }]}
      width="wide"
      navItems={getNetureMyPageNavItems(roles)}
    >
      {children}
    </MyPageLayout>
  );

  if (isLoading) return layout(<MyPageLoadingState message="불러오는 중..." />);
  if (!isAuthenticated || !user) {
    return layout(
      <MyPageAuthRequired
        description="커뮤니티 회원 관리는 로그인 후 이용할 수 있습니다."
        actionLabel="로그인"
        onAction={() => openLoginModal('/mypage/communities')}
      />,
    );
  }

  const visibleCommunities = loadedFor === user.id ? communities : null;
  const current = visibleCommunities?.find((c) => c.slug === selected) ?? null;

  return layout(
    <div className="text-sm">
      <p className="text-xs text-gray-500">
        담당 커뮤니티의 가입 신청을 심사합니다. 중앙에서 지정한 커뮤니티 서비스 Admin/Operator는 전체 독립 커뮤니티를 관리합니다. 최초 서비스 가입은 승인과 함께 생성하며, 기존 서비스 가입이 비활성 상태인 신청자는 서비스 회원 관리에서 먼저 처리해야 합니다.
      </p>
      {error && <div><p role="alert" className="mt-3 text-red-600">{error}</p><button type="button" className="min-h-11 rounded border px-3 py-2" onClick={load}>다시 조회</button></div>}
      {visibleCommunities === null && !error && <p className="mt-4 text-gray-500">불러오는 중입니다…</p>}
      {visibleCommunities && visibleCommunities.length > 0 && (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            {visibleCommunities.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelected(c.slug)}
                className={`rounded border px-3 py-1 ${
                  c.slug === selected ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600'
                }`}
              >
                {c.name}
                {c.pendingCount > 0 && <span className="ml-1 text-xs text-amber-700">({c.pendingCount})</span>}
              </button>
            ))}
          </div>
          {current && <JoinRequestsPanel key={`${user.id}:${current.slug}`} community={current} onChanged={load} />}
        </>
      )}
      {visibleCommunities?.length === 0 && !error && (
        <p className="mt-4 text-gray-500">운영자로 지정된 커뮤니티가 없습니다.</p>
      )}
    </div>,
    user.roles,
  );
}
