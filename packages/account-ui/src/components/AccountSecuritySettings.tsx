/**
 * AccountSecuritySettings — 보안 설정 / 계정 관리 공통 섹션
 *
 * WO-O4O-CROSS-SERVICE-PROFILE-COMMONIZATION-V1
 *
 * GlycoPharm / K-Cosmetics / Neture 의 `MySettingsPage` 본문이
 * serviceKey 주입값과 2단계 인증 안내 유무만 다른 3중 복제였다.
 * 비밀번호 변경 모달 · 모든 기기 로그아웃 · 확인 다이얼로그 흐름을 여기로 수렴한다.
 *
 * 경계:
 *   - 실제 API 호출(`PUT /users/password`, `logoutAll`)은 호출자가 주입한다.
 *     account-ui 는 서비스 apiClient 를 알지 못한다.
 *   - ⚠️ 비밀번호 값은 onChangePassword 로 전달만 하고 이 컴포넌트에 저장/로깅하지 않는다.
 *   - toast 는 `@o4o/error-handling` 의존을 만들지 않기 위해 `notify` 로 주입받는다.
 */

import { useState } from 'react';
import type { ReactNode } from 'react';
import { Lock, LogOut } from 'lucide-react';
import { SettingsSection } from './SettingsSection.js';
import { PasswordChangeModal } from './PasswordChangeModal.js';

export interface AccountSecurityNotify {
  success: (message: string) => void;
  error: (message: string) => void;
}

export interface AccountSecuritySettingsProps {
  /** 비밀번호 변경 실행. serviceKey 주입은 호출자 책임. */
  onChangePassword: (
    currentPassword: string,
    newPassword: string,
    newPasswordConfirm: string,
  ) => Promise<void>;
  /** 모든 기기 로그아웃. 미지정 시 "계정 관리" 섹션을 렌더하지 않는다. */
  onLogoutAll?: () => Promise<void>;
  notify?: AccountSecurityNotify;
  /** 보안 설정 섹션 설명 문구. */
  securityDescription?: string;
  /** 2단계 인증 "준비 중" 안내 노출 (GlycoPharm). */
  showTwoFactorNotice?: boolean;
  /** 섹션 하단 추가 항목. */
  children?: ReactNode;
}

const ROW_CLS =
  'w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors';

const LOGOUT_ALL_CONFIRM = '다른 모든 기기에서 로그아웃됩니다.\n\n계속하시겠습니까?';

export function AccountSecuritySettings({
  onChangePassword,
  onLogoutAll,
  notify,
  securityDescription,
  showTwoFactorNotice = false,
  children,
}: AccountSecuritySettingsProps) {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  const handleChangePassword = async (
    currentPassword: string,
    newPassword: string,
    newPasswordConfirm: string,
  ) => {
    setChangingPassword(true);
    try {
      await onChangePassword(currentPassword, newPassword, newPasswordConfirm);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogoutAll = async () => {
    if (!onLogoutAll) return;
    if (!window.confirm(LOGOUT_ALL_CONFIRM)) return;
    setLoggingOutAll(true);
    try {
      await onLogoutAll();
      notify?.success('다른 기기에서 로그아웃되었습니다.');
    } catch {
      notify?.error('로그아웃에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoggingOutAll(false);
    }
  };

  return (
    <>
      <SettingsSection title="보안 설정" description={securityDescription}>
        <button type="button" onClick={() => setShowPasswordModal(true)} className={ROW_CLS}>
          <div className="flex items-center gap-3">
            <Lock className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-700">비밀번호 변경</span>
          </div>
        </button>
        {showTwoFactorNotice && (
          // 2단계 인증 API 미도입 — no-op button 대신 "준비 중" 정직 표시.
          <div className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl opacity-60 cursor-not-allowed">
            <span className="text-sm text-gray-700">2단계 인증</span>
            <span className="text-xs text-gray-400">준비 중</span>
          </div>
        )}
      </SettingsSection>

      {onLogoutAll && (
        <SettingsSection title="계정 관리">
          <button
            type="button"
            onClick={() => void handleLogoutAll()}
            disabled={loggingOutAll}
            className={`${ROW_CLS} disabled:opacity-50`}
          >
            <div className="flex items-center gap-3">
              <LogOut className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700">모든 기기 로그아웃</span>
            </div>
            {loggingOutAll && <span className="text-xs text-gray-400">처리 중...</span>}
          </button>
        </SettingsSection>
      )}

      {children}

      <PasswordChangeModal
        open={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSubmit={handleChangePassword}
        submitting={changingPassword}
      />
    </>
  );
}
