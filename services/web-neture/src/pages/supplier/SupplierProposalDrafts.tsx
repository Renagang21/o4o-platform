import { useEffect, useRef, useState } from 'react';
import { neturePharmacySupplierApi as api, type SupplyProposal } from '../../lib/api/neturePharmacy';
import { INPUT } from '../../components/neture-pharmacy/PharmacyCommerceUi';
import { productLabel, type SupplierPharmacyOptions } from '../../components/neture-pharmacy/useSupplierPharmacyOptions';

interface Terms { offerId: string; unitPrice: string; note: string }
interface Draft extends Terms {
  key: string;
  name: string;
  targetOrganizationId: string;
  status: 'draft' | 'sending' | 'submitted' | 'error';
  error?: string;
}
const EMPTY: Terms = { offerId: '', unitPrice: '', note: '' };

/** 화면 안에서만 유지하는 초안. 제출은 기존 단일 협업체 API로 각각 처리한다. */
export default function SupplierProposalDrafts({ options, requestedProduct, proposals, onSubmitted }: {
  options: SupplierPharmacyOptions;
  requestedProduct: string | null;
  proposals: SupplyProposal[];
  onSubmitted: () => Promise<void>;
}) {
  const [terms, setTerms] = useState(EMPTY);
  const [selected, setSelected] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [source, setSource] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const offerId = terms.offerId;
  useEffect(() => {
    if (!requestedProduct || options.loading || options.error) return;
    setTerms((prev) => ({ ...prev, offerId: options.products.some((p) => p.id === requestedProduct) ? requestedProduct : '' }));
  }, [requestedProduct, options.products, options.loading, options.error]);

  const addDrafts = () => {
    if (!offerId || !selected.length || !Number.isSafeInteger(Number(terms.unitPrice)) || Number(terms.unitPrice) <= 0) {
      setMessage('제품 · 협업체 · 공급 가격(원, 양의 정수)을 선택해 주세요.');
      return;
    }
    const additions = options.semiFranchises.filter((sf) => selected.includes(sf.key) && !drafts.some((d) => d.key === sf.key));
    setDrafts((prev) => [...prev, ...additions.map((sf): Draft => ({
      ...terms, offerId, key: sf.key, name: sf.name, targetOrganizationId: '', status: 'draft',
    }))]);
    setSelected([]);
    setMessage(additions.length ? `${additions.length}개 협업체의 초안을 만들었습니다. 각 조건을 확인한 후 승인 요청하세요.` : '선택한 협업체의 초안이 이미 있습니다. 기존 초안을 확인하세요.');
  };

  const update = (key: string, patch: Partial<Terms & { targetOrganizationId: string }>) => {
    setDrafts((prev) => prev.map((d) => d.key === key ? { ...d, ...patch } : d));
  };

  const submit = async (keys: string[]) => {
    if (sending.current) return;
    const pending = drafts.filter((d) => keys.includes(d.key) && d.status !== 'submitted');
    if (!pending.length) return;
    if (pending.some((d) => !options.products.some((p) => p.id === d.offerId) || !options.semiFranchises.some((sf) => sf.key === d.key) || !Number.isSafeInteger(Number(d.unitPrice)) || Number(d.unitPrice) <= 0)) {
      setMessage('각 초안의 제품 · 활성 협업체 · 공급 가격(원, 양의 정수)을 확인해 주세요.');
      return;
    }
    sending.current = true;
    setBusy(true);
    let succeeded = 0;
    try {
      for (const draft of pending) {
        setDrafts((prev) => prev.map((d) => d.key === draft.key ? { ...d, status: 'sending', error: undefined } : d));
        try {
          await api.createProposal({ offerId: draft.offerId, semiFranchiseKey: draft.key, unitPrice: Number(draft.unitPrice),
            targetOrganizationId: draft.targetOrganizationId.trim() || undefined, note: draft.note.trim() || undefined });
          succeeded++;
          setDrafts((prev) => prev.map((d) => d.key === draft.key ? { ...d, status: 'submitted' } : d));
        } catch (error) {
          setDrafts((prev) => prev.map((d) => d.key === draft.key ? { ...d, status: 'error', error: error instanceof Error ? error.message : '요청 결과를 확인하지 못했습니다.' } : d));
        }
      }
      setMessage(`${succeeded}건 요청 완료 · ${pending.length - succeeded}건 결과 확인 필요. 협업체별로 독립 심사됩니다.`);
      await onSubmitted();
    } finally {
      sending.current = false;
      setBusy(false);
    }
  };

  return <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-4" aria-label="협업체별 공급 요청 초안">
    <h2 className="text-base font-semibold text-gray-900">같은 조건으로 여러 협업체에 요청</h2>
    <p className="text-sm text-gray-600">공통 입력으로 협업체별 초안을 만든 뒤 각각 확인·수정하세요. 요청·승인·변경·종료는 협업체별로 독립 처리되며, 다른 협업체로 자동 반영되지 않습니다.</p>
    <p className="text-xs text-gray-500">제안 가격 변경은 기존 제안 종료 후 새 요청으로 진행합니다. 현재 배송비는 공급자 공통 정책을 사용합니다. 초안은 이 화면을 벗어나면 사라집니다.</p>
    {options.error && <p role="alert" className="text-sm text-red-600">{options.error}</p>}
    <fieldset disabled={busy || options.loading || !!options.error} className="space-y-3 disabled:opacity-70">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm">제품<select className={INPUT} value={offerId} onChange={(e) => setTerms({ ...terms, offerId: e.target.value })}><option value="">제품 선택 (등록 승인된 제품)</option>{options.products.map((p) => <option key={p.id} value={p.id}>{productLabel(p)}</option>)}</select></label>
        <label className="text-sm">공통 공급 가격 (원)<input className={INPUT} inputMode="numeric" value={terms.unitPrice} onChange={(e) => setTerms({ ...terms, unitPrice: e.target.value.replace(/[^0-9]/g, '') })} /></label>
      </div>
      <label className="block text-sm">공통 메모 (선택)<textarea className={INPUT} maxLength={1000} value={terms.note} onChange={(e) => setTerms({ ...terms, note: e.target.value })} /></label>
      <label className="block text-sm">기존 제안에서 조건 가져오기
        <select className={INPUT} value={source} onChange={(e) => {
          setSource(e.target.value);
          const p = proposals.find((row) => row.id === e.target.value);
          if (p) { setTerms({ offerId: p.offerId, unitPrice: String(p.unitPrice), note: p.note || '' }); setMessage('제품 · 단가 · 메모를 가져왔습니다. 대상 약국은 복사하지 않습니다. 기존 초안은 변경하지 않습니다.'); }
        }}><option value="">기존 제안 선택 (선택 사항)</option>{proposals.map((p) => <option key={p.id} value={p.id}>{p.productName} · {p.semiFranchiseName} · {p.unitPrice.toLocaleString('ko-KR')}원 · {p.id.slice(0, 8)}</option>)}</select>
      </label>
      <fieldset className="rounded border border-gray-200 p-3"><legend className="px-1 text-sm">초안을 만들 협업체 선택</legend>
        <div className="flex flex-wrap gap-4">{options.semiFranchises.map((sf) => <label key={sf.key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selected.includes(sf.key)} disabled={drafts.some((d) => d.key === sf.key)} onChange={(e) => setSelected((prev) => e.target.checked ? [...prev, sf.key] : prev.filter((key) => key !== sf.key))} />{sf.name}</label>)}</div>
        {!options.loading && !options.error && !options.semiFranchises.length && <p className="text-sm text-gray-500">요청할 수 있는 활성 협업체가 없습니다.</p>}
      </fieldset>
      <button type="button" className="rounded border border-primary-300 px-3 py-2 text-sm text-primary-700" onClick={addDrafts}>협업체별 초안 만들기</button>
    </fieldset>
    {message && <p role="status" className="text-sm text-blue-700">{message}</p>}
    {!!drafts.length && <div className="space-y-3">
      <p className="text-sm text-gray-600">약국을 지정하지 않으면 해당 협업체의 활성 회원 약국 전체를 대상으로 합니다.</p>
      {drafts.map((d) => <fieldset key={d.key} disabled={busy || d.status === 'submitted'} aria-label={`${d.name} 초안`} className="min-w-0 space-y-3 rounded border border-gray-200 p-3">
        <legend className="px-1 font-medium">{d.name} · {d.status === 'submitted' ? '승인 요청 완료' : d.status === 'sending' ? '요청 중' : '미제출 초안'}</legend>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">제품<select className={INPUT} value={d.offerId} onChange={(e) => update(d.key, { offerId: e.target.value })}><option value="">제품 선택</option>{options.products.map((p) => <option key={p.id} value={p.id}>{productLabel(p)}</option>)}</select></label>
          <label className="text-sm">공급 가격 (원)<input className={INPUT} inputMode="numeric" value={d.unitPrice} onChange={(e) => update(d.key, { unitPrice: e.target.value.replace(/[^0-9]/g, '') })} /></label>
          <label className="text-sm md:col-span-2">대상 약국 조직 ID (선택)<input className={INPUT} value={d.targetOrganizationId} onChange={(e) => update(d.key, { targetOrganizationId: e.target.value })} /></label>
          <label className="text-sm md:col-span-2">메모 (선택)<textarea className={INPUT} maxLength={1000} value={d.note} onChange={(e) => update(d.key, { note: e.target.value })} /></label>
        </div>
        {d.error && <p role="alert" className="text-sm text-red-600">{d.error} 목록에서 접수 여부를 확인한 후 다시 요청하세요. 통신 오류라도 접수됐을 수 있습니다.</p>}
        {d.status !== 'submitted' && <div className="flex flex-wrap gap-3"><button type="button" onClick={() => submit([d.key])} className="rounded bg-primary-600 px-3 py-2 text-sm text-white">{d.name} 승인 요청</button><button type="button" onClick={() => setDrafts((prev) => prev.filter((row) => row.key !== d.key))} className="text-sm text-gray-600">초안 삭제</button></div>}
      </fieldset>)}
      <button type="button" disabled={busy || !drafts.some((d) => d.status === 'draft')} onClick={() => submit(drafts.filter((d) => d.status === 'draft').map((d) => d.key))} className="rounded bg-primary-600 px-4 py-2 text-sm text-white disabled:opacity-50">미제출 초안 승인 요청</button>
      {drafts.some((d) => d.status === 'submitted') && <button type="button" disabled={busy} onClick={() => setDrafts((prev) => prev.filter((d) => d.status !== 'submitted'))} className="ml-3 text-sm text-gray-600">완료 초안 정리</button>}
      <p className="text-xs text-gray-500">완료된 요청과 오류가 난 요청은 묶음 요청에서 제외합니다. 오류가 난 건은 접수 여부 확인 후 개별 요청하세요.</p>
    </div>}
  </section>;
}
