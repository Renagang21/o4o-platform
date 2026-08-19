/**
 * MySettingsPage - 보안 / 계정 관리
 *
 * WO-O4O-GLYCOPHARM-MYPAGE-SPLIT-V1
 * WO-O4O-MYPAGE-TIER1-DEAD-STUB-CLEANUP-V1 (2단계 인증 "준비 중" 정직 표시 · 알림/탈퇴 stub 제거)
 * WO-O4O-CROSS-SERVICE-PROFILE-COMMONIZATION-V1:
 *   보안 설정 / 계정 관리 본문 3중 복제를 `@o4o/account-ui` 의
 *   `AccountSecuritySettings` 로 수렴. 이 화면은 serviceKey 주입만 담당한다.
 */

import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/apiClient';
import { toast } from '@o4o/error-handling';
import { MyPageLayout, MyPageAuthRequired, AccountSecuritySettings } from '@o4o/account-ui';
import { GLYCOPHARM_MYPAGE_NAV_ITEMS } from './navItems';

export default function MySettingsPage() {
  const { user, logoutAll } = useAuth();

  // WO-O4O-CROSS-SERVICE-MYPAGE-SHELL-LAYOUT-COMMONIZATION-V1:
  // 로그인 안내도 Shell 안에서 렌더한다 (헤더·네비게이션 유실 금지).
  if (!user) {
    return (
      <MyPageLayout title="설정" width="form" navItems={GLYCOPHARM_MYPAGE_NAV_ITEMS}>
        <MyPageAuthRequired />
      </MyPageLayout>
    );
  }

  return (
    <MyPageLayout title="설정" width="form" navItems={GLYCOPHARM_MYPAGE_NAV_ITEMS}>
      <AccountSecuritySettings
        showTwoFactorNotice
        notify={{ success: toast.success, error: toast.error }}
        onLogoutAll={logoutAll}
        onChangePassword={async (currentPassword, newPassword, newPasswordConfirm) => {
          // WO-O4O-IDENTITY-V2-PHASE2-CHANGE-PASSWORD-SERVICE-SCOPE-V1:
          //   serviceKey='glycopharm' 주입 — GlycoPharm 범위의 service_credentials 만 갱신.
          await api.put('/users/password', {
            currentPassword,
            newPassword,
            newPasswordConfirm,
            serviceKey: 'glycopharm',
          });
        }}
      />
    </MyPageLayout>
  );
}
