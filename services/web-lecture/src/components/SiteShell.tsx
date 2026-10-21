import { OperatorInboxLink } from '@o4o/operator-core-ui';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { PublicLegalFooterInfo, ServiceContactInboxLink } from '@o4o/shared-space-ui';
import { BRAND, SERVICE_KEY } from '../config/service';
import { loadFooterLegal } from '../lib/footerLegal';
import { MyHomeButton, O4OHomeButton, ServiceAccountMenu } from '@o4o/auth-react';
import { useAuth } from '../contexts/AuthContext';
import { authClient } from '../lib/apiClient';
import { canAccess } from './AccessGate';

export default function SiteShell() {
  // WO-O4O-CROSS-SERVICE-PUBLIC-DESIGN-FINAL-POLISH-V1: 세션 복구 중에는 O4O 홈을 비활성으로 둔다(handoff 없이 이동 방지 — 공통 authLoading 패턴)
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const location = useLocation();
  return <div className="site">
    <header className="header">
      <Link className="brand" to="/">{BRAND.name}</Link>
      <nav className="nav">
        <Link to="/courses">강의</Link>
        <Link to="/contact">이용 · 개설 문의</Link>
        {isAuthenticated && <Link to="/my/enrollments">내 학습</Link>}
        {(canAccess('instructor', user) || canAccess('operator', user)) && <details className="work-menu">
          <summary>업무 메뉴</summary>
          <nav aria-label="강의 업무 메뉴">
            {canAccess('instructor', user) && <Link to="/instructor">강사</Link>}
            {canAccess('operator', user) && <><Link to="/operator">운영</Link><OperatorInboxLink key={user?.id} client={authClient.api} endpoint="/operator-inbox/service/lecture" href="/operator/inbox"/>{canAccess('admin', user) && <Link to="/operator/operators">Operator 지정 · 해제</Link>}<Link to="/operator/home-presentation">Hero · 광고 관리</Link><ServiceContactInboxLink client={authClient.api} serviceKey="lecture" accountId={user?.id} enabled={canAccess('operator',user)} href="/operator/contact" />{canAccess('admin',user) && <a href="https://neture.co.kr/operator/service-contact/lecture/settings">문의 알림 설정</a>}<Link to="/operator/members">회원 관리</Link></>}
          </nav>
        </details>}
      </nav>
      <div className="header-actions" aria-label="계정">
        {/* WO-O4O-REPRESENTATIVE-ENTRY-RETURN-HANDOFF-AND-HOME-NAVIGATION-V1: O4O 홈(로그인 유지) · 로그아웃 = 해당 서브도메인의 현재 브라우저 세션 종료 */}
        <span className="inline-flex flex-wrap items-center gap-3"><MyHomeButton accountId={user?.id} api={authClient.api} isAuthenticated={isAuthenticated} authLoading={authLoading} className="o4o-home-link" /><O4OHomeButton api={authClient.api} isAuthenticated={isAuthenticated} authLoading={authLoading} className="o4o-home-link" /></span>
        {isAuthenticated && user ? <ServiceAccountMenu key={user.id} displayName={user.name || '사용자'} email={user.email} onLogout={logout} /> : <><Link to="/login" state={{ from: `${location.pathname}${location.search}` }}>로그인</Link><a href="https://neture.co.kr/signup">회원가입</a></>}
      </div>
    </header>
    <div className="content"><Outlet /></div>
    <footer className="footer">
      <div className="footer-links"><Link to="/terms">이용약관</Link><Link to="/privacy">개인정보처리방침</Link><O4OHomeButton api={authClient.api} isAuthenticated={isAuthenticated} authLoading={authLoading} className="link-button footer-o4o-home" /></div>
      <PublicLegalFooterInfo serviceKey={SERVICE_KEY} loadProfile={loadFooterLegal} />
      <p>© {new Date().getFullYear()} Neture · {BRAND.name}</p>
    </footer>
  </div>;
}
