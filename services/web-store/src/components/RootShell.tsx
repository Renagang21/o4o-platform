/**
 * 공통 root shell — WO-O4O-UNIFIED-STORE-WORKSPACE-FOUNDATION-V1 §3-⑥
 * 홈 · 내 매장 · 서비스 업무 · 내 서비스 · 설정을 제공한다. HUB 기능은 내 매장에 배치한다.
 * `내 매장: ○○ ▼` 로 언제든 매장을 바꾼다(Selector 재진입).
 */
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { PublicLegalFooterInfo } from '@o4o/shared-space-ui';
import { BRAND, PLATFORM_LEGAL_SERVICE_KEY, PLATFORM_ORIGIN, ROOT_NAV_ITEMS, WORKSPACE_PATHS } from '../config/workspace';
import { loadFooterLegal } from '../lib/footerLegal';
import { O4OHomeButton, O4O_LOGOUT_LABEL } from '@o4o/auth-react';
import { useAuth } from '../contexts/AuthContext';
import { authClient } from '../lib/apiClient';
import { useUnifiedStore } from '../contexts/StoreContext';
import { withReturnTo } from '../lib/returnTo';

function StoreSwitcher() {
  const { status, organizationName, stores, clearStore } = useUnifiedStore();
  const navigate = useNavigate();
  if (status !== 'ready' && status !== 'resolving') return null;
  const canSwitch = stores.length > 1;
  return (
    <button
      type="button"
      className="store-switcher"
      data-testid="store-switcher"
      disabled={!canSwitch}
      title={canSwitch ? '다른 매장 선택' : '접근 가능한 매장이 1개입니다'}
      onClick={() => { clearStore(); navigate(WORKSPACE_PATHS.select); }}
    >
      내 매장: {organizationName || '이름 없음'}{canSwitch ? ' ▼' : ''}
    </button>
  );
}

export default function RootShell() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  // 상단 로그인도 원래 경로를 보존한다(§21-19 운영 실측에서 발견 — 본문 카드만 보존하고 있었다)
  const { pathname, search, hash } = useLocation();
  const navItems = ROOT_NAV_ITEMS;
  const { organizationId } = useUnifiedStore();
  return <div className="site">
    <header className="header">
      <div className="header-left">
        <Link className="brand" to={WORKSPACE_PATHS.home}>{BRAND.name}</Link>
        <StoreSwitcher />
      </div>
      <nav className="nav" aria-label="매장 업무공간" data-testid="root-nav">
        {navItems.map((item) => (
          <NavLink key={item.key} to={item.to} end={item.end} className={({ isActive }) => (isActive ? 'active' : undefined)}>
            {item.label}
          </NavLink>
        ))}
        {user?.roles?.some(r => ['neture:operator', 'neture:admin', 'platform:super_admin'].includes(r)) && <NavLink to="/operator/pharmacy-memberships">매장 신청 심사</NavLink>}
      </nav>
      {/* WO-O4O-CROSS-SERVICE-PUBLIC-DESIGN-FINAL-POLISH-V1: O4O 홈 · 계정은 nav 와 분리한다 — 모바일에서 brand 와 같은 첫 줄에 두고 nav 만 둘째 줄로 내린다.
          세션 복구 중에는 O4O 홈을 비활성으로 둔다(authLoading — 다른 서비스 헤더와 같은 공통 패턴). */}
      <div className="header-actions">
        {/* WO-O4O-REPRESENTATIVE-ENTRY-RETURN-HANDOFF-AND-HOME-NAVIGATION-V1: O4O 홈(로그인 유지) · 로그아웃 = 해당 서브도메인의 현재 브라우저 세션 종료 */}
        <O4OHomeButton api={authClient.api} isAuthenticated={isAuthenticated} authLoading={authLoading} className="o4o-home-link" />
        {isAuthenticated
          ? <button className="link-button" type="button" onClick={logout}>{O4O_LOGOUT_LABEL}</button>
          : <Link to={withReturnTo(WORKSPACE_PATHS.login, `${pathname}${search}${hash}`)}>로그인</Link>}
      </div>
    </header>
    <div className="content"><Outlet key={organizationId ?? 'no-store'} /></div>
    <footer className="footer">
      <div className="footer-links">
        <a href={`${PLATFORM_ORIGIN}/terms`}>이용약관</a>
        <a href={`${PLATFORM_ORIGIN}/privacy`}>개인정보처리방침</a>
        <O4OHomeButton api={authClient.api} isAuthenticated={isAuthenticated} authLoading={authLoading} className="link-button footer-o4o-home" />
      </div>
      <PublicLegalFooterInfo serviceKey={PLATFORM_LEGAL_SERVICE_KEY} loadProfile={loadFooterLegal} />
      <p>© {new Date().getFullYear()} Neture · {BRAND.name}</p>
    </footer>
  </div>;
}
