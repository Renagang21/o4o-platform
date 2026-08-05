/**
 * StoreConnectionNotice — 매장 연결 상태 안내
 *
 * WO-PHARMACY-HUB-STORE-HANDLED-PRODUCTS-V1
 *
 * 서버(resolvePharmacyHubStoreOrganization) 판정을 그대로 표시한다.
 *   not_connected : Pharmacy-Hub 활성 매장 0개 — 다른 서비스 조직으로 대체하지 않는다
 *   ambiguous     : 2개 이상 — 임의 선택 금지, 운영자 확인 필요
 * connected 면 아무것도 렌더하지 않는다.
 */

export interface StoreConnectionState {
  status: 'connected' | 'not_connected' | 'ambiguous';
  candidateCount: number;
  errorCode?: string | null;
}

export function StoreConnectionNotice({ connection }: { connection: StoreConnectionState }) {
  if (connection.status === 'connected') return null;

  const isAmbiguous = connection.status === 'ambiguous';

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
      <p className="font-medium">
        {isAmbiguous ? '연결된 매장이 여러 개입니다.' : '연결된 매장이 없습니다.'}
      </p>
      <p className="mt-1 text-amber-700">
        {isAmbiguous
          ? `승인된 약국이 ${connection.candidateCount}개 확인되어 어느 매장의 상품인지 결정할 수 없습니다. 운영자에게 문의해 주세요.`
          : '약국 가입·승인이 완료되면 매장 상품을 등록·관리할 수 있습니다.'}
      </p>
    </div>
  );
}
