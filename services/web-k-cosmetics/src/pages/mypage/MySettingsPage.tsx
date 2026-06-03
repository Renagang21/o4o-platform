/**
 * MySettingsPage - 설정 (경량 모드)
 *
 * WO-O4O-KCOSMETICS-MYPAGE-SPLIT-V1
 *
 * /mypage/settings — 보안/알림/계정 관리.
 * 현재 k-cosmetics에서는 기능이 제한적이므로 안내 메시지로 구성.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/apiClient';
import { toast } from '@o4o/error-handling';
import { Lock, LogOut } from 'lucide-react';
import { MyPageLayout, SettingsSection, PasswordChangeModal } from '@o4o/account-ui';
import { KCOS_MYPAGE_NAV_ITEMS } from './navItems';

export default function MySettingsPage() {
  const { user, isAuthenticated, logoutAll } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center max-w-sm w-full">
          <h1 className="text-lg font-semibold text-gray-900 mb-4">로그인이 필요합니다</h1>
          <Link
            to="/login"
            className="block w-full py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors text-center"
          >
            로그인
          </Link>
        </div>
      </div>
    );
  }

  const handleChangePassword = async (currentPassword: string, newPassword: string, newPasswordConfirm: string) => {
    setChangingPassword(true);
    try {
      // WO-O4O-IDENTITY-V2-PHASE2-CHANGE-PASSWORD-SERVICE-SCOPE-V1:
      //   serviceKey='k-cosmetics' 주입 — K-Cosmetics 범위의 service_credentials 만 갱신.
      await api.put('/users/password', {
        currentPassword,
        newPassword,
        newPasswordConfirm,
        serviceKey: 'k-cosmetics',
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
      subtitle="내 정보를 확인하고 관리할 수 있습니다"
      width="form"
      navItems={KCOS_MYPAGE_NAV_ITEMS}
    >
      <SettingsSection title="보안 설정" description="정기적인 비밀번호 변경을 권장합니다">
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
