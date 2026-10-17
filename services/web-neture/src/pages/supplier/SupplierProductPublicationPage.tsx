import { Link } from 'react-router-dom';
import { useSupplierPublication } from './publication/useSupplierPublication';
import { supplierEditLink, supplierReturnPath } from '../../lib/supplierNavigation';

const INPUT = 'mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm disabled:bg-slate-100';

export default function SupplierProductPublicationPage() {
  const c = useSupplierPublication();
  const { product, form, setForm } = c;
  const approved = product?.approvalStatus === 'APPROVED';
  const serviceApproval = product?.serviceApprovals?.find(a => a.serviceKey === 'kpa-society');
  const serviceStatus: Record<string, string> = { pending: '승인 대기', approved: '승인 완료', rejected: '반려', cancelled: '게시 철회' };
  const returnTo = supplierReturnPath(c.params.get('returnTo'), '/supplier/products');
  const toggleService = (key: string) => setForm(f => ({ ...f, serviceKeys: f.serviceKeys.includes(key) ? f.serviceKeys.filter(k => k !== key) : [...f.serviceKeys, key] }));
  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <Link to={returnTo} className="text-sm text-blue-700 underline">내 제품으로 돌아가기</Link>
      <div><h1 className="text-2xl font-bold">서비스 게시</h1><p className="mt-2 text-sm text-slate-600">승인된 제품의 일반 공급 대상과 가격을 정합니다. 제품 등록과 이벤트·특가는 각각 별도 업무입니다.</p></div>
      {c.loading && <p role="status">제품 불러오는 중...</p>}
      {c.loadError && <p role="alert" className="text-red-700">{c.loadError} <button type="button" onClick={c.retry} className="underline">다시 시도</button></p>}
      {!c.loading && !c.loadError && <>
        <label className="block text-sm font-medium">제품 선택
          <select className={INPUT} value={c.offerId} onChange={e => c.select(e.target.value)} disabled={c.saving}>
            <option value="">제품을 선택하세요</option>
            {c.products.map(p => <option key={p.id} value={p.id}>{p.name || p.masterName} · {p.approvalStatus === 'APPROVED' ? '등록 승인' : '등록 검토 필요'}</option>)}
          </select>
        </label>
        {c.offerId && !product && <p role="alert" className="text-amber-800">요청한 제품을 찾을 수 없습니다. 내 제품을 다시 선택해 주세요.</p>}
        {product && <>
          <div className="rounded-lg border bg-slate-50 p-4 text-sm">
            <strong>{product.name || product.masterName}</strong>
            {product.registrationRejectionReason && <p className="mt-1 text-amber-800">등록 검토 사유: {product.registrationRejectionReason}</p>}
            <p className="mt-1">제품 등록: {approved ? '승인 완료' : '검토 필요'}. 게시를 중단해도 제품 승인과 이벤트는 유지됩니다.</p>
          </div>
          {!approved && <p role="alert" className="text-amber-800">운영자의 제품 등록 승인 후 게시할 수 있습니다. 등록 승인이 자동 게시를 뜻하지는 않습니다.</p>}
          {approved && <>
            <fieldset disabled={c.saving || !c.pricesReady} className="space-y-4 rounded-lg border bg-white p-4">
              <legend className="px-1 font-semibold">일반 공급 게시</legend>
              <label className="block text-sm">기본 B2B 공급가 (원)
                <input type="number" min="1" step="1" className={INPUT} value={form.priceGeneral} onChange={e => setForm(f => ({ ...f, priceGeneral: e.target.value }))} />
              </label>
              <div className="space-y-2 rounded border p-3 text-sm" role="group" aria-label="pharmacy 등재 선택">
                <strong>이 제품을 pharmacy 협력사업에 공급하시겠습니까?</strong>
                <label className="flex gap-2"><input type="radio" name="pharmacy-publication" checked={form.defaultSupplyEnabled} onChange={() => setForm(f => ({ ...f, defaultSupplyEnabled: true }))} />예 — Neture 약국 기본 공급에 등재</label>
                <label className="flex gap-2"><input type="radio" name="pharmacy-publication" checked={!form.defaultSupplyEnabled} onChange={() => setForm(f => ({ ...f, defaultSupplyEnabled: false }))} />아니요 — pharmacy 기본 공급에 등재하지 않음</label>
                <p className="text-slate-500">예를 선택하고 게시 설정을 저장하면 일반 공급가로 게시됩니다. 다른 협력사업의 공급 제안·이벤트는 별도로 유지됩니다.</p>
              </div>
              <div className="rounded border p-3 text-sm">
                <label className="flex items-center gap-3"><input type="checkbox" checked={form.serviceKeys.includes('kpa-society')} onChange={() => toggleService('kpa-society')} /><strong>KPA Society</strong></label>
                <p className="mt-2">서비스 게시 승인: {serviceStatus[serviceApproval?.status ?? ''] ?? '미신청'}{serviceApproval?.reason && <span className="block text-amber-800">{serviceApproval.reason}</span>}</p>
                <p className="mt-2 text-slate-500">서비스 운영자 승인 후 노출됩니다. 반려된 대상은 저장하면 재신청합니다.</p>
                <label className="mt-3 block">KPA 서비스 공급가 (선택 — 비우면 기존 서비스 가격 또는 기본가 유지)
                  <input type="number" min="1" step="1" className={INPUT} value={form.prices['kpa-society'] ?? ''} onChange={e => setForm(f => ({ ...f, prices: { ...f.prices, 'kpa-society': e.target.value } }))} />
                </label>
                <p className="mt-1 text-xs text-slate-500">게시를 중단해도 서비스 가격은 보존합니다. 가격 해제는 상품 상세의 서비스별 가격 설정을 이용하세요.</p>
              </div>
              <details className="rounded border p-3 text-sm"><summary className="cursor-pointer font-medium">기존 전체 공급 설정</summary>
                <label className="mt-3 flex gap-3"><input type="checkbox" checked={form.isPublic} onChange={e => setForm(f => ({ ...f, isPublic: e.target.checked }))} /><span>전체 공급 카탈로그 공개 (의약품 제외)</span></label>
              </details>
              <button type="button" onClick={c.save} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white">{c.saving ? '저장 중...' : '게시 설정 저장'}</button>
            </fieldset>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link className="rounded border px-3 py-2 text-blue-700" to={supplierEditLink('/supplier/supply-proposals', { offer: product.id }, returnTo)}>협력사업별 거래 조건 설정·등재 요청</Link>
              <Link className="rounded border px-3 py-2 text-purple-700" to={supplierEditLink('/supplier/semi-franchise-events', { offer: product.id }, returnTo)}>이 제품으로 이벤트·특가</Link>
            </div>
          </>}
        </>}
      </>}
      {c.message && <div role={c.message.error ? 'alert' : 'status'} className={`rounded-lg border p-3 text-sm ${c.message.error ? 'border-red-200 text-red-700' : 'border-green-200 text-green-800'}`}>{c.message.text}{c.message.error && !c.pricesReady && <button type="button" onClick={c.retry} className="ml-2 underline">다시 시도</button>}</div>}
    </div>
  );
}
