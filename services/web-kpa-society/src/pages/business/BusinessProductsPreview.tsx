import { useEffect, useState } from 'react';
import { businessApi, pharmacyApiBase } from './api';
import BusinessStoreShortcut from './BusinessStoreShortcut';

type Product = { kind: string; optionId: string; productName: string; supplierName: string; semiFranchiseKey: string };

/** Existing supply access applies active memberships, operator approval and offer validity. */
export default function BusinessProductsPreview({ businessKey, organizationId, canManage }: {
  businessKey: string; organizationId?: string; canManage: boolean;
}) {
  const scope = `${businessKey}:${organizationId}:${canManage}`;
  const [result, setResult] = useState<{ scope: string; items?: Product[]; error?: boolean } | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let alive = true;
    setResult(null);
    if (!organizationId || canManage) return;
    void businessApi.get<{ items: Product[] }>(`${pharmacyApiBase}/store/supply-options`, { source: `sf:${businessKey}`, page: 1, limit: 3 }, organizationId)
      .then(data => {
        if (!Array.isArray(data.items) || data.items.length > 3 || !data.items.every(item =>
          item && typeof item.optionId === 'string' && !!item.optionId && typeof item.kind === 'string' &&
          typeof item.productName === 'string' && typeof item.supplierName === 'string' && item.semiFranchiseKey === businessKey)) throw new Error('Invalid business supply options');
        if (alive) setResult({ scope, items: data.items });
      }).catch(() => { if (alive) setResult({ scope, error: true }); });
    return () => { alive = false; };
  }, [scope, organizationId, canManage, businessKey, retry]);
  const current = result?.scope === scope ? result : null;
  return <section className="rounded-xl border bg-white p-5 sm:p-6" aria-label="사업 공급 상품">
    <h2 className="text-lg font-semibold text-slate-900">사업 공급 상품</h2>
    <p className="mt-2 text-sm leading-6 text-slate-600">선택 약국이 현재 이용할 수 있는 사업 공급 조건을 최대 3건 보여줍니다. 상세 조건과 주문은 내 매장에서 확인하세요.</p>
    {canManage ? <p className="mt-3 text-sm text-slate-500">공급 승인과 상품 관리는 사업 운영 화면에서 진행합니다.</p> : !organizationId ?
      <p className="mt-3 text-sm text-slate-500">이용할 약국을 먼저 선택해 주세요.</p> :
      !current ? <p role="status" className="py-4 text-sm text-slate-500">공급 상품을 불러오고 있습니다…</p> :
      current.error ? <div className="py-3"><p role="alert">공급 상품을 불러오지 못했습니다.</p><button type="button" className="mt-2 min-h-11 text-blue-700" onClick={() => setRetry(n => n + 1)}>공급 상품 다시 확인</button></div> :
      !current.items?.length ? <p className="py-4 text-sm text-slate-500">현재 이용 가능한 사업 공급 상품이 없습니다.</p> : <>
        <ul className="my-4 grid gap-3 sm:grid-cols-3">{current.items.map(item => <li key={`${item.kind}:${item.optionId}`} className="min-w-0 rounded-lg border p-4">
          <h3 className="break-words font-medium">{item.productName}</h3><p className="mt-2 break-words text-sm text-slate-500">{item.supplierName}</p>
        </li>)}</ul>
        <BusinessStoreShortcut businessKey={businessKey} supply />
      </>}
  </section>;
}
