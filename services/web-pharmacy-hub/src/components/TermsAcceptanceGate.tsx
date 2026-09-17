/**
 * TermsAcceptanceGate — Pharmacy-Hub 기존 회원 이용약관 재동의 게이트
 *
 * WO-O4O-INTEGRATED-TERMS-ACCEPTANCE-AND-SIGNUP-ALIGNMENT-V1 §17
 *
 * 공통 PolicyAcceptanceGate(@o4o/shared-space-ui) 에 이 서비스의 세션 상태·API 만 주입한다.
 * 세션의 pendingPolicyAcceptances 가 비어 있지 않으면 어떤 경로에서도(공개 /terms · /privacy 제외)
 * 서비스 화면 대신 재동의 화면을 그린다. 서버 게이트(428)가 최종 방어선이다.
 */

import type { ReactNode } from 'react';
import { PolicyAcceptanceGate } from '@o4o/shared-space-ui';
import { useAuth } from '../contexts/AuthContext';
import { BRAND } from '../config/service';
import { loadPolicy } from '../pages/legal/PolicyDocumentPage';

const ALLOW_PATHS = ['/terms', '/privacy'];

export function TermsAcceptanceGate({ children }: { children: ReactNode }) {
  const { pendingPolicyAcceptances, acceptPendingPolicies, logout } = useAuth();
  return (
    <PolicyAcceptanceGate
      pending={pendingPolicyAcceptances}
      loadPolicy={loadPolicy}
      onAccept={acceptPendingPolicies}
      onLogout={logout}
      allowPaths={ALLOW_PATHS}
      serviceName={BRAND.name}
      termsPath="/terms"
    >
      {children}
    </PolicyAcceptanceGate>
  );
}
