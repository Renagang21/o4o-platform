/**
 * TabletProductListQuickEditor — 빠른 상품 수정(추가 / 제거 / 순서)
 *
 * WO-O4O-STORE-TABLET-LOCATION-CONTENT-RUNTIME-MANAGEMENT-V1
 *
 * 콘텐츠(Screen Set)의 product_list block 선택 목록만 다룬다. 새 상품 저장 형식을 만들지 않고
 * canonical config(`{ source:'selected_products', products:[{productType, productId, qrCodeId}] }`) 를 그대로 사용한다.
 * 경영자 PC 화면(콘텐츠 목록 [상품 수정])과 태블릿 직원 화면([상품 수정]) 이 같은 컴포넌트를 쓰며,
 * 조회/저장 함수만 주입한다(경영자=/screen-sets/:id/product-list · 직원=/tablet-runtime/screen-sets/:id/product-list).
 */
import { useEffect, useMemo, useState } from 'react';
import type { ProductListEditorData, ProductListSelection } from '../../api/tabletDisplays';

export interface TabletProductListQuickEditorProps {
  load: () => Promise<ProductListEditorData>;
  save: (products: Array<{ productType: 'supplier' | 'local'; productId: string; qrCodeId?: string | null }>) => Promise<void>;
  onSaved?: () => void;
  onClose: () => void;
  /** 태블릿(터치) 문맥이면 버튼/글자를 키운다 */
  large?: boolean;
}

export function TabletProductListQuickEditor({ load, save, onSaved, onClose, large = false }: TabletProductListQuickEditorProps) {
  const [data, setData] = useState<ProductListEditorData | null>(null);
  const [selected, setSelected] = useState<ProductListSelection[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load()
      .then((d) => { if (cancelled) return; setData(d); setSelected(d.selected ?? []); })
      .catch((e: any) => { if (!cancelled) setError(e?.message || '상품 목록을 불러오지 못했습니다.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [load]);

  const pool = useMemo(() => {
    if (!data) return [];
    const all = [...data.pool.supplierProducts, ...data.pool.localProducts];
    const chosen = new Set(selected.map((s) => `${s.productType}:${s.productId}`));
    const kw = q.trim().toLowerCase();
    return all.filter((p) => !chosen.has(`${p.productType}:${p.productId}`) && (!kw || p.name.toLowerCase().includes(kw)));
  }, [data, selected, q]);

  const move = (idx: number, dir: -1 | 1) => {
    setSelected((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await save(selected.map((s) => ({ productType: s.productType, productId: s.productId, qrCodeId: s.qrCodeId ?? null })));
      onSaved?.();
      onClose();
    } catch (e: any) {
      setError(e?.message || '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const fs = large ? 18 : 14;
  const btn: React.CSSProperties = { fontSize: fs, padding: large ? '10px 14px' : '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' };
  const primary: React.CSSProperties = { ...btn, background: '#2563eb', color: '#fff', border: '1px solid #2563eb' };

  return (
    <div role="dialog" aria-label="빠른 상품 수정" data-testid="product-quick-editor" style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: fs, color: '#111827' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ fontSize: fs + 2 }}>빠른 상품 수정{data ? ` — ${data.screenSetName}` : ''}</strong>
        <button type="button" style={btn} onClick={onClose}>닫기</button>
      </div>
      {error && <div role="alert" style={{ color: '#b91c1c' }}>{error}</div>}
      {loading ? (
        <div>불러오는 중…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 16 }}>
          <section>
            <h4 style={{ margin: '0 0 8px' }}>표시 상품 ({selected.length})</h4>
            {selected.length === 0 && <div style={{ color: '#6b7280' }}>선택된 상품이 없습니다. 오른쪽에서 추가하세요.</div>}
            <ol data-testid="quick-editor-selected" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: large ? '48vh' : 320, overflowY: 'auto' }}>
              {selected.map((s, i) => (
                <li key={`${s.productType}:${s.productId}`} style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 8px' }}>
                  <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {i + 1}. {s.name || s.productId}
                    <span style={{ marginLeft: 6, color: '#6b7280', fontSize: fs - 3 }}>{s.productType === 'local' ? '매장' : '공급'}</span>
                  </span>
                  <button type="button" style={btn} aria-label="위로" disabled={i === 0} onClick={() => move(i, -1)}>▲</button>
                  <button type="button" style={btn} aria-label="아래로" disabled={i === selected.length - 1} onClick={() => move(i, 1)}>▼</button>
                  <button type="button" style={btn} aria-label="제거" onClick={() => setSelected((prev) => prev.filter((_, j) => j !== i))}>제거</button>
                </li>
              ))}
            </ol>
          </section>
          <section>
            <h4 style={{ margin: '0 0 8px' }}>매장 상품 추가</h4>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="상품명 검색"
              aria-label="상품명 검색"
              style={{ width: '100%', boxSizing: 'border-box', fontSize: fs, padding: large ? 10 : 6, borderRadius: 8, border: '1px solid #cbd5e1', marginBottom: 8 }}
            />
            <ul data-testid="quick-editor-pool" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: large ? '44vh' : 280, overflowY: 'auto' }}>
              {pool.length === 0 && <li style={{ color: '#6b7280' }}>추가할 상품이 없습니다.</li>}
              {pool.map((p) => (
                <li key={`${p.productType}:${p.productId}`} style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 8px' }}>
                  <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                    <span style={{ marginLeft: 6, color: '#6b7280', fontSize: fs - 3 }}>{p.productType === 'local' ? '매장' : '공급'}</span>
                  </span>
                  <button type="button" style={btn} onClick={() => setSelected((prev) => [...prev, { productType: p.productType, productId: p.productId, qrCodeId: null, name: p.name }])}>추가</button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button type="button" style={btn} onClick={onClose} disabled={saving}>취소</button>
        <button type="button" style={primary} onClick={handleSave} disabled={saving || loading} data-testid="quick-editor-save">{saving ? '저장 중…' : '저장'}</button>
      </div>
    </div>
  );
}

export default TabletProductListQuickEditor;
