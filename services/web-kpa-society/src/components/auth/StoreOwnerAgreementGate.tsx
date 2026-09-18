import type { ReactNode } from 'react';
import { RequiredAgreementGate, type PendingPolicyAcceptanceLike } from '@o4o/shared-space-ui';
import { useAuth, authClient } from '../../contexts/AuthContext';
import { loadPolicy } from '../../lib/legalDocument';

const SERVICE_KEY = 'kpa-society';
const DOCUMENT_TYPE = 'store_owner_agreement';

export function StoreOwnerAgreementGate({ children }: { children: ReactNode }) {
  const { logout, user } = useAuth();
  const isContractStoreOwner = !!user?.roles?.includes('kpa:store_owner') || !!user?.isStoreOwner;
  if (!isContractStoreOwner) return <>{children}</>;
  return (
    <RequiredAgreementGate
      serviceKey={SERVICE_KEY}
      documentType={DOCUMENT_TYPE}
      serviceName="KPA Society"
      policyPath="/store-owner-agreement"
      loadPolicy={loadPolicy}
      loadPending={async (serviceKey, documentType) => {
        const res = await authClient.api.get('/auth/policy-acceptances', { params: { serviceKey, documentType } });
        return (res.data?.data?.pending ?? []) as PendingPolicyAcceptanceLike[];
      }}
      acceptOne={async (item) => {
        await authClient.api.post('/auth/policy-acceptances', {
          serviceKey: item.serviceKey,
          documentType: item.documentType,
          policyDocumentId: item.policyDocumentId,
          version: item.version,
        });
      }}
      onLogout={logout}
    >
      {children}
    </RequiredAgreementGate>
  );
}
