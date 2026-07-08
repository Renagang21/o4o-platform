/**
 * AddO4oStandardProductModal — O4O 표준 상품(ProductMaster)에서 검색·선택·등록
 *
 * WO-O4O-STORE-HANDLED-PRODUCTS-PRODUCTMASTER-LIST-LINK-V1
 *
 * 매장 경영자가 O4O 표준 상품 DB를 검색하여, 선택한 상품을 매장 경영활용 제품
 * (O4O 기반 제품 listing)으로 등록한다. 검색=GET /store/products/search,
 * 등록=POST /store/products/list(master 기반, idempotent). 백엔드 변경 없음.
 */

import { useEffect, useState, useCallback, type CSSProperties } from 'react';
import { X, Search, Loader2, Package, Plus, Check } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { Pagination } from '@o4o/operator-ux-core';
import {
  searchO4oStandardProducts,
  registerStandardProductToStore,
  type O4oStandardProduct,
} from '../../api/o4oStandardProducts';
import { colors } from '../../styles/theme';

interface Props {
  open: boolean;
  onClose: () => void;
  /** 등록 성공 후 호출 — 매장 경영활용 제품 목록 갱신 */
  onRegistered: () => void;
}

const PAGE_LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 300;

/** 분류 필터 chip (code '' = 전체) — 백엔드 classificationToFilter 버킷과 정합 */
const CLASSIFICATION_CHIPS: { code: string; label: string }[] = [
  { code: '', label: '전체' },
  { code: 'otc', label: '일반의약품' },
  { code: 'rx', label: '전문의약품' },
  { code: 'quasi', label: '의약외품' },
  { code: 'health_functional', label: '건강기능식품' },
  { code: 'medical_device', label: '의료기기' },
  { code: 'cosmetic', label: '화장품' },
  { code: 'general', label: '일반·기타' },
];

/** 분류 배지 색상 (code → {배경, 글자}) */
const CLASSIFICATION_COLORS: Record<string, { bg: string; fg: string }> = {
  otc: { bg: '#DBEAFE', fg: '#1D4ED8' },
  rx: { bg: '#FEE2E2', fg: '#B91C1C' },
  drug: { bg: '#E0E7FF', fg: '#4338CA' },
  quasi: { bg: '#FEF3C7', fg: '#B45309' },
  health_functional: { bg: '#DCFCE7', fg: '#15803D' },
  medical_device: { bg: '#CFFAFE', fg: '#0E7490' },
  cosmetic: { bg: '#FCE7F3', fg: '#BE185D' },
  general: { bg: '#F1F5F9', fg: '#475569' },
  unknown: { bg: '#F1F5F9', fg: '#94A3B8' },
};

