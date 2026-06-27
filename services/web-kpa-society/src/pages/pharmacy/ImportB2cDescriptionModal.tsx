/**
 * ImportB2cDescriptionModal — O4O B2C 상세설명을 매장 콘텐츠로 가져오기(=복사)
 *
 * WO-O4O-KPA-O4O-B2C-DESCRIPTION-COPY-TO-STORE-CONTENT-V1
 *
 * O4O 기반 제품(listing)에서만 진입. 서버가 관계를 검증하고 원본을 직접 읽어 복사하므로
 * 클라이언트는 listingId + 선택한 descriptionId 만 전달한다(본문/masterId 미제출).
 * 원본과 사본은 독립. 같은 원본 재가져오기는 새 사본을 생성(중복 가능성 안내 후 진행).
 */

import { useEffect, useState, useCallback, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, FileDown, Loader2, CheckCircle2, Pencil, ListChecks } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { b2cDescriptionApi, type B2cDescriptionItem } from '../../api/assetSnapshot';
import { colors } from '../../styles/theme';

export interface ImportB2cProduct {
  /** organization_product_listings.id (O4O 기반 제품) */
  listingId: string;
  name: string;
}

interface Props {
  open: boolean;
  product: ImportB2cProduct | null;
  onClose: () => void;
  /** 가져오기 성공 후 호출 — 연결 콘텐츠 수 갱신 */
  onImported: () => void;
  /** 완료 화면 "연결 콘텐츠 보기" — 해당 제품 드로어 오픈 */
  onViewLinked: () => void;
}

const STATUS_LABEL: Record<string, string> = { canonical: '공개' };
function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('ko-KR');
}

