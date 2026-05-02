/**
 * Header - KPA Society 메인 네비게이션
 *
 * WO-KPA-SOCIETY-MAIN-NAV-REFINE-V1: 서비스 단위 진입 중심 구조
 * WO-KPA-SOCIETY-SERVICE-STRUCTURE-BASELINE-V1: 3개 서비스 구조 기준
 * WO-KPA-SUPER-OPERATOR-BASELINE-REFINE-V1: Super Operator 공통 메뉴 지원
 * WO-KPA-A-ROLE-BASED-NAVIGATION-AND-ENTRY-REFINEMENT-V1: 공개/역할 메뉴 분리 + dropdown 진입점
 * WO-O4O-GLOBAL-USER-PROFILE-DROPDOWN-EXTRACTION-V1: 사용자 드롭다운을 @o4o/account-ui 공통 컴포넌트로 교체 (hover 트리거 + Super Operator 배지/색상 보존)
 *
 * 원칙: 상단 메뉴는 서비스 진입점만 노출 (기능 나열 금지)
 */

import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Shield, GraduationCap } from 'lucide-react';
import {
  GlobalUserProfileDropdown,
  NotificationBell,
  getUserDisplayName,
  useNotifications,
  type GlobalUserProfileMenuItem,
} from '@o4o/account-ui';
import { notificationsApi, NOTIFICATION_SERVICE_KEY } from '../api/notifications';
import { useAuth, type User as UserType } from '../contexts';
import { useAuthModal } from '../contexts/LoginModalContext';
import { colors } from '../styles/theme';
import { DashboardSwitcher, useAccessibleDashboards } from './common/DashboardSwitcher';
import { ROLES, SUPER_OPERATOR_ROLES, hasAnyRole } from '../lib/role-constants';
import { kpaConfig } from '@o4o/operator-ux-core';
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
 * 역할 조건부: 매장 운영 허브 (pharmacy_owner) / 내 약국 (isStoreOwner) / 운영 대시보드 (operator/admin)
 */
const menuItems: MenuItem[] = [
  { label: '홈', href: '/' },
  { label: '포럼', href: '/forum' },
  { label: '강의', href: '/lms' },
  { label: kpaConfig.terminology.storeHubLabel, href: '/store-hub' },
  { label: kpaConfig.terminology.myStoreLabel, href: '/store' },
  { label: '운영 대시보드', href: '/operator' },
];

