/**
 * KCosGlobalHeader — K-Cosmetics 서비스의 GlobalHeader 브릿지
 *
 * WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1
 *
 * 역할:
 *   - K-Cosmetics AuthContext → GlobalHeader props 변환
 *   - 역할 기반 메뉴 필터링
 *   - K-Cosmetics 브랜드 정보 주입
 *   - ServiceSwitcher 연결
 *   - 사용자 드롭다운 메뉴 구성
 */

import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import { LayoutDashboard, UserCircle, Settings, GraduationCap, Shield } from 'lucide-react';
import { GlobalHeader, GlobalHeaderMenuItem } from '@o4o/ui';
import { NotificationBell, useNotifications } from '@o4o/account-ui';
import type { NotificationItem } from '@o4o/account-ui';
import { isStoreOwnerDual } from '@o4o/auth-utils';
import { useAuth, getKCosmeticsDashboardRoute } from '@/contexts/AuthContext';
import { useLoginModal } from '@/contexts/LoginModalContext';
import {
  KCOS_PUBLIC_NAV,
  KCOS_CONTEXTUAL_NAV,
  filterContextualNav,
} from '@/config/navigation';
import { notificationsApi } from '@/lib/api/notifications';
// ─── Helpers ─────────────────────────────────────────────────────────────────

function getUserDisplayName(user: any): string {
  if (!user) return '사용자';
  if (user.displayName) return user.displayName;
  if (user.lastName || user.firstName) {
    const full = `${user.lastName || ''}${user.firstName || ''}`.trim();
    if (full) return full;
  }
  if (user.name && user.name !== user.email) return user.name;
  if (user.email) return user.email.split('@')[0];
  return '사용자';
}

// ─── Component ───────────────────────────────────────────────────────────────

export function KCosGlobalHeader() {
  const { user, isAuthenticated, logout } = useAuth();
  const { openLoginModal } = useLoginModal();
  const navigate = useNavigate();

  const isAdmin = isAuthenticated && user?.roles?.some(
    (r: string) => r === 'cosmetics:admin' || r === 'platform:super_admin',
  );
  const isOperator = isAuthenticated && user?.roles?.some(
    (r: string) => r === 'cosmetics:operator' || r === 'cosmetics:admin' || r === 'platform:super_admin',
  );
  // WO-O4O-KCOS-GLOBAL-HEADER-PROFILE-MENU-ALIGNMENT-V1:
  // "강의 대시보드" 는 실제 lms:instructor 역할 보유자에게만 노출한다.
  // 이전 결선 `showInstructor = isInstructor || isAdmin` 은 관리자라는 이유만으로
  // 강의 대시보드를 강제 노출시키는 메뉴 오염이었음 — 제거.
  const isInstructor = isAuthenticated && user?.roles?.some(
    (r: string) => r === 'lms:instructor',
  );
  const showInstructor = isInstructor;

  // WO-O4O-AUTH-UTILS-STORE-OWNER-DUAL-V1: cosmetics:store_owner 부분 helper 적용
  // isStoreManager = 매장 경영자 OR 관리/운영 역할 (광의)
  const isStoreManager = isAuthenticated && (
    isStoreOwnerDual(user?.roles ?? [], 'cosmetics:store_owner') ||
    user?.roles?.some(
      (r: string) =>
        r === 'cosmetics:operator' ||
        r === 'cosmetics:admin' ||
        r === 'platform:admin' ||
        r === 'platform:super_admin',
    )
  );

  // WO-O4O-COMMON-MENU-VISIBILITY-POLICY-IMPL-V1: operator/admin은 모든 메뉴를 본다
  // WO-KCOS-HEADER-ROLE-NAV-FIX-V1: storeManager는 역할 기반 판정 (cosmetics:store_owner 이상)
  const contextualNav = filterContextualNav(KCOS_CONTEXTUAL_NAV, {
    isAdminOrOperator: !!(isAdmin || isOperator),
    isStoreManager: !!isStoreManager,
  });

  // WO-O4O-KCOS-MENU-CANONICAL-ALIGN-V1: 비로그인 시 Contact 헤더 노출
  const publicNav = isAuthenticated
    ? KCOS_PUBLIC_NAV
    : [...KCOS_PUBLIC_NAV, { label: 'Contact', href: '/contact' }];

  const headerUser = user
    ? { displayName: getUserDisplayName(user), email: user.email }
    : null;

  // WO-O4O-GLYCOPHARM-K-COSMETICS-NOTIFICATION-BELL-ACTIVATION-V1
  const notif = useNotifications(notificationsApi, {
    enabled: !!user,
    serviceKey: 'k-cosmetics',
  });

  const handleNotificationClick = useCallback(
    (n: NotificationItem) => {
      const target = (n.metadata as Record<string, unknown> | undefined)?.targetUrl;
      if (typeof target === 'string' && target.length > 0) {
        navigate(target);
      }
    },
    [navigate],
  );

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const dashboardPath = user?.roles ? getKCosmeticsDashboardRoute(user.roles) : '/';

  return (
    <GlobalHeader
      brand={{
        icon: '💄',
        name: 'K-Cosmetics',
        subtitle: 'K-Beauty 전문 플랫폼',
        primaryColor: '#db2777',
      }}
      publicNav={publicNav}
      contextualNav={contextualNav}
      user={headerUser}
      onLogin={openLoginModal}
      onRegister={() => navigate('/register')}
      onLogout={handleLogout}
      utilitySlot={user ? (
        <NotificationBell
          unreadCount={notif.unreadCount}
          notifications={notif.notifications}
          loading={notif.loading}
          onOpen={notif.refetchList}
          onItemClick={handleNotificationClick}
          onMarkAsRead={notif.markAsRead}
          onMarkAllAsRead={notif.markAllAsRead}
        />
      ) : undefined}
      userMenuItems={
        <>
          {/* 강의 대시보드 — 최상단 (WO-KCOS-LMS-INSTRUCTOR-BOOTSTRAP-V1) */}
          {showInstructor && (
            <GlobalHeaderMenuItem to="/instructor" icon={<GraduationCap className="w-4 h-4" />}>
              강의 대시보드
            </GlobalHeaderMenuItem>
          )}
          {/* WO-O4O-KCOS-GLOBAL-HEADER-PROFILE-MENU-ALIGNMENT-V1:
             admin/operator 라벨·경로 분기. isOperator 는 admin 포함이므로 isAdmin 우선. */}
          {isAdmin ? (
            <GlobalHeaderMenuItem to="/admin" icon={<Shield className="w-4 h-4" />}>
              관리자 대시보드
            </GlobalHeaderMenuItem>
          ) : isOperator ? (
            <GlobalHeaderMenuItem to="/operator" icon={<Shield className="w-4 h-4" />}>
              운영 대시보드
            </GlobalHeaderMenuItem>
          ) : (
            <GlobalHeaderMenuItem to={dashboardPath} icon={<LayoutDashboard className="w-4 h-4" />}>
              대시보드
            </GlobalHeaderMenuItem>
          )}
          <GlobalHeaderMenuItem to="/mypage" icon={<UserCircle className="w-4 h-4" />}>
            마이페이지
          </GlobalHeaderMenuItem>
          <GlobalHeaderMenuItem to="/mypage/settings" icon={<Settings className="w-4 h-4" />}>
            설정
          </GlobalHeaderMenuItem>
        </>
      }
    />
  );
}
