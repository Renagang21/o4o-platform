/** Shared account security section. User logout is separate from security revocation. */
import { useState } from 'react';
import type { ReactNode } from 'react';
import { LogOut, ShieldCheck } from 'lucide-react';
import { SettingsSection } from './SettingsSection.js';

export interface AccountSecurityNotify {
  success: (message: string) => void;
  error: (message: string) => void;
}

export interface AccountSecuritySettingsProps {
  /** Log out of this service in the current browser. */
  onLogout?: () => void | Promise<void>;
  notify?: AccountSecurityNotify;
  securityDescription?: string;
  showTwoFactorNotice?: boolean;
  children?: ReactNode;
}

export function AccountSecuritySettings({
  onLogout,
  notify,
  securityDescription,
  showTwoFactorNotice = false,
  children,
}: AccountSecuritySettingsProps) {
  const [loggingOut, setLoggingOut] = useState(false);
  const handleLogout = async () => {
    if (!onLogout || loggingOut) return;
    setLoggingOut(true);
    try {
      await onLogout();
    } catch {
      notify?.error('로그아웃에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <>
      <SettingsSection title="보안 설정" description={securityDescription}>
        <div className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-700">로그인 계정</span>
          </div>
          <span className="text-xs text-gray-500">O4O 계정</span>
        </div>
        {showTwoFactorNotice && (
          <div className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl opacity-60 cursor-not-allowed">
            <span className="text-sm text-gray-700">2단계 인증</span>
            <span className="text-xs text-gray-400">준비 중</span>
          </div>
        )}
      </SettingsSection>
      {onLogout && (
        <SettingsSection title="계정 관리">
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={loggingOut}
            className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <LogOut className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700">로그아웃</span>
            </div>
            {loggingOut && <span className="text-xs text-gray-400">처리 중...</span>}
          </button>
        </SettingsSection>
      )}
      {children}
    </>
  );
}
