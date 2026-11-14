import { useState } from 'react';
import { listProductMasters, type ProductMasterRow } from '@/api/o4o-product-db.api';

/** 매장 태블릿이 「이 제품의 영상」으로 읽는 연결 용도(WO-O4O-STORE-QR-TABLET-CHANNEL-SEPARATION-V1 T4 · T5). */
export const PRODUCT_VIDEO_PURPOSE = 'product-video';

/**
 * 미디어 카탈로그의 제품 연결 — Entity ID 를 직접 입력하지 않고 표준 제품을 이름으로 찾아 고른다.
 * 고르면 Entity ID 에 제품 마스터 ID 가 들어간다. 서버 연결 API · 권한은 그대로다.
 */
export function ProductMasterPicker({ disabled, onPick }: { disabled?: boolean; onPick: (product: ProductMasterRow) => void }) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<ProductMasterRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const search = async () => {
    if (!q.trim() || busy) return;
    setBusy(true); setError('');
    try {
      setItems((await listProductMasters({ q: q.trim(), limit: 8 })).items);
    } catch {
      setItems(null); setError('제품을 검색하지 못했습니다. 다시 시도해 주시기 바랍니다.');
    } finally { setBusy(false); }
  };
  return (
    <div className="mt-2 rounded border border-gray-200 p-2">
      <div className="flex gap-2">
        <input aria-label="연결할 제품 검색" value={q} disabled={disabled} onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void search(); } }}
          placeholder="제품 이름으로 찾기" className="min-w-0 flex-1 border rounded px-2 py-1 text-sm" />
        <button type="button" disabled={disabled || busy || !q.trim()} onClick={() => void search()} className="border rounded px-3 py-1 text-sm disabled:opacity-50">
          {busy ? '찾는 중…' : '제품 찾기'}
        </button>
      </div>
      {error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
      {items && items.length === 0 && <p className="mt-1 text-xs text-gray-500">맞는 제품이 없습니다.</p>}
      {items && items.length > 0 && (
        <ul className="mt-1 max-h-48 overflow-y-auto text-sm">
          {items.map(p => (
            <li key={p.id}>
              <button type="button" disabled={disabled} onClick={() => onPick(p)} className="w-full text-left px-1 py-1 hover:bg-gray-50 break-words">
                {p.name}{p.brand?.name ? ` · ${p.brand.name}` : ''}{p.specification ? ` · ${p.specification}` : ''}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1 text-xs text-gray-500">
        용도를 「{PRODUCT_VIDEO_PURPOSE}」로 두면 매장 태블릿 코너에서 이 제품의 [영상 보기]로 쓰입니다. 매장이 이 영상을 등록해 쓰면 연결도 함께 보입니다.
      </p>
    </div>
  );
}
