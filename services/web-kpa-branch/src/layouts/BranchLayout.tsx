/**
 * BranchLayout — 분회 홈페이지 고정 템플릿 셸 ('classic')
 * WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1
 *
 * 페이지 빌더가 아니다. 헤더(로고·분회명) / 메뉴(공개·회원·운영자 3계층) / 푸터(연락처)로 고정한다.
 * 운영자 메뉴는 서비스 역할(kpa-branch:operator 이상)이 있을 때만 노출하고,
 * 실제 접근 가능 여부는 backend 가 분회 축까지 검사해 판정한다.
 *
 * WO-O4O-KPA-BRANCH-IA-AND-NAVIGATION-FINALIZATION-V1:
 *   §8 메뉴는 공개 / 회원 / 운영자 3계층으로 분리한다. **메뉴 숨김은 보안이 아니다** —
 *   서버 guard 는 그대로이고 여기서는 "지금 쓸 수 있는 것" 만 보여준다.
 *   세션 복구가 끝나기 전(isAuthLoading)에는 회원·운영자 그룹을 아예 렌더하지 않는다.
 *   회원 그룹은 kpa-branch 회원 역할이 있을 때만, 운영자 그룹은 operator 이상일 때만 렌더한다
 *   (역할 표는 backend `KPA_BRANCH_SCOPE_CONFIG` 와 1:1 — `platform:super_admin` 포함).
 *   익명 메뉴가 잠깐 보였다가 회원 메뉴로 바뀌는 flicker 를 막는다.
 *   §9 모바일에서는 같은 그룹을 접이식 메뉴로 세로 배치한다 — 새 bottom-nav 를 만들지 않는다.
 */
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { getPublicSite, getOperatorSite, type BranchSite } from '../lib/api/branch';
import { useAuth } from '../contexts/AuthContext';
import { ROLES, satisfiesRole } from '../config/service';
import NotFoundPage from '../pages/NotFoundPage';

