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
import { GlobalHeader } from '@o4o/ui';
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
import { NetureUserMenuItems } from './NetureUserMenu';
import { resolveNetureNotificationTarget } from '../lib/notificationRouting';
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
      // WO-O4O-NETURE-MOBILE-NAV-...-V1: 라우팅 규칙을 resolveNetureNotificationTarget(SSOT)로 이관 —
      //   NetureBottomNav 모바일 알림 시트와 공유.
      const target = resolveNetureNotificationTarget(n);
      if (target) navigate(target);
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
      /* WO-O4O-NETURE-MOBILE-NAV-...-V1: 역할별 업무 공간 + 계정 메뉴를 NetureUserMenuItems(SSOT)로 이관.
         데스크톱 프로필 드롭다운은 이 항목을 그대로 사용. */
      userMenuItems={<NetureUserMenuItems user={user} isAuthenticated={isAuthenticated} />}
      /* WO-O4O-NETURE-MOBILE-NAV-...-V1: 모바일 햄버거 drawer 는 사이트 nav 만 표시.
         이름·이메일·역할별 업무 공간·계정 메뉴·로그아웃은 모바일 하단 '내정보' 프로필 시트
         (NetureBottomNav)로 분리. 데스크톱 드롭다운(userMenuItems)은 영향 없음. */
      showMobileUserMenu={false}
    />
  );
}
