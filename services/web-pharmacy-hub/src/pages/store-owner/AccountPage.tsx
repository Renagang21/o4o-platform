/**
 * Account — Pharmacy-Hub 내 계정 (프로필 · 비밀번호 · 알림 · 로그아웃)
 *
 * WO-PHARMACY-HUB-STORE-INFO-AND-ACCOUNT-V1  (범위 B)
 * WO-O4O-CROSS-SERVICE-PROFILE-COMMONIZATION-V1:
 *   ProfileCard + ProfileInfoField 목록 + 편집/저장 상태기계를
 *   `@o4o/account-ui` 의 `AccountProfileSection` 으로 수렴.
 *   PH 는 toast 대신 인라인 피드백을 쓰므로 `onError` 를 주입하지 않는다.
 *
 * /store-owner/account — 공통 매장 셸(StoreDashboardLayout) 안에서 렌더된다.
 *
 * ⚠️ 이 화면은 **사용자(users)** 만 다룬다. 매장 정보(organizations)는
 *    /store-owner/info 의 소관이며 두 축을 섞지 않는다.
 * ⚠️ 비밀번호는 모달 밖으로 나가지 않는다 — 상태 저장·로깅 금지.
 */

import { useCallback, useEffect, useState } from 'react';
import { LogOut, Mail, Phone, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  AccountProfileSection,
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

export default function AccountPage() {
  const { logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const notifications = useNotifications(notificationsApi, {
    enabled: isAuthenticated,
    serviceKey: SERVICE_KEY,
  });

  const load = useCallback(async () => {
    try {
      setProfile(await fetchAccountProfile());
    } catch (err) {
      const status = errorStatus(err);
      setError(
        status === 401
          ? '로그인이 필요합니다.'
          : errorMessage(err, '계정 정보를 불러오지 못했습니다.'),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (loading) {
    return <MyPageLoadingState message="계정 정보를 불러오는 중..." />;
  }

  if (error || !profile) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-slate-900">내 계정</h1>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {error ?? '계정 정보를 불러오지 못했습니다.'}
        </div>
      </div>
    );
  }

  const displayName = profile.name || profile.nickname || profile.email;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">내 계정</h1>
        <NotificationBell
          unreadCount={notifications.unreadCount}
          notifications={notifications.notifications}
          loading={notifications.loading}
          onOpen={() => void notifications.refetchList()}
          onMarkAsRead={(id) => void notifications.markAsRead(id)}
          onMarkAllAsRead={() => void notifications.markAllAsRead()}
        />
      </div>

      <AccountProfileSection
        initial={(displayName || '?').charAt(0).toUpperCase()}
        name={displayName}
        email={profile.email}
        roleLabel={ROLE_LABELS[ROLES.storeOwner]}
        fields={FIELDS}
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
      />

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
