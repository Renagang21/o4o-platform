/**
 * Header - K-Cosmetics
 * Based on GlycoPharm Header structure
 * WO-O4O-AUTH-MODAL-LOGIN-AND-ACCOUNT-STANDARD-V1: 중앙화된 LoginModal 사용
 */

import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import { useAuth, ROLE_LABELS, ROLE_DASHBOARDS } from '@/contexts/AuthContext';
import { useLoginModal } from '@/contexts/LoginModalContext';

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const { openLoginModal } = useLoginModal();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setUserMenuOpen(false);
    };
    if (userMenuOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [userMenuOpen]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [userMenuOpen]);

  const handleLogout = () => {
    logout();
    navigate('/');
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
  };

  const dashboardPath = user?.currentRole ? ROLE_DASHBOARDS[user.currentRole] : '/';
  const roleLabel = user?.currentRole ? ROLE_LABELS[user.currentRole] : '';

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
          <nav style={styles.nav}>
            <Link to="/" style={styles.navLink}>홈</Link>
            <Link to="/contact" style={styles.navLink}>문의하기</Link>
            {isAuthenticated && (
              <Link to="/store" style={styles.navLinkAccent}>매장 관리</Link>
            )}
          </nav>

          {/* Desktop User Actions */}
          <div style={styles.actions}>
            {isAuthenticated ? (
              <div style={styles.userMenu} ref={dropdownRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  style={styles.userButton}
                  aria-label="사용자 메뉴"
                >
                  <div style={styles.avatar}>
                    <User style={{ width: 20, height: 20, color: '#fff' }} />
                  </div>
                </button>

                {userMenuOpen && (
                  <div style={styles.dropdown}>
                    <div style={styles.dropdownHeader}>
                      <p style={styles.dropdownName}>
                        {(() => {
                          const extUser = user as any;
                          if (extUser?.lastName || extUser?.firstName) {
                            return `${extUser.lastName || ''}${extUser.firstName || ''}`.trim() || '운영자';
                          }
                          return (user?.name && user.name !== user.email) ? user.name : '운영자';
                        })()}님
                      </p>
                      <p style={styles.dropdownEmail}>{user?.email}</p>
                      <p style={styles.dropdownRole}>{roleLabel}</p>
                    </div>
                    <Link
                      to={dashboardPath}
                      style={styles.dropdownItem}
                      onClick={() => setUserMenuOpen(false)}
                    >
                      대시보드
                    </Link>
                    <button
                      onClick={handleLogout}
                      style={styles.dropdownLogout}
                    >
                      로그아웃
                    </button>
                  </div>
                )}
              </div>
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
              <Link to="/contact" style={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>문의하기</Link>
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
  userMenu: {
    position: 'relative',
  },
  userButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
    borderRadius: '50%',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #f48fb1, #e91e63)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '15px',
    fontWeight: 600,
    boxShadow: '0 2px 8px rgba(233, 30, 99, 0.3)',
  },
  dropdown: {
    position: 'absolute',
    right: 0,
    top: '100%',
    marginTop: '8px',
    width: '192px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
    border: '1px solid #e2e8f0',
    padding: '8px 0',
    zIndex: 50,
  },
  dropdownHeader: {
    padding: '12px 16px',
    borderBottom: '1px solid #e2e8f0',
  },
  dropdownName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 4px 0',
  },
  dropdownEmail: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#1e293b',
    margin: 0,
  },
  dropdownRole: {
    fontSize: '11px',
    color: '#e91e63',
    margin: '2px 0 0 0',
    fontWeight: 500,
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    fontSize: '14px',
    color: '#334155',
    textDecoration: 'none',
  },
  dropdownLogout: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    padding: '10px 16px',
    fontSize: '14px',
    color: '#dc2626',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
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
