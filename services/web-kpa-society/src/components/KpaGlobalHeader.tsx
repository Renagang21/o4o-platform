/**
 * KpaGlobalHeader — KPA Society 서비스의 GlobalHeader 브릿지
 *
 * WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1
 *
 * 역할:
 *   - KPA AuthContext → GlobalHeader props 변환
 *   - 역할 기반 메뉴 필터링
 *   - KPA 브랜드 정보 주입
 *   - ServiceSwitcher 연결
 *   - 사용자 드롭다운 메뉴 구성
 */

import { useNavigate, Link } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { GlobalHeader } from '@o4o/ui';
import { NotificationBell, useNotifications } from '@o4o/account-ui';
import type { NotificationItem } from '@o4o/account-ui';
import { isStoreOwnerDual } from '@o4o/auth-utils';
import { KpaUserMenuItems } from './KpaUserMenu';
import { resolveNotificationTarget } from '../lib/notificationRouting';
import { useAuth, type User as UserType } from '../contexts';
import { useAuthModal } from '../contexts/LoginModalContext';
import {
  KPA_BASE_NAV,
  KPA_SERVICE_GUIDE_NAV_ITEM,
  KPA_ABOUT_NAV_ITEM,
  KPA_CONTACT_NAV_ITEM,
  KPA_CONTEXTUAL_NAV,
  filterContextualNav,
} from '../config/navigation';
import { creditApi } from '../api/credit';
import { notificationsApi } from '../api/notifications';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * WO-O4O-NAME-NORMALIZATION-V1: 사용자 표시 이름
 * 우선순위: displayName > lastName+firstName > name > email prefix > '사용자'
 */
function getUserDisplayName(user: UserType | null): string {
  if (!user) return '사용자';
  const ext = user as any;
  if (ext.displayName) return ext.displayName;
  if (ext.lastName || ext.firstName) {
    const full = `${ext.lastName || ''}${ext.firstName || ''}`.trim();
    if (full) return full;
  }
  if (user.name && user.name !== user.email) return user.name;
  if (user.email) return user.email.split('@')[0];
  return '사용자';
}

// ─── Component ───────────────────────────────────────────────────────────────