export function ImportB2cDescriptionModal({ open, product, onClose, onImported, onViewLinked }: Props) {
  const navigate = useNavigate();
  const [items, setItems] = useState<B2cDescriptionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [doneContentId, setDoneContentId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !product) return;
    let cancelled = false;
    setLoading(true); setError(null); setSelectedId(null); setDoneContentId(null);
    b2cDescriptionApi
      .list(product.listingId)
      .then((res) => { if (!cancelled) setItems(res?.data?.items ?? []); })
      .catch((e: any) => { if (!cancelled) setError(e?.message || '상세설명을 불러오지 못했습니다'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, product]);

  const handleImport = useCallback(async () => {
    if (!product || !selectedId) return;
    setImporting(true);
    try {
      const res = await b2cDescriptionApi.import(product.listingId, selectedId);
      const newId = res?.data?.id;
      setDoneContentId(newId);
      onImported();
      toast.success('상세설명을 매장 콘텐츠로 가져왔습니다.');
    } catch (e: any) {
      toast.error(e?.message || '가져오기에 실패했습니다');
    } finally {
      setImporting(false);
    }
  }, [product, selectedId, onImported]);

  if (!open || !product) return null;

  return (
    <div style={styles.backdrop} role="presentation" onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header style={styles.header}>
          <div style={{ minWidth: 0 }}>
            <div style={styles.eyebrow}>O4O 상세설명 가져오기</div>
            <h2 style={styles.title} title={product.name}>{product.name}</h2>
          </div>
          <button type="button" onClick={onClose} style={styles.iconBtn} aria-label="닫기"><X size={18} /></button>
        </header>

        <div style={styles.body}>
          {doneContentId ? (
            // ── 완료 화면 ──
            <div style={styles.doneBox}>
              <CheckCircle2 size={32} style={{ color: '#16A34A' }} />
              <p style={styles.doneText}>상세설명을 매장 콘텐츠로 가져왔습니다.</p>
              <div style={styles.doneActions}>
                <button
                  type="button"
                  style={styles.primaryBtn}
                  onClick={() => { onClose(); navigate(`/store/content/direct/${doneContentId}?edit=1`); }}
                >
                  <Pencil size={14} /> 가져온 콘텐츠 편집
                </button>
                <button type="button" style={styles.secondaryBtn} onClick={() => { onClose(); onViewLinked(); }}>
                  <ListChecks size={14} /> 연결 콘텐츠 보기
                </button>
                <button type="button" style={styles.ghostBtn} onClick={onClose}>매장 경영활용 제품 목록으로</button>
              </div>
            </div>
          ) : loading ? (
            <div style={styles.stateBox}><Loader2 size={18} className="animate-spin" /><span>불러오는 중…</span></div>
          ) : error ? (
            <div style={{ ...styles.stateBox, color: '#DC2626' }}>{error}</div>
          ) : items.length === 0 ? (
            <div style={styles.emptyBox}>
              <FileDown size={28} style={{ color: colors.neutral300 }} />
              <p style={styles.emptyText}>가져올 수 있는 O4O 상세설명이 없습니다.</p>
            </div>
          ) : (
            // ── 선택 화면 ──
            <>
              <p style={styles.guideHint}>
                가져오기는 <strong>복사</strong>입니다. 원본과 매장 사본은 독립적이며, 같은 원본을 다시 가져오면 새 사본이 생성됩니다.
              </p>
              <ul style={styles.list}>
                {items.map((it) => {
                  const active = selectedId === it.descriptionId;
                  return (
                    <li key={it.descriptionId}>
                      <label style={{ ...styles.item, ...(active ? styles.itemActive : null) }}>
                        <input
                          type="radio"
                          name="b2c-desc"
                          checked={active}
                          onChange={() => setSelectedId(it.descriptionId)}
                          style={{ marginTop: 3 }}
                        />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={styles.itemTitle} title={it.title}>{it.title}</div>
                          <div style={styles.itemMeta}>
                            <span style={styles.badge}>{STATUS_LABEL[it.status] ?? it.status}</span>
                            <span style={styles.metaText}>{it.language?.toUpperCase()}</span>
                            <span style={styles.metaText}>{formatDate(it.updatedAt)}</span>
                          </div>
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        {!doneContentId && !loading && !error && items.length > 0 && (
          <footer style={styles.footer}>
            <button type="button" onClick={onClose} style={styles.secondaryBtn} disabled={importing}>취소</button>
            <button
              type="button"
              onClick={handleImport}
              disabled={!selectedId || importing}
              style={{ ...styles.primaryBtn, opacity: !selectedId || importing ? 0.5 : 1 }}
            >
              {importing ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
              {importing ? '가져오는 중…' : '가져오기'}
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
  modal: { width: '100%', maxWidth: 560, maxHeight: '88vh', background: colors.white, borderRadius: 12, boxShadow: '0 20px 50px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, padding: '14px 18px', borderBottom: `1px solid ${colors.neutral100}`, flexShrink: 0 },
  eyebrow: { fontSize: 11, fontWeight: 700, color: colors.primary, marginBottom: 4 },
  title: { fontSize: 16, fontWeight: 700, color: colors.neutral800, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  iconBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, border: 'none', background: 'transparent', color: colors.neutral500, cursor: 'pointer', borderRadius: 6, flexShrink: 0 },
  body: { padding: 18, overflowY: 'auto', flex: 1 },
  guideHint: { margin: '0 0 14px', padding: '9px 12px', fontSize: 12, lineHeight: 1.6, color: '#1E40AF', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8 },
  stateBox: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '40px 0', color: colors.neutral500, fontSize: 13 },
  emptyBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '44px 16px', textAlign: 'center' },
  emptyText: { margin: 0, fontSize: 13, color: colors.neutral500 },
  list: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 },
  item: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 12px', border: `1px solid ${colors.neutral200}`, borderRadius: 8, cursor: 'pointer' },
  itemActive: { borderColor: colors.primary, background: '#F5F8FF' },
  itemTitle: { fontSize: 14, fontWeight: 600, color: colors.neutral800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  itemMeta: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 },
  badge: { fontSize: 11, fontWeight: 500, color: '#16A34A', background: '#DCFCE7', padding: '2px 7px', borderRadius: 999 },
  metaText: { fontSize: 12, color: colors.neutral400 },
  footer: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, padding: '12px 18px', borderTop: `1px solid ${colors.neutral100}`, flexShrink: 0 },
  doneBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '32px 16px', textAlign: 'center' },
  doneText: { margin: 0, fontSize: 15, fontWeight: 600, color: colors.neutral800 },
  doneActions: { display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 280 },
  primaryBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 16px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  secondaryBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 14px', background: colors.white, color: colors.neutral700, border: `1px solid ${colors.neutral300}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  ghostBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '8px 14px', background: 'transparent', color: colors.neutral500, border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' },
};
