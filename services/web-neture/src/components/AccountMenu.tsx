/**
 * AccountMenu - 상단 계정 영역 UI
 *
 * WO-O4O-GLOBAL-USER-PROFILE-DROPDOWN-EXTRACTION-V1
 *   드롭다운 UI를 @o4o/account-ui의 GlobalUserProfileDropdown으로 교체.
 *   Neture 역할별 dashboard route 결정 로직은 본 wrapper에 유지.
 *
 * 비로그인 상태(로그인/회원가입 버튼)는 기존 동선 유지.
 */

import { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';
import {
  GlobalUserProfileDropdown,
  getUserDisplayName,
  type GlobalUserProfileMenuItem,
} from '@o4o/account-ui';

import { useAuth, getNetureDashboardRoute, getNetureRoleLabel, useLoginModal } from '../contexts';

export default function AccountMenu() {
  const { user, isAuthenticated, logout } = useAuth();
  const { openLoginModal, openRegisterModal } = useLoginModal();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // 비로그인 상태
  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => openLoginModal(location.pathname + location.search)}
          className="text-gray-700 px-4 py-2 text-sm font-medium hover:text-primary-600 transition-colors"
        >
          로그인
        </button>
        <button
          onClick={() => openRegisterModal()}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          회원가입
        </button>
      </div>
    );
  }

  // WO-O4O-NETURE-AUTH-ROLE-REDIRECT-FIX-V1: 전체 roles로 dashboard 경로 결정
  const dashboardPath = getNetureDashboardRoute(user.roles);
  const roleLabel = getNetureRoleLabel(user.roles);

  // WO-O4O-AUTH-RBAC-CLEANUP-V1: 대시보드 대상 역할 판별
  const DASHBOARD_ROLES = ['supplier', 'partner', 'seller'];
  const hasDashboardRole = user.roles?.some((r: string) =>
    r.endsWith(':admin') ||
    r.endsWith(':operator') ||
    r.endsWith(':supplier') ||
    r.endsWith(':partner') ||
    r.endsWith(':seller') ||
    r === 'platform:super_admin' ||
    DASHBOARD_ROLES.includes(r),
  ) ?? false;

  const displayName = getUserDisplayName(user as any);

  const menuItems: GlobalUserProfileMenuItem[] = useMemo(() => {
    const items: GlobalUserProfileMenuItem[] = [];
    if (hasDashboardRole) {
      items.push({
        key: 'dashboard',
        icon: <LayoutDashboard className="w-4 h-4 text-gray-500" />,
        label: `${roleLabel} 대시보드`,
        href: dashboardPath,
      });
    }
    items.push({
      key: 'mypage',
      icon: <LayoutDashboard className="w-4 h-4 text-gray-500" />,
      label: '마이페이지',
      href: '/mypage',
    });
    return items;
  }, [hasDashboardRole, roleLabel, dashboardPath]);

  return (
    <GlobalUserProfileDropdown
      user={{ displayName, email: user.email, roleLabel }}
      menuItems={menuItems}
      onLogout={handleLogout}
    />
  );
}
