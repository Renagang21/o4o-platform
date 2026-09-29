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
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { MyPageAuthRequired, MyPageLayout, MyPageLoadingState } from '@o4o/account-ui';
import { useAuth } from '../../contexts';
import { useLoginModal } from '../../contexts/LoginModalContext';
import {
  approveJoinRequest,
  canApproveJoin,
  communityOperatorErrorMessage,
  listJoinRequests,
  listOperatedCommunities,
  rejectJoinRequest,
  type JoinRequestRow,
  type OperatedCommunity,
} from '../../lib/api/communityOperator';
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
  const [rows, setRows] = useState<JoinRequestRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setRows(null);
    setError(null);
    listJoinRequests(community.slug, 'pending')
      .then(setRows)
      .catch((e) => setError(communityOperatorErrorMessage(e, '가입 신청 목록을 불러오지 못했습니다.')));
  }, [community.slug]);

  useEffect(load, [load]);

  const act = async (row: JoinRequestRow, kind: 'approve' | 'reject') => {
    let reason: string | null = null;
    if (kind === 'reject') {
      const input = window.prompt('거절 사유를 입력하세요(선택).');
      if (input === null) return;
      reason = input.trim() || null;
    }
    setBusyId(row.id);
    setNotice(null);
    setError(null);
    try {
      if (kind === 'approve') await approveJoinRequest(community.slug, row.id);
      else await rejectJoinRequest(community.slug, row.id, reason);
      setNotice(kind === 'approve' ? `${row.name ?? '신청자'} 님의 가입을 승인했습니다.` : '가입 신청을 거절했습니다.');
      load();
      onChanged();
    } catch (e) {
      setError(communityOperatorErrorMessage(e, kind === 'approve' ? '가입 승인에 실패했습니다.' : '가입 거절에 실패했습니다.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="mt-4 text-sm">
      {notice && <p className="mt-2 text-green-700">{notice}</p>}
      {error && <p className="mt-2 text-red-600">{error}</p>}
      {rows === null && !error && <p className="mt-3 text-gray-500">불러오는 중입니다…</p>}
      {rows && rows.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                <th className="py-2">이름</th>
                <th className="py-2">이메일</th>
                <th className="py-2">서비스 이용</th>
                <th className="py-2">신청일</th>
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
                  <td className="py-2 text-gray-600">{new Date(r.createdAt).toLocaleDateString('ko-KR')}</td>
                  <td className="whitespace-nowrap py-2 text-right">
                    <button
                      type="button"
                      disabled={busyId === r.id || !canApproveJoin(r)}
                      title={canApproveJoin(r) ? undefined : '서비스 이용이 정지된 신청자는 승인할 수 없습니다.'}
                      onClick={() => act(r, 'approve')}
                      className="rounded bg-primary-600 px-3 py-1 text-xs text-white disabled:opacity-50"
                    >
                      승인
                    </button>
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => act(r, 'reject')}
                      className="ml-2 rounded border border-gray-300 px-3 py-1 text-xs text-gray-700 disabled:opacity-50"
                    >
                      거절
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows?.length === 0 && <p className="mt-3 text-gray-500">심사 대기 중인 가입 신청이 없습니다.</p>}
    </section>
  );
}

export default function MyCommunityOperatorPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { openLoginModal } = useLoginModal();
  const [communities, setCommunities] = useState<OperatedCommunity[] | null>(null);
  const [selected, setSelected] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    listOperatedCommunities()
      .then((list) => {
        setCommunities(list);
        setSelected((cur) => (cur && list.some((c) => c.slug === cur) ? cur : list[0]?.slug ?? ''));
      })
      .catch((e) => setError(communityOperatorErrorMessage(e, '운영 중인 커뮤니티를 불러오지 못했습니다.')));
  }, []);

  useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated, load]);

  const layout = (children: ReactNode, roles: readonly string[] = []) => (
    <MyPageLayout
      title="커뮤니티 가입 심사"
      breadcrumb={[{ label: '홈', href: '/' }, { label: '마이페이지', href: '/mypage' }, { label: '커뮤니티 가입 심사' }]}
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
        description="커뮤니티 가입 심사는 로그인 후 이용할 수 있습니다."
        actionLabel="로그인"
        onAction={() => openLoginModal('/mypage/communities')}
      />,
    );
  }

  const current = communities?.find((c) => c.slug === selected) ?? null;

  return layout(
    <div className="text-sm">
      <p className="text-xs text-gray-500">
        내가 운영자로 있는 커뮤니티의 가입 신청만 심사합니다. 서비스 이용이 정지된 신청자는 승인되지 않습니다.
      </p>
      {error && <p className="mt-3 text-red-600">{error}</p>}
      {communities === null && !error && <p className="mt-4 text-gray-500">불러오는 중입니다…</p>}
      {communities && communities.length > 0 && (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            {communities.map((c) => (
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
          {current && <JoinRequestsPanel key={current.slug} community={current} onChanged={load} />}
        </>
      )}
      {communities?.length === 0 && !error && (
        <p className="mt-4 text-gray-500">운영자로 지정된 커뮤니티가 없습니다.</p>
      )}
    </div>,
    user.roles,
  );
}