export function Header({ serviceName }: { serviceName: string }) {
  const { user, logout, isLoading } = useAuth();
  const { openLoginModal, openRegisterModal } = useAuthModal();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const accessibleDashboards = useAccessibleDashboards();

  // WO-O4O-NOTIFICATION-UI-CORE-V1: shared notification bell (logged-in only)
  const notif = useNotifications(notificationsApi, {
    enabled: !!user,
    serviceKey: NOTIFICATION_SERVICE_KEY,
  });

  // ── 메뉴 필터링 (WO-KPA-A-ROLE-BASED-NAVIGATION-AND-ENTRY-REFINEMENT-V1) ──
  // kpa:admin  → "관리자 콘솔" /admin
  // kpa:operator → "운영 대시보드" /operator
  // /store-hub → 약국 관련 사용자(pharmacy_owner/isStoreOwner) + operator/admin
  // /store → 승인된 약국(isStoreOwner) + operator/admin
  // 나머지 → 전체 공개
  const isAdmin = user ? user.roles.includes('kpa:admin') : false;
  const isOperator = user ? user.roles.includes('kpa:operator') : false;
  const isInstructor = user ? user.roles.includes(ROLES.LMS_INSTRUCTOR) : false;
  const isStoreOwner = user?.isStoreOwner === true;
  const isPharmacyRelated = isStoreOwner || (user as any)?.activityType === 'pharmacy_owner';
  const isSuperOp = isSuperOperator(user);

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
      if (item.href === '/store-hub') return isPharmacyRelated || isOperator || isAdmin;
      if (item.href === '/store') return isStoreOwner || isOperator || isAdmin;
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

  const displayName = getUserDisplayName(user as any);

  // 사용자 드롭다운 메뉴 항목 (기존 분기 로직 보존)
  const dropdownMenuItems: GlobalUserProfileMenuItem[] = useMemo(() => {
    if (!user) return [];

    // Super Operator: 간소화된 메뉴
    if (isSuperOp) {
      return [
        {
          key: 'dashboard',
          icon: <Shield className="w-4 h-4 text-amber-600" />,
          label: isAdmin ? '관리자 콘솔' : '운영 대시보드',
          href: isAdmin ? '/admin' : '/operator',
        },
        {
          key: 'mypage',
          icon: <LayoutDashboard className="w-4 h-4 text-gray-500" />,
          label: '마이페이지',
          href: '/mypage',
        },
      ];
    }

    // 일반 사용자: 전체 메뉴
    const items: GlobalUserProfileMenuItem[] = [];

    // 강의 대시보드 (WO-O4O-INSTRUCTOR-DASHBOARD-ENTRY-V1)
    if (isInstructor || isAdmin) {
      items.push({
        key: 'instructor',
        icon: <GraduationCap className="w-4 h-4 text-gray-500" />,
        label: '강의 대시보드',
        href: '/instructor',
      });
    }

    // 운영/관리 진입점 (WO-KPA-OPERATOR-USER-MENU-CLEANUP-V1)
    if (isAdmin || isOperator) {
      items.push({
        key: 'admin-console',
        icon: <Shield className="w-4 h-4 text-gray-500" />,
        label: isAdmin ? '관리자 콘솔' : '운영 대시보드',
        href: isAdmin ? '/admin' : '/operator',
      });
    }

    // 다중 대시보드 접근 가능 시 DashboardSwitcher, 아니면 단순 마이페이지 링크
    // WO-KPA-SOCIETY-DASHBOARD-TO-MYPAGE-CONSOLIDATION-V1
    if (accessibleDashboards.length >= 2) {
      items.push({
        key: 'dashboard-switcher',
        node: (close) => <DashboardSwitcher onNavigate={close} />,
      });
    } else {
      items.push({
        key: 'mypage',
        icon: <LayoutDashboard className="w-4 h-4 text-gray-500" />,
        label: '마이페이지',
        href: '/mypage',
      });
    }

    items.push({
      key: 'settings',
      icon: <LayoutDashboard className="w-4 h-4 text-gray-500" />,
      label: '설정',
      href: '/mypage/settings',
    });

    return items;
  }, [user, isSuperOp, isAdmin, isOperator, isInstructor, accessibleDashboards.length]);

  return (
    <>
      <header style={styles.header}>
        <div style={styles.container}>
          {/* Logo */}
          <Link to="/" style={styles.logo}>
            <span style={styles.logoIcon}>💊</span>
            <span style={styles.logoText}>{serviceName || 'KPA-Society'}</span>
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
            {user && (
              <NotificationBell
                unreadCount={notif.unreadCount}
                notifications={notif.notifications}
                loading={notif.loading}
                onOpen={notif.refetchList}
                onMarkAsRead={notif.markAsRead}
                onMarkAllAsRead={notif.markAllAsRead}
              />
            )}
            {user ? (
              <GlobalUserProfileDropdown
                user={{
                  displayName,
                  email: user.email,
                  badge: isSuperOp ? (
                    <span className="text-xs font-semibold text-amber-700">🛡️ Super Operator</span>
                  ) : undefined,
                }}
                menuItems={dropdownMenuItems}
                onLogout={handleLogout}
                trigger="hover"
                triggerClassName={
                  isSuperOp
                    ? 'flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 border border-amber-500 hover:bg-amber-200 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
                    : 'flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 border border-gray-300 hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
                }
                triggerIconClassName={isSuperOp ? 'text-amber-600' : 'text-gray-600'}
                headerClassName={isSuperOp ? 'bg-amber-50' : undefined}
                widthClassName="w-[220px]"
              />
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
