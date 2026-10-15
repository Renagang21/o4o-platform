import { useCallback, useEffect, useRef, useState } from 'react';
import { Pagination } from '@o4o/operator-ux-core';
import { fetchHandledProducts, type HandledProduct } from '../../../api/handledProducts';
import { importMlcFromHub, type StoreMlcGroup, type StoreMlcHubItem, type StoreMlcTargetKind } from '../../../api/multilingualProductContentStore';
import { useLatestStoreRequest } from '../hooks/useLatestStoreRequest';

interface Props {
  item: StoreMlcHubItem;
  isCurrent: () => boolean;
  onClose: () => void;
  onImported: (group: StoreMlcGroup) => void;
}
const LIMIT = 20;

export function MultilingualImportDialog({ item, isCurrent, onClose, onImported }: Readonly<Props>) {
  const [kind, setKind] = useState<StoreMlcTargetKind>('local');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<HandledProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<HandledProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [writeError, setWriteError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const writing = useRef(false);
  const writes = useLatestStoreRequest(item.id);
  const requests = useLatestStoreRequest(`${kind}:${page}:${query}`);
  const load = useCallback(async () => {
    if (!isCurrent()) return;
    const current = requests.begin();
    setLoading(true); setError(null);
    try {
      const data = await fetchHandledProducts({ source: kind, page, limit: LIMIT, search: query });
      if (!current() || !isCurrent()) return;
      if (!Array.isArray(data?.items) || !Number.isSafeInteger(data.pagination?.total) || data.pagination.total < 0 ||
        data.items.some(p => p.sourceType !== kind || !p.sourceId || typeof p.name !== 'string')) throw new Error('Invalid products');
      const last = Math.max(1, Math.ceil(data.pagination.total / LIMIT));
      if (page > last) { setPage(last); return; }
      setProducts(data.items); setTotal(data.pagination.total);
    } catch {
      if (current() && isCurrent()) setError('연결할 제품을 불러오지 못했습니다. 다시 시도해 주세요.');
    } finally {
      if (current() && isCurrent()) setLoading(false);
    }
  }, [isCurrent, requests, kind, page, query]);
  useEffect(() => { void load(); return requests.cancel; }, [load, requests]);
  const close = useCallback(() => { if (!writing.current) onClose(); }, [onClose]);
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => { previous?.focus(); };
  }, []);
  const submit = async () => {
    if (writing.current || !isCurrent() || loading || error || !selected || selected.sourceType !== kind) return;
    const current = writes.begin();
    writing.current = true; setSaving(true); setWriteError(null);
    try {
      const group = await importMlcFromHub({ sourceGroupId: item.id, targetKind: kind, targetId: selected.sourceId });
      if (!current() || !isCurrent()) return;
      if (!group?.id || group.targetId !== selected.sourceId || group.targetKind !== kind) throw new Error('Invalid import');
      onImported(group);
    } catch {
      if (current() && isCurrent()) setWriteError('가져오기 결과를 확인하지 못했습니다. 선택한 제품을 유지했습니다. 내 매장 콘텐츠를 확인하거나 다시 시도해 주세요.');
    } finally {
      writing.current = false;
      if (current() && isCurrent()) setSaving(false);
    }
  };
  let productBody;
  if (error) {
    productBody = <div role="alert" className="text-sm text-red-700">{error}<button type="button" onClick={() => void load()} className="block min-h-11 underline">제품 다시 시도</button></div>;
  } else if (loading) {
    productBody = <p role="status">제품 불러오는 중…</p>;
  } else if (products.length === 0) {
    productBody = <p>조건에 맞는 연결 가능한 제품이 없습니다.</p>;
  } else {
    productBody = <label className="block text-sm">연결할 제품<select aria-label="연결할 제품" value={products.some(p => p.sourceId === selected?.sourceId) ? selected?.sourceId || '' : ''}
      className="block border rounded p-2 w-full min-h-11" onChange={e => setSelected(products.find(p => p.sourceId === e.target.value) ?? null)}>
      <option value="">제품을 선택하세요</option>{products.map(p => <option key={p.sourceId} value={p.sourceId}>{p.name}</option>)}
    </select></label>;
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
    {/* Backdrop is a real button (not a clickable div) so pointer close stays keyboard/a11y-safe; Escape is handled on the dialog. */}
    <button type="button" aria-hidden="true" tabIndex={-1} data-testid="mlc-import-backdrop" onClick={close}
      className="absolute inset-0 w-full h-full bg-black/40 cursor-default" />
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="mlc-import-heading" tabIndex={-1}
      className="relative w-full max-w-lg max-h-[90dvh] overflow-y-auto bg-white rounded-xl p-4 sm:p-6 space-y-4"
      onKeyDown={e => {
        if (e.key === 'Escape') { e.stopPropagation(); close(); }
        if (e.key === 'Tab') {
          const nodes = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]');
          if (!nodes?.length) { e.preventDefault(); return; }
          const first = nodes[0], last = nodes[nodes.length - 1];
          if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) { e.preventDefault(); first.focus(); }
        }
      }}>
      <div className="flex items-start justify-between gap-3">
        <div><h2 id="mlc-import-heading" className="font-bold">가져오기 — 매장 제품 연결</h2><p className="text-sm break-words">{item.title}</p></div>
        <button type="button" aria-label="가져오기 닫기" disabled={saving} onClick={close} className="min-h-11 px-3">닫기</button>
      </div>
      <p className="text-xs text-amber-800">같은 제품에 다시 가져오면 기존 사본의 내용이 덮어쓰기 됩니다. 선택한 제품을 확인해 주세요.</p>
      <fieldset disabled={saving} className="space-y-3">
        <label className="block text-sm">제품 종류<select aria-label="제품 종류" className="block border rounded p-2 w-full min-h-11" value={kind} onChange={e => {
          if (writing.current) return;
          setKind(e.target.value as StoreMlcTargetKind); setPage(1); setSelected(null); setProducts([]); setLoading(true); setError(null); setWriteError(null);
        }}><option value="local">매장 경영활용 제품</option><option value="listing">O4O 주문 가능 상품</option></select></label>
        <form className="flex gap-2" onSubmit={e => { e.preventDefault(); if (!writing.current) { setQuery(search.trim()); setPage(1); } }}>
          <input aria-label="연결할 제품 검색" value={search} onChange={e => setSearch(e.target.value)} className="min-w-0 flex-1 border rounded p-2" />
          <button type="submit" className="min-h-11 px-3 border rounded">검색</button>
        </form>
        {productBody}
        {!loading && !error && total > LIMIT && <Pagination page={page} totalPages={Math.ceil(total / LIMIT)} total={total} onPageChange={setPage} />}
      </fieldset>
      {selected && <p className="text-sm break-words">선택한 제품: <b>{selected.name}</b></p>}
      {writeError && <p role="alert" className="text-sm text-red-700">{writeError}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" disabled={saving} onClick={close} className="min-h-11 px-4 border rounded">취소</button>
        <button type="button" disabled={saving || loading || !!error || !selected} onClick={() => void submit()} className="min-h-11 px-4 rounded bg-blue-600 text-white disabled:opacity-50">{saving ? '가져오는 중…' : '가져오기 실행'}</button>
      </div>
    </div>
  </div>;
}
