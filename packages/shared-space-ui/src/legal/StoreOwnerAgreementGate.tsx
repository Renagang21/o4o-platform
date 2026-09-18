/**
 * StoreOwnerAgreementGate — Store Workspace 전용 매장 경영자 계약 승낙 UX.
 *
 * 게시된 store_owner_agreement 가 없으면 no-op. 게시 후 store_owner 는 해당 서비스 계약을
 * 명시적으로 승낙해야 workspace 를 이용할 수 있다. 서버 createRequireStoreOwner/isStoreOwner
 * 가 최종 방어선이며 이 컴포넌트는 닫을 수 없는 UX 표면이다.
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { PolicyAcceptanceGate, type PendingPolicyAcceptanceLike } from './PolicyAcceptanceGate';
import type { PolicyDocumentDto } from './PolicyDocumentViewer';

export interface StoreOwnerAgreementApi {
  get(url: string): Promise<{ data: any }>;
  post(url: string, body?: unknown): Promise<{ data: any }>;
}

export interface StoreOwnerAgreementGateProps {
  serviceKey: 'kpa-society' | 'k-cosmetics' | 'pharmacy-hub';
  serviceName: string;
  api: StoreOwnerAgreementApi;
  onLogout: () => void | Promise<void>;
  children: ReactNode;
}

const DOCUMENT_TYPE = 'store_owner_agreement';

function readPending(body: any): PendingPolicyAcceptanceLike[] {
  const rows = body?.data?.pending ?? body?.pending ?? [];
  if (!Array.isArray(rows)) return [];
  return rows.filter((r: any) =>
    r &&
    r.documentType === DOCUMENT_TYPE &&
    typeof r.serviceKey === 'string' &&
    typeof r.policyDocumentId === 'string' &&
    Number.isInteger(r.version),
  );
}

export function StoreOwnerAgreementGate({
  serviceKey,
  serviceName,
  api,
  onLogout,
  children,
}: StoreOwnerAgreementGateProps) {
  const [pending, setPending] = useState<PendingPolicyAcceptanceLike[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(
        `/auth/policy-acceptances?documentType=${DOCUMENT_TYPE}&serviceKey=${encodeURIComponent(serviceKey)}`,
      );
      setPending(readPending(res.data));
    } catch {
      // 서버가 계약 상태를 판정하지 못하면 보호 API 가 fail-closed 한다.
      // UI 는 임의 acceptance 를 합성하지 않는다.
      setPending([]);
    } finally {
      setLoading(false);
    }
  }, [api, serviceKey]);

  useEffect(() => { void refresh(); }, [refresh]);

  const loadPolicy = useCallback(async (
    key: string,
    documentType: string,
  ): Promise<(PolicyDocumentDto & { id?: string }) | null> => {
    try {
      const res = await api.get(`/public/services/${encodeURIComponent(key)}/policies/${encodeURIComponent(documentType)}`);
      return (res.data?.data ?? res.data) as PolicyDocumentDto & { id?: string };
    } catch (error: any) {
      if (error?.response?.status === 404) return null;
      throw error;
    }
  }, [api]);

  const accept = useCallback(async () => {
    let remaining = pending;
    for (const item of pending) {
      try {
        const res = await api.post('/auth/policy-acceptances', {
          serviceKey: item.serviceKey,
          policyDocumentId: item.policyDocumentId,
          version: item.version,
          documentType: DOCUMENT_TYPE,
        });
        remaining = readPending(res.data);
      } catch (error: any) {
        const message = error?.response?.data?.error ?? '매장 경영자 이용계약 동의 처리에 실패했습니다.';
        return { success: false, error: message };
      }
    }
    setPending(remaining);
    await refresh();
    return { success: true };
  }, [api, pending, refresh]);

  // 자식 Store 화면이 428 요청을 먼저 만들지 않도록 첫 판정이 끝날 때까지 mount 하지 않는다.
  if (loading) {
    return (
      <div style={{ minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
        매장 이용계약을 확인하는 중...
      </div>
    );
  }

  return (
    <PolicyAcceptanceGate
      pending={pending}
      loadPolicy={loadPolicy}
      onAccept={accept}
      onLogout={onLogout}
      serviceName={serviceName}
      agreementLabel="매장 경영자 이용계약"
      leadText="매장 업무공간을 이용하려면 아래 매장 경영자 이용계약을 확인하고 명시적으로 동의해야 합니다."
      checkboxText="위 매장 경영자 이용계약을 확인하였으며 이에 동의합니다. (필수)"
    >
      {children}
    </PolicyAcceptanceGate>
  );
}
