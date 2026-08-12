/**
 * BranchLayout — 분회 홈페이지 고정 템플릿 셸 ('classic')
 * WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1
 *
 * 페이지 빌더가 아니다. 헤더(로고·분회명) / 메뉴(홈·공지·자료실) / 푸터(연락처)로 고정한다.
 * 운영자 메뉴는 서비스 역할(kpa-branch:operator 이상)이 있을 때만 노출하고,
 * 실제 접근 가능 여부는 backend 가 분회 축까지 검사해 판정한다.
 */
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { getPublicSite, getOperatorSite, type BranchSite } from '../lib/api/branch';
import { useAuth } from '../contexts/AuthContext';
import { ROLES, satisfiesRole } from '../config/service';

export function BranchLayout({ slug, basePath }: { slug: string; basePath: string }) {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const [site, setSite] = useState<BranchSite | null>(null);
  const [error, setError] = useState<string | null>(null);

  const roles: string[] = (user?.roles as string[] | undefined) ?? [];
  const canOperate = satisfiesRole(roles, ROLES.operator);
  const isOperatorArea = location.pathname.includes('/operator/');

  useEffect(() => {
    let alive = true;
    setError(null);
    // 운영자 영역에서는 미게시 상태도 보여야 하므로 운영자 조회를 쓴다.
    const load = isOperatorArea && canOperate ? getOperatorSite(slug) : getPublicSite(slug);
    load
      .then((s) => alive && setSite(s))
      .catch((e: unknown) => {
        if (!alive) return;
        const status = (e as { response?: { status?: number } })?.response?.status;
        setError(status === 404 ? '아직 공개되지 않은 분회 홈페이지입니다.' : '분회 정보를 불러오지 못했습니다.');
      });
    return () => {
      alive = false;
    };
  }, [slug, isOperatorArea, canOperate]);

  const nav = [
    { to: basePath || '/', label: '홈', end: true },
    { to: `${basePath}/notices`, label: '공지', end: false },
    { to: `${basePath}/resources`, label: '자료실', end: false },
    // 신상신고는 로그인 회원만 쓸 수 있다. 메뉴 노출은 UX 안내일 뿐이고
    // 실제 경계는 backend 의 member 스코프 + 분회 축 가드가 판정한다.
    ...(isAuthenticated
      ? [{ to: `${basePath}/mypage/annual-report`, label: '신상신고', end: false }]
      : []),
  ];

  const operatorNav = [
    { to: `${basePath}/operator/site`, label: '홈페이지 설정' },
    { to: `${basePath}/operator/posts`, label: '글 관리' },
    { to: `${basePath}/operator/domains`, label: '도메인 연결' },
  ];

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
                <Link to="/me" className="text-gray-600 hover:text-gray-900">내 분회</Link>
                <button type="button" onClick={logout} className="text-gray-500 hover:text-gray-900">로그아웃</button>
              </span>
            ) : (
              <Link to="/login" className="text-gray-600 hover:text-gray-900">로그인</Link>
            )}
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-4 px-4 pb-3 text-sm">
          {nav.map((n) => (
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
          {canOperate && (
            <span className="ml-auto flex gap-4">
              {operatorNav.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  className={({ isActive }) =>
                    isActive ? 'font-semibold text-primary-700' : 'text-gray-500 hover:text-gray-900'
                  }
                >
                  {n.label}
                </NavLink>
              ))}
            </span>
          )}
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
