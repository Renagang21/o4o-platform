/**
 * Header - 경기도약사회 스타일
 * 상단 로고 + 메인 네비게이션 + 로그인/회원가입 버튼
 *
 * WO-KPA-DEMO-ROUTE-ISOLATION-V1: /demo 하위로 경로 수정
 */

import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { User, LayoutDashboard, UserCircle, Settings, LogOut } from 'lucide-react';
import { useAuth, useOrganization } from '../contexts';
import { TestAccountType } from '../contexts/AuthContext';
import { colors } from '../styles/theme';
import { ContextIndicator } from './common/ContextIndicator';
import { DashboardSwitcher, useAccessibleDashboards } from './common/DashboardSwitcher';

interface MenuItem {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
}

// 커뮤니티 홈 기준 메뉴 구조 (4개 항목)
// WO-KPA-COMMUNITY-HOME-REDESIGN-V1: 메인에 있는 항목은 메뉴에서 제거
// 교육/자료실/이벤트 → 메인 페이지 커뮤니티 섹션에서 접근
const menuItems: MenuItem[] = [
  { label: '홈', href: '/' },
  { label: '포럼', href: '/demo/forum' },
  { label: '약사회 서비스', href: '/demo' },
  { label: '약국경영', href: '/pharmacy' },
];

// 관리자 메뉴 (로그인한 관리자에게만 표시)
const adminMenu: MenuItem = {
  label: '관리자',
  href: '/demo/admin',
  children: [
    { label: '대시보드', href: '/demo/admin' },
    { label: '분회 관리', href: '/demo/admin/branches' },
    { label: '회원 관리', href: '/demo/admin/members' },
    { label: '공지 관리', href: '/demo/admin/news' },
  ],
};

