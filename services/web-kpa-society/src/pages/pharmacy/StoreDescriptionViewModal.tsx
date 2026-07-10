/**
 * StoreDescriptionViewModal — O4O 상품의 매장용(STORE) 상세설명서 직접 조회(읽기 전용)
 *
 * WO-O4O-KPA-STORE-HANDLED-PRODUCT-DESCRIPTION-USAGE-POLICY-FIX-V1
 *
 * 정책: O4O 상품 정보는 매장으로 복사하지 않는다. O4O 상품(master)에 등록된 매장용(STORE)
 *   상세설명서를 매장 화면에서 그대로 조회·표시한다. (구 'O4O 상세설명 가져오기=복사' 폐기)
 * - listing(=master)에 등록된 매장용 상세설명서만 표시(백엔드가 description_type='STORE' 로 한정).
 * - 없으면 '등록된 매장용 상세설명서가 없습니다' 안내.
 * - 매장이 직접 작성하는 설명은 이 화면과 분리(‘매장 제작 콘텐츠’에서 별도 생성·관리).
 */

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { X, FileText, Loader2 } from 'lucide-react';
import { storeDescriptionApi, type StoreDescriptionItem } from '../../api/assetSnapshot';
import { colors } from '../../styles/theme';

export interface StoreDescriptionProduct {
  /** organization_product_listings.id (O4O 기반 제품) */
  listingId: string;
  name: string;
}

interface Props {
  open: boolean;
  product: StoreDescriptionProduct | null;
  onClose: () => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('ko-KR');
}

export function StoreDescriptionViewModal({ open, product, onClose }: Props) {
  const [items, setItems] = useState<StoreDescriptionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !product) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setActiveId(null);
    setItems([]);
    storeDescriptionApi
      .list(product.listingId)
      .then((res) => {
        if (cancelled) return;
        const list = res?.data?.items ?? [];
        setItems(list);
        setActiveId(list[0]?.descriptionId ?? null);
      })
      .catch((e: any) => {
        if (!cancelled) setError(e?.message || '매장용 상세설명서를 불러오지 못했습니다');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, product]);

  const active = useMemo(
    () => items.find((it) => it.descriptionId === activeId) ?? items[0] ?? null,
    [items, activeId],
  );

  if (!open || !product) return null;

  return (
    <div style={styles.backdrop} role="presentation" onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header style={styles.header}>
          <div style={{ minWidth: 0 }}>
            <div style={styles.eyebrow}>매장용 상세설명서</div>
            <h2 style={styles.title} title={product.name}>{product.name}</h2>
          </div>
          <button type="button" onClick={onClose} style={styles.iconBtn} aria-label="닫기"><X size={18} /></button>
        </header>

        <div style={styles.body}>
          {loading ? (
            <div style={styles.stateBox}><Loader2 size={18} className="animate-spin" /><span>불러오는 중…</span></div>
          ) : error ? (
            <div style={{ ...styles.stateBox, color: '#DC2626' }}>{error}</div>
          ) : items.length === 0 ? (
            // 정책 안내 — 매장용 상세설명서 미등록
            <div style={styles.emptyBox}>
              <FileText size={28} style={{ color: colors.neutral300 }} />
              <p style={styles.emptyText}>등록된 매장용 상세설명서가 없습니다.</p>
              <p style={styles.emptySub}>
                O4O 상품에 매장용 상세설명서가 등록되면 이 화면에서 바로 확인할 수 있습니다.
                매장이 직접 작성하는 설명은 ‘콘텐츠 만들기’(매장 제작 콘텐츠)에서 별도로 생성·관리합니다.
              </p>
            </div>
          ) : (
            <>
              {/* 언어/버전이 여러 개면 선택 탭 제공 */}
              {items.length > 1 && (
                <div style={styles.tabRow}>
                  {items.map((it) => {
                    const on = it.descriptionId === active?.descriptionId;
                    return (
                      <button
                        key={it.descriptionId}
                        type="button"
                        onClick={() => setActiveId(it.descriptionId)}
                        style={{ ...styles.tab, ...(on ? styles.tabOn : styles.tabOff) }}
                      >
                        {(it.language || 'ko').toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              )}

              {active && (
                <>
                  <div style={styles.metaRow}>
                    <span style={styles.badge}>매장용</span>
                    <span style={styles.metaText}>{(active.language || 'ko').toUpperCase()}</span>
                    <span style={styles.metaText}>{formatDate(active.updatedAt)}</span>
                  </div>
                  {active.summary && <p style={styles.summary}>{active.summary}</p>}
                  {active.contentHtml ? (
                    <div style={styles.content} dangerouslySetInnerHTML={{ __html: active.contentHtml }} />
                  ) : (
                    <div style={styles.noContent}>본문 내용이 없습니다.</div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        <footer style={styles.footer}>
          <button type="button" onClick={onClose} style={styles.secondaryBtn}>닫기</button>
        </footer>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
  modal: { width: '100%', maxWidth: 640, maxHeight: '88vh', background: colors.white, borderRadius: 12, boxShadow: '0 20px 50px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, padding: '14px 18px', borderBottom: `1px solid ${colors.neutral100}`, flexShrink: 0 },
  eyebrow: { fontSize: 11, fontWeight: 700, color: colors.primary, marginBottom: 4 },
  title: { fontSize: 16, fontWeight: 700, color: colors.neutral800, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  iconBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, border: 'none', background: 'transparent', color: colors.neutral500, cursor: 'pointer', borderRadius: 6, flexShrink: 0 },
  body: { padding: 18, overflowY: 'auto', flex: 1 },
  stateBox: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '40px 0', color: colors.neutral500, fontSize: 13 },
  emptyBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '44px 16px', textAlign: 'center' },
  emptyText: { margin: 0, fontSize: 14, fontWeight: 600, color: colors.neutral700 },
  emptySub: { margin: 0, fontSize: 12, lineHeight: 1.7, color: colors.neutral400, maxWidth: 420 },
  tabRow: { display: 'flex', gap: 6, marginBottom: 12 },
  tab: { padding: '5px 12px', fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: 'pointer' },
  tabOn: { background: colors.primary, color: '#fff', border: `1px solid ${colors.primary}` },
  tabOff: { background: colors.white, color: colors.neutral600, border: `1px solid ${colors.neutral300}` },
  metaRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 },
  badge: { fontSize: 11, fontWeight: 500, color: '#1D4ED8', background: '#DBEAFE', padding: '2px 8px', borderRadius: 999 },
  metaText: { fontSize: 12, color: colors.neutral400 },
  summary: { margin: '0 0 12px', fontSize: 13, lineHeight: 1.7, color: colors.neutral600, padding: '10px 12px', background: colors.neutral100, borderRadius: 8 },
  content: { fontSize: 14, lineHeight: 1.8, color: colors.neutral800, wordBreak: 'break-word' },
  noContent: { padding: '30px 0', textAlign: 'center', fontSize: 13, color: colors.neutral400 },
  footer: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, padding: '12px 18px', borderTop: `1px solid ${colors.neutral100}`, flexShrink: 0 },
  secondaryBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 16px', background: colors.white, color: colors.neutral700, border: `1px solid ${colors.neutral300}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
};
