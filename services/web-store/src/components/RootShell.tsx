/**
 * 공통 root shell — WO-O4O-UNIFIED-STORE-WORKSPACE-FOUNDATION-V1 §3-⑥
 * 상위 nav 6개(홈 · 내 매장 · 서비스 업무 · 매장 HUB · 내 서비스 · 설정) 골격만. 하위 항목·기능은 WO B.
 * `내 매장: ○○ ▼` 로 언제든 매장을 바꾼다(Selector 재진입).
 */
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { PublicLegalFooterInfo } from '@o4o/shared-space-ui';
import { BRAND, PLATFORM_LEGAL_SERVICE_KEY, PLATFORM_ORIGIN, ROOT_NAV_ITEMS, WORKSPACE_PATHS } from '../config/workspace';
import { loadFooterLegal } from '../lib/footerLegal';
import { O4OHomeButton, O4O_LOGOUT_LABEL } from '@o4o/auth-react';
import { useAuth } from '../contexts/AuthContext';
import { authClient } from '../lib/apiClient';
import { useUnifiedStore } from '../contexts/StoreContext';

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
  const { isAuthenticated, logout } = useAuth();
  return <div className="site">
    <header className="header">
      <div className="header-left">
        <Link className="brand" to={WORKSPACE_PATHS.home}>{BRAND.name}</Link>
        <StoreSwitcher />
      </div>
      <nav className="nav" aria-label="매장 업무공간" data-testid="root-nav">
        {ROOT_NAV_ITEMS.map((item) => (
          <NavLink key={item.key} to={item.to} end={item.end} className={({ isActive }) => (isActive ? 'active' : undefined)}>
            {item.label}
          </NavLink>
        ))}
        {/* WO-O4O-REPRESENTATIVE-ENTRY-RETURN-HANDOFF-AND-HOME-NAVIGATION-V1: O4O 홈(로그인 유지) · 로그아웃 = O4O 계정 전체 종료 */}
        <O4OHomeButton api={authClient.api} isAuthenticated={isAuthenticated} className="link-button" />
        {isAuthenticated
          ? <button className="link-button" type="button" onClick={logout}>{O4O_LOGOUT_LABEL}</button>
          : <Link to={WORKSPACE_PATHS.login}>로그인</Link>}
      </nav>
    </header>
    <div className="content"><Outlet /></div>
    <footer className="footer">
      <div className="footer-links">
        <a href={`${PLATFORM_ORIGIN}/terms`}>이용약관</a>
        <a href={`${PLATFORM_ORIGIN}/privacy`}>개인정보처리방침</a>
        <O4OHomeButton api={authClient.api} isAuthenticated={isAuthenticated} className="link-button footer-o4o-home" />
      </div>
      <PublicLegalFooterInfo serviceKey={PLATFORM_LEGAL_SERVICE_KEY} loadProfile={loadFooterLegal} />
      <p>© {new Date().getFullYear()} Neture · {BRAND.name}</p>
    </footer>
  </div>;
}
