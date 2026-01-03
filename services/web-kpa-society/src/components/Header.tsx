/**
 * Header - 경기도약사회 스타일
 * 상단 로고 + 메인 네비게이션 + 로그인/회원가입 버튼
 */

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts';
import { colors } from '../styles/theme';

interface MenuItem {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
}

const menuItems: MenuItem[] = [
  {
    label: '약사회 소개',
    href: '/about',
    children: [
      { label: '인사말', href: '/about' },
      { label: '연혁', href: '/about#history' },
      { label: '조직도', href: '/about#organization' },
      { label: '오시는 길', href: '/about#location' },
    ],
  },
  {
    label: '공지/소식',
    href: '/notices',
    children: [
      { label: '공지사항', href: '/notices' },
      { label: '행사/교육', href: '/events' },
      { label: '자료실', href: '/resources' },
    ],
  },
  {
    label: '회원서비스',
    href: '/organizations',
    children: [
      { label: '조직 현황', href: '/organizations' },
      { label: '회원 가입 신청', href: '/member/apply' },
      { label: '내 신청 현황', href: '/applications' },
    ],
  },
  {
    label: '커뮤니티',
    href: '/community',
    children: [
      { label: '회원 동정', href: '/community/news' },
      { label: '자유게시판', href: '/community/board' },
    ],
  },
];

