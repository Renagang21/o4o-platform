/**
 * StoreNewProductRequestModal — 매장 신규 상품 등록 요청 (P1)
 *
 * WO-O4O-KPA-STORE-NEW-PRODUCT-REQUEST-AND-ADMIN-APPROVAL-V1 (Phase 1)
 * 설계: docs/investigations/IR-O4O-KPA-STORE-NEW-PRODUCT-REQUEST-AND-ADMIN-APPROVAL-V1.md §7
 *
 * 신규 모드: 1단계 중복검색(상품명/바코드) → 기존 상품 있으면 "기존 상품 추가"로 전환 /
 *            없으면 요청 폼(상품명·분류·바코드·제조사·규격/용량·이미지(선택)).
 * 편집 모드: 보완 요청(revision_requested) 건을 수정 후 재제출.
 *
 * 상세설명서·허가번호·가격·재고·배송 입력란 없음(WO 요구).
 */

import { useId, useState, type CSSProperties, type ReactNode } from 'react';
import { X, Search, Loader2, Package, Plus, Send, ImagePlus, Trash2 } from 'lucide-react';
import { colors } from '../../styles/theme';
import type { StoreProductRequest } from '../../api/storeProductRequests';
import { useProductRequestForm } from './productRequests/useProductRequestForm';
import { ProductRequestDialog, useProductRequestScope } from './productRequests/requestSession';
import MediaPickerModal from '../../components/common/MediaPickerModal';

