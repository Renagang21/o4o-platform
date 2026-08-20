/**
 * MyProfilePage — Pharmacy-Hub 내 프로필 (개인 계정 · 비밀번호 · 로그아웃)
 *
 * WO-O4O-CROSS-SERVICE-PROFILE-COMMONIZATION-V1 (production 잔여 결함 처리)
 *
 * 결함: 사용자 드롭다운의 계정 진입점이 `isStoreOwner` 로 게이트돼 있어 운영자·공급자
 *       계정에는 Profile 진입점이 아예 없었다(Profile Core 접근 불가).
 * 교정: 개인 계정 화면을 역할 셸 밖의 canonical route `/account` 로 올리고, 모든 로그인
 *       사용자가 같은 화면을 쓴다. `/store-owner/account`(매장 셸 설정 메뉴)는 같은
 *       컴포넌트를 렌더한다 — 화면을 두 벌 만들지 않는다.
 *
 * ⚠️ 이 화면은 **사용자(users)** 축만 다룬다. 매장 정보(organizations)는
 *    `/store-owner/info` 소관이며 두 축을 섞지 않는다. 이 화면은 매장·사업자 정보를
 *    렌더하지 않으므로 운영자에게 store_owner 자산이 노출되지 않는다.
 * ⚠️ 비밀번호는 모달 밖으로 나가지 않는다 — 상태 저장·로깅 금지.
 *
 * WO-O4O-CROSS-SERVICE-SELF-PROFILE-WRITE-CONTRACT-V1:
 *   프로필 계약이 플랫폼 공통 `GET/PATCH /api/v1/users/me/profile` 로 확정돼,
 *   운영자·공급자·매장주 구분 없이 인증 사용자 본인이 자기 ACCOUNT_CORE 를 수정한다.
 *
 * 편집 가능 여부는 **역할 하드코딩이 아니라 서버 응답으로** 결정한다:
 *   응답의 `editableFields` 에 들어 있는 필드만 편집 가능하게 렌더한다.
 *   프론트에서 가드를 완화하지 않으며, 403 을 회피하려고 store_owner 경로를
 *   억지로 열지 않는다.
 */

import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Mail, Phone, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  AccountProfileSection,
  AccountSecuritySettings,
  MyPageAuthRequired,
  MyPageLoadingState,
  MembershipStatusBadge,
  MyPageShell,
  NotificationBell,
  resolveRoleLabel,
  useNotifications,
  resolveNotificationTarget,
  type AccountProfileFieldSpec,
  type NotificationItem,
} from '@o4o/account-ui';
import { getServiceMembershipStatus } from '../../lib/membershipGate';
import { PHARMACY_HUB_ACCOUNT_NAV_ITEMS } from './navItems';
import {
  changeAccountPassword,
  fetchAccountProfile,
  updateAccountProfile,
  type AccountProfile,
} from '../../lib/api/pharmacyHubAccount';
import { notificationsApi } from '../../lib/api/notifications';
import { errorMessage, errorStatus } from '../../lib/api/pharmacyHubOrders';
import { useAuth } from '../../contexts/AuthContext';
import { PLATFORM_SUPER_ADMIN, ROLE_LABELS, ROLES, SERVICE_KEY } from '../../config/service';

/** 편집 가능 계정의 필드 구성 (서버 editableFields 와 같은 축: name · nickname · phone) */
const FIELDS: AccountProfileFieldSpec[] = [
  { key: 'name', label: '이름', icon: <UserIcon className="h-4 w-4 text-gray-400" /> },
  { key: 'nickname', label: '닉네임' },
  { key: 'phone', label: '연락처', type: 'tel', icon: <Phone className="h-4 w-4 text-gray-400" /> },
  // 이메일 변경은 별도 인증 절차가 필요하므로 이 화면에서 수정하지 않는다.
  {
    key: 'email',
    label: '이메일 (로그인 아이디)',
    editable: false,
    icon: <Mail className="h-4 w-4 text-gray-400" />,
  },
];

/** 조회 전용(수정 계약이 없는 계정) 필드 구성 — 같은 항목을 읽기 전용으로만 보여준다. */
const READONLY_FIELDS: AccountProfileFieldSpec[] = FIELDS.map((f) => ({ ...f, editable: false }));

/**
 * 보유 역할 중 Pharmacy-Hub 역할 라벨 — 없으면 중립 라벨.
 *
 * WO-O4O-CROSS-SERVICE-MYPAGE-MEMBERSHIP-ROLE-STATUS-COMMONIZATION-V1 §9:
 * 같은 해석 루프가 5 서비스에 복제돼 있어 공통 `resolveRoleLabel` 로 수렴했다.
 * 라벨 사전(ROLE_LABELS)·우선순위는 이 서비스 config 소관이다.
 */
