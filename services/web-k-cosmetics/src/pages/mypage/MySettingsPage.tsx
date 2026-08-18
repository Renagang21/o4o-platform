/**
 * MySettingsPage - 설정 (경량 모드)
 *
 * WO-O4O-KCOSMETICS-MYPAGE-SPLIT-V1
 * WO-O4O-CROSS-SERVICE-PROFILE-COMMONIZATION-V1:
 *   `@o4o/account-ui` 의 `AccountSecuritySettings` / `MyPageAuthRequired` 채택.
 *
 * /mypage/settings — 보안 / 계정 관리.
 */

import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/apiClient';
import { toast } from '@o4o/error-handling';
import { MyPageLayout, MyPageAuthRequired, AccountSecuritySettings } from '@o4o/account-ui';
import { KCOS_MYPAGE_NAV_ITEMS } from './navItems';

export default function MySettingsPage() {
  const { user, isAuthenticated, logoutAll } = useAuth();

  if (!isAuthenticated || !user) {
    return (
      <MyPageAuthRequired
        href="/login"
        renderLink={(href, className, label) => (
          <Link to={href} className={className}>
            {label}
          </Link>
        )}
      />
    );
  }

  return (
    <MyPageLayout
      title="마이페이지"
      subtitle="내 정보를 확인하고 관리할 수 있습니다"
      width="form"
      navItems={KCOS_MYPAGE_NAV_ITEMS}
    >
      <AccountSecuritySettings
        securityDescription="정기적인 비밀번호 변경을 권장합니다"
        notify={{ success: toast.success, error: toast.error }}
        onLogoutAll={logoutAll}
        onChangePassword={async (currentPassword, newPassword, newPasswordConfirm) => {
          // WO-O4O-IDENTITY-V2-PHASE2-CHANGE-PASSWORD-SERVICE-SCOPE-V1:
          //   serviceKey='k-cosmetics' 주입 — K-Cosmetics 범위의 service_credentials 만 갱신.
          await api.put('/users/password', {
            currentPassword,
            newPassword,
            newPasswordConfirm,
            serviceKey: 'k-cosmetics',
          });
        }}
      />
    </MyPageLayout>
  );
}
