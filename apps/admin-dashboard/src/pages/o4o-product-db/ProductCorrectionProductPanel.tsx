import { useEffect, useRef, useState } from 'react';
import { productCorrectionPeriodicApi as api, type ProductWorkspaceDetail, type ProductWorkspaceSection } from '@/api/product-correction-periodic.api';

const sections: Record<ProductWorkspaceSection, string> = {
  descriptions: '현행 설명서·출처', tasks: '검토·다음 점검', proposals: '근거·변경안·반영',
  renewals: '설명서 갱신', edits: '일반 편집 이력',
};
const states: Record<string, string> = {
  canonical: '현행 정본', pending: '대기', in_progress: '작업 중', needs_source: '근거 확인 필요',
  review_ready: '검토 대기', deferred: '보류', no_change: '수정 불필요', reviewed: '검토 완료',
  excluded: '대상 제외', applied: '반영 완료', done: '갱신 검토 종료', saved: '저장 완료',
};
const date = (value?: string) => value ? new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : '없음';
const show = (value: unknown) => value == null ? '(없음)' : typeof value === 'string' ? value : JSON.stringify(value);
const button = 'rounded border px-3 py-2 disabled:opacity-40';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Read-only product projection. Existing task/proposal/renewal screens retain their write contracts. */
export default function ProductCorrectionProductPanel() {
  const initialId = new URLSearchParams(window.location.search).get('product') ?? '';
  const [input, setInput] = useState(initialId);
  const [data, setData] = useState<ProductWorkspaceDetail | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const sequence = useRef(0);
  const load = async (id: string, section: ProductWorkspaceSection = 'descriptions', page = 1) => {
    const seq = ++sequence.current;
    if (!uuid.test(id)) { setBusy(false); setError('상품 상세의 연결을 이용하거나 올바른 상품 ID를 입력하세요.'); return; }
    setBusy(true); setError('');
    try {
      const result = await api.productWorkspace(id, section, page);
      if (seq === sequence.current) setData(result);
    } catch (e) {
      if (seq === sequence.current) setError(e instanceof Error ? e.message : '상품 작업을 조회하지 못했습니다.');
    } finally {
      if (seq === sequence.current) setBusy(false);
    }
  };
  useEffect(() => {
    const requests = sequence;
    if (uuid.test(initialId)) void load(initialId);
    return () => { requests.current++; };
  // The query is an entry point, not a signal to reset a user's current view.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <section id="product-workspace" className="space-y-3 rounded border p-3" aria-label="상품별 자료와 관리 이력">
    <h4 className="font-semibold">상품별 자료 · 정비 · 갱신 이력</h4>
    <p className="text-sm">상품 상세나 검토 작업에서 연결해 열 수 있습니다. 현행 원문과 과거 작업의 당시 자료를 구분해 확인하세요. 이 조회는 상품을 수정하거나 작업을 실행하지 않습니다.</p>
    <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); void load(input.trim()); }}>
      <label className="min-w-0 flex-1">상품 ID
        <input className="w-full rounded border p-2" aria-label="상품 관리 이력 ID" value={input}
          onChange={(e) => { sequence.current++; setBusy(false); setInput(e.target.value); }} />
      </label>
      <button className={button} disabled={busy}>상품 자료·이력 조회</button>
    </form>
    {error && <p role="alert">{error} 현재 표시된 자료는 마지막 성공한 조회입니다.</p>}
    {data && <>
      <p className="break-words font-semibold">조회 상품: {data.product.name} · {data.product.status}</p>
      <p className="break-words text-sm">바코드 {data.product.barcode ?? '없음'} · 제조사 {data.product.manufacturerName ?? '없음'} · 규격 {data.product.specification ?? '없음'} · 상품군 {data.product.regulatoryType}</p>
      <a className="block text-blue-700 underline" href={`/admin/o4o-product-db/masters/${data.product.id}`}>상품 상세·원문 관리 열기</a>
      <div className="flex flex-wrap gap-2">{(Object.keys(sections) as ProductWorkspaceSection[]).map((section) =>
        <button type="button" className={button} key={section} disabled={busy} aria-pressed={data.section === section}
          onClick={() => void load(data.product.id, section)}>{sections[section]}</button>)}</div>
      <p>{sections[data.section]} · {data.total}건 · {data.page}페이지 (한국시간)</p>
      {!data.items.length && <p>이 상품에 연결된 해당 이력이 없습니다.</p>}
      {data.items.map((item) => <article className="space-y-2 rounded border p-3" key={item.id}>
        <p className="break-words font-semibold">{item.title} · {states[item.state] ?? item.state}</p>
        <p className="text-sm">{date(item.at)}</p>
        {item.sourceType && <p className="break-words text-sm">출처 유형: {item.sourceType} · 참조: {item.sourceRefId ?? '없음'}</p>}
        {item.content !== undefined && <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-sm">{item.content}</pre>}
        {item.truncated && <p>원문 앞 20,000자입니다. 전체 내용은 상품 상세에서 확인하세요.</p>}
        {item.summary && <p className="whitespace-pre-wrap break-words">요약: {item.summary}</p>}
        {item.notes && <p className="whitespace-pre-wrap break-words">검토 의견: {item.notes}</p>}
        {item.sources && <p className="whitespace-pre-wrap break-words">기록한 근거: {item.sources}</p>}
        {(item.nextReviewAt || item.followUpAt) && <p>다음 점검 {date(item.nextReviewAt)} · 재확인 {date(item.followUpAt)}</p>}
        {item.evidence?.map((e) => <p key={e.id} className="whitespace-pre-wrap break-words text-sm">
          {e.kind === 'product-fact' ? '상품 사실' : '전문 참고'} · {e.source} · {e.checkedOn} · {e.status === 'confirmed' ? '확인 완료' : '미확인'}
        </p>)}
        {item.changes?.map((c) => <pre key={c.field} className="max-h-48 overflow-auto whitespace-pre-wrap break-words text-sm">
          {c.field}: {show(c.before)} → {show(c.after)}{c.reason ? `\n이유: ${c.reason}` : ''}
        </pre>)}
        <a className="block text-blue-700 underline" href={item.href}>해당 자료·작업 이어서 열기</a>
      </article>)}
      <div className="flex flex-wrap gap-3">
        <button type="button" className={button} disabled={busy || data.page <= 1} onClick={() => void load(data.product.id, data.section, data.page - 1)}>이전 상품 이력</button>
        <button type="button" className={button} disabled={busy || data.page * data.pageSize >= data.total} onClick={() => void load(data.product.id, data.section, data.page + 1)}>다음 상품 이력</button>
      </div>
    </>}
  </section>;
}
