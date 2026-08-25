/**
 * PharmacyHubGlobalHeader — Pharmacy-Hub 의 GlobalHeader 브릿지
 *
 * WO-O4O-CROSSSERVICE-HEADER-MENU-FOOTER-UI-COMPLETION-V1
 *
 * KPA(KpaGlobalHeader) / K-Cosmetics(KCosGlobalHeader) / Neture(NetureGlobalHeader) 와 같은
 * thin bridge 다. 공통 GlobalHeader(@o4o/ui) 를 그대로 쓰고 **서비스 차이만** 주입한다:
 *   - AuthContext → GlobalHeader props 변환
 *   - Pharmacy-Hub 브랜드(로고·명칭·색)
 *   - 역할 기반 contextual nav 필터 (config/navigation.ts 의 표)
 *   - 알림 벨(공통 /notifications 계약)
 *   - 사용자 드롭다운
 *
 * 역할 판정은 config/service.ts 의 satisfiesRole 하나만 쓴다 — 이 파일에 역할 문자열을
 * 다시 하드코딩하지 않는다(backend scopeRoleMapping 과 같은 표 유지).
 *
 * 이 헤더는 **공개 영역 셸(PublicLayout)** 전용이다. 역할별 업무 셸
 * (StoreDashboardLayout / OperatorAreaShell) 은 각자의 상단바 계약을
 * 그대로 유지한다 — 이중 헤더를 만들지 않는다.
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, LayoutDashboard, LogIn, Pill, Shield, Store, UserCircle } from 'lucide-react';
import { GlobalHeader, GlobalHeaderMenuItem, buildCommunityPrimaryNav } from '@o4o/ui';
import { NotificationBell, useNotifications,
  resolveNotificationTarget, getUserDisplayName } from '@o4o/account-ui';
import type { NotificationItem } from '@o4o/account-ui';
import { useAuth } from '../contexts/AuthContext';
import { BRAND, ROLES, SERVICE_KEY, satisfiesRole } from '../config/service';
import { PH_BASE_NAV, PH_CONTEXTUAL_NAV, PH_TRAILING_NAV } from '../config/navigation';
import { notificationsApi } from '../lib/api/notifications';

/** 브랜드 primary — 다른 서비스와 구분되는 Pharmacy-Hub 색(teal, 공급자 헤더와 동일 계열) */
const PH_PRIMARY = '#0d9488';

