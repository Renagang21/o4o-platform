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

import { useEffect, useState, useCallback, type CSSProperties, type ReactNode } from 'react';
import { X, Search, Loader2, Package, Plus, Send, ImagePlus, Trash2 } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { colors } from '../../styles/theme';
import { searchO4oStandardProducts, registerStandardProductToStore, type O4oStandardProduct } from '../../api/o4oStandardProducts';
import {
  submitProductRequest,
  resubmitProductRequest,
  type StoreProductRequest,
  type StoreProductRequestInput,
  type StoreRequestApiError,
} from '../../api/storeProductRequests';
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

interface FormState {
  productName: string;
  classification: string;
  barcode: string;
  noBarcode: boolean;
  manufacturer: string;
  spec: string;
  unit: string;
  imageUrl: string;
}

const EMPTY_FORM: FormState = {
  productName: '',
  classification: '',
  barcode: '',
  noBarcode: false,
  manufacturer: '',
  spec: '',
  unit: '',
  imageUrl: '',
};

export function StoreNewProductRequestModal({ open, onClose, onSubmitted, editRequest, onAddExisting }: Props) {
  const isEdit = !!editRequest;
  const [step, setStep] = useState<'search' | 'form'>(isEdit ? 'form' : 'search');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  // 중복검색 상태
  const [searchInput, setSearchInput] = useState('');
  const [searched, setSearched] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<O4oStandardProduct[]>([]);
  const [registeringId, setRegisteringId] = useState<string | null>(null);

  // 열릴 때 초기화 (신규/편집 분기)
  useEffect(() => {
    if (!open) return;
    if (editRequest) {
      setStep('form');
      setForm({
        productName: editRequest.productName ?? '',
        classification: editRequest.classification?.code ?? '',
        barcode: editRequest.barcode ?? '',
        noBarcode: editRequest.noBarcode,
        manufacturer: editRequest.manufacturer ?? '',
        spec: editRequest.spec ?? '',
        unit: editRequest.unit ?? '',
        imageUrl: editRequest.imageUrl ?? '',
      });
    } else {
      setStep('search');
      setForm(EMPTY_FORM);
    }
    setSearchInput('');
    setSearched(false);
    setSearchResults([]);
    setSubmitting(false);
  }, [open, editRequest]);

  const patch = useCallback((p: Partial<FormState>) => setForm((f) => ({ ...f, ...p })), []);

  const runSearch = useCallback(async () => {
    const q = searchInput.trim();
    if (!q) {
      toast.info('상품명 또는 바코드를 입력하세요.');
      return;
    }
    setSearchLoading(true);
    setSearched(true);
    try {
      const r = await searchO4oStandardProducts({ q, page: 1, limit: 20 });
      setSearchResults(r.items);
    } catch (e: any) {
      toast.error(e?.message || '검색에 실패했습니다');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [searchInput]);

  // 검색 결과의 기존 상품을 매장 경영활용 제품으로 추가
  const handleRegisterExisting = useCallback(async (p: O4oStandardProduct) => {
    setRegisteringId(p.id);
    try {
      const res = await registerStandardProductToStore(p.id);
      if (res.message === 'ALREADY_LISTED') {
        toast.info(`이미 매장 경영활용 제품에 등록된 상품입니다: ${p.name}`);
      } else {
        toast.success(`매장 경영활용 제품으로 추가했습니다: ${p.name}`);
      }
      onSubmitted();
      onClose();
    } catch (e: any) {
      if (e?.code === 'NO_ACTIVE_MEMBERSHIP') {
        toast.error('활성화된 매장 멤버십이 없어 추가할 수 없습니다.');
      } else {
        toast.error(e?.message || '추가에 실패했습니다');
      }
    } finally {
      setRegisteringId(null);
    }
  }, [onSubmitted, onClose]);

  // 신규 등록 요청 폼으로 전환 (검색어를 상품명/바코드에 프리필)
  const goToForm = useCallback(() => {
    const q = searchInput.trim();
    // 숫자로만 이뤄진 검색어는 바코드로 추정하여 프리필
    const looksBarcode = /^\d{6,14}$/.test(q);
    setForm((f) => ({
      ...f,
      productName: looksBarcode ? f.productName : (f.productName || q),
      barcode: looksBarcode ? q : f.barcode,
    }));
    setStep('form');
  }, [searchInput]);

  const handleSubmit = useCallback(async () => {
    const productName = form.productName.trim();
    if (!productName) { toast.info('포장 표시 상품명을 입력하세요.'); return; }
    if (!form.classification) { toast.info('O4O 표준 분류를 선택하세요.'); return; }
    const barcode = form.barcode.trim();
    if (!barcode && !form.noBarcode) { toast.info('바코드를 입력하거나 ‘바코드 없음’을 선택하세요.'); return; }

    const input: StoreProductRequestInput = {
      productName,
      classification: form.classification,
      barcode: barcode || undefined,
      noBarcode: barcode ? false : form.noBarcode,
      manufacturer: form.manufacturer.trim() || undefined,
      spec: form.spec.trim() || undefined,
      unit: form.unit.trim() || undefined,
      imageUrl: form.imageUrl || undefined,
    };

    setSubmitting(true);
    try {
      if (isEdit && editRequest) {
        await resubmitProductRequest(editRequest.id, input);
        toast.success('보완 내용을 반영해 다시 제출했습니다.');
      } else {
        await submitProductRequest(input);
        toast.success('신규 상품 등록 요청을 제출했습니다. 검토 결과는 요청 목록에서 확인할 수 있습니다.');
      }
      onSubmitted();
      onClose();
    } catch (e: any) {
      const err = e as StoreRequestApiError;
      if (err?.code === 'EXISTING_PRODUCT_FOUND') {
        toast.info('이미 O4O 표준 상품에 등록된 바코드입니다. 기존 상품 추가로 전환하세요.');
        if (onAddExisting) { onClose(); onAddExisting(); }
      } else {
        toast.error(err?.message || '요청 제출에 실패했습니다');
      }
    } finally {
      setSubmitting(false);
    }
  }, [form, isEdit, editRequest, onSubmitted, onClose, onAddExisting]);

  if (!open) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
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

        {step === 'search' ? (
          <>
            <div style={styles.searchRow}>
              <div style={styles.searchWrap}>
                <Search size={15} style={styles.searchIcon} />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') runSearch(); }}
                  placeholder="상품명 또는 바코드로 검색"
                  style={styles.searchInput}
                  autoFocus
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
                  value={form.productName}
                  onChange={(e) => patch({ productName: e.target.value })}
                  placeholder="포장에 표기된 상품명"
                  style={styles.input}
                  maxLength={255}
                  autoFocus
                />
              </Field>

              <Field label="O4O 표준 분류" required>
                <select
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
      </div>

      <MediaPickerModal
        open={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={(asset) => { patch({ imageUrl: asset.url }); setShowMediaPicker(false); }}
        title="상품 이미지 선택"
      />
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>
        {label}
        {required && <span style={styles.req}> *</span>}
      </label>
      {children}
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
  searchWrap: { position: 'relative', flex: 1 },
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
  searchFooter: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', paddingTop: '12px', borderTop: `1px solid ${colors.neutral200}` },
  footerNote: { fontSize: '13px', color: colors.neutral500 },

  // form step
  formBody: { display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '58vh', overflowY: 'auto', paddingRight: '4px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
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
  formFooter: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', paddingTop: '14px', borderTop: `1px solid ${colors.neutral200}` },
  backBtn: { padding: '8px 12px', background: colors.white, border: `1px solid ${colors.neutral300}`, borderRadius: '8px', fontSize: '13px', color: colors.neutral600, cursor: 'pointer' },
  cancelBtn: { padding: '8px 14px', background: colors.white, border: `1px solid ${colors.neutral300}`, borderRadius: '8px', fontSize: '13px', color: colors.neutral700, cursor: 'pointer' },
  primaryBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: colors.primary, border: `1px solid ${colors.primary}`, borderRadius: '8px', fontSize: '13px', fontWeight: 500, color: colors.white, cursor: 'pointer' },
};
