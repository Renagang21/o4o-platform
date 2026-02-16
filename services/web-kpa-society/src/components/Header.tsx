/**
 * Header - KPA Society 메인 네비게이션
 *
 * WO-KPA-SOCIETY-MAIN-NAV-REFINE-V1: 서비스 단위 진입 중심 구조
 * WO-KPA-SOCIETY-SERVICE-STRUCTURE-BASELINE-V1: 3개 서비스 구조 기준
 * WO-KPA-SUPER-OPERATOR-BASELINE-REFINE-V1: Super Operator 공통 메뉴 지원
 *
 * 메뉴 구조 (서비스 진입점 중심):
 * - 홈: 커뮤니티 서비스 진입점 (Forum 포함)
 * - 약국경영: 독립 실서비스
 * - 분회 서비스: 실제 분회 운영 서비스
 * - 지부/분회 서비스 데모: 데모 서비스 (/demo) - 제거 예정
 *
 * 원칙: 상단 메뉴는 서비스 진입점만 노출 (기능 나열 금지)
 */

import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { User, LayoutDashboard, UserCircle, Settings, LogOut } from 'lucide-react';
import { useAuth, type User as UserType } from '../contexts';
import { useAuthModal } from '../contexts/LoginModalContext';
import { colors } from '../styles/theme';
import { DashboardSwitcher, useAccessibleDashboards } from './common/DashboardSwitcher';

/**
 * Super Operator 감지 헬퍼
 * WO-KPA-SUPER-OPERATOR-BASELINE-REFINE-V1
 */
function isSuperOperator(user: UserType | null): boolean {
  if (!user) return false;
  if ((user as any).isSuperOperator) return true;
  const operatorRoles = ['platform:operator', 'super_operator', 'platform:admin'];
  if (user.roles?.some(r => operatorRoles.includes(r))) return true;
  if (user.role && operatorRoles.includes(user.role)) return true;
  return false;
}

/**
 * 사용자 표시 이름 헬퍼
 * 우선순위: lastName+firstName > name > '운영자'
 * name이 이메일과 동일한 경우 '운영자' 표시
 */
function getUserDisplayName(user: UserType | null): string {
  if (!user) return '사용자';

  // 1. lastName + firstName 조합 시도
  const extendedUser = user as any;
  if (extendedUser.lastName || extendedUser.firstName) {
    const fullName = `${extendedUser.lastName || ''}${extendedUser.firstName || ''}`.trim();
    if (fullName) return fullName;
  }

  // 2. name 필드 사용 (이메일과 다른 경우에만)
  if (user.name && user.name !== user.email) {
    return user.name;
  }

  // 3. 기본값
  return '운영자';
}

interface MenuItem {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
}

/**
 * 메뉴 구조 (WO-KPA-A-HUB-ARCHITECTURE-RESTRUCTURE-V1)
 *
 * 사이트 기본 메뉴 + 허브
 * - 홈: 커뮤니티 메인
 * - 포럼: 커뮤니티 포럼
 * - 강의: LMS 강좌
 * - 콘텐츠: 공지/뉴스
 * - 허브: 운영 허브 (operator 이상)
 */
const menuItems: MenuItem[] = [
  { label: '홈', href: '/' },
  { label: '포럼', href: '/forum' },
  { label: '강의', href: '/lms' },
  { label: '콘텐츠', href: '/news' },
  { label: '허브', href: '/hub' },
];

export function Header({ serviceName }: { serviceName: string }) {
  const { user, logout, isLoading } = useAuth();
  const { openLoginModal, openRegisterModal } = useAuthModal();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const accessibleDashboards = useAccessibleDashboards();

  // 허브 메뉴: kpa:operator 이상만 노출 (WO-KPA-A-HUB-ARCHITECTURE-RESTRUCTURE-V1)
  const hasHubAccess = user?.roles?.some(r => ['kpa:admin', 'kpa:operator'].includes(r)) ?? false;
  const displayMenuItems = menuItems.filter(item => {
    if (item.href === '/hub') return hasHubAccess;
    return true;
  });

  const handleLogout = async () => {
    await logout();
    navigate('/demo');
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
                {/* Super Operator는 다른 아이콘/색상 */}
                <button
                  style={{
                    ...styles.userIconButton,
                    ...(isSuperOperator(user) ? styles.operatorIconButton : {}),
                  }}
                  aria-label="사용자 메뉴"
                >
                  <User style={{ width: 20, height: 20, color: isSuperOperator(user) ? '#d97706' : colors.gray600 }} />
                </button>
                {showUserDropdown && (
                  <div style={styles.userDropdown}>
                    <div style={styles.userDropdownInner}>
                      <div style={{
                        ...styles.userDropdownHeader,
                        ...(isSuperOperator(user) ? styles.operatorDropdownHeader : {}),
                      }}>
                        <span style={styles.userDropdownName}>{getUserDisplayName(user)}님</span>
                        <span style={styles.userDropdownEmail}>{user.email}</span>
                        {isSuperOperator(user) && (
                          <span style={styles.operatorBadge}>🛡️ Super Operator</span>
                        )}
                      </div>
                      <div style={styles.userDropdownDivider} />

                      {/* Super Operator: 간소화된 메뉴 */}
                      {isSuperOperator(user) ? (
                        <>
                          <Link
                            to="/mypage/profile"
                            style={styles.userDropdownItem}
                            onClick={() => setShowUserDropdown(false)}
                          >
                            <UserCircle style={{ width: 16, height: 16, color: colors.gray500 }} />
                            프로필
                          </Link>
                        </>
                      ) : (
                        /* 일반 사용자: 전체 메뉴 */
                        <>
                          {accessibleDashboards.length >= 2 ? (
                            <>
                              <DashboardSwitcher onNavigate={() => setShowUserDropdown(false)} />
                              <div style={styles.userDropdownDivider} />
                            </>
                          ) : (
                            <Link
                              to="/dashboard"
                              style={styles.userDropdownItem}
                              onClick={() => setShowUserDropdown(false)}
                            >
                              <LayoutDashboard style={{ width: 16, height: 16, color: colors.gray500 }} />
                              대시보드
                            </Link>
                          )}
                          <Link
                            to="/mypage/profile"
                            style={styles.userDropdownItem}
                            onClick={() => setShowUserDropdown(false)}
                          >
                            <UserCircle style={{ width: 16, height: 16, color: colors.gray500 }} />
                            프로필
                          </Link>
                          <Link
                            to="/mypage/settings"
                            style={styles.userDropdownItem}
                            onClick={() => setShowUserDropdown(false)}
                          >
                            <Settings style={{ width: 16, height: 16, color: colors.gray500 }} />
                            설정
                          </Link>
                        </>
                      )}

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
                  type="button"
                  style={styles.authButton}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openLoginModal();
                  }}
                  disabled={isLoading}
                >
                  로그인
                </button>
                <button
                  type="button"
                  style={styles.authButtonOutline}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openRegisterModal();
                  }}
                  disabled={isLoading}
                >
                  회원가입
                </button>
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
  // WO-KPA-SUPER-OPERATOR-BASELINE-REFINE-V1: Super Operator 스타일
  operatorIconButton: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
  },
  operatorDropdownHeader: {
    backgroundColor: '#fffbeb',
  },
  operatorBadge: {
    marginTop: '4px',
    fontSize: '11px',
    fontWeight: 600,
    color: '#d97706',
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
};
