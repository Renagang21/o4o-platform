/**
 * Account — Pharmacy-Hub 내 계정 (프로필 · 비밀번호 · 알림 · 로그아웃)
 *
 * WO-PHARMACY-HUB-STORE-INFO-AND-ACCOUNT-V1  (범위 B)
 *
 * /store-owner/account — 공통 매장 셸(StoreDashboardLayout) 안에서 렌더된다.
 *
 * 전부 **기존 공통 계약 재사용**이다. PH 전용 계정/알림 API 를 만들지 않았고,
 * KPA 전용 계정·자격·면허·분회 화면도 가져오지 않았다.
 *   UI   @o4o/account-ui  (ProfileCard · ProfileInfoField · SecuritySection ·
 *                          PasswordChangeModal · NotificationBell · useNotifications)
 *   API  /users/profile · /users/password · /notifications
 *
 * ⚠️ 이 화면은 **사용자(users)** 만 다룬다. 매장 정보(organizations)는
 *    /store-owner/info 의 소관이며 두 축을 섞지 않는다.
 * ⚠️ 비밀번호는 모달 밖으로 나가지 않는다 — 상태 저장·로깅 금지.
 */

import { useCallback, useEffect, useState } from 'react';
import { LogOut, Mail, Phone, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  MyPageLoadingState,
  NotificationBell,
  PasswordChangeModal,
  ProfileCard,
  ProfileInfoField,
  SecuritySection,
  useNotifications,
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

export default function AccountPage() {
  const { logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ name: '', nickname: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [passwordOpen, setPasswordOpen] = useState(false);

  const notifications = useNotifications(notificationsApi, {
    enabled: isAuthenticated,
    serviceKey: SERVICE_KEY,
  });

  const load = useCallback(async () => {
    try {
      const result = await fetchAccountProfile();
      setProfile(result);
      setDraft({
        name: result.name ?? '',
        nickname: result.nickname ?? '',
        phone: result.phone ?? '',
      });
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

  const handleSave = async () => {
    if (!profile) return;
    const name = draft.name.trim();
    if (name.length === 0) {
      setSaveError('이름을 입력해 주세요.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateAccountProfile({
        name,
        nickname: draft.nickname.trim(),
        phone: draft.phone.trim(),
      });
      setProfile((prev) => ({ ...(prev as AccountProfile), ...updated }));
      setEditing(false);
      setSaved(true);
    } catch (err) {
      setSaveError(errorMessage(err, '계정 정보를 저장하지 못했습니다.'));
    } finally {
      setSaving(false);
    }
  };

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

      {saved ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          계정 정보를 저장했습니다.
        </div>
      ) : null}

      <ProfileCard
        initial={(displayName || '?').charAt(0).toUpperCase()}
        name={displayName}
        email={profile.email}
        roleLabel={ROLE_LABELS[ROLES.storeOwner]}
        isEditing={editing}
        saving={saving}
        onEdit={() => {
          setSaveError(null);
          setSaved(false);
          setEditing(true);
        }}
        onSave={() => void handleSave()}
        onCancel={() => {
          setDraft({
            name: profile.name ?? '',
            nickname: profile.nickname ?? '',
            phone: profile.phone ?? '',
          });
          setSaveError(null);
          setEditing(false);
        }}
      >
        <div className="space-y-3">
          <ProfileInfoField
            label="이름"
            value={profile.name ?? ''}
            editValue={draft.name}
            isEditing={editing}
            onChange={(v) => setDraft({ ...draft, name: v })}
            icon={<UserIcon className="h-4 w-4 text-gray-400" />}
          />
          <ProfileInfoField
            label="닉네임"
            value={profile.nickname ?? ''}
            editValue={draft.nickname}
            isEditing={editing}
            onChange={(v) => setDraft({ ...draft, nickname: v })}
          />
          <ProfileInfoField
            label="연락처"
            value={profile.phone ?? ''}
            editValue={draft.phone}
            isEditing={editing}
            onChange={(v) => setDraft({ ...draft, phone: v })}
            type="tel"
            icon={<Phone className="h-4 w-4 text-gray-400" />}
          />
          {/* 이메일 변경은 별도 인증 절차가 필요하므로 이 화면에서 수정하지 않는다. */}
          <ProfileInfoField
            label="이메일 (로그인 아이디)"
            value={profile.email}
            editable={false}
            icon={<Mail className="h-4 w-4 text-gray-400" />}
          />
          {saveError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {saveError}
            </div>
          ) : null}
        </div>
      </ProfileCard>

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
