/**
 * Header - GlycoPharm 헤더
 * WO-GLYCOPHARM-TOP-NAV-KPA-ALIGN-V1:
 *   KPA-Society 기준 역할 기반 메뉴 구조
 *   비로그인/일반: 홈 | 포럼 | 강의
 *   약사 로그인: 홈 | 포럼 | 강의 | ─ | 약국 HUB | 내 약국
 * WO-O4O-GLOBAL-USER-PROFILE-DROPDOWN-EXTRACTION-V1:
 *   사용자 드롭다운을 @o4o/account-ui 공통 컴포넌트로 교체
 */

import { useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { GLYCOPHARM_ROLES, isPharmacistRole } from '@/lib/role-constants';
import { glycopharmConfig } from '@o4o/operator-ux-core';
import { useLoginModal } from '@/contexts/LoginModalContext';
import {
  GlobalUserProfileDropdown,
  getUserDisplayName,
  type GlobalUserProfileMenuItem,
} from '@o4o/account-ui';
import {
  Menu,
  X,
  User,
  LogOut,
  Activity,
  Home,
  MessageSquare,
  Store,
  GraduationCap,
  Settings,
  Shield,
  LayoutDashboard,
} from 'lucide-react';

import ServiceSwitcher from '../ServiceSwitcher';

/**
 * 공개 메뉴 — 로그인 상태 관계없이 항상 표시
 */
const publicMenuItems = [
  { label: '홈', icon: Home, path: '/', end: true },
  { label: '포럼', icon: MessageSquare, path: '/forum', end: false },
  { label: '강의 / 마케팅 콘텐츠', icon: GraduationCap, path: '/education', end: false },
];

/**
 * 조건부 메뉴 — glycopharm:pharmacist 로그인 시에만 표시
 * WO-GLYCOPHARM-HEADER-HUB-STORE-ROUTING-FIX-V1:
 *   약국 HUB → /hub (플랫폼 탐색 허브)
 *   내 약국 → /store (약국 운영 진입점)
 */
const pharmacyMenuItems = [
  { label: '약국 HUB', icon: LayoutDashboard, path: '/store-hub', end: false },
  { label: glycopharmConfig.terminology.myStoreLabel, icon: Store, path: '/store', end: false },
];

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const { openLoginModal } = useLoginModal();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // WO-GLYCOPHARM-ROLE-PREFIX-MIGRATION-V1: glycopharm:pharmacist OR legacy pharmacy
  const isPharmacy = isAuthenticated && user?.roles?.some(r => isPharmacistRole(r));
  const isAdmin = isAuthenticated && user?.roles?.some(r => r === 'glycopharm:admin' || r === 'platform:super_admin');
  const isOperator = isAuthenticated && user?.roles?.some(r => r === 'glycopharm:operator' || r === 'glycopharm:admin' || r === 'platform:super_admin');
  // WO-O4O-INSTRUCTOR-DASHBOARD-ENTRY-V1: lms:instructor 또는 admin/platform:super_admin 진입 허용
  const isInstructor = isAuthenticated && user?.roles?.some(r => r === GLYCOPHARM_ROLES.LMS_INSTRUCTOR);
  const showInstructor = isInstructor || isAdmin;

  // KPA canonical: Shield 단일 진입 (admin > operator 우선)
  const showDashboard = isAdmin || isOperator;
  const dashboardPath = isAdmin ? '/admin' : '/operator';
  const dashboardLabel = isAdmin ? '관리자 콘솔' : '운영 대시보드';

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const displayName = getUserDisplayName(user as any);

  const menuItems: GlobalUserProfileMenuItem[] = useMemo(() => {
    const items: GlobalUserProfileMenuItem[] = [];
    if (showInstructor) {
      items.push({
        key: 'instructor',
        icon: <GraduationCap className="w-4 h-4 text-gray-500" />,
        label: '강의 대시보드',
        href: '/instructor',
      });
    }
    if (showDashboard) {
      items.push({
        key: 'dashboard',
        icon: <Shield className="w-4 h-4" />,
        label: dashboardLabel,
        href: dashboardPath,
        variant: 'highlighted',
      });
    }
    items.push(
      {
        key: 'mypage',
        icon: <User className="w-4 h-4 text-gray-500" />,
        label: '마이페이지',
        href: '/mypage',
      },
      {
        key: 'settings',
        icon: <Settings className="w-4 h-4 text-gray-500" />,
        label: '설정',
        href: '/mypage/settings',
      },
    );
    return items;
  }, [showInstructor, showDashboard, dashboardLabel, dashboardPath]);

  /** NavLink 활성 스타일 (desktop) */
  const desktopNavClass = (isActive: boolean) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-primary-100 text-primary-700'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  /** NavLink 활성 스타일 (mobile) */
  const mobileNavClass = (isActive: boolean) =>
    `px-4 py-3 rounded-xl text-sm font-medium ${
      isActive ? 'bg-primary-100 text-primary-700' : 'text-slate-600'
    }`;

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/25">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-xl text-slate-800">GlycoPharm</span>
              <span className="block text-[10px] text-slate-500 -mt-1">혈당관리 전문 플랫폼</span>
            </div>
          </NavLink>

          {/* Desktop Navigation — 공개 메뉴 + 조건부 약국 메뉴 */}
          <nav className="hidden md:flex items-center gap-1">
            {/* 공개 메뉴 */}
            {publicMenuItems.map((item) => (
              <NavLink
                key={item.label}
                to={item.path}
                end={item.end}
                className={({ isActive }) => desktopNavClass(isActive)}
              >
                {item.label}
              </NavLink>
            ))}
            {/* 조건부 약국 메뉴 */}
            {isPharmacy && (
              <>
                <span className="mx-1 h-4 w-px bg-slate-200" />
                {pharmacyMenuItems.map((item) => (
                  <NavLink
                    key={item.label}
                    to={item.path}
                    end={item.end}
                    className={({ isActive }) => desktopNavClass(isActive)}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </>
            )}
          </nav>

          {/* Desktop User Actions */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated && <ServiceSwitcher currentServiceKey="glycopharm" />}
            {isAuthenticated && user ? (
              <GlobalUserProfileDropdown
                user={{ displayName, email: user.email }}
                menuItems={menuItems}
                onLogout={handleLogout}
              />
            ) : (
              <>
                <button
                  onClick={openLoginModal}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  로그인
                </button>
                <NavLink
                  to="/register"
                  className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/25"
                >
                  회원가입
                </NavLink>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-slate-100"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-slate-700" />
            ) : (
              <Menu className="w-6 h-6 text-slate-700" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t animate-fade-in">
            <nav className="flex flex-col gap-1">
              {/* 공개 메뉴 */}
              {publicMenuItems.map((item) => (
                <NavLink
                  key={item.label}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) => mobileNavClass(isActive)}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="flex items-center gap-3">
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </span>
                </NavLink>
              ))}
              {/* 조건부 약국 메뉴 */}
              {isPharmacy && (
                <>
                  <div className="my-1 border-t border-slate-100" />
                  {pharmacyMenuItems.map((item) => (
                    <NavLink
                      key={item.label}
                      to={item.path}
                      end={item.end}
                      className={({ isActive }) => mobileNavClass(isActive)}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="flex items-center gap-3">
                        <item.icon className="w-5 h-5" />
                        {item.label}
                      </span>
                    </NavLink>
                  ))}
                </>
              )}
            </nav>

            <div className="mt-4 pt-4 border-t">
              {isAuthenticated ? (
                <div className="flex flex-col gap-1">
                  {/* 강의 대시보드 — 최상단 (WO-O4O-INSTRUCTOR-DASHBOARD-ENTRY-V1) */}
                  {showInstructor && (
                    <NavLink
                      to="/instructor"
                      className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-600"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <GraduationCap className="w-5 h-5" />
                      강의 대시보드
                    </NavLink>
                  )}
                  {showDashboard && (
                    <NavLink
                      to={dashboardPath}
                      className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-blue-700"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Shield className="w-5 h-5" />
                      {dashboardLabel}
                    </NavLink>
                  )}
                  <NavLink
                    to="/mypage"
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-600"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <User className="w-5 h-5" />
                    마이페이지
                  </NavLink>
                  <NavLink
                    to="/mypage/settings"
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-600"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Settings className="w-5 h-5" />
                    설정
                  </NavLink>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-600"
                  >
                    <LogOut className="w-5 h-5" />
                    로그아웃
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 px-4">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openLoginModal();
                    }}
                    className="w-full py-3 text-center text-sm font-medium text-slate-600 border rounded-xl"
                  >
                    로그인
                  </button>
                  <NavLink
                    to="/register"
                    className="w-full py-3 text-center text-sm font-medium text-white bg-primary-600 rounded-xl"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    회원가입
                  </NavLink>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
