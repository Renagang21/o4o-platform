/**
 * Header - K-Cosmetics
 * Based on GlycoPharm Header structure
 * WO-O4O-AUTH-MODAL-LOGIN-AND-ACCOUNT-STANDARD-V1: 중앙화된 LoginModal 사용
 * WO-O4O-GLOBAL-USER-PROFILE-DROPDOWN-EXTRACTION-V1: 사용자 드롭다운을 공통 컴포넌트로 교체
 */

import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';
import {
  GlobalUserProfileDropdown,
  getUserDisplayName,
  type GlobalUserProfileMenuItem,
} from '@o4o/account-ui';
import { useAuth, ROLE_LABELS, getKCosmeticsDashboardRoute } from '@/contexts/AuthContext';
import { useLoginModal } from '@/contexts/LoginModalContext';
import ServiceSwitcher from '../ServiceSwitcher';

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const { openLoginModal } = useLoginModal();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const dashboardPath = user?.roles[0] ? getKCosmeticsDashboardRoute(user.roles) : '/';
  const roleLabel = user?.roles[0] ? ROLE_LABELS[user.roles[0]] : '';
  const isStoreOwner = user?.roles.includes('cosmetics:store_owner') ?? false;

  const displayName = getUserDisplayName(user as any);

  const menuItems: GlobalUserProfileMenuItem[] = useMemo(() => [
    {
      key: 'dashboard',
      icon: <LayoutDashboard className="w-4 h-4 text-gray-500" />,
      label: '대시보드',
      href: dashboardPath,
    },
    {
      key: 'mypage',
      icon: <LayoutDashboard className="w-4 h-4 text-gray-500" />,
      label: '마이페이지',
      href: '/mypage',
    },
  ], [dashboardPath]);

  return (
    <header style={styles.header}>
      <div style={styles.container}>
        <div style={styles.inner}>
          {/* Logo */}
          <Link to="/" style={styles.logoLink}>
            <div style={styles.logoIcon}>💄</div>
            <div style={styles.logoText}>
              <span style={styles.logoTitle}>K-Cosmetics</span>
              <span style={styles.logoSubtitle}>K-Beauty 전문 플랫폼</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          {/* WO-KCOS-MENU-STRUCTURE-ALIGN-V1: 허브 추가, 문의하기 제거
               WO-KCOS-COMMUNITY-CONTENT-INTEGRATION-V1: 콘텐츠 제거 (커뮤니티 서브 페이지)
               WO-KCOS-COMMUNITY-FORUM-STRUCTURE-ALIGN-V1: 포럼 제거 (커뮤니티 내부 전문 영역) */}
          <nav style={styles.nav}>
            <Link to="/" style={styles.navLink}>홈</Link>
            {isStoreOwner && (
              <Link to="/store-hub" style={styles.navLink}>허브</Link>
            )}
            <Link to="/community" style={styles.navLink}>커뮤니티</Link>
            {isAuthenticated && (
              <Link to="/store" style={styles.navLinkAccent}>매장 관리</Link>
            )}
          </nav>

          {/* Desktop User Actions */}
          <div style={styles.actions}>
            {isAuthenticated && <ServiceSwitcher currentServiceKey="k-cosmetics" />}
            {isAuthenticated && user ? (
              <GlobalUserProfileDropdown
                user={{ displayName, email: user.email, roleLabel }}
                menuItems={menuItems}
                onLogout={handleLogout}
              />
            ) : (
              <>
                <button onClick={openLoginModal} style={styles.loginLink}>로그인</button>
                <Link to="/register" style={styles.registerButton}>회원가입</Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={styles.mobileMenuButton}
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div style={styles.mobileMenu}>
            <nav style={styles.mobileNav}>
              <Link to="/" style={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>홈</Link>
              {isStoreOwner && (
                <Link to="/store-hub" style={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>허브</Link>
              )}
              <Link to="/community" style={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>커뮤니티</Link>
              {isAuthenticated && (
                <Link to="/store" style={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>매장 관리</Link>
              )}
            </nav>
            <div style={styles.mobileActions}>
              {isAuthenticated ? (
                <>
                  <Link to="/mypage" style={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>마이페이지</Link>
                  <button onClick={handleLogout} style={styles.mobileLogout}>로그아웃</button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openLoginModal();
                    }}
                    style={styles.mobileLoginLink}
                  >
                    로그인
                  </button>
                  <Link to="/register" style={styles.mobileRegisterButton} onClick={() => setMobileMenuOpen(false)}>회원가입</Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(226, 232, 240, 0.5)',
  },
  container: {
    maxWidth: '1280px',
    margin: '0 auto',
    padding: '0 16px',
  },
  inner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '64px',
  },
  logoLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    textDecoration: 'none',
  },
  logoIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #e91e63, #c2185b)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    boxShadow: '0 4px 12px rgba(233, 30, 99, 0.25)',
  },
  logoText: {
    display: 'flex',
    flexDirection: 'column',
  },
  logoTitle: {
    fontWeight: 700,
    fontSize: '20px',
    color: '#1e293b',
  },
  logoSubtitle: {
    fontSize: '10px',
    color: '#64748b',
    marginTop: '-2px',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  navLink: {
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#475569',
    textDecoration: 'none',
    transition: 'all 0.2s',
  },
  navLinkAccent: {
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#e91e63',
    textDecoration: 'none',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  loginLink: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#475569',
    textDecoration: 'none',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
  },
  registerButton: {
    padding: '8px 16px',
    backgroundColor: '#e91e63',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 500,
    borderRadius: '12px',
    textDecoration: 'none',
    boxShadow: '0 4px 12px rgba(233, 30, 99, 0.25)',
  },
  mobileMenuButton: {
    display: 'none',
    padding: '8px',
    borderRadius: '8px',
    border: 'none',
    background: 'transparent',
    fontSize: '24px',
    cursor: 'pointer',
  },
  mobileMenu: {
    padding: '16px 0',
    borderTop: '1px solid #e2e8f0',
  },
  mobileNav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  mobileNavLink: {
    padding: '12px 16px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#475569',
    textDecoration: 'none',
  },
  mobileActions: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #e2e8f0',
  },
  mobileLoginLink: {
    display: 'block',
    width: '100%',
    padding: '12px',
    textAlign: 'center',
    fontSize: '14px',
    fontWeight: 500,
    color: '#475569',
    textDecoration: 'none',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
  },
  mobileRegisterButton: {
    display: 'block',
    width: '100%',
    padding: '12px',
    textAlign: 'center',
    fontSize: '14px',
    fontWeight: 500,
    color: '#fff',
    backgroundColor: '#e91e63',
    textDecoration: 'none',
    borderRadius: '12px',
    marginTop: '8px',
  },
  mobileLogout: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#dc2626',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
  },
};
