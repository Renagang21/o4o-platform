/**
 * MySettingsPage - 설정 (경량 모드)
 *
 * WO-O4O-NETURE-MYPAGE-SPLIT-V1
 * WO-O4O-CROSS-SERVICE-PROFILE-COMMONIZATION-V1:
 *   `@o4o/account-ui` 의 `AccountSecuritySettings` / `MyPageAuthRequired` 채택.
 *
 * /mypage/settings — 보안 / 계정 관리.
 */

import { User } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { useAuth } from '../../contexts';
import { useLoginModal } from '../../contexts/LoginModalContext';
import { api } from '../../lib/apiClient';
import { MyPageLayout, MyPageAuthRequired, AccountSecuritySettings } from '@o4o/account-ui';

export default function MySettingsPage() {
  const { user, isAuthenticated, logoutAll } = useAuth();
  const { openLoginModal } = useLoginModal();

  if (!isAuthenticated || !user) {
    return (
      <MyPageAuthRequired
        icon={<User className="w-8 h-8 text-gray-400" />}
        description="마이페이지를 이용하려면 로그인해주세요."
        onAction={() => openLoginModal('/mypage/settings')}
      />
    );
  }

  return (
    <MyPageLayout
      title="마이페이지"
      subtitle="계정 보안 및 환경 설정을 관리합니다"
      width="form"
      breadcrumb={[
        { label: '홈', href: '/' },
        { label: '마이페이지', href: '/mypage' },
        { label: '설정' },
      ]}
    >
      <AccountSecuritySettings
        notify={{ success: toast.success, error: toast.error }}
        onLogoutAll={logoutAll}
        onChangePassword={async (currentPassword, newPassword, newPasswordConfirm) => {
          // WO-O4O-IDENTITY-V2-PHASE2-CHANGE-PASSWORD-SERVICE-SCOPE-V1:
          //   serviceKey='neture' 주입 — Neture 범위의 service_credentials 만 갱신.
          await api.put('/users/password', {
            currentPassword,
            newPassword,
            newPasswordConfirm,
            serviceKey: 'neture',
          });
        }}
      />
    </MyPageLayout>
  );
}
