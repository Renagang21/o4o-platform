/**
 * MySettingsPage - 설정 (경량 모드)
 *
 * WO-O4O-NETURE-MYPAGE-SPLIT-V1
 * WO-O4O-CROSS-SERVICE-PROFILE-COMMONIZATION-V1:
 *   `@o4o/account-ui` 의 `AccountSecuritySettings` / `MyPageAuthRequired` 채택.
 *
 * WO-O4O-LOCAL-WORK-AGENT-ONECLICK-PAIRING-V1:
 *   [ 이 PC 연결 ] 카드를 여기에 둔다. 별도 설정 화면을 만들지 않는다 (§5).
 *
 * WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1:
 *   이전 Google 연결 경로는 은퇴한 채 유지한다.
 *   Phase 4-C 신규 연결은 현재 계정 재인증·대상 인증·명시적 확인을 모두 요구한다.
 *
 * /mypage/settings — 보안 / 계정 관리.
 */

import { User } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { useAuth } from '../../contexts';
import { useLoginModal } from '../../contexts/LoginModalContext';
import { MyPageLayout, MyPageAuthRequired, MyPageLoadingState, AccountSecuritySettings } from '@o4o/account-ui';
import { getNetureMyPageNavItems } from './navItems';
import LocalAgentCard from '../../components/mypage/LocalAgentCard';
import ExternalAiConnectionsCard from '../../components/mypage/ExternalAiConnectionsCard';
import { PasswordSecuritySettings, SocialAccountConnections } from '@o4o/auth-react';
import { authClient } from '../../lib/apiClient';
import { knownHasStore } from '../../lib/my-home-store-presence';
import { useState } from 'react';

export default function MySettingsPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { openLoginModal } = useLoginModal();

  /**
   * WO-O4O-CROSS-SERVICE-MYPAGE-FINAL-AUDIT-AND-CLOSURE-V1:
   *   /mypage/* 에는 route guard 가 없어 auth bootstrap 중에도 미인증 분기가 먼저 렌더됐다.
   *   그 결과 로그인한 사용자에게 "로그인이 필요합니다" 가 수 초간 노출됐다.
   *   로딩은 미인증 분기보다 먼저, Shell 안에서 렌더한다.
   */
  if (isLoading) {
    return (
      <MyPageLayout title="계정 설정" width="form" navItems={getNetureMyPageNavItems([])}>
        <MyPageLoadingState message="계정 정보를 불러오는 중..." />
      </MyPageLayout>
    );
  }

  // WO-O4O-CROSS-SERVICE-MYPAGE-SHELL-LAYOUT-COMMONIZATION-V1:
  // 로그인 안내도 Shell 안에서 렌더한다 (헤더·네비게이션 유실 금지).
  if (!isAuthenticated || !user) {
    return (
      <MyPageLayout title="계정 설정" width="form" navItems={getNetureMyPageNavItems([])}>
        <MyPageAuthRequired
          icon={<User className="w-8 h-8 text-gray-400" />}
          description="My Home을 이용하려면 로그인해 주시기 바랍니다."
          onAction={() => openLoginModal('/mypage/settings')}
        />
      </MyPageLayout>
    );
  }

  return (
    <MyPageLayout
      title="계정 설정"
      subtitle="로그인 · 보안과 연결 설정을 관리합니다"
      width="form"
      navItems={getNetureMyPageNavItems(user.roles, knownHasStore(user.id))}
      breadcrumb={[
        { label: '홈', href: '/' },
        { label: 'My Home', href: '/mypage' },
        { label: '계정 설정' },
      ]}
    >
      {/* 2026-11-13 My Home 개선 2: 로그인 · 보안을 한 묶음으로 먼저, 연결 설정은 그 아래에 둔다.
          약사 자격은 프로필로 옮겼다. 이 PC 연결은 펼칠 때만 PC 를 확인한다(브라우저 로컬 연결 권한 요청을 원치 않는 사람에게 띄우지 않는다). */}
      <AccountSecuritySettings
        notify={{ success: toast.success, error: toast.error }}
        onLogout={logout}
      />
      <SocialAccountConnections client={authClient} />
      <PasswordSecuritySettings client={authClient} notify={{ success: toast.success }} onSessionEnded={() => openLoginModal('/mypage/settings')} />
      <ExternalAiConnectionsCard key={user.id} />
      <PcConnectionSection key={user.id} />
    </MyPageLayout>
  );
}

/** 이 PC 연결(PC 프로그램) — 펼쳤을 때만 카드를 띄워 PC 상태를 확인한다. */
function PcConnectionSection() {
  const [open, setOpen] = useState(false);
  return (
    <details className="mt-6 rounded-xl border border-gray-200 bg-white p-4" onToggle={event => setOpen((event.currentTarget as HTMLDetailsElement).open)}>
      <summary className="min-h-11 cursor-pointer content-center font-semibold text-gray-900">이 PC 연결 (PC 프로그램)</summary>
      <p className="mt-1 text-sm text-gray-600">이 PC 에 설치한 O4O PC 프로그램을 계정과 연결합니다. 펼치면 이 PC 의 연결 상태를 확인합니다.</p>
      {open && <div className="mt-4"><LocalAgentCard /></div>}
    </details>
  );
}
