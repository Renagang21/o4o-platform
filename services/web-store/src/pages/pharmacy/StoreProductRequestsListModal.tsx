/**
 * StoreProductRequestsListModal — 내 매장 신규 상품 등록 요청 목록 · 상태 (P1)
 *
 * WO-O4O-KPA-STORE-NEW-PRODUCT-REQUEST-AND-ADMIN-APPROVAL-V1 (Phase 1)
 *
 * 매장이 제출한 신규 상품 등록 요청과 처리 상태(검토 중/보완 요청/등록 완료/등록 불가)를 확인한다.
 * 보완 요청 건은 '수정 재제출'로 편집 모달(StoreNewProductRequestModal editRequest)로 이어진다.
 */

import { useEffect, useState, useCallback, type CSSProperties } from 'react';
import { X, RefreshCw, Loader2, Package, Pencil } from 'lucide-react';
import { Pagination } from '@o4o/operator-ux-core';
import { colors } from '../../styles/theme';
import { listProductRequests, type StoreProductRequest, type StoreRequestDisplayStatus } from '../../api/storeProductRequests';

interface Props {
  open: boolean;
  onClose: () => void;
  /** 보완 요청 건 '수정 재제출' 클릭 시 — 편집 모달 오픈 */
  onEdit: (request: StoreProductRequest) => void;
  /** 목록 강제 갱신 트리거 (제출/재제출 후 증가) */
  refreshKey?: number;
}

const PAGE_LIMIT = 20;

const STATUS_TONE: Record<StoreRequestDisplayStatus, CSSProperties> = {
  reviewing: { background: '#DBEAFE', color: '#1D4ED8' },
  revision_requested: { background: '#FEF3C7', color: '#B45309' },
  registered: { background: '#DCFCE7', color: '#15803D' },
  rejected: { background: '#FEE2E2', color: '#B91C1C' },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('ko-KR');
}

