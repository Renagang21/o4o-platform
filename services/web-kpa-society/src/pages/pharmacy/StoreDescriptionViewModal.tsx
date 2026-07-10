/**
 * StoreDescriptionViewModal — O4O 상품의 매장용(STORE) 상세설명서 다국어 조회(읽기 전용)
 *
 * WO-O4O-KPA-STORE-HANDLED-PRODUCT-DESCRIPTION-USAGE-POLICY-FIX-V1 (선행)
 * WO-O4O-KPA-STORE-HANDLED-PRODUCT-ACTIONS-AND-MULTILINGUAL-DESCRIPTION-V1:
 *   동일 ProductMaster 의 description_type='STORE' 설명서를 언어별로 조회.
 *   - 한국어 기본 표시, 없으면 사용 가능한 첫 번째 언어.
 *   - 실제 존재하는 언어만 버튼 노출. 버튼 선택 시 해당 언어 본문 표시.
 *   - 전부 읽기 전용. 매장 복사·kpa_store_contents 생성 없음.
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

// 언어 표시 라벨 + 노출 순서(한국어 우선).
const LANG_LABELS: Record<string, string> = {
  ko: '한국어',
  en: 'English',
  zh: '中文',
  ja: '日本語',
  vi: 'Tiếng Việt',
  th: 'ภาษาไทย',
  id: 'Bahasa',
};
const LANG_ORDER = ['ko', 'en', 'zh', 'ja', 'vi', 'th', 'id'];
function langLabel(l: string): string {
  return LANG_LABELS[l] || l.toUpperCase();
}
function normLang(l: string | null | undefined): string {
  return (l || 'ko').toLowerCase();
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('ko-KR');
}

export function StoreDescriptionViewModal({ open, product, onClose }: Props) {
  const [items, setItems] = useState<StoreDescriptionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeLang, setActiveLang] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !product) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setActiveLang(null);
    setItems([]);
    storeDescriptionApi
      .list(product.listingId)
      .then((res) => {
        if (cancelled) return;
        setItems(res?.data?.items ?? []);
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

  // 언어별 대표 설명서(언어당 최신 1건 — 백엔드가 updated_at DESC 정렬) + 노출 언어 목록.
  const { byLang, languages } = useMemo(() => {
    const map = new Map<string, StoreDescriptionItem>();
    for (const it of items) {
      const l = normLang(it.language);
      if (!map.has(l)) map.set(l, it); // 첫 등장 = 최신
    }
    const present = Array.from(map.keys());
    // 한국어 우선 → 그 외 정의된 순서 → 알 수 없는 언어는 뒤에.
    const ordered = present.sort((a, b) => {
      if (a === 'ko') return -1;
      if (b === 'ko') return 1;
      const ia = LANG_ORDER.indexOf(a);
      const ib = LANG_ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
    return { byLang: map, languages: ordered };
  }, [items]);

  // 기본 언어: 한국어 있으면 한국어, 없으면 사용 가능한 첫 번째 언어.
  useEffect(() => {
    if (languages.length === 0) {
      setActiveLang(null);
      return;
    }
    setActiveLang((prev) => (prev && languages.includes(prev) ? prev : languages.includes('ko') ? 'ko' : languages[0]));
  }, [languages]);

  const active = activeLang ? byLang.get(activeLang) ?? null : null;

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
          ) : languages.length === 0 ? (
            // 정책 안내 — 매장용 상세설명서 미등록
            <div style={styles.emptyBox}>
              <FileText size={28} style={{ color: colors.neutral300 }} />
              <p style={styles.emptyText}>등록된 매장용 상세설명서가 없습니다.</p>
              <p style={styles.emptySub}>
                O4O 상품에 매장용 상세설명서가 등록되면 이 화면에서 바로 확인할 수 있습니다.
              </p>
            </div>
          ) : (
            <>
              {/* 실제 존재하는 언어만 버튼으로 노출(한국어 우선). 선택 시 해당 언어 본문 표시. */}
              <div style={styles.tabRow}>
                {languages.map((l) => {
                  const on = l === activeLang;
                  return (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setActiveLang(l)}
                      style={{ ...styles.tab, ...(on ? styles.tabOn : styles.tabOff) }}
                    >
                      {langLabel(l)}
                    </button>
                  );
                })}
              </div>

              {active && (
                <>
                  <div style={styles.metaRow}>
                    <span style={styles.badge}>매장용</span>
                    <span style={styles.metaText}>{langLabel(normLang(active.language))}</span>
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
  tabRow: { display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' },
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
