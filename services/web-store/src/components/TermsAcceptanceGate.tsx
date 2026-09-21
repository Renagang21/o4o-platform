import type { ReactNode } from 'react';
import { PolicyAcceptanceGate, type PolicyDocumentDto } from '@o4o/shared-space-ui';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/apiClient';
import { BRAND, PLATFORM_ORIGIN } from '../config/workspace';

/** pending 항목의 serviceKey(세션 응답이 준 값)로 공개 정책 문서를 읽는다 — 이 앱이 serviceKey 를 정하지 않는다. */
export async function loadPolicy(serviceKey: string, documentType: string): Promise<PolicyDocumentDto | null> {
  try {
    const res = await api.get(`/public/services/${serviceKey}/policies/${documentType}`);
    return (res.data as { data?: PolicyDocumentDto | null })?.data ?? null;
  } catch (err: unknown) {
    if ((err as { response?: { status?: number } })?.response?.status === 404) return null;
    throw err;
  }
}

export function TermsAcceptanceGate({ children }: { children: ReactNode }) {
  const { pendingPolicyAcceptances, acceptPendingPolicies, logout } = useAuth();
  return <PolicyAcceptanceGate
    pending={pendingPolicyAcceptances}
    loadPolicy={loadPolicy}
    onAccept={acceptPendingPolicies}
    onLogout={logout}
    serviceName={BRAND.name}
    termsPath={`${PLATFORM_ORIGIN}/terms`}
  >{children}</PolicyAcceptanceGate>;
}
