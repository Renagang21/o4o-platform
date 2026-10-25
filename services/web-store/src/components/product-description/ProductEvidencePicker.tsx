import { useRef, useState } from 'react';
import { sanitizeRichHtml } from '@o4o/content-editor';
import { getLocalProduct } from '../../api/localProducts';
import { storeDescriptionApi } from '../../api/assetSnapshot';
import { useLatestStoreRequest } from '../../pages/pharmacy/hooks/useLatestStoreRequest';

export interface ProductEvidenceSelection { html: string; title: string; source: string }
/** Reads the existing product source; inserting it changes only the current editor draft. */
export function ProductEvidencePicker({ kind, id, locale, disabled, isCurrent, onLoaded, onInsert }: {
  kind: 'local' | 'listing'; id: string; locale: string; disabled: boolean; isCurrent: () => boolean;
  onLoaded: (evidence: ProductEvidenceSelection) => void; onInsert: (html: string) => void;
}) {
  const requests = useLatestStoreRequest(`${kind}:${id}:${locale}`);
  const lock = useRef(false), inserted = useRef(false);
  const [didInsert, setDidInsert] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [empty, setEmpty] = useState(false);
  const [evidence, setEvidence] = useState<ProductEvidenceSelection | null>(null);
  const read = async () => {
    if (lock.current || disabled || !isCurrent()) return;
    lock.current = true; inserted.current = false; setDidInsert(false);
    const current = requests.begin(); setBusy(true); setError(''); setEmpty(false); setEvidence(null);
    try {
      let value: ProductEvidenceSelection | null = null;
      if (kind === 'local') {
        const product = await getLocalProduct(id);
        if (product.id !== id) throw new Error('Invalid product');
        const html = product.detailHtml ?? product.detail_html;
        if (product.is_active !== false && html?.trim()) value = { html: sanitizeRichHtml(html), title: product.name,
          source: '내 매장에 저장한 상품 상세설명 · 검수 상태는 별도 확인' };
      } else {
        const response = await storeDescriptionApi.list(id);
        if (!response.success || !Array.isArray(response.data?.items)) throw new Error('Invalid source');
        const pages = response.data.items.filter(p => p.status.toLowerCase() === 'published' && p.contentHtml?.trim());
        const page = pages.find(p => p.language === locale) || pages.find(p => p.language === 'ko') || pages[0];
        if (page) value = { html: sanitizeRichHtml(page.contentHtml!), title: page.title,
          source: `O4O 게시 상품 설명 · ${page.language} · ${page.updatedAt}` };
      }
      if (!current() || !isCurrent()) return;
      if (value?.html.trim()) { setEvidence(value); onLoaded(value); } else setEmpty(true);
    } catch { if (current() && isCurrent()) setError('상품 원문을 불러오지 못했습니다. 현재 작성 내용은 유지했습니다.'); }
    finally { lock.current = false; if (current() && isCurrent()) setBusy(false); }
  };
  return <details className="rounded-lg border border-slate-200 p-3">
    <summary className="min-h-11 cursor-pointer content-center text-sm font-medium">저장된 상품 원문 확인·가져오기</summary>
    <button type="button" className="mt-2 min-h-11 rounded border px-3 text-sm" disabled={busy || disabled} onClick={() => void read()}>
      {busy ? '원문 확인 중…' : error ? '상품 원문 다시 확인' : '상품 원문 불러오기'}
    </button>
    {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    {empty && <p role="status" className="mt-2 text-sm">가져올 상품 설명이 없습니다. 아래에서 근거를 넣어 직접 작성할 수 있습니다.</p>}
    {evidence && <div className="mt-3 space-y-3">
      <p className="text-sm font-medium">{evidence.title}</p><p className="text-xs text-slate-500">{evidence.source}</p>
      <div className="prose max-h-60 max-w-full overflow-auto rounded border p-3" dangerouslySetInnerHTML={{ __html: evidence.html }} />
      <button type="button" disabled={busy || disabled || didInsert} className="min-h-11 rounded border px-3 text-sm"
        onClick={() => { if (isCurrent() && !inserted.current) { inserted.current = true; setDidInsert(true); onInsert(evidence.html); } }}>
        {didInsert ? '원문을 본문에 추가했습니다' : '확인한 원문을 본문에 추가'}</button>
      <p className="text-xs text-slate-500">현재 작성 내용 뒤에 추가합니다. 저장·발행은 내용을 확인한 뒤 별도로 진행합니다.</p>
    </div>}
  </details>;
}
