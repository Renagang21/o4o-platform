import { Link, Outlet } from 'react-router-dom';
import { PublicLegalFooterInfo } from '@o4o/shared-space-ui';
import { BRAND, SERVICE_KEY } from '../config/service';
import { loadFooterLegal } from '../lib/footerLegal';
import { O4OHomeButton, O4O_LOGOUT_LABEL } from '@o4o/auth-react';
import { useAuth } from '../contexts/AuthContext';
import { authClient } from '../lib/apiClient';
import { canAccess } from './AccessGate';

export default function SiteShell() {
  const { user, isAuthenticated, logout } = useAuth();
  return <div className="site">
    <header className="header">
      <Link className="brand" to="/">{BRAND.name}</Link>
      <nav className="nav">
        <Link to="/courses">강의</Link>
        {isAuthenticated && <Link to="/my/enrollments">내 학습</Link>}
        {canAccess('instructor', user) && <Link to="/instructor">강사</Link>}
        {canAccess('operator', user) && <Link to="/operator">운영</Link>}
        {/* WO-O4O-REPRESENTATIVE-ENTRY-RETURN-HANDOFF-AND-HOME-NAVIGATION-V1: O4O 홈(로그인 유지) · 로그아웃 = O4O 계정 전체 종료 */}
        <O4OHomeButton api={authClient.api} isAuthenticated={isAuthenticated} className="link-button" />
        {isAuthenticated ? <button className="link-button" type="button" onClick={logout}>{O4O_LOGOUT_LABEL}</button> : <Link to="/login">로그인</Link>}
      </nav>
    </header>
    <div className="content"><Outlet /></div>
    <footer className="footer">
      <div className="footer-links"><Link to="/terms">이용약관</Link><Link to="/privacy">개인정보처리방침</Link><O4OHomeButton api={authClient.api} isAuthenticated={isAuthenticated} className="link-button footer-o4o-home" /></div>
      <PublicLegalFooterInfo serviceKey={SERVICE_KEY} loadProfile={loadFooterLegal} />
      <p>© {new Date().getFullYear()} Neture · {BRAND.name}</p>
    </footer>
  </div>;
}