export function StoreProductRequestsListModal({ open, onClose, onEdit, refreshKey }: Props) {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<StoreProductRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    listProductRequests({ page, limit: PAGE_LIMIT })
      .then((r) => { setItems(r.items); setTotal(r.meta.total); })
      .catch((e: any) => setError(e?.message || '요청 목록을 불러오지 못했습니다'))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { if (open) setPage(1); }, [open]);
  useEffect(() => { if (open) load(); }, [open, load, refreshKey]);

  if (!open) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>내 신규 상품 등록 요청</h2>
            <p style={styles.subtitle}>제출한 요청의 처리 상태를 확인합니다. 보완 요청은 수정 후 다시 제출할 수 있습니다.</p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={load} style={styles.refreshBtn} aria-label="새로고침"><RefreshCw size={14} /></button>
            <button onClick={onClose} style={styles.closeBtn} aria-label="닫기"><X size={18} /></button>
          </div>
        </div>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, textAlign: 'left' }}>상품</th>
                <th style={styles.th}>분류</th>
                <th style={styles.th}>바코드</th>
                <th style={styles.th}>상태</th>
                <th style={styles.th}>제출일</th>
                <th style={styles.th}>작업</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={styles.empty}><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> 불러오는 중…</td></tr>
              ) : error ? (
                <tr><td colSpan={6} style={{ ...styles.empty, color: '#DC2626' }}>{error}</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} style={styles.empty}>아직 제출한 신규 상품 등록 요청이 없습니다.</td></tr>
              ) : (
                items.map((r) => (
                  <tr key={r.id} style={styles.row}>
                    <td style={styles.tdProduct}>
                      <div style={styles.productCell}>
                        {r.imageUrl ? (
                          <img src={r.imageUrl} alt="" style={styles.thumb} />
                        ) : (
                          <div style={styles.thumbPlaceholder}><Package size={16} style={{ color: colors.neutral400 }} /></div>
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div style={styles.productName} title={r.productName ?? ''}>{r.productName || '—'}</div>
                          {r.manufacturer && <div style={styles.productSub}>{r.manufacturer}</div>}
                          {r.displayStatus === 'revision_requested' && r.reviewNote && (
                            <div style={styles.reviewNote}>보완 메모: {r.reviewNote}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={styles.td}>{r.classification?.label || '—'}</td>
                    <td style={styles.tdMono}>{r.barcode || (r.noBarcode ? '바코드 없음' : '—')}</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.statusBadge, ...STATUS_TONE[r.displayStatus] }}>{r.displayStatusLabel}</span>
                    </td>
                    <td style={styles.td}>{formatDate(r.createdAt)}</td>
                    <td style={styles.td}>
                      {r.editable ? (
                        <button onClick={() => onEdit(r)} style={styles.editBtn}>
                          <Pencil size={13} /> 수정 재제출
                        </button>
                      ) : (
                        <span style={{ color: colors.neutral300 }}>—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={total} />

        <p style={styles.footnote}>
          ※ 등록 완료된 요청의 상품은 관리자 승인 후 <b>매장 경영활용 제품</b>으로 자동 연결됩니다(후속 단계). 현재 단계에서는 요청 접수·상태 확인만 제공합니다.
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, padding: '40px 16px', overflowY: 'auto' },
  modal: { background: colors.white, borderRadius: '12px', width: '100%', maxWidth: '860px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', padding: '20px 22px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' },
  title: { fontSize: '17px', fontWeight: 600, color: colors.neutral800, margin: 0 },
  subtitle: { fontSize: '13px', color: colors.neutral500, margin: '4px 0 0' },
  headerActions: { display: 'flex', alignItems: 'center', gap: '4px' },
  refreshBtn: { border: `1px solid ${colors.neutral300}`, background: colors.white, cursor: 'pointer', color: colors.neutral600, padding: '6px', borderRadius: '6px', display: 'inline-flex' },
  closeBtn: { border: 'none', background: 'transparent', cursor: 'pointer', color: colors.neutral500, padding: '4px' },
  tableWrap: { overflowX: 'auto', border: `1px solid ${colors.neutral200}`, borderRadius: '8px', maxHeight: '56vh', overflowY: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { padding: '9px 12px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: colors.neutral500, background: '#F8FAFC', borderBottom: `1px solid ${colors.neutral200}`, whiteSpace: 'nowrap', position: 'sticky', top: 0 },
  row: { borderBottom: `1px solid ${colors.neutral100}` },
  td: { padding: '10px 12px', textAlign: 'center', color: colors.neutral700, whiteSpace: 'nowrap' },
  tdMono: { padding: '10px 12px', textAlign: 'center', color: colors.neutral500, fontSize: '12px', fontFamily: 'monospace', whiteSpace: 'nowrap' },
  tdProduct: { padding: '10px 12px', textAlign: 'left', minWidth: '280px' },
  productCell: { display: 'flex', alignItems: 'flex-start', gap: '10px', minWidth: 0 },
  thumb: { width: '38px', height: '38px', borderRadius: '6px', objectFit: 'cover', border: `1px solid ${colors.neutral200}`, flexShrink: 0 },
  thumbPlaceholder: { width: '38px', height: '38px', borderRadius: '6px', background: colors.neutral100, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  productName: { fontSize: '14px', fontWeight: 500, color: colors.neutral800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '360px' },
  productSub: { fontSize: '12px', color: colors.neutral400, marginTop: '2px' },
  reviewNote: { fontSize: '12px', color: '#B45309', marginTop: '4px', whiteSpace: 'normal', lineHeight: 1.4 },
  statusBadge: { display: 'inline-block', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' },
  editBtn: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 12px', background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: '6px', fontSize: '12px', fontWeight: 500, color: '#B45309', cursor: 'pointer', whiteSpace: 'nowrap' },
  empty: { padding: '40px 12px', textAlign: 'center', color: colors.neutral400, fontSize: '13px' },
  footnote: { marginTop: '12px', fontSize: '12px', color: colors.neutral500, lineHeight: 1.6, padding: '10px 12px', background: colors.neutral100, borderRadius: '6px' },
};
