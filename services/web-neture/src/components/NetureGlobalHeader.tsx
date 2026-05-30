/**
 * NetureGlobalHeader — Neture 서비스의 GlobalHeader 브릿지
 *
 * WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1
 *
 * 역할:
 *   - Neture AuthContext → GlobalHeader props 변환
 *   - 역할 기반 메뉴 필터링
 *   - Neture 브랜드 정보 주입
 *   - ServiceSwitcher 연결
 *   - 사용자 드롭다운 메뉴 구성
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Settings, Shield } from 'lucide-react';
import { GlobalHeader, GlobalHeaderMenuItem } from '@o4o/ui';
import { NotificationBell, useNotifications } from '@o4o/account-ui';
import type { NotificationItem } from '@o4o/account-ui';
import { notificationsApi, NOTIFICATION_SERVICE_KEY } from '../lib/api/notifications';
import {
  ADMIN_ROLES,
  OPERATOR_OR_ABOVE_ROLES,
  SUPPLIER_ONLY_ROLES,
  PARTNER_ONLY_ROLES,
} from '../lib/role-constants';
import { useAuth } from '../contexts/AuthContext';
import { useLoginModal } from '../contexts/LoginModalContext';
import {
  NETURE_PUBLIC_NAV,
  NETURE_CONTEXTUAL_NAV,
  filterContextualNav,
} from '../config/navigation';
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

export function NetureGlobalHeader() {
  const { user, isAuthenticated, logout } = useAuth();
  const { openLoginModal, openRegisterModal } = useLoginModal();
  const navigate = useNavigate();

  // WO-O4O-NOTIFICATION-UI-CORE-V1
  const notif = useNotifications(notificationsApi, {
    enabled: isAuthenticated && !!user,
    serviceKey: NOTIFICATION_SERVICE_KEY,
  });

  // WO-O4O-NETURE-GLOBAL-HEADER-OPERATOR-LABEL-AND-NOTIFICATION-CLICK-FIX-V1:
  // 알림 항목 클릭 시 metadata.targetUrl 이 있으면 해당 경로로 이동.
  // KPA / K-Cosmetics / GlycoPharm GlobalHeader 동일 패턴.
  const handleNotificationClick = useCallback(
    (n: NotificationItem) => {
      const target = (n.metadata as Record<string, unknown> | undefined)?.targetUrl;
      if (typeof target === 'string' && target.length > 0) {
        navigate(target);
      }
    },
    [navigate],
  );

  const isAdmin = isAuthenticated && user?.roles?.some((r: string) => ADMIN_ROLES.includes(r));
  const isOperator = isAuthenticated && user?.roles?.some((r: string) => OPERATOR_OR_ABOVE_ROLES.includes(r));
  const isSupplier = isAuthenticated && user?.roles?.some((r: string) => SUPPLIER_ONLY_ROLES.includes(r));
  const isPartner = isAuthenticated && user?.roles?.some((r: string) => PARTNER_ONLY_ROLES.includes(r));

  // WO-O4O-COMMON-MENU-VISIBILITY-POLICY-IMPL-V1: operator/admin은 모든 메뉴를 본다
  const contextualNav = filterContextualNav(NETURE_CONTEXTUAL_NAV, {
    isAdminOrOperator: !!(isAdmin || isOperator),
    isSupplier: !!isSupplier,
    isPartner: !!isPartner,
  });

  const headerUser = user
    ? { displayName: getUserDisplayName(user), email: user.email }
    : null;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <GlobalHeader
      brand={{
        icon: '🌿',
        name: 'Neture',
        subtitle: '공급자·파트너 협업 플랫폼',
        primaryColor: '#059669',
      }}
      publicNav={NETURE_PUBLIC_NAV}
      contextualNav={contextualNav}
      user={headerUser}
      onLogin={openLoginModal}
      onRegister={openRegisterModal}
      onLogout={handleLogout}
      utilitySlot={
        <>
          {isAuthenticated && user && (
            <NotificationBell
              unreadCount={notif.unreadCount}
              notifications={notif.notifications}
              loading={notif.loading}
              onOpen={notif.refetchList}
              onItemClick={handleNotificationClick}
              onMarkAsRead={notif.markAsRead}
              onMarkAllAsRead={notif.markAllAsRead}
            />
          )}
        </>
      }
      userMenuItems={
        <>
          {/* WO-O4O-NETURE-SUPPLIER-DASHBOARD-ENTRY-AND-MEMBER-LIST-CLEANUP-V1:
              역할 동시 보유 사용자(operator + supplier 등)도 각 대시보드에
              개별 진입할 수 있도록 항목을 역할별로 분리. 각 항목은 자기 역할의
              canonical route 로 직접 연결.
              WO-O4O-NETURE-ADMIN-OPERATOR-DASHBOARD-AND-MEMBER-TYPE-FIX-V1:
              admin / operator 진입을 분리. admin 은 /admin (관리자 대시보드),
              operator-only 는 /operator (운영자 대시보드). */}
          {isAdmin && (
            <GlobalHeaderMenuItem to="/admin" icon={<Shield className="w-4 h-4" />}>
              관리자 대시보드
            </GlobalHeaderMenuItem>
          )}
          {/* WO-O4O-NETURE-GLOBAL-HEADER-OPERATOR-LABEL-AND-NOTIFICATION-CLICK-FIX-V1:
              "운영자 대시보드" → "운영 대시보드" (KPA / K-Cosmetics / GlycoPharm canonical 정합) */}
          {isOperator && (
            <GlobalHeaderMenuItem to="/operator" icon={<Shield className="w-4 h-4" />}>
              운영 대시보드
            </GlobalHeaderMenuItem>
          )}
          {isSupplier && (
            <GlobalHeaderMenuItem to="/supplier/dashboard" icon={<LayoutDashboard className="w-4 h-4" />}>
              공급자 대시보드
            </GlobalHeaderMenuItem>
          )}
          {isPartner && (
            <GlobalHeaderMenuItem to="/partner/dashboard" icon={<LayoutDashboard className="w-4 h-4" />}>
              파트너 대시보드
            </GlobalHeaderMenuItem>
          )}
          <GlobalHeaderMenuItem to="/mypage" icon={<LayoutDashboard className="w-4 h-4" />}>
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
