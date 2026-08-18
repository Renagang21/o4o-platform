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
 * 편집 가능 여부는 **역할 하드코딩이 아니라 서버 응답으로** 결정한다:
 *   GET /pharmacy-hub/store-owner/account/profile 이 200 이면 편집 가능,
 *   403 이면 조회 전용으로 떨어진다. 프론트에서 가드를 완화하지 않으며 403 을
 *   회피하려고 store_owner 경로를 억지로 열지 않는다.
 *   (운영자 본인 프로필의 수정 계약은 backend 부재 — CHECK 문서 잔여 항목 참조)
 */

import { useCallback, useEffect, useState } from 'react';
import { LogOut, Mail, Phone, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  AccountProfileSection,
  MyPageAuthRequired,
  MyPageLoadingState,
  NotificationBell,
  PasswordChangeModal,
  SecuritySection,
  useNotifications,
  type AccountProfileFieldSpec,
} from '@o4o/account-ui';
import {
  changeAccountPassword,
  fetchAccountProfile,
  updateAccountProfile,
  type AccountProfile,
} from '../../lib/api/pharmacyHubAccount';
import { notificationsApi } from '../../lib/api/notifications';
import { errorMessage, errorStatus } from '../../lib/api/pharmacyHubOrders';
import { useAuth } from '../../contexts/AuthContext';
import { ROLE_LABELS, ROLES, SERVICE_KEY } from '../../config/service';

/** 편집 가능 계정의 필드 구성 (서버 editableFields = name · nickname · phone 과 같은 축) */
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

/** 보유 역할 중 Pharmacy-Hub 역할 라벨 — 없으면 중립 라벨. */
function resolveRoleLabel(roles: readonly string[]): string {
  for (const role of roles) {
    if (ROLE_LABELS[role]) return ROLE_LABELS[role];
  }
  return '회원';
}

/**
 * 수정 계약이 없는 계정의 조회 폴백. 세션(GET /auth/me)이 이미 보유한 값만 쓴다 —
 * 이 화면 때문에 새 backend 계약을 만들지 않는다.
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
  /** 매장 셸 안에는 공개 헤더의 알림 벨이 없으므로 화면이 직접 렌더한다. */
  showNotifications = false,
}: {
  showNotifications?: boolean;
}) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);

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
      setProfile(await fetchAccountProfile());
      setCanEdit(true);
    } catch (err) {
      const status = errorStatus(err);
      if (status === 403) {
        // 프로필 수정 계약이 없는 계정(운영자·공급자 등) — 세션 값으로 조회만 제공한다.
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

  if (isLoading || loading) {
    return <MyPageLoadingState message="계정 정보를 불러오는 중..." />;
  }

  if (!isAuthenticated) {
    return (
      <MyPageAuthRequired
        description="내 프로필은 로그인 후 이용할 수 있습니다."
        actionLabel="로그인"
        onAction={() => navigate('/login')}
      />
    );
  }

  if (error || !profile) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-slate-900">내 프로필</h1>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {error ?? '계정 정보를 불러오지 못했습니다.'}
        </div>
      </div>
    );
  }

  const displayName = profile.name || profile.nickname || profile.email;
  const roles: string[] = Array.isArray(user?.roles) ? (user!.roles as string[]) : [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">내 프로필</h1>
        {showNotifications && (
          <NotificationBell
            unreadCount={notifications.unreadCount}
            notifications={notifications.notifications}
            loading={notifications.loading}
            onOpen={() => void notifications.refetchList()}
            onMarkAsRead={(id) => void notifications.markAsRead(id)}
            onMarkAllAsRead={() => void notifications.markAllAsRead()}
          />
        )}
      </div>

      <AccountProfileSection
        initial={(displayName || '?').charAt(0).toUpperCase()}
        name={displayName}
        email={profile.email}
        roleLabel={roles.length > 0 ? resolveRoleLabel(roles) : ROLE_LABELS[ROLES.storeOwner]}
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

      <SecuritySection
        onPasswordChange={() => setPasswordOpen(true)}
        description="Pharmacy-Hub 로그인 비밀번호"
      />

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">세션</h3>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-between rounded-xl bg-gray-50 p-4 text-sm text-gray-700 transition-colors hover:bg-gray-100"
        >
          <span>로그아웃</span>
          <LogOut className="h-4 w-4 text-gray-400" />
        </button>
      </div>

      <PasswordChangeModal
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        onSubmit={changeAccountPassword}
      />
    </div>
  );
}