const PHARMACY_HUB_ROLE_PRIORITY = [
  PLATFORM_SUPER_ADMIN,
  ROLES.admin,
  ROLES.operator,
  ROLES.supplier,
  ROLES.storeOwner,
] as const;

function resolvePharmacyHubRoleLabel(roles: readonly string[]): string {
  return resolveRoleLabel(roles, {
    labels: ROLE_LABELS,
    priority: PHARMACY_HUB_ROLE_PRIORITY,
    fallback: '회원',
  });
}

/**
 * 조회 폴백. canonical 계약이 어떤 이유로 거부되면(403) 세션(GET /auth/me)이 이미
 * 보유한 값만으로 조회 전용 화면을 유지한다 — 화면을 빈 오류로 떨어뜨리지 않는다.
 */
function profileFromSession(user: Record<string, unknown> | null): AccountProfile | null {
  if (!user) return null;
  const str = (v: unknown) => (typeof v === 'string' && v.length > 0 ? v : null);
  const email = str(user.email);
  if (!email) return null;
  return {
    id: str(user.id) ?? '',
    email,
    name: str(user.name),
    nickname: str(user.nickname),
    phone: str(user.phone),
    status: str(user.status),
  };
}

export default function MyProfilePage({
  /**
   * 매장 셸 안에는 공개 헤더의 알림 벨이 없으므로 화면이 직접 렌더한다.
   *
   * WO-O4O-CROSS-SERVICE-MYPAGE-NOTIFICATIONS-COMMONIZATION-V1:
   *   기본값을 true 로 올렸다. 공통 GlobalHeader 의 utilitySlot(NotificationBell)은
   *   `hidden md:flex` 안에 있어 모바일에서 렌더되지 않고, Pharmacy-Hub 에는
   *   모바일 하단 nav 가 없어 canonical `/account` 가 유일한 모바일 알림 진입점이다.
   *   MyPageShell 의 headerActions 는 폭과 무관하게 렌더된다.
   */
  showNotifications = true,
  /**
   * WO-O4O-CROSS-SERVICE-MYPAGE-SHELL-LAYOUT-COMMONIZATION-V1:
   * canonical route `/account` 는 공통 My Page Shell(헤더 + navigation) 안에서
   * 렌더한다. 매장 셸(`/store-owner/account`)은 이미 자체 chrome·사이드바를 갖고
   * 있으므로 Shell 을 이중으로 씌우지 않는다 → 그쪽만 false.
   * §13 계약(개인 = /account, 매장 셸 = 호환 route)은 그대로다.
   */
  withShell = true,
}: {
  showNotifications?: boolean;
  withShell?: boolean;
}) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const notifications = useNotifications(notificationsApi, {
    enabled: isAuthenticated && showNotifications,
    serviceKey: SERVICE_KEY,
  });

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    try {
      const loaded = await fetchAccountProfile();
      setProfile(loaded);
      // 서버가 알려준 편집 가능 필드로만 판단한다 (역할 하드코딩 금지).
      setCanEdit((loaded.editableFields?.length ?? 0) > 0);
    } catch (err) {
      const status = errorStatus(err);
      if (status === 403) {
        // 예외적으로 계약이 거부된 계정 — 세션 값으로 조회만 제공한다.
        const fallback = profileFromSession(user as Record<string, unknown> | null);
        if (fallback) {
          setProfile(fallback);
          setCanEdit(false);
        } else {
          setError('계정 정보를 불러오지 못했습니다.');
        }
      } else if (status === 401) {
        setError('로그인이 필요합니다.');
      } else {
        setError(errorMessage(err, '계정 정보를 불러오지 못했습니다.'));
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (isLoading) return;
    void load();
  }, [isLoading, load]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  /**
   * WO-O4O-CROSS-SERVICE-MYPAGE-NOTIFICATIONS-COMMONIZATION-V1:
   *   `onItemClick` 이 없어 알림을 눌러도 아무 데도 가지 않던 dead deep link 를
   *   공통 resolveNotificationTarget 으로 연결했다 (헤더 벨과 동일 계약).
   */
  const handleNotificationClick = useCallback(
    (n: NotificationItem) => {
      const target = resolveNotificationTarget(n);
      if (target) navigate(target);
    },
    [navigate],
  );

  const notificationBell = (
    <NotificationBell
      unreadCount={notifications.unreadCount}
      notifications={notifications.notifications}
      loading={notifications.loading}
      onOpen={() => void notifications.refetchList()}
      onItemClick={handleNotificationClick}
      onMarkAsRead={(id) => void notifications.markAsRead(id)}
      onMarkAllAsRead={() => void notifications.markAllAsRead()}
    />
  );

  /**
   * 화면 골격 — 상태(로딩/미인증/오류/정상)와 무관하게 같은 그릇을 쓴다.
   * 로딩·오류일 때만 헤더가 사라지는 구조를 만들지 않는다.
   */
  // 컴포넌트가 아니라 **함수 호출**로 감싼다 — 렌더마다 새 컴포넌트 타입이 생기면
  // 안쪽 편집 폼이 통째로 remount 되어 입력 중이던 값이 날아간다.
  const frame = (children: ReactNode) =>
    withShell ? (
      <MyPageShell
        title="내 프로필"
        width="form"
        basePath="/account"
        navItems={PHARMACY_HUB_ACCOUNT_NAV_ITEMS}
        headerActions={showNotifications ? notificationBell : undefined}
      >
        {children}
      </MyPageShell>
    ) : (
      // 매장 셸 안 — 셸이 이미 제목 영역을 갖고 있지 않으므로 화면이 제목을 렌더한다.
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">내 프로필</h1>
          {showNotifications && notificationBell}
        </div>
        {children}
      </div>
    );

  if (isLoading || loading) {
    return frame(<MyPageLoadingState message="계정 정보를 불러오는 중..." />);
  }

  if (!isAuthenticated) {
    return frame(
      <MyPageAuthRequired
        description="내 프로필은 로그인 후 이용할 수 있습니다."
        actionLabel="로그인"
        onAction={() => navigate('/login')}
      />,
    );
  }

  if (error || !profile) {
    return frame(
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        {error ?? '계정 정보를 불러오지 못했습니다.'}
      </div>,
    );
  }

  const displayName = profile.name || profile.nickname || profile.email;
  const roles: string[] = Array.isArray(user?.roles) ? (user!.roles as string[]) : [];

  return frame(
    <div className="space-y-5">
      {/* 서비스 가입 상태 — service_memberships.status 축 (5 서비스 공통 표현)
          WO-O4O-CROSS-SERVICE-MYPAGE-MEMBERSHIP-ROLE-STATUS-COMMONIZATION-V1 */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
        <span>서비스 가입 상태</span>
        <MembershipStatusBadge status={getServiceMembershipStatus(user)} />
      </div>

      <AccountProfileSection
        initial={(displayName || '?').charAt(0).toUpperCase()}
        name={displayName}
        email={profile.email}
        roleLabel={roles.length > 0 ? resolvePharmacyHubRoleLabel(roles) : ROLE_LABELS[ROLES.storeOwner]}
        fields={canEdit ? FIELDS : READONLY_FIELDS}
        values={{
          name: profile.name ?? '',
          nickname: profile.nickname ?? '',
          phone: profile.phone ?? '',
          email: profile.email,
        }}
        successMessage="계정 정보를 저장했습니다."
        validate={(draft) => (draft.name.trim().length === 0 ? '이름을 입력해 주세요.' : null)}
        onSave={async (draft) => {
          const updated = await updateAccountProfile({
            name: draft.name.trim(),
            nickname: draft.nickname.trim(),
            phone: draft.phone.trim(),
          });
          setProfile((prev) => ({ ...(prev as AccountProfile), ...updated }));
        }}
      >
        {!canEdit && (
          <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
            이 계정은 프로필 조회만 지원합니다. 이름·닉네임·연락처 변경은 서비스 운영자에게 문의해 주세요.
          </p>
        )}
      </AccountProfileSection>

      {/* WO-O4O-CROSS-SERVICE-MYPAGE-SETTINGS-SECURITY-COMMONIZATION-V1:
          보안 설정(비밀번호) · 계정 관리(로그아웃) 를 5 서비스 공통
          `AccountSecuritySettings` 로 수렴한다. Pharmacy-Hub 는 `/mypage` 축이 없어
          이 화면이 Profile + Settings 를 함께 담는다(§13 계약 유지).
          `logoutAll` 계약이 없으므로 현재 기기 로그아웃만 노출한다 — 세션 backend 는
          신설하지 않는다.
          ⚠️ 비밀번호 값은 공통 모달 밖으로 나가지 않는다. */}
      <AccountSecuritySettings
        securityDescription="Pharmacy-Hub 로그인 비밀번호"
        onChangePassword={changeAccountPassword}
        onLogout={handleLogout}
      />
    </div>,
  );
}
