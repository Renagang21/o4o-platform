import { Link, Outlet } from 'react-router-dom';
import { PublicLegalFooterInfo } from '@o4o/shared-space-ui';
import { BRAND, SERVICE_KEY } from '../config/service';
import { loadFooterLegal } from '../lib/footerLegal';
import { useAuth } from '../contexts/AuthContext';

export default function SiteShell() {
  const { isAuthenticated, logout } = useAuth();
  return <div className="site">
    <header className="header">
      <Link className="brand" to="/">{BRAND.name}</Link>
      <nav className="nav">
        <Link to="/">홈</Link><Link to="/instructor">강사</Link><Link to="/operator">운영</Link>
        {isAuthenticated ? <button className="link-button" type="button" onClick={logout}>로그아웃</button> : <Link to="/login">로그인</Link>}
      </nav>
    </header>
    <div className="content"><Outlet /></div>
    <footer className="footer">
      <div className="footer-links"><Link to="/terms">이용약관</Link><Link to="/privacy">개인정보처리방침</Link><a href="https://neture.co.kr">Neture</a></div>
      <PublicLegalFooterInfo serviceKey={SERVICE_KEY} loadProfile={loadFooterLegal} />
      <p>© {new Date().getFullYear()} Neture · {BRAND.name}</p>
    </footer>
  </div>;
}