export function BranchLayout({ slug, basePath }: { slug: string; basePath: string }) {
  const { user, isAuthenticated, isLoading: isAuthLoading, logout } = useAuth();
  const location = useLocation();
  const [site, setSite] = useState<BranchSite | null>(null);
  const [error, setError] = useState<string | null>(null);
  // WO-O4O-KPA-BRANCH-PUBLIC-PATH-ROUTING-AND-CUSTOM-DOMAIN-BASELINE-V1:
  //   `/kpa/{존재하지 않는 slug}` 를 "미게시 분회" 로 뭉개지 않는다.
  //   backend 는 두 상황을 다른 code 로 구분해 준다 —
  //     BRANCH_NOT_FOUND         : slug 자체가 없다        → 404 화면
  //     BRANCH_SITE_NOT_PUBLISHED: 분회는 있고 미게시다     → 셸 + 안내
  const [branchMissing, setBranchMissing] = useState(false);
  /** 모바일 접이식 메뉴. 데스크톱(md 이상)에서는 항상 펼쳐진다. */
  const [menuOpen, setMenuOpen] = useState(false);

  const roles: string[] = (user?.roles as string[] | undefined) ?? [];
  // 회원 메뉴 게이트는 "로그인했는가"가 아니라 "kpa-branch 회원인가"다.
  //   kpa-society 등 형제 서비스 세션으로도 isAuthenticated 는 true 가 된다. 그 사용자는
  //   `/me/*` 가 전부 403 이므로 회원 메뉴를 띄우면 전부 막힌 링크만 보여주는 셈이다.
  //   판정 근거는 backend scopeRoleMapping 과 같은 표(`config/service.ts`) 뿐이다.
  const canUseMemberArea = satisfiesRole(roles, ROLES.member);
  const canOperate = satisfiesRole(roles, ROLES.operator);
  const isOperatorArea = location.pathname.includes('/operator/');

  // 라우트가 바뀌면 모바일 메뉴를 닫는다 — 이동 후 메뉴가 화면을 덮고 있으면 안 된다.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    let alive = true;
    setError(null);
    setBranchMissing(false);
    // WO-O4O-KPA-BRANCH-BRANCHLAYOUT-SITE-PREFETCH-404-CLOSURE-V1:
    //   세션 복구가 끝나기 전에는 운영자 여부(canOperate)를 알 수 없다. 그 사이에 조회를 먼저 쏘면
    //   auth 확정 뒤 effect 가 다시 돌면서 같은 조회를 한 번 더 하게 되고, 미게시 분회에서는 그
    //   버려지는 요청이 그대로 404 로 남는다. 요청 자체를 미룬다(404 를 숨기는 것이 아니다).
    //   비로그인 방문자는 isLoading 이 처음부터 false 이므로 공개 조회가 지연 없이 나간다.
    if (isAuthLoading) return;
    // 운영자 영역에서는 미게시 상태도 보여야 하므로 운영자 조회를 쓴다.
    const load = isOperatorArea && canOperate ? getOperatorSite(slug) : getPublicSite(slug);
    load
      .then((s) => alive && setSite(s))
      .catch((e: unknown) => {
        if (!alive) return;
        const res = (e as { response?: { status?: number; data?: { code?: string } } })?.response;
        if (res?.data?.code === 'BRANCH_NOT_FOUND') {
          setBranchMissing(true);
          return;
        }
        setError(res?.status === 404 ? '아직 공개되지 않은 분회 홈페이지입니다.' : '분회 정보를 불러오지 못했습니다.');
      });
    return () => {
      alive = false;
    };
  }, [slug, isOperatorArea, canOperate, isAuthLoading]);

  type NavItem = { to: string; label: string; end?: boolean };
  type NavGroup = { key: string; label: string | null; items: NavItem[] };

  // 공개 — 홍보·정보 제공. 회의록은 여기 두지 않는다(회원 전용 계약 유지).
  const publicGroup: NavGroup = {
    key: 'public',
    label: null,
    items: [
      { to: basePath || '/', label: '홈', end: true },
      { to: `${basePath}/notices`, label: '공지' },
      { to: `${basePath}/events`, label: '행사' },
      { to: `${basePath}/resources`, label: '자료실' },
      { to: `${basePath}/officers`, label: '임원소개' },
    ],
  };

  // 회원 — 내 업무 3축(신상신고·회비·연수교육) + 행사 참가 + 회원 전용 회의 자료.
  const memberGroup: NavGroup = {
    key: 'member',
    label: '회원',
    items: [
      { to: `${basePath}/mypage`, label: '내 정보', end: true },
      { to: `${basePath}/mypage/annual-report`, label: '신상신고' },
      { to: `${basePath}/mypage/fees`, label: '회비' },
      { to: `${basePath}/mypage/education`, label: '연수교육' },
      { to: `${basePath}/mypage/events`, label: '행사 참가신청' },
      { to: `${basePath}/meetings`, label: '회의록' },
    ],
  };

  // 운영자 — 업무 축으로 묶는다. 회원 업무 콘솔이 회원관리의 대표 진입점이다.
  const operatorGroups: NavGroup[] = [
    {
      key: 'op-members',
      label: '운영 · 회원',
      items: [
        { to: `${basePath}/operator/members`, label: '회원관리' },
        { to: `${basePath}/operator/annual-reports`, label: '신상신고 검수' },
        { to: `${basePath}/operator/fees`, label: '회비 관리' },
        { to: `${basePath}/operator/education`, label: '연수교육 원장' },
      ],
    },
    {
      key: 'op-content',
      label: '운영 · 콘텐츠',
      items: [
        { to: `${basePath}/operator/posts`, label: '글 관리' },
        { to: `${basePath}/operator/events`, label: '행사 관리' },
        { to: `${basePath}/operator/officers`, label: '임원 명부' },
      ],
    },
    {
      key: 'op-settings',
      label: '운영 · 분회 설정',
      items: [
        { to: `${basePath}/operator/site`, label: '사이트 정보' },
        { to: `${basePath}/operator/domains`, label: '도메인 연결' },
      ],
    },
  ];

  // 세션 복구 중에는 회원·운영자 그룹을 렌더하지 않는다 (flicker 방지).
  const groups: NavGroup[] = [
    publicGroup,
    ...(!isAuthLoading && isAuthenticated && canUseMemberArea ? [memberGroup] : []),
    ...(!isAuthLoading && canOperate ? operatorGroups : []),
  ];

  // 존재하지 않는 분회는 셸(헤더·메뉴·푸터)을 그리지 않는다 — 유효한 분회처럼 보이면 안 된다.
  if (branchMissing) {
    return <NotFoundPage />;
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link to={basePath || '/'} className="flex items-center gap-3">
            {site?.logoUrl ? (
              <img src={site.logoUrl} alt="" className="h-10 w-10 rounded object-contain" />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded bg-primary-600 text-sm font-bold text-white">
                분회
              </span>
            )}
            <span className="text-lg font-semibold text-gray-900">{site?.title ?? site?.branchName ?? '분회 홈페이지'}</span>
          </Link>
          <div className="text-sm">
            {isAuthenticated ? (
              <span className="flex items-center gap-3">
                {canUseMemberArea && (
                  <Link to={`${basePath}/mypage`} className="text-gray-600 hover:text-gray-900">내 정보</Link>
                )}
                <button type="button" onClick={logout} className="text-gray-500 hover:text-gray-900">로그아웃</button>
              </span>
            ) : (
              <Link to="/login" className="text-gray-600 hover:text-gray-900">로그인</Link>
            )}
          </div>
        </div>
        <nav className="mx-auto max-w-5xl px-4 pb-3 text-sm">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="branch-nav"
            className="mb-2 rounded border border-gray-300 px-3 py-1.5 text-gray-700 md:hidden"
          >
            메뉴 {menuOpen ? '닫기' : '열기'}
          </button>
          <div
            id="branch-nav"
            className={`${menuOpen ? 'block' : 'hidden'} space-y-2 md:block md:space-y-0`}
          >
            {groups.map((g) => (
              <div key={g.key} className="flex flex-col gap-1 md:flex-row md:flex-wrap md:items-center md:gap-4">
                {g.label && (
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-400 md:mr-1">
                    {g.label}
                  </span>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {g.items.map((n) => (
                    <NavLink
                      key={n.to}
                      to={n.to}
                      end={n.end}
                      className={({ isActive }) =>
                        isActive ? 'font-semibold text-primary-700' : 'text-gray-600 hover:text-gray-900'
                      }
                    >
                      {n.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {error && !isOperatorArea ? (
          <p className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{error}</p>
        ) : null}
        <Outlet />
      </main>

      <footer className="mt-16 border-t border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-gray-500">
          <p className="font-medium text-gray-700">{site?.branchName ?? ''}</p>
          {site?.contact?.address && <p>{site.contact.address}</p>}
          {site?.contact?.phone && <p>전화 {site.contact.phone}</p>}
          {site?.contact?.email && <p>이메일 {site.contact.email}</p>}
          {site?.contact?.hours && <p>운영시간 {site.contact.hours}</p>}
        </div>
      </footer>
    </div>
  );
}
