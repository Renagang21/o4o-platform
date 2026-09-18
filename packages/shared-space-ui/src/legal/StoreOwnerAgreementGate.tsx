/**
 * StoreOwnerAgreementGate — Store Workspace 전용 매장 경영자 계약 명시 동의 UX
 *
 * WO-O4O-STORE-OWNER-AGREEMENT-PUBLISH-PREREQUISITES-V1 §3.4
 *
 * published 계약이 없으면 pending=[] 이므로 children 을 그대로 렌더한다.
 * backend store-owner guard 의 428 이 최종 방어선이며 이 컴포넌트는 공통 UX 표면이다.
 */

import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { PolicyAcceptanceGate, type PendingPolicyAcceptanceLike } from './PolicyAcceptanceGate';
import type { PublishedPolicyDocument } from './usePublishedPolicyDocument';

export interface StoreOwnerAgreementGateProps {
  serviceKey: string;
  serviceName: string;
  loadPolicy: (serviceKey: string, documentType: string) => Promise<PublishedPolicyDocument | null>;
  loadPending: (serviceKey: string) => Promise<PendingPolicyAcceptanceLike[]>;
  acceptAgreement: (item: PendingPolicyAcceptanceLike) => Promise<void>;
  onLogout: () => void | Promise<void>;
  agreementPath?: string;
  allowPaths?: string[];
  loadingNode?: ReactNode;
  children: ReactNode;
}

const DEFAULT_LOADING = (
  <div style={{ minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
    매장 이용계약을 확인하는 중입니다…
  </div>
);

export function StoreOwnerAgreementGate({
  serviceKey,
  serviceName,
  loadPolicy,
  loadPending,
  acceptAgreement,
  onLogout,
  agreementPath,
  allowPaths = [],
  loadingNode = DEFAULT_LOADING,
  children,
}: StoreOwnerAgreementGateProps) {
  const [pending, setPending] = useState<PendingPolicyAcceptanceLike[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setPending(await loadPending(serviceKey));
    } catch {
      // backend 428이 최종 방어선이므로 UI 조회 장애를 권한 우회로 해석하지 않는다.
      setLoadError('매장 이용계약 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  }, [loadPending, serviceKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (loading) return <>{loadingNode}</>;
  if (loadError) {
    return (
      <div style={{ minHeight: 320, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#b91c1c' }}>{loadError}</p>
        <button type="button" onClick={() => void refresh()}>다시 확인</button>
      </div>
    );
  }

  return (
    <PolicyAcceptanceGate
      pending={pending}
      loadPolicy={loadPolicy}
      onAccept={async () => {
        try {
          for (const item of pending) await acceptAgreement(item);
          const remaining = await loadPending(serviceKey);
          setPending(remaining);
          return remaining.length === 0
            ? { success: true }
            : { success: false, error: '동의 처리가 완료되지 않았습니다. 다시 확인해 주세요.' };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : '매장 경영자 이용계약 동의 처리에 실패했습니다.',
          };
        }
      }}
      onLogout={onLogout}
      allowPaths={allowPaths}
      serviceName={serviceName}
      termsPath={agreementPath}
      documentLabel="매장 경영자 이용계약"
      leadText="매장 업무공간을 이용하려면 아래 매장 경영자 이용계약을 확인하고 명시적으로 동의해야 합니다."
      checkboxText="위 매장 경영자 이용계약을 확인하였으며 이에 동의합니다. (필수)"
      children={children}
    />
  );
}
