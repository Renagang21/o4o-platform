/**
 * AddO4oStandardProductModal — O4O 표준 상품(ProductMaster)에서 검색·선택·등록
 *
 * WO-O4O-STORE-HANDLED-PRODUCTS-PRODUCTMASTER-LIST-LINK-V1
 *
 * 매장 경영자가 O4O 표준 상품 DB를 검색하여, 선택한 상품을 매장 경영활용 제품
 * (O4O 기반 제품 listing)으로 등록한다. 검색=GET /store/products/search,
 * 등록=POST /store/products/list(master 기반, idempotent). 백엔드 변경 없음.
 */

import { type CSSProperties } from 'react';
import { X, Search, Loader2, Package, Plus, Check } from 'lucide-react';
import { Pagination } from '@o4o/operator-ux-core';
import {
  buildProductVariantLabel,
} from '../../api/o4oStandardProducts';
import { colors } from '../../styles/theme';

import { useStandardProductSelection } from './productRegistration/useStandardProductSelection';
import { StoreProductDialog, useStoreProductScope } from '../../components/store/StoreProductSession';

interface Props {
  open: boolean;
  onClose: () => void;
  /** 등록 성공 후 호출 — 매장 경영활용 제품 목록 갱신 */
  onRegistered: () => void;
}

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

export function AddO4oStandardProductModal(props: Props) {
  const scope = useStoreProductScope();
  if (!props.open || !scope.ready) return null;
  return <StandardProductSelection key={scope.key} {...props} organizationId={scope.organizationId!} />;
}
function StandardProductSelection({ onClose, onRegistered, organizationId }: Props & { organizationId: string }) {
  const state = useStandardProductSelection(organizationId, onRegistered);
  const { searchInput, setSearchInput, classification, setClassification, page, setPage,
    items, total, loading, error, registeringId, registeredIds, handleRegister, totalPages } = state;

  return (
    <StoreProductDialog style={styles.overlay} label="O4O 표준 상품에서 추가" preventBackdropClose={registeringId !== null} onClose={onClose}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>O4O 표준 상품에서 추가</h2>
            <p style={styles.subtitle}>
              O4O 표준 상품 DB에서 제품을 검색하여 매장 경영활용 제품으로 등록합니다.
            </p>
          </div>
          <button onClick={onClose} style={styles.closeBtn} aria-label="닫기"><X size={18} /></button>
        </div>

        {state.actionError && <p role="alert" className="mb-3 rounded bg-red-50 p-3 text-sm text-red-700">{state.actionError}</p>}
        <fieldset disabled={registeringId !== null} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <div style={styles.searchWrap}>
          <Search size={15} style={styles.searchIcon} />
          <input
            aria-label="표준 상품 검색"
            data-request-autofocus
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="제품명 / 제조사 / 바코드 검색"
            style={styles.searchInput}
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

        <p className="mb-2 text-xs text-slate-500 md:hidden">표를 좌우로 이동하면 추가 버튼을 확인할 수 있습니다.</p>
        <div style={styles.tableWrap} role="region" aria-label="표준 상품 목록, 좌우로 이동 가능" tabIndex={0}>
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
                <tr><td role="alert" colSpan={5} style={{ ...styles.empty, color: '#DC2626' }}>{error} <button type="button" onClick={state.retry}>다시 시도</button></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} style={styles.empty}>{searchInput.trim() ? '검색 결과가 없습니다' : '표시할 O4O 표준 상품이 없습니다'}</td></tr>
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
                            {/* WO-...-SKU-DISTINGUISHABILITY-V1: 동일 상품명 구분용 보조정보(규격·제형·포장). 있을 때만. */}
                            {(() => {
                              const variant = buildProductVariantLabel(p);
                              return variant ? (
                                <div style={styles.productVariant} title={p.specification ?? undefined}>{variant}</div>
                              ) : null;
                            })()}
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

        <div className="[&>div]:flex-wrap"><Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={total} /></div>

        <p style={styles.footnote}>
          ※ 등록한 상품은 <b>매장 경영활용 제품</b>(O4O 기반 제품)으로 추가되어 이 화면 목록에 표시됩니다.
          가격·진열·콘텐츠 등 세부 설정은 등록 후 각 관리 화면에서 진행합니다.
        </p>
        </fieldset>
      </div>
    </StoreProductDialog>
  );
}

const styles: Record<string, CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, padding: '40px 16px', overflowY: 'auto' },
  modal: { minWidth: 0, background: colors.white, borderRadius: '12px', width: '100%', maxWidth: '820px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', padding: '20px 22px' },
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
  // WO-...-SKU-DISTINGUISHABILITY-V1: 상품명 아래 SKU 구분정보(규격·제형·포장). 상품명보다 작고 보조적이되 너무 흐리지 않게(neutral600).
  //   작은 화면에서 전체가 보이도록 말줄임 대신 자연 줄바꿈(spec 문자열이 짧아 데스크톱은 사실상 1줄).
  productVariant: { fontSize: '12px', color: colors.neutral600, maxWidth: '340px', marginTop: '1px', lineHeight: 1.35, wordBreak: 'keep-all' },
  productSub: { fontSize: '11px', color: colors.neutral400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '340px' },
  addBtn: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 12px', background: colors.primary, border: `1px solid ${colors.primary}`, borderRadius: '6px', fontSize: '12px', fontWeight: 500, color: colors.white, cursor: 'pointer' },
  addBtnBusy: { opacity: 0.6, cursor: 'default' },
  doneBadge: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 10px', fontSize: '12px', fontWeight: 500, color: '#16A34A', background: '#DCFCE7', borderRadius: '6px' },
  empty: { padding: '40px 12px', textAlign: 'center', color: colors.neutral400, fontSize: '13px' },
  footnote: { marginTop: '12px', fontSize: '12px', color: colors.neutral500, lineHeight: 1.6, padding: '10px 12px', background: colors.neutral100, borderRadius: '6px' },
};
