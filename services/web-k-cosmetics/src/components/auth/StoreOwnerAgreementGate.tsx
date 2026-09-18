import type { ReactNode } from 'react';
import {
  StoreOwnerAgreementGate as SharedStoreOwnerAgreementGate,
  type PendingPolicyAcceptanceLike,
  type StoreOwnerAgreementStatus,
} from '@o4o/shared-space-ui';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/apiClient';
import { loadPolicy } from '@/pages/legal/PolicyDocumentPage';

const SERVICE_KEY = 'k-cosmetics';

export function StoreOwnerAgreementGate({ children }: { children: ReactNode }) {
  const { logout } = useAuth();

  const loadStatus = async (): Promise<StoreOwnerAgreementStatus> => {
    const response = await api.get(`/auth/policy-acceptances/store-owner/${SERVICE_KEY}`);
    return response.data.data as StoreOwnerAgreementStatus;
  };

  const acceptAgreement = async (pending: PendingPolicyAcceptanceLike) => {
    try {
      await api.post('/auth/policy-acceptances/store-owner', {
        serviceKey: SERVICE_KEY,
        policyDocumentId: pending.policyDocumentId,
        version: pending.version,
      });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error?.response?.data?.error || error?.message || '매장 이용계약 동의 처리에 실패했습니다.',
      };
    }
  };

  return (
    <SharedStoreOwnerAgreementGate
      serviceKey={SERVICE_KEY}
      serviceName="K-Cosmetics"
      loadStatus={loadStatus}
      acceptAgreement={acceptAgreement}
      loadPolicy={loadPolicy}
      onLogout={logout}
    >
      {children}
    </SharedStoreOwnerAgreementGate>
  );
}
