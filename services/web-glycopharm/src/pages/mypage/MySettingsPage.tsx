/**
 * MySettingsPage - 보안 / 알림 / 계정 관리
 *
 * WO-O4O-GLYCOPHARM-MYPAGE-SPLIT-V1
 *
 * /mypage/settings — 비밀번호 변경, 2FA, 알림 설정, 계정 탈퇴 등
 * 기존 MyPage.tsx의 하단 보안/계정 섹션을 분리.
 */

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/apiClient';
import { toast } from '@o4o/error-handling';
import { Lock, LogOut } from 'lucide-react';
import {
  MyPageLayout,
  SettingsSection,
  PasswordChangeModal,
} from '@o4o/account-ui';

export default function MySettingsPage() {
  const { user, logoutAll } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <p className="text-slate-500">로그인이 필요합니다.</p>
      </div>
    );
  }

  const handleChangePassword = async (currentPassword: string, newPassword: string, newPasswordConfirm: string) => {
    setChangingPassword(true);
    try {
      // WO-O4O-IDENTITY-V2-PHASE2-CHANGE-PASSWORD-SERVICE-SCOPE-V1:
      //   serviceKey='glycopharm' 주입 — GlycoPharm 범위의 service_credentials 만 갱신.
      //   다른 서비스(KPA 등)의 비밀번호에 영향 없음.
      await api.put('/users/password', {
        currentPassword,
        newPassword,
        newPasswordConfirm,
        serviceKey: 'glycopharm',
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogoutAll = async () => {
    const confirmed = window.confirm('다른 모든 기기에서 로그아웃됩니다.\n\n계속하시겠습니까?');
    if (!confirmed) return;
    setLoggingOutAll(true);
    try {
      await logoutAll();
      toast.success('다른 기기에서 로그아웃되었습니다.');
    } catch {
      toast.error('로그아웃에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoggingOutAll(false);
    }
  };

  return (
    <MyPageLayout title="마이페이지">
      {/* Security */}
      <SettingsSection title="보안 설정">
        <button
          onClick={() => setShowPasswordModal(true)}
          className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Lock className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-700">비밀번호 변경</span>
          </div>
        </button>
        <button className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
          <span className="text-sm text-gray-700">2단계 인증</span>
          <span className="text-xs text-gray-400">비활성화</span>
        </button>
      </SettingsSection>

      {/* Notifications */}
      <SettingsSection title="알림 설정">
        <button className="w-full text-left p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
          <span className="text-sm text-gray-700">알림 설정</span>
        </button>
      </SettingsSection>

      {/* Account */}
      <SettingsSection title="계정 관리">
        <button
          onClick={handleLogoutAll}
          disabled={loggingOutAll}
          className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          <div className="flex items-center gap-3">
            <LogOut className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-700">모든 기기 로그아웃</span>
          </div>
          {loggingOutAll && <span className="text-xs text-gray-400">처리 중...</span>}
        </button>
        <button className="w-full text-left p-4 bg-red-50 rounded-xl hover:bg-red-100 transition-colors">
          <span className="text-sm text-red-600">계정 탈퇴</span>
        </button>
      </SettingsSection>

      {/* Password Change Modal */}
      <PasswordChangeModal
        open={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSubmit={handleChangePassword}
        submitting={changingPassword}
      />
    </MyPageLayout>
  );
}