export function AddO4oStandardProductModal({ open, onClose, onRegistered }: Props) {
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [classification, setClassification] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<O4oStandardProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeringId, setRegisteringId] = useState<string | null>(null);
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  // 모달 열릴 때 초기화
  useEffect(() => {
    if (open) {
      setSearchInput('');
      setSearchQuery('');
      setClassification('');
      setPage(1);
      setRegisteredIds(new Set());
    }
  }, [open]);

  // 검색어 디바운스
  useEffect(() => {
    const h = setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(h);
  }, [searchInput]);

  // 검색 조회
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    searchO4oStandardProducts({ q: searchQuery || undefined, classification: classification || undefined, page, limit: PAGE_LIMIT })
      .then((r) => {
        if (cancelled) return;
        setItems(r.items);
        setTotal(r.meta.total);
      })
      .catch((e: any) => {
        if (!cancelled) setError(e?.message || 'O4O 표준 상품을 불러오지 못했습니다');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [open, searchQuery, classification, page]);

  const handleRegister = useCallback(async (p: O4oStandardProduct) => {
    setRegisteringId(p.id);
    try {
      const res = await registerStandardProductToStore(p.id);
      setRegisteredIds((prev) => new Set(prev).add(p.id));
      if (res.message === 'ALREADY_LISTED') {
        toast.info(`이미 매장 경영활용 제품에 등록된 상품입니다: ${p.name}`);
      } else {
        toast.success(`매장 경영활용 제품으로 등록되었습니다: ${p.name}`);
      }
      onRegistered();
    } catch (e: any) {
      if (e?.code === 'NO_ACTIVE_MEMBERSHIP') {
        toast.error('활성화된 매장 멤버십이 없어 등록할 수 없습니다.');
      } else {
        toast.error(e?.message || '등록에 실패했습니다');
      }
    } finally {
      setRegisteringId(null);
    }
  }, [onRegistered]);

  if (!open) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>O4O 표준 상품에서 추가</h2>
            <p style={styles.subtitle}>
              O4O 표준 상품 DB에서 제품을 검색하여 매장 경영활용 제품으로 등록합니다.
            </p>
          </div>
          <button onClick={onClose} style={styles.closeBtn} aria-label="닫기"><X size={18} /></button>
        </div>

        <div style={styles.searchWrap}>
          <Search size={15} style={styles.searchIcon} />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="제품명 / 제조사 / 바코드 검색"
            style={styles.searchInput}
            autoFocus
          />
        </div>

        <div style={styles.chipRow}>
          {CLASSIFICATION_CHIPS.map((chip) => {
            const active = classification === chip.code;
            return (
              <button
                key={chip.code || 'all'}
                type="button"
                onClick={() => { setClassification(chip.code); setPage(1); }}
                style={{ ...styles.chip, ...(active ? styles.chipActive : {}) }}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        <div style={styles.countRow}>
          <span style={styles.countBadge}>{total.toLocaleString()}건</span>
        </div>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, textAlign: 'left' }}>제품</th>
                <th style={styles.th}>제조사</th>
                <th style={styles.th}>바코드</th>
                <th style={styles.th}>분류</th>
                <th style={styles.th}>등록</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={styles.empty}><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> 불러오는 중…</td></tr>
              ) : error ? (
                <tr><td colSpan={5} style={{ ...styles.empty, color: '#DC2626' }}>{error}</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} style={styles.empty}>{searchQuery ? '검색 결과가 없습니다' : '표시할 O4O 표준 상품이 없습니다'}</td></tr>
              ) : (
                items.map((p) => {
                  const done = registeredIds.has(p.id);
                  const busy = registeringId === p.id;
                  return (
                    <tr key={p.id} style={styles.row}>
                      <td style={styles.tdProduct}>
                        <div style={styles.productCell}>
                          {p.primaryImageUrl ? (
                            <img src={p.primaryImageUrl} alt="" style={styles.thumb} />
                          ) : (
                            <div style={styles.thumbPlaceholder}><Package size={16} style={{ color: colors.neutral400 }} /></div>
                          )}
                          <div style={{ minWidth: 0 }}>
                            <div style={styles.productName} title={p.name}>{p.name}</div>
                            {p.regulatoryName && p.regulatoryName !== p.name && (
                              <div style={styles.productSub} title={p.regulatoryName}>{p.regulatoryName}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={styles.td}>{p.manufacturerName || '—'}</td>
                      <td style={styles.tdMono}>{p.barcode || '—'}</td>
                      <td style={styles.td}>
                        {p.classification ? (
                          <span
                            style={{
                              ...styles.classBadge,
                              background: (CLASSIFICATION_COLORS[p.classification.code] ?? CLASSIFICATION_COLORS.unknown).bg,
                              color: (CLASSIFICATION_COLORS[p.classification.code] ?? CLASSIFICATION_COLORS.unknown).fg,
                            }}
                            title={p.category?.name || undefined}
                          >
                            {p.classification.label}
                          </span>
                        ) : (
                          p.category?.name || '—'
                        )}
                      </td>
                      <td style={styles.td}>
                        {done ? (
                          <span style={styles.doneBadge}><Check size={13} /> 등록됨</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRegister(p)}
                            disabled={busy}
                            style={{ ...styles.addBtn, ...(busy ? styles.addBtnBusy : {}) }}
                          >
                            {busy ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={13} />}
                            등록
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={total} />

        <p style={styles.footnote}>
          ※ 등록한 상품은 <b>매장 경영활용 제품</b>(O4O 기반 제품)으로 추가되어 이 화면 목록에 표시됩니다.
          가격·진열·콘텐츠 등 세부 설정은 등록 후 각 관리 화면에서 진행합니다.
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, padding: '40px 16px', overflowY: 'auto' },
  modal: { background: colors.white, borderRadius: '12px', width: '100%', maxWidth: '820px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', padding: '20px 22px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' },
  title: { fontSize: '17px', fontWeight: 600, color: colors.neutral800, margin: 0 },
  subtitle: { fontSize: '13px', color: colors.neutral500, margin: '4px 0 0' },
  closeBtn: { border: 'none', background: 'transparent', cursor: 'pointer', color: colors.neutral500, padding: '4px' },
  searchWrap: { position: 'relative', marginBottom: '10px' },
  searchIcon: { position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: colors.neutral400, pointerEvents: 'none' },
  searchInput: { width: '100%', padding: '10px 14px 10px 34px', border: `1px solid ${colors.neutral300}`, borderRadius: '8px', fontSize: '14px', outline: 'none', background: colors.white, boxSizing: 'border-box' },
  chipRow: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' },
  chip: { padding: '5px 12px', border: `1px solid ${colors.neutral300}`, borderRadius: '999px', background: colors.white, fontSize: '12px', fontWeight: 500, color: colors.neutral600, cursor: 'pointer', whiteSpace: 'nowrap' },
  chipActive: { background: colors.primary, borderColor: colors.primary, color: colors.white },
  classBadge: { display: 'inline-block', padding: '3px 9px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' },
  countRow: { marginBottom: '8px' },
  countBadge: { display: 'inline-flex', alignItems: 'center', padding: '2px 8px', fontSize: '12px', fontWeight: 500, color: colors.neutral600, background: colors.neutral100, borderRadius: '999px' },
  tableWrap: { overflowX: 'auto', border: `1px solid ${colors.neutral200}`, borderRadius: '8px', maxHeight: '52vh', overflowY: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { padding: '9px 12px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: colors.neutral500, background: '#F8FAFC', borderBottom: `1px solid ${colors.neutral200}`, whiteSpace: 'nowrap', position: 'sticky', top: 0 },
  row: { borderBottom: `1px solid ${colors.neutral100}` },
  td: { padding: '9px 12px', textAlign: 'center', color: colors.neutral700, whiteSpace: 'nowrap' },
  tdMono: { padding: '9px 12px', textAlign: 'center', color: colors.neutral500, fontSize: '12px', fontFamily: 'monospace', whiteSpace: 'nowrap' },
  tdProduct: { padding: '9px 12px', textAlign: 'left', minWidth: '260px' },
  productCell: { display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 },
  thumb: { width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover', border: `1px solid ${colors.neutral200}`, flexShrink: 0 },
  thumbPlaceholder: { width: '36px', height: '36px', borderRadius: '6px', background: colors.neutral100, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  productName: { fontSize: '14px', fontWeight: 500, color: colors.neutral800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '340px' },
  productSub: { fontSize: '12px', color: colors.neutral400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '340px' },
  addBtn: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 12px', background: colors.primary, border: `1px solid ${colors.primary}`, borderRadius: '6px', fontSize: '12px', fontWeight: 500, color: colors.white, cursor: 'pointer' },
  addBtnBusy: { opacity: 0.6, cursor: 'default' },
  doneBadge: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 10px', fontSize: '12px', fontWeight: 500, color: '#16A34A', background: '#DCFCE7', borderRadius: '6px' },
  empty: { padding: '40px 12px', textAlign: 'center', color: colors.neutral400, fontSize: '13px' },
  footnote: { marginTop: '12px', fontSize: '12px', color: colors.neutral500, lineHeight: 1.6, padding: '10px 12px', background: colors.neutral100, borderRadius: '6px' },
};
