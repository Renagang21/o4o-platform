/**
 * MyCommunityOperatorPage — 담당 커뮤니티의 가입 심사·회원 상태·이력 관리
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1
 *
 * 개별 커뮤니티의 가입 심사는 그 커뮤니티 운영자가 한다(Admin · 커뮤니티 서비스 관리자가 아니다).
 * `/mypage/communities` 관리 경로의 공식 호스트는 community.neture.co.kr이다(HostBoundary).
 *
 * 목록은 세션 사용자가 **운영자로 있는 커뮤니티만** 온다(`GET /communities/operating`).
 * 심사 요청은 매번 backend 개체 운영자 가드가 다시 판정한다 — 다른 커뮤니티 slug 를 넣어도 403 이다.
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { MyPageAuthRequired, MyPageLayout, MyPageLoadingState } from '@o4o/account-ui';
import { useAuth } from '../../contexts';
import { useLoginModal } from '../../contexts/LoginModalContext';
import { communityOperatorErrorMessage, listOperatedCommunities, type OperatedCommunity } from '../../lib/api/communityOperator';
import { CommunityMembersPanel } from './community-members/CommunityMembersPanel';
import { useLatestRequest } from '../../hooks/useLatestRequest';
import { getNetureMyPageNavItems } from './navItems';

export default function MyCommunityOperatorPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { openLoginModal } = useLoginModal();
  const [communities, setCommunities] = useState<OperatedCommunity[] | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const beginList = useLatestRequest(user?.id ?? '');

  const load = useCallback(async () => {
    setError(null);
    const current = beginList();
    return listOperatedCommunities()
      .then((list) => {
        if (!current()) return false;
        setCommunities(list);
        setLoadedFor(user?.id ?? null);
        setSelected((cur) => (cur && list.some((c) => c.slug === cur) ? cur : list[0]?.slug ?? ''));
        return true;
      })
      .catch(e => { if (current()) setError(communityOperatorErrorMessage(e, '운영 중인 커뮤니티를 불러오지 못했습니다.')); return false; });
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
        담당 커뮤니티의 가입 신청을 심사합니다. 회원 정지·해제·탈퇴와 이력 조회는 Admin만 할 수 있습니다. 중앙에서 지정한 커뮤니티 서비스 Admin/Operator는 전체 독립 커뮤니티를 관리합니다. 최초 서비스 가입은 승인과 함께 생성하며, 기존 서비스 가입이 비활성 상태인 신청자는 서비스 회원 관리에서 먼저 처리해야 합니다.
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
          {current && <CommunityMembersPanel key={`${user.id}:${current.slug}`} community={current} onChanged={load} />}
        </>
      )}
      {visibleCommunities?.length === 0 && !error && (
        <p className="mt-4 text-gray-500">운영자로 지정된 커뮤니티가 없습니다.</p>
      )}
    </div>,
    user.roles,
  );
}
