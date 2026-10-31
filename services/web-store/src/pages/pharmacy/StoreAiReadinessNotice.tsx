import { useEffect, useState } from 'react';
import { getStoreAiReadiness, type StoreAiReadiness } from '../../api/storeProductAi';

export function StoreAiReadinessNotice({ organizationId, language }: { organizationId: string; language: string }) {
  const [data, setData] = useState<StoreAiReadiness | null>(null), [error, setError] = useState(false), [retry, setRetry] = useState(0);
  useEffect(() => {
    let alive = true; setData(null); setError(false);
    void getStoreAiReadiness(language).then(value => {
      if (value.organizationId !== organizationId || value.language !== language || value.purpose !== 'B2B') throw new Error('Store changed');
      if (alive) setData(value);
    }).catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [organizationId, language, retry]);
  return <div role="status" className="rounded border p-3 text-sm">
    {error ? <><p>현재 매장의 자료 현황을 조회하지 못했습니다. 권한·연결 상태를 확인해 주세요.</p><button type="button" className="min-h-11 underline" onClick={() => setRetry(value => value + 1)}>자료 현황 다시 확인</button></>
      : data ? <><p>현재 매장 · {language} 공통 B2B 자료: 고유 상품 {data.masterCount}종 · 연결 {data.listingCount}행</p>
        <p>구조화 근거 준비 {data.states.structured}종 · 미분류 {data.states.unclassified}종 · 기존 설명만 {data.states.legacy}종 · 자료 없음 {data.states.missing}종</p>
        <p>매장 자체 상품 {data.localCount}개는 공통 표준자료와 별도로 관리합니다. 취급 등록은 실시간 재고를 보장하지 않습니다.</p></>
      : '현재 매장의 상품 자료 현황을 확인하고 있습니다…'}
  </div>;
}
