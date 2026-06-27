/**
 * LinkedContentsDrawer — 매장 경영활용 제품에 연결된 자료함 콘텐츠 보기 (read + 열기/편집 진입)
 *
 * WO-O4O-KPA-STORE-HANDLED-PRODUCTS-CONTENT-ACTIONS-V1
 * 선행: WO-O4O-KPA-STORE-HANDLED-PRODUCTS-CONTENT-LINK-V1 (연결 구조 + by-product API)
 *
 * GET /api/v1/kpa/store-contents/by-product?sourceType=&sourceId= 호출.
 * 항목별 열기/편집은 콘텐츠 종류(direct vs snapshot_edit)에 따라 기존 편집 경로로 분기한다.
 * 연결 해제 UI 는 본 범위 밖(별도 WO).
 */

import { useEffect, useState, useCallback, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, FileText, ExternalLink, Plus, Loader2 } from 'lucide-react';
import { handledProductContentApi, type LinkedContentItem } from '../../api/assetSnapshot';
import { colors } from '../../styles/theme';

export interface LinkedDrawerProduct {
  sourceType: 'listing' | 'local';
  sourceId: string;
  name: string;
}

interface Props {
  open: boolean;
  product: LinkedDrawerProduct | null;
  onClose: () => void;
  onCreateNew: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  draft: '초안',
  pending_ai: 'AI 대기',
  ai_processed: 'AI 처리됨',
  ready_curation: '큐레이션 준비',
  archived: '보관됨',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('ko-KR');
}

export function LinkedContentsDrawer({ open, product, onClose, onCreateNew }: Props) {
  const navigate = useNavigate();
  const [items, setItems] = useState<LinkedContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !product) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    handledProductContentApi
      .byProduct(product.sourceType, product.sourceId)
      .then((res) => {
        if (!cancelled) setItems(res?.data?.items ?? []);
      })
      .catch((e: any) => {
        if (!cancelled) setError(e?.message || '연결 콘텐츠를 불러오지 못했습니다');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, product]);

  // direct → 상세(보기/편집) / snapshot_edit → 스냅샷 편집 페이지
  const openContent = useCallback(
    (it: LinkedContentItem) => {
      onClose();
      if (it.sourceType === 'direct') {
        navigate(`/store/content/direct/${it.contentId}`);
      } else if (it.snapshotId) {
        navigate(`/store/content/${it.snapshotId}/edit`);
      }
    },
    [navigate, onClose],
  );

  if (!open || !product) return null;

  const kindLabel = product.sourceType === 'listing' ? 'O4O 기반 제품' : '매장 경영활용 제품';

  return (
    <div style={styles.backdrop} role="presentation" onClick={onClose}>
      <aside style={styles.drawer} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header style={styles.header}>
          <div style={{ minWidth: 0 }}>
            <div style={styles.eyebrow}>연결 콘텐츠</div>
            <h2 style={styles.title} title={product.name}>{product.name}</h2>
            <span style={styles.kind}>{kindLabel}</span>
          </div>
          <button type="button" onClick={onClose} style={styles.iconBtn} aria-label="닫기">
            <X size={18} />
          </button>
        </header>

        <div style={styles.body}>
          {loading ? (
            <div style={styles.stateBox}>
              <Loader2 size={18} className="animate-spin" />
              <span>불러오는 중…</span>
            </div>
          ) : error ? (
            <div style={{ ...styles.stateBox, color: '#DC2626' }}>{error}</div>
          ) : items.length === 0 ? (
            <div style={styles.emptyBox}>
              <FileText size={28} style={{ color: colors.neutral300 }} />
              <p style={styles.emptyText}>이 제품에 연결된 콘텐츠가 없습니다.</p>
              <button type="button" onClick={onCreateNew} style={styles.primaryBtn}>
                <Plus size={14} />
                새 콘텐츠 만들기
              </button>
            </div>
          ) : (
            <ul style={styles.list}>
              {items.map((it) => (
                <li key={it.contentId} style={styles.item}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={styles.itemTitle} title={it.title}>{it.title || '(제목 없음)'}</div>
                    <div style={styles.itemMeta}>
                      <span style={styles.statusBadge}>{STATUS_LABEL[it.status] ?? it.status}</span>
                      <span style={styles.itemDate}>{formatDate(it.updatedAt)}</span>
                    </div>
                  </div>
                  <button type="button" onClick={() => openContent(it)} style={styles.openBtn}>
                    열기
                    <ExternalLink size={12} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {!loading && !error && items.length > 0 && (
          <footer style={styles.footer}>
            <button type="button" onClick={onCreateNew} style={styles.primaryBtn}>
              <Plus size={14} />
              새 콘텐츠 만들기
            </button>
          </footer>
        )}
      </aside>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles: Record<string, CSSProperties> = {
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', justifyContent: 'flex-end', zIndex: 1000 },
  drawer: { width: '100%', maxWidth: 440, height: '100%', background: colors.white, boxShadow: '-12px 0 40px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column' },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, padding: '16px 18px', borderBottom: `1px solid ${colors.neutral100}`, flexShrink: 0 },
  eyebrow: { fontSize: 11, fontWeight: 700, color: colors.primary, marginBottom: 4 },
  title: { fontSize: 16, fontWeight: 700, color: colors.neutral800, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  kind: { display: 'inline-block', marginTop: 6, fontSize: 11, fontWeight: 500, color: '#1D4ED8', background: '#DBEAFE', padding: '2px 8px', borderRadius: 999 },
  iconBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, border: 'none', background: 'transparent', color: colors.neutral500, cursor: 'pointer', borderRadius: 6, flexShrink: 0 },
  body: { padding: 16, overflowY: 'auto', flex: 1 },
  stateBox: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '40px 0', color: colors.neutral500, fontSize: 13 },
  emptyBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '48px 16px', textAlign: 'center' },
  emptyText: { margin: 0, fontSize: 13, color: colors.neutral500 },
  list: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 },
  item: { display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', border: `1px solid ${colors.neutral200}`, borderRadius: 8, background: colors.white },
  itemTitle: { fontSize: 14, fontWeight: 600, color: colors.neutral800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  itemMeta: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 },
  statusBadge: { fontSize: 11, fontWeight: 500, color: colors.neutral600, background: colors.neutral100, padding: '2px 7px', borderRadius: 999 },
  itemDate: { fontSize: 12, color: colors.neutral400 },
  openBtn: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 11px', background: colors.white, border: `1px solid ${colors.neutral300}`, borderRadius: 6, fontSize: 12, color: colors.neutral700, cursor: 'pointer', flexShrink: 0 },
  footer: { padding: '12px 16px', borderTop: `1px solid ${colors.neutral100}`, flexShrink: 0 },
  primaryBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
};
