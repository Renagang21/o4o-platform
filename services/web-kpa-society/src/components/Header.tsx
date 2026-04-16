/**
 * Header - KPA Society 메인 네비게이션
 *
 * WO-KPA-SOCIETY-MAIN-NAV-REFINE-V1: 서비스 단위 진입 중심 구조
 * WO-KPA-SOCIETY-SERVICE-STRUCTURE-BASELINE-V1: 3개 서비스 구조 기준
 * WO-KPA-SUPER-OPERATOR-BASELINE-REFINE-V1: Super Operator 공통 메뉴 지원
 * WO-KPA-A-ROLE-BASED-NAVIGATION-AND-ENTRY-REFINEMENT-V1: 공개/역할 메뉴 분리 + dropdown 진입점
 *
 * 원칙: 상단 메뉴는 서비스 진입점만 노출 (기능 나열 금지)
 */

import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { User, LayoutDashboard, UserCircle, Settings, LogOut, Shield } from 'lucide-react';
import { useAuth, type User as UserType } from '../contexts';
import { useAuthModal } from '../contexts/LoginModalContext';
import { colors } from '../styles/theme';
import { DashboardSwitcher, useAccessibleDashboards } from './common/DashboardSwitcher';
import { SUPER_OPERATOR_ROLES, hasAnyRole } from '../lib/role-constants';
import ServiceSwitcher from './ServiceSwitcher';

/**
 * Super Operator 감지 헬퍼
 * WO-KPA-SUPER-OPERATOR-BASELINE-REFINE-V1
 */
function isSuperOperator(user: UserType | null): boolean {
  if (!user) return false;
  if ((user as any).isSuperOperator) return true;
  return hasAnyRole(user.roles, SUPER_OPERATOR_ROLES);
}

/**
 * WO-O4O-NAME-NORMALIZATION-V1: 사용자 표시 이름 헬퍼
 * 우선순위: displayName > lastName+firstName > name > email prefix > '사용자'
 */
function getUserDisplayName(user: UserType | null): string {
  if (!user) return '사용자';

  const extendedUser = user as any;

  // 1. API computed displayName
  if (extendedUser.displayName) return extendedUser.displayName;

  // 2. lastName + firstName 조합
  if (extendedUser.lastName || extendedUser.firstName) {
    const fullName = `${extendedUser.lastName || ''}${extendedUser.firstName || ''}`.trim();
    if (fullName) return fullName;
  }

  // 3. name 필드 (이메일과 다른 경우에만)
  if (user.name && user.name !== user.email) {
    return user.name;
  }

  // 4. email prefix
  if (user.email) return user.email.split('@')[0];

  return '사용자';
}

interface MenuItem {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
}

/**
 * 메뉴 구조 (WO-KPA-A-ROLE-BASED-NAVIGATION-AND-ENTRY-REFINEMENT-V1)
 * WO-KPA-A-TOP-NAV-SERVICE-ENTRY-RESTRUCTURE-V1:
 *   - 내 약국: 프로필 드롭다운 → 상단 네비게이션으로 이동 (서비스 진입점)
 *   - 프로필 드롭다운 = 개인 영역 / 상단 네비게이션 = 서비스 진입 영역
 *
 * 공개 기본: 홈 / 포럼 / 강의
 * 역할 조건부: 약국 HUB (pharmacy_owner) / 내 약국 (isStoreOwner) / 운영 대시보드 (operator/admin)
 */