export function KpaGlobalHeader() {
  const { user, logout, isLoading } = useAuth();
  const { openLoginModal, openRegisterModal } = useAuthModal();
  const navigate = useNavigate();
  const [creditBalance, setCreditBalance] = useState<number | null>(null);

  // WO-O4O-KPA-LOGIN-REFETCH-MINIMIZE-V1:
  // user 객체 참조 전체 대신 user.id만 의존 — fetchKpaContext Phase2 갱신 시
  // user 참조가 바뀌어도 동일 사용자이면 재호출 방지.
  useEffect(() => {
    if (!user) { setCreditBalance(null); return; }
    creditApi.getMyBalance()
      .then((res: any) => {
        const bal = res?.data?.data?.balance ?? res?.data?.balance ?? null;
        if (typeof bal === 'number') setCreditBalance(bal);
      })
      .catch(() => { /* 실패 시 뱃지 숨김 */ });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // WO-O4O-KPA-MEMBER-REGISTRATION-NOTIFICATION-PHASE1-V1
  // 알림 — kpa-society serviceKey 로 backend 가 저장하므로 동일 키로 필터.
  // (KPA 로컬 SERVICE_KEY='kpa' 는 backend 와 불일치 — literal 'kpa-society' 사용)
  const notif = useNotifications(notificationsApi, {
    enabled: !!user,
    serviceKey: 'kpa-society',
  });

  const handleNotificationClick = useCallback(
    (n: NotificationItem) => {
      // WO-O4O-KPA-MOBILE-BOTTOM-UTILITY-NAV-ROUTE-COVERAGE-FIX-V1:
      //   라우팅 규칙을 resolveNotificationTarget(SSOT)로 이관 — MobileBottomNav 알림 시트와 공유.
      const target = resolveNotificationTarget(n);
      if (target) navigate(target);
    },
    [navigate],
  );

  // 역할 판정 — 프로필 메뉴 역할은 KpaUserMenuItems(SSOT)가 자체 판정.
  // 여기서는 nav 조합(약국 HUB 등)에 필요한 isStoreOwner 만 산출한다.
  // WO-O4O-KPA-HEADER-MENU-CANONICAL-ALIGNMENT-V1:
  //   내 약국 + 운영 허브 모두 store_owner role 기준으로 통일.
  //   HubGuard/PharmacyGuard/StoreHubPage CTA 가 모두 isStoreOwnerDual 단일 SSOT 사용 — header도 동일.
  //   (이전: 운영 허브만 activityType=='pharmacy_owner' fallback 보유 → 메뉴 보이지만 진입 시 guard redirect)
  const isStoreOwner = isStoreOwnerDual(user?.roles ?? [], 'kpa:store_owner', user?.isStoreOwner);

  // WO-O4O-KPA-WEB-MENU-STRUCTURE-PHASE1-V1: 상태별 통합 nav 조합
  // 비로그인: 커뮤니티 / 서비스 안내 / About / Contact
  // 로그인:   커뮤니티 / [내 매장] / [약국 HUB] / 서비스 안내 / About
  // WO-O4O-KPA-SOCIETY-SERVICE-GUIDE-PAGE-V1: contextual 항목 뒤, About 앞에 "서비스 안내" 삽입.
  const roleItems = filterContextualNav(KPA_CONTEXTUAL_NAV, { isStoreOwner });
  const computedNav = [
    ...KPA_BASE_NAV,
    ...roleItems,
    KPA_SERVICE_GUIDE_NAV_ITEM,
    KPA_ABOUT_NAV_ITEM,
    ...(user ? [] : [KPA_CONTACT_NAV_ITEM]),
  ];

  // User 정보 변환
  // isLoading 중 placeholder를 전달해 GlobalHeader의 isAuthenticated && user 조건 충족.
  // side effects(creditApi, notif)는 useAuth()의 실제 user를 참조하므로 영향 없음.
  const headerUser = user
    ? { displayName: getUserDisplayName(user), email: user.email }
    : isLoading
      ? { displayName: '', email: '' }
      : null;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <GlobalHeader
      brand={{
        icon: '💊',
        name: 'KPA-Society',
        subtitle: '약사 전문 플랫폼',
        primaryColor: '#2563eb',
      }}
      publicNav={computedNav}
      user={headerUser}
      isAuthenticated={isLoading || !!user}
      onLogin={openLoginModal}
      onRegister={openRegisterModal}
      onLogout={handleLogout}
      utilitySlot={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {user && creditBalance !== null && (
            <Link
              to="/mypage/credits"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '4px 10px', borderRadius: 999,
                background: '#fef9c3', color: '#854d0e',
                fontSize: 13, fontWeight: 600, textDecoration: 'none',
                border: '1px solid #fde047',
              }}
              title="크레딧 잔액 — 클릭하면 이력을 확인할 수 있습니다"
            >
              ⭐ {creditBalance.toLocaleString()} C
            </Link>
          )}
          {/* WO-O4O-KPA-MEMBER-REGISTRATION-NOTIFICATION-PHASE1-V1: 로그인 사용자에게만 표시 */}
          {user && (
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
        </div>
      }
      /* WO-O4O-ROLE-BASED-PROFILE-MENU-CANONICALIZATION-V1 규칙은 KpaUserMenuItems(SSOT)로 이동.
         데스크톱 프로필 드롭다운은 이 항목을 그대로 사용. */
      userMenuItems={<KpaUserMenuItems user={user} />}
      /* WO-O4O-KPA-MOBILE-NAV-AND-PROFILE-MENU-SEPARATION-V1:
         모바일 햄버거 drawer 는 사이트 nav 만 표시. 사용자 이름·이메일·역할별 대시보드·계정 메뉴·
         로그아웃은 모바일 하단 '내정보' 프로필 시트(MobileBottomNav)로 분리한다.
         데스크톱 드롭다운(userMenuItems)은 영향 없음. */
      showMobileUserMenu={false}
    />
  );
}
