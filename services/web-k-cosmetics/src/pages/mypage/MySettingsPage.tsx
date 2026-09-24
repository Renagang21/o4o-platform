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
    /*
     * WO-O4O-CROSS-SERVICE-MYPAGE-FINAL-AUDIT-AND-CLOSURE-V1:
     *   leaf 화면인데 허브 제목("마이페이지")을 그대로 써서, KCos 만 어느 화면에
     *   있는지 제목으로 알 수 없었다. KPA/Neture/PH 와 동일하게 화면 이름을 쓴다.
     */
    <MyPageLayout
      title="설정"
      subtitle="보안과 계정을 관리할 수 있습니다"
      width="form"
      navItems={KCOS_MYPAGE_NAV_ITEMS}
    >
      <AccountSecuritySettings
        securityDescription="로그인 수단 — Google 계정"
        notify={{ success: toast.success, error: toast.error }}
        onLogoutAll={logoutAll}
      />
    </MyPageLayout>
  );
}
