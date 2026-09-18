import type { ReactNode } from 'react';
import { RequiredAgreementGate, type PendingPolicyAcceptanceLike } from '@o4o/shared-space-ui';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/apiClient';
import { BRAND, SERVICE_KEY } from '../config/service';
import { loadPolicy } from '../pages/legal/PolicyDocumentPage';

const DOCUMENT_TYPE = 'store_owner_agreement';

export function StoreOwnerAgreementGate({ children }: { children: ReactNode }) {
  const { logout, user } = useAuth();
  const isContractStoreOwner = !!user?.roles?.includes('pharmacy-hub:store_owner');
  if (!isContractStoreOwner) return <>{children}</>;
  return (
    <RequiredAgreementGate
      serviceKey={SERVICE_KEY}
      documentType={DOCUMENT_TYPE}
      serviceName={BRAND.name}
      policyPath="/store-owner-agreement"
      loadPolicy={loadPolicy}
      loadPending={async (serviceKey, documentType) => {
        const res = await api.get('/auth/policy-acceptances', { params: { serviceKey, documentType } });
        return (res.data?.data?.pending ?? []) as PendingPolicyAcceptanceLike[];
      }}
      acceptOne={async (item) => {
        await api.post('/auth/policy-acceptances', {
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
