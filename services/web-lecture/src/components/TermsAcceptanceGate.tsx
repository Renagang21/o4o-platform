import type { ReactNode } from 'react';
import { PolicyAcceptanceGate } from '@o4o/shared-space-ui';
import { useAuth } from '../contexts/AuthContext';
import { BRAND } from '../config/service';
import { loadPolicy } from '../pages/legal/PolicyDocumentPage';

export function TermsAcceptanceGate({ children }: { children: ReactNode }) {
  const { pendingPolicyAcceptances, acceptPendingPolicies, logout } = useAuth();
  return <PolicyAcceptanceGate
    pending={pendingPolicyAcceptances}
    loadPolicy={loadPolicy}
    onAccept={acceptPendingPolicies}
    onLogout={logout}
    allowPaths={['/terms', '/privacy']}
    serviceName={BRAND.name}
    termsPath="/terms"
  >{children}</PolicyAcceptanceGate>;
}
