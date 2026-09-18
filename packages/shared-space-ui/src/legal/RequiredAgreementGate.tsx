/**
 * RequiredAgreementGate — 특정 서비스의 필수 agreement pending 조회 + 공통 acceptance UI.
 *
 * HTTP 구현은 서비스가 callback 으로 주입한다. 통합약관/매장계약 화면 사본을 만들지 않는다.
 */
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { PolicyAcceptanceGate, type PendingPolicyAcceptanceLike } from './PolicyAcceptanceGate';
import type { PolicyDocumentDto } from './PolicyDocumentViewer';

export interface RequiredAgreementGateProps {
  serviceKey: string;
  documentType: string;
  serviceName: string;
  policyPath: string;
  loadPending: (serviceKey: string, documentType: string) => Promise<PendingPolicyAcceptanceLike[]>;
  loadPolicy: (serviceKey: string, documentType: string) => Promise<(PolicyDocumentDto & { id?: string }) | null>;
  acceptOne: (pending: PendingPolicyAcceptanceLike) => Promise<void>;
  onLogout: () => void | Promise<void>;
  children: ReactNode;
}

export function RequiredAgreementGate({
  serviceKey, documentType, serviceName, policyPath,
  loadPending, loadPolicy, acceptOne, onLogout, children,
}: RequiredAgreementGateProps) {
  const [pending, setPending] = useState<PendingPolicyAcceptanceLike[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  const refresh = useCallback(async () => {
    setLoadError(false);
    try {
      setPending(await loadPending(serviceKey, documentType));
    } catch {
      setLoadError(true);
      setPending(null);
    }
  }, [serviceKey, documentType, loadPending]);

  useEffect(() => { void refresh(); }, [refresh]);

  if (loadError) {
    return (
      <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: 12 }}>매장 경영자 계약 상태를 확인하지 못했습니다.</p>
          <button type="button" onClick={() => void refresh()}>다시 확인</button>
        </div>
      </div>
    );
  }

  if (pending === null) {
    return <div style={{ minHeight: '40vh', display: 'grid', placeItems: 'center' }}>계약 상태를 확인하는 중입니다…</div>;
  }

  return (
    <PolicyAcceptanceGate
      pending={pending}
      loadPolicy={loadPolicy}
      onAccept={async () => {
        try {
          for (const item of pending) await acceptOne(item);
          await refresh();
          return { success: true };
        } catch (err) {
          return { success: false, error: err instanceof Error ? err.message : '계약 동의 처리에 실패했습니다.' };
        }
      }}
      onLogout={onLogout}
      serviceName={serviceName}
      termsPath={policyPath}
      allowPaths={[policyPath, '/terms', '/policy', '/privacy']}
      eyebrow="매장 경영자 이용계약"
      leadText="매장 업무공간을 이용하려면 아래 매장 경영자 이용계약을 확인하고 명시적으로 동의해야 합니다."
      checkboxLabel="위 매장 경영자 이용계약을 확인하였으며 이에 동의합니다. (필수)"
    >
      {children}
    </PolicyAcceptanceGate>
  );
}
