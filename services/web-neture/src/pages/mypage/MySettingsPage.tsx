/**
 * MySettingsPage - 설정 (경량 모드)
 *
 * WO-O4O-NETURE-MYPAGE-SPLIT-V1
 *
 * /mypage/settings — 보안 설정. 현재 비밀번호 변경만 안내 상태.
 */

import { useState } from 'react';
import { User, Lock, LogOut } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { useAuth } from '../../contexts';
import { useLoginModal } from '../../contexts/LoginModalContext';
import { api } from '../../lib/apiClient';
import { MyPageLayout, SettingsSection, PasswordChangeModal } from '@o4o/account-ui';

export default function MySettingsPage() {
  const { user, isAuthenticated, logoutAll } = useAuth();
  const { openLoginModal } = useLoginModal();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center max-w-sm w-full">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-gray-400" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900 mb-2">로그인이 필요합니다</h1>
          <p className="text-sm text-gray-500 mb-6">마이페이지를 이용하려면 로그인해주세요.</p>
          <button
            onClick={() => openLoginModal('/mypage/settings')}
            className="w-full py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            로그인
          </button>
        </div>
      </div>
    );
  }

  const handleChangePassword = async (currentPassword: string, newPassword: string, newPasswordConfirm: string) => {
    setChangingPassword(true);
    try {
      // WO-O4O-IDENTITY-V2-PHASE2-CHANGE-PASSWORD-SERVICE-SCOPE-V1:
      //   serviceKey='neture' 주입 — Neture 범위의 service_credentials 만 갱신.
      await api.put('/users/password', {
        currentPassword,
        newPassword,
        newPasswordConfirm,
        serviceKey: 'neture',
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
    <MyPageLayout
      title="마이페이지"
      subtitle="계정 보안 및 환경 설정을 관리합니다"
      width="form"
      breadcrumb={[{ label: '홈', href: '/' }, { label: '마이페이지', href: '/mypage' }, { label: '설정' }]}
    >
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
      </SettingsSection>

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
      </SettingsSection>

      <PasswordChangeModal
        open={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSubmit={handleChangePassword}
        submitting={changingPassword}
      />
    </MyPageLayout>
  );
}
