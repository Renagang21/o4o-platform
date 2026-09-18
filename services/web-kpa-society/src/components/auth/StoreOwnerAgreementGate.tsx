import type { ReactNode } from 'react';
import {
  StoreOwnerAgreementGate as SharedStoreOwnerAgreementGate,
  type PendingPolicyAcceptanceLike,
  type StoreOwnerAgreementStatus,
} from '@o4o/shared-space-ui';
import { useAuth } from '../../contexts/AuthContext';
import { coreApiClient } from '../../api/client';
import { loadPolicy } from '../../lib/legalDocument';

const SERVICE_KEY = 'kpa-society';

export function StoreOwnerAgreementGate({ children }: { children: ReactNode }) {
  const { logout } = useAuth();

  const loadStatus = async (): Promise<StoreOwnerAgreementStatus> => {
    const response = await coreApiClient.get<{ success: boolean; data: StoreOwnerAgreementStatus }>(
      `/auth/policy-acceptances/store-owner/${SERVICE_KEY}`,
    );
    return response.data;
  };

  const acceptAgreement = async (pending: PendingPolicyAcceptanceLike) => {
    try {
      await coreApiClient.post('/auth/policy-acceptances/store-owner', {
        serviceKey: SERVICE_KEY,
        policyDocumentId: pending.policyDocumentId,
        version: pending.version,
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : '매장 이용계약 동의 처리에 실패했습니다.' };
    }
  };

  return (
    <SharedStoreOwnerAgreementGate
      serviceKey={SERVICE_KEY}
      serviceName="KPA Society"
      loadStatus={loadStatus}
      acceptAgreement={acceptAgreement}
      loadPolicy={loadPolicy}
      onLogout={logout}
    >
      {children}
    </SharedStoreOwnerAgreementGate>
  );
}