const menuItems: MenuItem[] = [
  { label: '홈', href: '/' },
  { label: '포럼', href: '/forum' },
  { label: '강의 / 마케팅 콘텐츠', href: '/lms' },
  { label: '약국 HUB', href: '/hub' },
  { label: '내 약국', href: '/store' },
  { label: '운영 대시보드', href: '/operator' },
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

  // ── 메뉴 필터링 (WO-KPA-A-ROLE-BASED-NAVIGATION-AND-ENTRY-REFINEMENT-V1) ──
  // kpa:admin  → "관리자 콘솔" /admin
  // kpa:operator → "운영 대시보드" /operator
  // /store → 승인된 약국 (isStoreOwner)
  // 나머지 → 전체 공개
  const isAdmin = user ? user.roles.includes('kpa:admin') : false;
  const isOperator = user ? user.roles.includes('kpa:operator') : false;
  const isStoreOwner = user?.isStoreOwner === true;
  const isPharmacyRelated = isStoreOwner || (user as any)?.activityType === 'pharmacy_owner';
  const displayMenuItems = menuItems
    .map(item => {
      // admin이면 "운영 대시보드" → "관리자 콘솔" + /admin
      if (item.href === '/operator' && isAdmin) {
        return { ...item, label: '관리자 콘솔', href: '/admin' };
      }
      return item;
    })
    .filter(item => {
      if (item.href === '/operator') return isOperator;
      if (item.href === '/admin') return isAdmin;
      if (item.href === '/hub') return isPharmacyRelated;
      if (item.href === '/store') return isStoreOwner;
      return true;
    });

  // 공개 메뉴와 역할 메뉴를 분리 (시각적 구분선 표시용)
  const PUBLIC_PATHS = ['/', '/forum', '/lms'];
  const publicMenuItems = displayMenuItems.filter(item => PUBLIC_PATHS.includes(item.href));
  const roleMenuItems = displayMenuItems.filter(item => !PUBLIC_PATHS.includes(item.href));

  const handleLogout = async () => {
    await logout();
    navigate('/');
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

          {/* Desktop Navigation — 공개/역할 메뉴 분리 */}
          <nav style={styles.nav}>
            <ul style={styles.navList}>
              {publicMenuItems.map((item) => (
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
                  {item.children && activeMenu === item.label && (
                    <div style={styles.dropdown}>
                      {item.children.map((child) => (
                        <Link key={child.href} to={child.href} style={styles.dropdownItem}>
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </li>
              ))}
              {roleMenuItems.length > 0 && (
                <li style={styles.navSeparator} aria-hidden="true">
                  <span style={styles.navSeparatorLine} />
                </li>
              )}
              {roleMenuItems.map((item) => (
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
                      ...((location.pathname.startsWith(item.href)) ? styles.navLinkActive : {}),
                    }}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Auth Buttons */}
          <div style={styles.authArea}>
            {user && <ServiceSwitcher currentServiceKey="kpa-society" />}
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
                          <Link
                            to={isAdmin ? '/admin' : '/operator'}
                            style={styles.userDropdownItem}
                            onClick={() => setShowUserDropdown(false)}
                          >
                            <Shield style={{ width: 16, height: 16, color: '#d97706' }} />
                            {isAdmin ? '관리자 콘솔' : '운영 대시보드'}
                          </Link>
                        </>
                      ) : (
                        /* 일반 사용자: 전체 메뉴
                         * DashboardSwitcher: 2개 이상 대시보드 접근 가능 시 표시 (KPA 전용)
                         * - "마이페이지" (/mypage): 모든 인증 사용자
                         * - "약국경영" (/pharmacy): pharmacy context + non-admin/operator
                         * 1개만 접근 가능하면 단순 마이페이지 링크 표시
                         * WO-KPA-SOCIETY-DASHBOARD-TO-MYPAGE-CONSOLIDATION-V1
                         */
                        <>
                          {accessibleDashboards.length >= 2 ? (
                            <>
                              <DashboardSwitcher onNavigate={() => setShowUserDropdown(false)} />
                              <div style={styles.userDropdownDivider} />
                            </>
                          ) : (
                            <Link
                              to="/mypage"
                              style={styles.userDropdownItem}
                              onClick={() => setShowUserDropdown(false)}
                            >
                              <LayoutDashboard style={{ width: 16, height: 16, color: colors.gray500 }} />
                              마이페이지
                            </Link>
                          )}
                          {/* 운영/관리 진입점 (WO-KPA-A-ROLE-BASED-NAVIGATION-AND-ENTRY-REFINEMENT-V1) */}
                          {(isAdmin || isOperator) && (
                            <>
                              <div style={styles.userDropdownDivider} />
                              <Link
                                to={isAdmin ? '/admin' : '/operator'}
                                style={styles.userDropdownItem}
                                onClick={() => setShowUserDropdown(false)}
                              >
                                <Shield style={{ width: 16, height: 16, color: colors.gray500 }} />
                                {isAdmin ? '관리자 콘솔' : '운영 대시보드'}
                              </Link>
                            </>
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

                      {/* Account Center — 임시 숨김: account.neture.co.kr 서비스 미배포/SSL 미구성 (WO-KPA-SOCIETY-HIDE-BROKEN-ACCOUNT-CENTER-LINK-V1) */}
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

        {/* Mobile Menu — 공개/역할 메뉴 분리 */}
        {mobileMenuOpen && (
          <div style={styles.mobileMenu}>
            {publicMenuItems.map((item) => (
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
            {roleMenuItems.length > 0 && <div style={styles.mobileSeparator} />}
            {roleMenuItems.map((item) => (
              <div key={item.label}>
                <Link
                  to={item.href}
                  style={styles.mobileMenuItem}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
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
  navSeparator: {
    display: 'flex',
    alignItems: 'center',
    padding: '0 4px',
  },
  navSeparatorLine: {
    display: 'block',
    width: '1px',
    height: '20px',
    backgroundColor: colors.gray300,
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
  mobileSeparator: {
    height: '1px',
    backgroundColor: colors.gray300,
    margin: '8px 0',
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
