import type { ReactNode } from 'react';
import { PolicyAcceptanceGate, type PolicyDocumentDto } from '@o4o/shared-space-ui';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/apiClient';

async function loadPolicy(serviceKey: string, documentType: string): Promise<PolicyDocumentDto | null> {
  const response = await api.get(`/public/services/${serviceKey}/policies/${documentType}`);
  return (response.data as { data?: PolicyDocumentDto | null }).data ?? null;
}

/** Common account acceptance does not enroll a member or assign any branch role. */
export function TermsAcceptanceGate({ children }: { children: ReactNode }) {
  const { pendingPolicyAcceptances, acceptPendingPolicies, logout } = useAuth();
  return <PolicyAcceptanceGate pending={pendingPolicyAcceptances} loadPolicy={loadPolicy}
    onAccept={acceptPendingPolicies} onLogout={logout} serviceName="약사회 분회">
    {children}
  </PolicyAcceptanceGate>;
}
