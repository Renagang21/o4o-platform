import { useEffect, useRef, useState } from 'react';
import { sanitizeRichHtml } from '@o4o/content-editor';
import { lookupProductDescription, type CounselingTarget } from '../../api/productDescriptionResources';
import { useStoreOperationScope } from '../../hooks/useStoreOperationScope';

/** Counseling only: has no cart/product creation dependency. Name results always require selection. */
export function ProductDescriptionLookup() {
  const scope = useStoreOperationScope();
  const [mode, setMode] = useState('barcode'), [query, setQuery] = useState(''), [type, setType] = useState('B2B');
  const [items, setItems] = useState<CounselingTarget[]>([]), [selected, setSelected] = useState<CounselingTarget | null>(null);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const request = useRef(0);
  const clear = () => { request.current++; setItems([]); setSelected(null); setMessage(''); setBusy(false); };
  useEffect(() => { clear(); setQuery(''); return () => { request.current++; }; }, [scope.key]);
  const search = async () => {
    const key = ++request.current; setBusy(true); setItems([]); setSelected(null); setMessage('');
    try {
      const result = await lookupProductDescription({ [mode]: query.trim(), descriptionType: type, language: 'ko' });
      if (request.current !== key || !scope.isCurrent()) return;
      setItems(result.items);
      if (result.state === 'matched') setSelected(result.items[0]);
      if (!result.items.length) setMessage('등록된 설명을 찾지 못했습니다. 새 상품이나 빈 설명은 저장하지 않습니다.');
      else if (result.state !== 'matched') setMessage('상품명·제조사·바코드를 확인하고 설명을 볼 상품을 선택하세요.');
    } catch { if (request.current === key && scope.isCurrent()) setMessage('조회하지 못했습니다. 바코드 숫자·검증번호 또는 상품명을 확인해 주세요.'); }
    finally { if (request.current === key) setBusy(false); }
  };
  return <section className="mt-5 rounded-xl border border-slate-200 bg-white p-4 space-y-3" aria-label="상담용 상품 설명 조회">
    <h2 className="font-semibold">주문장 상품 설명 조회</h2>
    <p className="text-sm text-slate-600">주문장의 바코드나 상품명으로 상담자료를 확인합니다. 성분·용법·적용 예 등 설명을 조회하며 주문 상품·수량은 바뀌지 않습니다.</p>
    <form onSubmit={e => { e.preventDefault(); if (query.trim()) void search(); }} className="flex flex-wrap items-end gap-2">
      <label>검색 기준<select aria-label="설명 검색 기준" className="block rounded border p-2" value={mode} onChange={e => { clear(); setMode(e.target.value); setQuery(''); }}><option value="barcode">바코드</option><option value="name">상품명</option></select></label>
      <label className="grow">{mode === 'barcode' ? '바코드' : '상품명'}<input aria-label="설명 검색어" className="block rounded border p-2 w-full" value={query} maxLength={mode === 'barcode' ? 128 : 500} onChange={e => { clear(); setQuery(e.target.value); }} /></label>
      <label>설명 목적<select aria-label="조회할 설명 목적" className="block rounded border p-2" value={type} onChange={e => { clear(); setType(e.target.value); }}><option value="B2B">전문인 상담 (B2B)</option><option value="STORE">매장 안내 (STORE)</option></select></label>
      <button disabled={busy || !query.trim()} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-40">{busy ? '조회 중…' : '설명 조회'}</button>
    </form>
    <p role="status">{message}</p>
    {items.length > 0 && !selected && <ul className="space-y-2">{items.map(item => <li key={item.id}><button type="button" className="rounded border p-2 text-left w-full" onClick={() => setSelected(item)}>{item.name} · {item.manufacturer} · {item.barcode} · {item.canonical ? '설명 있음' : '해당 목적·언어 설명 없음'}</button></li>)}</ul>}
    {selected && <article className="space-y-2"><h3 className="font-semibold">{selected.name} · {selected.manufacturer}</h3>
      {items.length > 1 && <button className="underline" onClick={() => setSelected(null)}>다른 후보 선택</button>}
      {selected.canonical ? <><div className="prose max-w-none overflow-auto max-h-[36rem]" dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(selected.canonical.content) }} />
        {selected.canonical.source && <div className="text-sm"><p>근거 {selected.canonical.source.kind} · 확인일 {selected.canonical.source.checkedOn ?? '미확인'} {selected.canonical.source.currentness === 'archived' ? '· 보관자료 / 현행성 미확인' : ''}</p>{selected.canonical.source.references.map(r => <a className="block break-all text-blue-700" key={r.url} href={r.url} target="_blank" rel="noopener noreferrer">{r.label || r.url}</a>)}</div>}</> : <p>이 목적·언어의 승인된 설명이 없습니다.</p>}
    </article>}
  </section>;
}