export function Header({ serviceName }: { serviceName: string }) {
  const { user, login, logout, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { accessibleOrganizations } = useOrganization();
  const accessibleDashboards = useAccessibleDashboards();

  // 관리자 여부 확인 (admin, district_admin, branch_admin 역할만 관리자 메뉴 표시)
  const adminRoles = ['admin', 'super_admin', 'district_admin', 'branch_admin', 'operator'];
  const isAdmin = user && user.role && adminRoles.includes(user.role);

  // 약국경영 메뉴: pharmacy context가 있을 때만 노출
  const hasPharmacyContext = accessibleOrganizations.some(org => org.type === 'pharmacy');
  const filteredMenuItems = menuItems.filter(item => {
    if (item.href === '/pharmacy') return hasPharmacyContext;
    return true;
  });

  // 메뉴 구성 (관리자인 경우 관리자 메뉴 추가)
  const displayMenuItems = isAdmin ? [...filteredMenuItems, adminMenu] : filteredMenuItems;

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
    navigate('/demo');
  };

  /**
   * WO-KPA-OPERATION-TEST-ENV-V1: 테스트 계정 정보를 입력 필드에 채우기
   * (즉시 로그인이 아닌 입력만)
   */
  const fillTestAccount = (accountType: TestAccountType) => {
    // Note: Password must match API server seed (TestPassword)
    const testCredentials: Record<TestAccountType, { email: string; password: string }> = {
      pharmacist: { email: 'pharmacist-kpa@o4o.com', password: 'TestPassword' },
      district_admin: { email: 'district-admin-kpa@o4o.com', password: 'TestPassword' },
      branch_admin: { email: 'branch-admin-kpa@o4o.com', password: 'TestPassword' },
      district_officer: { email: 'district-officer-kpa@o4o.com', password: 'TestPassword' },
      branch_officer: { email: 'branch-officer-kpa@o4o.com', password: 'TestPassword' },
    };
    const creds = testCredentials[accountType];
    setLoginForm({ email: creds.email, password: creds.password });
    setLoginError(null);
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

          {/* Context Indicator - WO-CONTEXT-SWITCH-FOUNDATION-V1 */}
          <ContextIndicator />

          {/* Desktop Navigation */}
          <nav style={styles.nav}>
            <ul style={styles.navList}>
              {displayMenuItems.map((item) => (
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
                      ...((item.href === '/' ? location.pathname === '/' : location.pathname.startsWith(item.href)) ? styles.navLinkActive : {}),
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
              <div
                style={styles.userIconWrapper}
                onMouseEnter={() => setShowUserDropdown(true)}
                onMouseLeave={() => setShowUserDropdown(false)}
              >
                <button style={styles.userIconButton} aria-label="사용자 메뉴">
                  <User style={{ width: 20, height: 20, color: colors.gray600 }} />
                </button>
                {showUserDropdown && (
                  <div style={styles.userDropdown}>
                    <div style={styles.userDropdownInner}>
                      <div style={styles.userDropdownHeader}>
                        <span style={styles.userDropdownName}>{user.name}님</span>
                        <span style={styles.userDropdownEmail}>{user.email}</span>
                      </div>
                      <div style={styles.userDropdownDivider} />
                      {accessibleDashboards.length >= 2 ? (
                        <>
                          <DashboardSwitcher onNavigate={() => setShowUserDropdown(false)} />
                          <div style={styles.userDropdownDivider} />
                        </>
                      ) : (
                        <Link
                          to="/demo/mypage"
                          style={styles.userDropdownItem}
                          onClick={() => setShowUserDropdown(false)}
                        >
                          <LayoutDashboard style={{ width: 16, height: 16, color: colors.gray500 }} />
                          대시보드
                        </Link>
                      )}
                      <Link
                        to="/demo/mypage/profile"
                        style={styles.userDropdownItem}
                        onClick={() => setShowUserDropdown(false)}
                      >
                        <UserCircle style={{ width: 16, height: 16, color: colors.gray500 }} />
                        프로필
                      </Link>
                      <Link
                        to="/demo/mypage/settings"
                        style={styles.userDropdownItem}
                        onClick={() => setShowUserDropdown(false)}
                      >
                        <Settings style={{ width: 16, height: 16, color: colors.gray500 }} />
                        설정
                      </Link>
                      <div style={styles.userDropdownDivider} />
                      <button
                        style={styles.userDropdownLogout}
                        onClick={() => {
                          setShowUserDropdown(false);
                          handleLogout();
                        }}
                      >
                        <LogOut style={{ width: 16, height: 16, color: colors.error || '#dc2626' }} />
                        로그아웃
                      </button>
                    </div>
                  </div>
                )}
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
                <Link to="/demo/register" style={styles.authButtonOutline}>
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
            {displayMenuItems.map((item) => (
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

            {/* WO-KPA-OPERATION-TEST-ENV-V1: 테스트 계정 버튼 */}
            <div style={styles.testAccountSection}>
              <div style={styles.testAccountDivider}>
                <span style={styles.testAccountDividerText}>테스트 환경</span>
              </div>
              <p style={styles.testAccountDesc}>
                아래 버튼을 클릭하면 테스트 계정 정보가 입력됩니다.
              </p>
              <div style={styles.testAccountButtons}>
                <button
                  type="button"
                  style={styles.testAccountButton}
                  onClick={() => fillTestAccount('pharmacist')}
                >
                  <span style={styles.testAccountIcon}>💊</span>
                  <span>약사 계정</span>
                </button>
                <button
                  type="button"
                  style={styles.testAccountButton}
                  onClick={() => fillTestAccount('district_admin')}
                >
                  <span style={styles.testAccountIcon}>🏛️</span>
                  <span>지부 운영자 계정</span>
                </button>
                <button
                  type="button"
                  style={styles.testAccountButton}
                  onClick={() => fillTestAccount('branch_admin')}
                >
                  <span style={styles.testAccountIcon}>🏢</span>
                  <span>분회 운영자 계정</span>
                </button>
                <button
                  type="button"
                  style={styles.testAccountButton}
                  onClick={() => fillTestAccount('district_officer')}
                >
                  <span style={styles.testAccountIcon}>👔</span>
                  <span>지부 임원 계정</span>
                </button>
                <button
                  type="button"
                  style={styles.testAccountButton}
                  onClick={() => fillTestAccount('branch_officer')}
                >
                  <span style={styles.testAccountIcon}>👤</span>
                  <span>분회 임원 계정</span>
                </button>
              </div>
            </div>
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
    padding: '24px 12px',
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
  userIconWrapper: {
    position: 'relative',
  },
  userIconButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: colors.gray100,
    border: `1px solid ${colors.gray300}`,
    cursor: 'pointer',
    transition: 'background-color 0.2s, border-color 0.2s',
  },
  userIcon: {
    fontSize: '20px',
  },
  userDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    paddingTop: '8px',  // Use paddingTop instead of marginTop to keep hover area connected
    backgroundColor: 'transparent',
    zIndex: 100,
  },
  userDropdownInner: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    minWidth: '220px',
    padding: '8px 0',
  },
  userDropdownHeader: {
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  userDropdownName: {
    fontSize: '15px',
    fontWeight: 600,
    color: colors.gray900,
  },
  userDropdownEmail: {
    fontSize: '12px',
    color: colors.gray500,
    wordBreak: 'break-all',
  },
  userDropdownDivider: {
    height: '1px',
    backgroundColor: colors.gray200,
    margin: '4px 0',
  },
  userDropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 16px',
    color: colors.gray700,
    textDecoration: 'none',
    fontSize: '14px',
    transition: 'background-color 0.2s',
  },
  userDropdownItemIcon: {
    fontSize: '16px',
  },
  userDropdownLogout: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '10px 16px',
    color: colors.error || '#dc2626',
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '14px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background-color 0.2s',
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
  // WO-KPA-OPERATION-TEST-ENV-V1: 테스트 계정 스타일
  testAccountSection: {
    marginTop: '24px',
    paddingTop: '20px',
    borderTop: `1px dashed ${colors.gray300}`,
  },
  testAccountDivider: {
    textAlign: 'center',
    marginBottom: '12px',
  },
  testAccountDividerText: {
    fontSize: '12px',
    color: colors.gray500,
    backgroundColor: colors.white,
    padding: '0 12px',
  },
  testAccountDesc: {
    fontSize: '13px',
    color: colors.gray600,
    textAlign: 'center',
    margin: '0 0 16px 0',
  },
  testAccountButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  testAccountButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '14px 16px',
    backgroundColor: colors.gray100,
    border: `1px solid ${colors.gray300}`,
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    color: colors.gray700,
    cursor: 'pointer',
    transition: 'background-color 0.2s, border-color 0.2s',
  },
  testAccountIcon: {
    fontSize: '18px',
  },
};