/** O4O 표준 분류 선택지 (자유입력 금지 — 백엔드 PRODUCT_CLASSIFICATION_CODES 정합) */
const CLASSIFICATION_OPTIONS: { code: string; label: string }[] = [
  { code: 'general', label: '일반·기타' },
  { code: 'health_functional', label: '건강기능식품' },
  { code: 'quasi', label: '의약외품' },
  { code: 'cosmetic', label: '화장품' },
  { code: 'medical_device', label: '의료기기' },
  { code: 'otc', label: '일반의약품' },
  { code: 'rx', label: '전문의약품' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  /** 제출/재제출 성공 후 호출 — 목록 갱신 */
  onSubmitted: () => void;
  /** 편집(재제출) 대상. null/undefined 이면 신규 요청 모드. */
  editRequest?: StoreProductRequest | null;
  /** "기존 상품 추가"로 전환 요청 (신규 모드에서 기존 상품 발견 시) */
  onAddExisting?: () => void;
}

export function StoreNewProductRequestModal(props: Props) {
  const scope = useProductRequestScope();
  if (!props.open || !scope.ready) return null;
  return <ProductRequestForm key={`${scope.key}:${props.editRequest?.id ?? 'new'}`}
    {...props} organizationId={scope.organizationId!} />;
}

function ProductRequestForm({ onClose, onSubmitted, editRequest, onAddExisting, organizationId }: Props & { organizationId: string }) {
  const isEdit = !!editRequest;
  const state = useProductRequestForm({ organizationId, editRequest, onSubmitted, onClose });
  const { step, setStep, form, patch, searchInput, setSearchInput, searched, searchLoading, searchResults,
    runSearch, goToForm, registeringId, handleRegisterExisting, submitting, handleSubmit } = state;
  const busy = submitting || registeringId !== null;
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  return (
    <ProductRequestDialog preventBackdropClose={busy} focusKey={step} style={styles.overlay} label={isEdit ? '등록 요청 보완 · 재제출' : '신규 상품 등록 요청'} onClose={() => showMediaPicker ? setShowMediaPicker(false) : onClose()}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>{isEdit ? '등록 요청 보완 · 재제출' : '신규 상품 등록 요청'}</h2>
            <p style={styles.subtitle}>
              {isEdit
                ? '관리자 보완 요청 내용을 반영해 요청을 수정한 뒤 다시 제출합니다.'
                : 'O4O 표준 상품 DB에 없는 상품의 등록을 요청합니다. 먼저 기존 상품이 있는지 검색하세요.'}
            </p>
          </div>
          <button onClick={onClose} style={styles.closeBtn} aria-label="닫기"><X size={18} /></button>
        </div>

        {state.actionError && <div role="alert" className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {state.actionError}
          {state.existingFound && onAddExisting && <button type="button" className="ml-2 underline" onClick={() => { onClose(); onAddExisting(); }}>기존 상품 추가로 이동</button>}
        </div>}
        {busy && <p role="status">처리 중입니다. 결과를 확인할 때까지 기다려 주세요.</p>}
        <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        {step === 'search' ? (
          <>
            <div style={styles.searchRow}>
              <div style={styles.searchWrap}>
                <Search size={15} style={styles.searchIcon} />
                <input
                  aria-label="상품명 또는 바코드 검색"
                  data-request-autofocus
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') runSearch(); }}
                  placeholder="상품명 또는 바코드로 검색"
                  style={styles.searchInput}
                />
              </div>
              <button onClick={runSearch} disabled={searchLoading} style={styles.searchBtn}>
                {searchLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={14} />}
                검색
              </button>
            </div>

            <div style={styles.searchBody}>
              {!searched ? (
                <div style={styles.hint}>
                  등록하려는 상품이 이미 O4O 표준 상품에 있으면 신규 요청 없이 바로 매장에 추가할 수 있습니다.
                </div>
              ) : searchLoading ? (
                <div style={styles.empty}><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> 검색 중…</div>
              ) : state.searchError ? (
                <div role="alert" style={styles.empty}>{state.searchError} <button type="button" onClick={() => void runSearch()}>다시 검색</button></div>
              ) : searchResults.length === 0 ? (
                <div style={styles.empty}>검색 결과가 없습니다. 아래에서 신규 등록을 요청하세요.</div>
              ) : (
                <div style={styles.resultList}>
                  {searchResults.map((p) => {
                    const busy = registeringId === p.id;
                    return (
                      <div key={p.id} style={styles.resultRow}>
                        {p.primaryImageUrl ? (
                          <img src={p.primaryImageUrl} alt="" style={styles.thumb} />
                        ) : (
                          <div style={styles.thumbPlaceholder}><Package size={16} style={{ color: colors.neutral400 }} /></div>
                        )}
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={styles.resultName} title={p.name}>{p.name}</div>
                          <div style={styles.resultSub}>
                            {p.manufacturerName || '제조사 미상'}{p.barcode ? ` · ${p.barcode}` : ''}
                            {p.classification ? ` · ${p.classification.label}` : ''}
                          </div>
                        </div>
                        <button onClick={() => handleRegisterExisting(p)} disabled={busy} style={styles.addExistingBtn}>
                          {busy ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={13} />}
                          매장에 추가
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={styles.searchFooter}>
              <span style={styles.footerNote}>찾는 상품이 없나요?</span>
              <button onClick={goToForm} style={styles.primaryBtn}>
                <Plus size={14} /> 신규 등록 요청 작성
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={styles.formBody}>
              <Field label="포장 표시 상품명" required>
                <input
                  type="text"
                  aria-label="포장 표시 상품명"
                  data-request-autofocus
                  value={form.productName}
                  onChange={(e) => patch({ productName: e.target.value })}
                  placeholder="포장에 표기된 상품명"
                  style={styles.input}
                  maxLength={255}
                />
              </Field>

              <Field label="O4O 표준 분류" required>
                <select
                  aria-label="O4O 표준 분류"
                  value={form.classification}
                  onChange={(e) => patch({ classification: e.target.value })}
                  style={styles.input}
                >
                  <option value="">분류 선택…</option>
                  {CLASSIFICATION_OPTIONS.map((o) => (
                    <option key={o.code} value={o.code}>{o.label}</option>
                  ))}
                </select>
              </Field>

              <Field label="바코드">
                <div style={styles.barcodeRow}>
                  <input
                    type="text"
                    aria-label="바코드"
                    value={form.barcode}
                    onChange={(e) => patch({ barcode: e.target.value })}
                    placeholder="숫자 바코드"
                    style={{ ...styles.input, flex: 1, ...(form.noBarcode ? styles.inputDisabled : {}) }}
                    disabled={form.noBarcode}
                    inputMode="numeric"
                  />
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={form.noBarcode}
                      onChange={(e) => patch({ noBarcode: e.target.checked, barcode: e.target.checked ? '' : form.barcode })}
                      style={styles.checkbox}
                    />
                    바코드 없음
                  </label>
                </div>
              </Field>

              <Field label="제조사 또는 판매원">
                <input
                  type="text"
                  aria-label="제조사 또는 판매원"
                  value={form.manufacturer}
                  onChange={(e) => patch({ manufacturer: e.target.value })}
                  placeholder="제조사/판매원명"
                  style={styles.input}
                  maxLength={255}
                />
              </Field>

              <div style={styles.twoCol}>
                <Field label="규격·용량">
                  <input
                    type="text"
                    aria-label="규격·용량"
                    value={form.spec}
                    onChange={(e) => patch({ spec: e.target.value })}
                    placeholder="예: 500"
                    style={styles.input}
                    maxLength={255}
                  />
                </Field>
                <Field label="단위">
                  <input
                    type="text"
                    aria-label="단위"
                    value={form.unit}
                    onChange={(e) => patch({ unit: e.target.value })}
                    placeholder="예: ml, 정, g"
                    style={styles.input}
                    maxLength={64}
                  />
                </Field>
              </div>

              <Field label="썸네일 / 포장 이미지 (선택)">
                {form.imageUrl ? (
                  <div style={styles.imagePreview}>
                    <img src={form.imageUrl} alt="" style={styles.previewImg} />
                    <button type="button" onClick={() => patch({ imageUrl: '' })} style={styles.removeImgBtn}>
                      <Trash2 size={13} /> 제거
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setShowMediaPicker(true)} style={styles.imagePickBtn}>
                    <ImagePlus size={16} /> 이미지 불러오기
                  </button>
                )}
              </Field>

              <p style={styles.formNote}>
                ※ 상세설명서·허가번호·가격·재고·배송 정보는 이 단계에서 받지 않습니다. 등록 완료 후 각 관리 화면에서 진행합니다.
              </p>
            </div>

            <div style={styles.formFooter}>
              {!isEdit && (
                <button onClick={() => setStep('search')} style={styles.backBtn} disabled={submitting}>
                  ← 검색으로
                </button>
              )}
              <div style={{ flex: 1 }} />
              <button onClick={onClose} style={styles.cancelBtn} disabled={submitting}>취소</button>
              <button onClick={handleSubmit} style={styles.primaryBtn} disabled={submitting}>
                {submitting ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
                {isEdit ? '재제출' : '등록 요청 제출'}
              </button>
            </div>
          </>
        )}
        </fieldset>
      </div>

      <MediaPickerModal
        open={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={(asset) => { patch({ imageUrl: asset.url }); setShowMediaPicker(false); }}
        title="상품 이미지 선택"
      />
    </ProductRequestDialog>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  const id = useId();
  return (
    <div style={styles.field}>
      <span id={`${id}-label`} style={styles.label}>
        {label}
        {required && <span style={styles.req}> *</span>}
      </span>
      <div role="group" aria-labelledby={`${id}-label`}>{children}</div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, padding: '40px 16px', overflowY: 'auto' },
  modal: { background: colors.white, borderRadius: '12px', width: '100%', maxWidth: '640px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', padding: '20px 22px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' },
  title: { fontSize: '17px', fontWeight: 600, color: colors.neutral800, margin: 0 },
  subtitle: { fontSize: '13px', color: colors.neutral500, margin: '4px 0 0', lineHeight: 1.5 },
  closeBtn: { border: 'none', background: 'transparent', cursor: 'pointer', color: colors.neutral500, padding: '4px' },

  // search step
  searchRow: { display: 'flex', gap: '8px', marginBottom: '12px' },
  searchWrap: { minWidth: 0, position: 'relative', flex: 1 },
  searchIcon: { position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: colors.neutral400, pointerEvents: 'none' },
  searchInput: { width: '100%', padding: '10px 14px 10px 34px', border: `1px solid ${colors.neutral300}`, borderRadius: '8px', fontSize: '14px', outline: 'none', background: colors.white, boxSizing: 'border-box' },
  searchBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0 16px', background: colors.primary, border: `1px solid ${colors.primary}`, borderRadius: '8px', fontSize: '13px', fontWeight: 500, color: colors.white, cursor: 'pointer', whiteSpace: 'nowrap' },
  searchBody: { minHeight: '120px', maxHeight: '46vh', overflowY: 'auto', marginBottom: '12px' },
  hint: { padding: '20px 14px', textAlign: 'center', color: colors.neutral500, fontSize: '13px', background: colors.neutral100, borderRadius: '8px', lineHeight: 1.6 },
  empty: { padding: '32px 12px', textAlign: 'center', color: colors.neutral400, fontSize: '13px' },
  resultList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  resultRow: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', border: `1px solid ${colors.neutral200}`, borderRadius: '8px' },
  thumb: { width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover', border: `1px solid ${colors.neutral200}`, flexShrink: 0 },
  thumbPlaceholder: { width: '40px', height: '40px', borderRadius: '6px', background: colors.neutral100, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  resultName: { fontSize: '14px', fontWeight: 500, color: colors.neutral800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  resultSub: { fontSize: '12px', color: colors.neutral400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' },
  addExistingBtn: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '6px', fontSize: '12px', fontWeight: 500, color: '#15803D', cursor: 'pointer', whiteSpace: 'nowrap' },
  searchFooter: { flexWrap: 'wrap', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', paddingTop: '12px', borderTop: `1px solid ${colors.neutral200}` },
  footerNote: { fontSize: '13px', color: colors.neutral500 },

  // form step
  formBody: { display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '58vh', overflowY: 'auto', paddingRight: '4px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  twoCol: { minWidth: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  label: { fontSize: '13px', fontWeight: 500, color: colors.neutral700 },
  req: { color: '#DC2626' },
  input: { width: '100%', padding: '9px 12px', border: `1px solid ${colors.neutral300}`, borderRadius: '8px', fontSize: '14px', outline: 'none', background: colors.white, boxSizing: 'border-box' },
  inputDisabled: { background: colors.neutral100, color: colors.neutral400 },
  barcodeRow: { display: 'flex', alignItems: 'center', gap: '12px' },
  checkboxLabel: { display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: colors.neutral600, cursor: 'pointer', whiteSpace: 'nowrap' },
  checkbox: { width: 15, height: 15, cursor: 'pointer', accentColor: colors.primary },
  imagePickBtn: { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 16px', width: '100%', justifyContent: 'center', border: `1px dashed ${colors.neutral300}`, borderRadius: '8px', background: colors.neutral50, fontSize: '13px', color: colors.neutral600, cursor: 'pointer' },
  imagePreview: { display: 'flex', alignItems: 'center', gap: '12px' },
  previewImg: { width: '64px', height: '64px', borderRadius: '8px', objectFit: 'cover', border: `1px solid ${colors.neutral200}` },
  removeImgBtn: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '6px', fontSize: '12px', color: '#DC2626', cursor: 'pointer' },
  formNote: { fontSize: '12px', color: colors.neutral500, lineHeight: 1.6, padding: '10px 12px', background: colors.neutral100, borderRadius: '6px', margin: 0 },
  formFooter: { flexWrap: 'wrap', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', paddingTop: '14px', borderTop: `1px solid ${colors.neutral200}` },
  backBtn: { padding: '8px 12px', background: colors.white, border: `1px solid ${colors.neutral300}`, borderRadius: '8px', fontSize: '13px', color: colors.neutral600, cursor: 'pointer' },
  cancelBtn: { padding: '8px 14px', background: colors.white, border: `1px solid ${colors.neutral300}`, borderRadius: '8px', fontSize: '13px', color: colors.neutral700, cursor: 'pointer' },
  primaryBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: colors.primary, border: `1px solid ${colors.primary}`, borderRadius: '8px', fontSize: '13px', fontWeight: 500, color: colors.white, cursor: 'pointer' },
};