export function PharmacyHubGlobalHeader() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const roles: string[] = Array.isArray(user?.roles) ? (user!.roles as string[]) : [];

  /**
   * WO-O4O-PHARMACYHUB-ADMIN-OPERATOR-DUAL-AREA-ADOPTION-AND-PRODUCTION-CLOSURE-V1
   *
   * admin 과 operator 는 **독립 업무 영역**이다. admin 이 operator API 를 쓸 수 있다는
   * 이유로 메뉴를 하나로 합치지 않는다 (K-Cosmetics / GlycoPharm / Neture 와 같은 계약).
   * 두 역할을 모두 만족하면 두 항목이 모두 보인다.
   */
  const isAdmin = isAuthenticated && satisfiesRole(roles, ROLES.admin);
  const isOperator = isAuthenticated && satisfiesRole(roles, ROLES.operator);
  /**
   * StoreOwnerGuard('pharmacy-hub') 통과 조건과 같은 표 —
   * store_owner 본인 + operator/admin(운영 목적 진입 허용). 메뉴와 가드가 어긋나지 않게 한다.
   */
  const isStoreOwner = isAuthenticated && satisfiesRole(roles, ROLES.storeOwner);
  const isStoreManager = isStoreOwner || isOperator;

  /**
   * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §4 (#42)
   *   강사 진입점은 **실제 `lms:instructor` 보유자에게만** 노출한다.
   *   admin/operator 도 route guard 는 통과하지만(운영 목적 진입),
   *   관리자라는 이유로 강의 대시보드를 메뉴에 띄우지 않는다
   *   (KPA / GlycoPharm / K-Cosmetics canonical 정합 — 메뉴 오염 방지).
   */
  const isInstructor = isAuthenticated && roles.includes('lms:instructor');

  /*
   * WO-O4O-KPA-PHARMACYHUB-COMMUNITY-HOME-AND-NAV-CANONICAL-CONVERGENCE-V1 §9:
   *   KPA 와 같은 공통 조립기(buildCommunityPrimaryNav)를 쓴다 —
   *   base(커뮤니티) → 역할 진입점 → 이용 안내 순서를 두 서비스가 공유한다.
   *   항목·역할 판정표는 config/navigation.ts · config/service.ts 소유 그대로다.
   */
  const primaryNav = buildCommunityPrimaryNav({
    base: PH_BASE_NAV,
    contextual: PH_CONTEXTUAL_NAV,
    conditions: {
      storeManager: !!isStoreManager,
      storeOwner: !!isStoreOwner,
      operator: !!isOperator,
    },
    trailing: PH_TRAILING_NAV,
    isAuthenticated,
  });

  /**
   * 가입 진입점 (WO-O4O-GLOBAL-HEADER-REGISTER-CONTRACT-AND-PRODUCTION-VALIDATION-V1)
   *
   * 공통 GlobalHeader 의 회원가입 버튼이 `/register` 하드코딩에서 onRegister 콜백 계약으로
   * 바로잡혔다. Pharmacy-Hub 의 가입 경로는 `/join` 이므로 표준 회원가입 버튼을 그대로 쓰고,
   * 이전에 우회로 넣었던 public nav 의 `가입 신청` 항목은 제거한다(중복 진입점 방지).
   */

  const headerUser = user
    ? { displayName: getUserDisplayName(user), email: user.email ?? '' }
    : null;

  const notif = useNotifications(notificationsApi, {
    enabled: !!user,
    serviceKey: SERVICE_KEY,
  });

  // WO-O4O-CROSS-SERVICE-MYPAGE-NOTIFICATIONS-COMMONIZATION-V1:
  //   metadata.targetUrl 을 검증 없이 navigate 하던 인라인 구현을 공통
  //   resolveNotificationTarget 으로 교체했다 (내부 절대 경로만 통과 —
  //   `//host` 같은 protocol-relative 값 차단).
  const handleNotificationClick = useCallback(
    (n: NotificationItem) => {
      const target = resolveNotificationTarget(n);
      if (target) navigate(target);
    },
    [navigate],
  );

  const handleLogout = useCallback(() => {
    logout();
    navigate('/');
  }, [logout, navigate]);

  return (
    <GlobalHeader
      brand={{
        icon: <Pill className="w-5 h-5 text-white" aria-hidden="true" />,
        name: BRAND.name,
        subtitle: BRAND.nameKo,
        primaryColor: PH_PRIMARY,
      }}
      publicNav={primaryNav}
      user={headerUser}
      /** Pharmacy-Hub 는 로그인 모달이 없다(전용 /login 화면 계약). 모달 대신 라우팅한다. */
      onLogin={() => navigate('/login')}
      onRegister={() => navigate('/join')}
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
          {isStoreOwner && (
            <GlobalHeaderMenuItem to="/store-owner" icon={<Store className="w-4 h-4" />}>
              내 약국
            </GlobalHeaderMenuItem>
          )}
          {isAdmin && (
            <GlobalHeaderMenuItem to="/admin" icon={<Shield className="w-4 h-4" />}>
              관리자 대시보드
            </GlobalHeaderMenuItem>
          )}
          {isOperator && (
            <GlobalHeaderMenuItem to="/operator" icon={<LayoutDashboard className="w-4 h-4" />}>
              운영 대시보드
            </GlobalHeaderMenuItem>
          )}
          {/* 동일 WO §4 (#42) — 강사 운영 콘솔 진입점 */}
          {isInstructor && (
            <GlobalHeaderMenuItem to="/instructor" icon={<GraduationCap className="w-4 h-4" />}>
              강의 대시보드
            </GlobalHeaderMenuItem>
          )}
          {/*
            내 프로필 = 개인 계정(users) 화면. 역할과 무관하게 모든 로그인 사용자에게 노출한다.
            WO-O4O-CROSS-SERVICE-PROFILE-COMMONIZATION-V1 (production 잔여 결함):
              기존에는 매장 셸 안의 /store-owner/account 만 있어 `isStoreOwner` 로 게이트했고,
              그 결과 운영자·공급자에게는 Profile 진입점이 아예 없었다. 개인 계정 화면을
              역할 셸 밖 canonical route `/account` 로 올려 데드링크 없이 전원에게 연다.
              (`/store-owner/account` 는 매장 셸 사이드바용으로 유지 — 같은 화면을 렌더한다)
            매장·사업자 정보는 이 진입점이 아니라 `내 약국`(역할·도메인 화면) 소관이다.
          */}
          <GlobalHeaderMenuItem to="/account" icon={<UserCircle className="w-4 h-4" />}>
            내 프로필
          </GlobalHeaderMenuItem>
          <GlobalHeaderMenuItem to="/join/status" icon={<LogIn className="w-4 h-4" />}>
            가입 상태
          </GlobalHeaderMenuItem>
        </>
      }
    />
  );
}
