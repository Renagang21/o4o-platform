/**
 * TermsAcceptanceGate — KPA Society 기존 회원 이용약관 재동의 게이트
 *
 * WO-O4O-INTEGRATED-TERMS-ACCEPTANCE-AND-SIGNUP-ALIGNMENT-V1 §17
 *
 * 공통 PolicyAcceptanceGate(@o4o/shared-space-ui) 에 이 서비스의 세션 상태·API 만 주입한다.
 * KPA 의 공개 약관 경로는 `/policy`(이용약관) · `/privacy` 다. 승낙 대상은 표준 service_policy_documents 이므로
 * loader 는 legacy fallback 없는 canonical `loadPolicy` 를 쓴다. 서버 게이트(428)가 최종 방어선이다.
 */

import type { ReactNode } from 'react';
import { PolicyAcceptanceGate } from '@o4o/shared-space-ui';
import { useAuth } from '../../contexts/AuthContext';
import { loadPolicy } from '../../lib/legalDocument';

const ALLOW_PATHS = ['/policy', '/privacy', '/terms'];

export function TermsAcceptanceGate({ children }: { children: ReactNode }) {
  const { pendingPolicyAcceptances, acceptPendingPolicies, logout } = useAuth();
  return (
    <PolicyAcceptanceGate
      pending={pendingPolicyAcceptances}
      loadPolicy={loadPolicy}
      onAccept={acceptPendingPolicies}
      onLogout={logout}
      allowPaths={ALLOW_PATHS}
      serviceName="KPA Society"
      termsPath="/policy"
    >
      {children}
    </PolicyAcceptanceGate>
  );
}