export function Header({ serviceName }: { serviceName: string }) {
  const { user, login, logout, isLoading } = useAuth();
  const location = useLocation();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsSubmitting(true);
    try {
      await login(loginForm.email, loginForm.password);
      setShowLoginModal(false);
      setLoginForm({ email: '', password: '' });
    } catch (err: any) {
      setLoginError(err.message || '로그인에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <>
      <header style={styles.header}>
        <div style={styles.container}>
          {/* Logo */}
          <Link to="/" style={styles.logo}>
            <span style={styles.logoIcon}>💊</span>
            <span style={styles.logoText}>{serviceName || '약사회'}</span>
          </Link>

          {/* Desktop Navigation */}
          <nav style={styles.nav}>
            <ul style={styles.navList}>
              {menuItems.map((item) => (
                <li
                  key={item.label}
                  style={styles.navItem}
                  onMouseEnter={() => setActiveMenu(item.label)}
                  onMouseLeave={() => setActiveMenu(null)}
                >
                  <Link
                    to={item.href}
                    style={{
                      ...styles.navLink,
                      ...(location.pathname.startsWith(item.href) ? styles.navLinkActive : {}),
                    }}
                  >
                    {item.label}
                  </Link>
                  {/* Dropdown */}
                  {item.children && activeMenu === item.label && (
                    <div style={styles.dropdown}>
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          to={child.href}
                          style={styles.dropdownItem}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          {/* Auth Buttons */}
          <div style={styles.authArea}>
            {user ? (
              <div style={styles.userInfo}>
                <span style={styles.userName}>{user.name}님</span>
                <button style={styles.authButtonOutline} onClick={handleLogout}>
                  로그아웃
                </button>
              </div>
            ) : (
              <>
                <button
                  style={styles.authButton}
                  onClick={() => setShowLoginModal(true)}
                  disabled={isLoading}
                >
                  로그인
                </button>
                <Link to="/signup" style={styles.authButtonOutline}>
                  회원가입
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            style={styles.mobileMenuBtn}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            ☰
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div style={styles.mobileMenu}>
            {menuItems.map((item) => (
              <div key={item.label}>
                <Link
                  to={item.href}
                  style={styles.mobileMenuItem}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
                {item.children && (
                  <div style={styles.mobileSubMenu}>
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        to={child.href}
                        style={styles.mobileSubMenuItem}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </header>

      {/* Login Modal */}
      {showLoginModal && (
        <div style={styles.modalOverlay} onClick={() => setShowLoginModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>로그인</h2>
              <button
                style={styles.closeButton}
                onClick={() => setShowLoginModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleLogin} style={styles.loginForm}>
              <div style={styles.formGroup}>
                <label style={styles.label}>이메일</label>
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  style={styles.input}
                  placeholder="email@example.com"
                  required
                  autoFocus
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>비밀번호</label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  style={styles.input}
                  placeholder="비밀번호 입력"
                  required
                />
              </div>
              {loginError && <div style={styles.errorMessage}>{loginError}</div>}
              <button
                type="submit"
                style={{
                  ...styles.submitButton,
                  ...(isSubmitting ? styles.submitButtonDisabled : {}),
                }}
                disabled={isSubmitting}
              >
                {isSubmitting ? '로그인 중...' : '로그인'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    position: 'sticky',
    top: 0,
    backgroundColor: colors.white,
    boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
    zIndex: 1000,
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '70px',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    textDecoration: 'none',
    gap: '8px',
  },
  logoIcon: {
    fontSize: '28px',
  },
  logoText: {
    fontSize: '22px',
    fontWeight: 700,
    color: colors.primary,
  },
  nav: {
    display: 'flex',
  },
  navList: {
    display: 'flex',
    listStyle: 'none',
    margin: 0,
    padding: 0,
    gap: '4px',
  },
  navItem: {
    position: 'relative',
  },
  navLink: {
    display: 'block',
    padding: '24px 20px',
    color: colors.gray800,
    textDecoration: 'none',
    fontSize: '16px',
    fontWeight: 500,
    transition: 'color 0.2s',
  },
  navLinkActive: {
    color: colors.primary,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: colors.white,
    borderRadius: '8px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    minWidth: '160px',
    padding: '8px 0',
    zIndex: 100,
  },
  dropdownItem: {
    display: 'block',
    padding: '10px 20px',
    color: colors.gray700,
    textDecoration: 'none',
    fontSize: '14px',
    transition: 'background-color 0.2s, color 0.2s',
  },
  authArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  userName: {
    fontSize: '14px',
    color: colors.gray700,
    fontWeight: 500,
  },
  authButton: {
    padding: '10px 20px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  authButtonOutline: {
    padding: '10px 20px',
    backgroundColor: 'transparent',
    color: colors.primary,
    border: `1px solid ${colors.primary}`,
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'background-color 0.2s',
  },
  mobileMenuBtn: {
    display: 'none',
    padding: '8px 12px',
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: colors.gray700,
  },
  mobileMenu: {
    display: 'none',
    backgroundColor: colors.white,
    borderTop: `1px solid ${colors.gray200}`,
    padding: '16px 20px',
  },
  mobileMenuItem: {
    display: 'block',
    padding: '12px 0',
    color: colors.gray800,
    textDecoration: 'none',
    fontSize: '16px',
    fontWeight: 500,
    borderBottom: `1px solid ${colors.gray200}`,
  },
  mobileSubMenu: {
    paddingLeft: '16px',
  },
  mobileSubMenuItem: {
    display: 'block',
    padding: '10px 0',
    color: colors.gray600,
    textDecoration: 'none',
    fontSize: '14px',
  },
  // Modal styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
  },
  modal: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '32px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  modalTitle: {
    fontSize: '22px',
    fontWeight: 600,
    color: colors.gray900,
    margin: 0,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '28px',
    color: colors.gray500,
    cursor: 'pointer',
    padding: 0,
    lineHeight: 1,
  },
  loginForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: colors.gray700,
  },
  input: {
    padding: '12px 14px',
    fontSize: '16px',
    border: `1px solid ${colors.gray300}`,
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  errorMessage: {
    padding: '10px 14px',
    backgroundColor: '#ffebee',
    color: colors.error,
    borderRadius: '6px',
    fontSize: '14px',
  },
  submitButton: {
    padding: '14px',
    fontSize: '16px',
    fontWeight: 600,
    color: colors.white,
    backgroundColor: colors.primary,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '8px',
    transition: 'background-color 0.2s',
  },
  submitButtonDisabled: {
    backgroundColor: colors.gray400,
    cursor: 'not-allowed',
  },
};
