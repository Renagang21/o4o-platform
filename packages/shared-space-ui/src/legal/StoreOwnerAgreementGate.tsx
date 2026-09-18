/**
 * StoreOwnerAgreementGate — Store Workspace 전용 계약 동의 UX.
 *
 * 계약 상태 조회/승낙 API 는 서비스가 주입한다. published 계약이 없거나 이미 승낙했으면 children.
 * 상태 조회 실패는 UX 를 fail-open 하되 backend 428 gate 가 최종 방어선이다.
 */
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { PolicyAcceptanceGate, type PendingPolicyAcceptanceLike } from './PolicyAcceptanceGate';
import type { PolicyDocumentDto } from './PolicyDocumentViewer';

export interface StoreOwnerAgreementStatus {
  required: boolean;
  accepted: boolean;
  pending: PendingPolicyAcceptanceLike[];
}

export interface StoreOwnerAgreementGateProps {
  serviceKey: string;
  serviceName: string;
  loadStatus: () => Promise<StoreOwnerAgreementStatus>;
  acceptAgreement: (pending: PendingPolicyAcceptanceLike) => Promise<{ success: boolean; error?: string }>;
  loadPolicy: (serviceKey: string, documentType: string) => Promise<(PolicyDocumentDto & { id?: string }) | null>;
  onLogout: () => void | Promise<void>;
  children: ReactNode;
}

export function StoreOwnerAgreementGate({
  serviceKey,
  serviceName,
  loadStatus,
  acceptAgreement,
  loadPolicy,
  onLogout,
  children,
}: StoreOwnerAgreementGateProps) {
  const [pending, setPending] = useState<PendingPolicyAcceptanceLike[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const status = await loadStatus();
      setPending(status.required && !status.accepted ? status.pending : []);
    } catch {
      // 서버 Store gate 가 최종 방어선. 상태 조회 장애만으로 일반 화면 전체를 죽이지 않는다.
      setPending([]);
    } finally {
      setLoading(false);
    }
  }, [loadStatus]);

  useEffect(() => { void refresh(); }, [refresh]);

  const onAccept = useCallback(async () => {
    const item = pending[0];
    if (!item) return { success: true };
    const result = await acceptAgreement(item);
    if (result.success) await refresh();
    return result;
  }, [acceptAgreement, pending, refresh]);

  const stablePending = useMemo(
    () => pending.filter((p) => p.serviceKey === serviceKey && p.documentType === 'store_owner_agreement'),
    [pending, serviceKey],
  );

  if (loading) {
    return (
      <div style={{ minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
        매장 이용계약을 확인하는 중입니다…
      </div>
    );
  }

  if (stablePending.length === 0) return <>{children}</>;

  return (
    <PolicyAcceptanceGate
      pending={stablePending}
      loadPolicy={loadPolicy}
      onAccept={onAccept}
      onLogout={onLogout}
      serviceName={serviceName}
    >
      {children}
    </PolicyAcceptanceGate>
  );
}
