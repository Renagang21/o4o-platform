/**
 * 「이 영상의 제품」 선택 — 매장이 취급하는 제품 중 하나를 고르거나 연결을 해제한다.
 * WO-O4O-STORE-QR-TABLET-CHANNEL-SEPARATION-V1 D6 · T4. 태블릿 코너에서 제품을 넣으면 연결된 영상이 [영상 보기] 후보가 된다(T5).
 * 서버가 매장 취급 제품인지 다시 확인한다 — 이 화면의 목록은 고르기 편하게 보여 줄 뿐이다.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { fetchHandledProducts, type HandledProduct } from '../../../api/handledProducts';
import { linkSignageMediaProduct } from '../../../api/signageMedia';

export function VideoProductLinkDialog({ organizationId, mediaId, videoTitle, currentListingId, currentProductName, inherited = false, onClose, onSaved }: {
  organizationId: string;
  mediaId: string;
  videoTitle: string;
  currentListingId: string | null;
  currentProductName: string | null;
  /** 공용 영상 사본이 원본의 연결을 따르는 중 — 이 매장에서 해제할 수 없고, 다른 제품을 고르면 이 사본만 바뀐다. */
  inherited?: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const headingId = useId();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<HandledProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState<string | null>(currentListingId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);

  useEffect(() => {
    let active = true;
    setLoading(true); setLoadError('');
    fetchHandledProducts({ source: 'listing', search: query || undefined, limit: 20 })
      .then(data => { if (active) setItems(data.items.filter(item => item.sourceType === 'listing')); })
      .catch(() => { if (active) setLoadError('취급 제품을 불러오지 못했습니다. 다시 검색해 주시기 바랍니다.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [query]);

  const save = async (listingId: string | null) => {
    if (lock.current) return;
    lock.current = true; setSaving(true); setError('');
    try {
      await linkSignageMediaProduct(organizationId, mediaId, listingId);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : '제품을 연결하지 못했습니다. 다시 시도해 주시기 바랍니다.');
    } finally { lock.current = false; setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div role="dialog" aria-modal="true" aria-labelledby={headingId} className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <div className="border-b border-slate-200 p-4">
          <h2 id={headingId} className="text-lg font-semibold text-slate-900">이 영상의 제품</h2>
          <p className="mt-1 break-words text-sm text-slate-600">{videoTitle}</p>
          <p className="mt-1 text-sm text-slate-500">
            현재: {currentProductName ?? '연결 안 됨'}{inherited ? '(원본 영상의 연결)' : ''} · 태블릿 코너에 이 제품을 넣으면 이 영상을 [영상 보기]로 보일 수 있습니다.
          </p>
        </div>
        <form className="flex gap-2 p-4 pb-2" onSubmit={event => { event.preventDefault(); setQuery(search.trim()); }}>
          <input aria-label="취급 제품 검색" value={search} onChange={event => setSearch(event.target.value)} placeholder="제품 이름으로 검색"
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-300 px-3 text-sm" />
          <button type="submit" className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm">검색</button>
        </form>
        <div className="min-h-0 flex-1 overflow-y-auto px-4">
          {loading ? <p className="py-6 text-center text-sm text-slate-500">취급 제품을 불러오는 중…</p>
            : loadError ? <p role="alert" className="py-6 text-center text-sm text-red-700">{loadError}</p>
            : items.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">연결할 수 있는 취급 제품이 없습니다. 매장 자체 등록 제품은 표준 제품 정보가 없어 연결할 수 없습니다.</p>
            : <ul className="divide-y divide-slate-100">
              {items.map(item => (
                <li key={item.sourceId}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 py-2 text-sm">
                    <input type="radio" name="video-product" checked={selected === item.sourceId} onChange={() => setSelected(item.sourceId)} />
                    <span className="min-w-0 flex-1 break-words">{item.name}</span>
                    <span className="shrink-0 text-xs text-slate-500">{item.ownerLabel}</span>
                  </label>
                </li>
              ))}
            </ul>}
        </div>
        {error && <p role="alert" className="px-4 pt-2 text-sm text-red-700">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 p-4">
          {currentProductName && !inherited && <button type="button" disabled={saving} onClick={() => void save(null)}
            className="min-h-11 rounded-lg border border-red-200 px-3 text-sm text-red-700 disabled:opacity-50">연결 해제</button>}
          <button type="button" disabled={saving} onClick={onClose} className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm disabled:opacity-50">취소</button>
          <button type="button" disabled={saving || !selected || selected === currentListingId} onClick={() => void save(selected)}
            className="min-h-11 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white disabled:opacity-50">{saving ? '저장 중…' : '연결 저장'}</button>
        </div>
      </div>
    </div>
  );
}
