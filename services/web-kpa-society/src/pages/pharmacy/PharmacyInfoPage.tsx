/**
 * PharmacyInfoPage — 약국 정보 조회/수정
 *
 * WO-KPA-PHARMACY-INFO-EDIT-FLOW-V1
 *
 * Store 사이드바 "약국 정보" 메뉴에서 진입.
 * organizations 테이블을 SSOT로 사용.
 * View/Edit 모드 전환 지원.
 */

import { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { colors, shadows, borderRadius } from '../../styles/theme';
import {
  getPharmacyInfo,
  updatePharmacyInfo,
  type PharmacyInfoData,
  type StoreAddress,
} from '../../api/pharmacyInfo';

type LoadState = 'loading' | 'loaded' | 'error';

interface FormState {
  name: string;
  phone: string;
  ownerPhone: string;
  taxInvoiceEmail: string;
  zipCode: string;
  baseAddress: string;
  detailAddress: string;
}

function dataToForm(data: PharmacyInfoData): FormState {
  return {
    name: data.name || '',
    phone: data.phone || '',
    ownerPhone: data.ownerPhone || '',
    taxInvoiceEmail: data.taxInvoiceEmail || '',
    zipCode: data.addressDetail?.zipCode || '',
    baseAddress: data.addressDetail?.baseAddress || '',
    detailAddress: data.addressDetail?.detailAddress || '',
  };
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

function composeDisplayAddress(detail: StoreAddress | null): string {
  if (!detail?.baseAddress) return '-';
  const parts = [];
  if (detail.zipCode) parts.push(`(${detail.zipCode})`);
  parts.push(detail.baseAddress);
  if (detail.detailAddress) parts.push(detail.detailAddress);
  return parts.join(' ');
}

export function PharmacyInfoPage() {
  const [data, setData] = useState<PharmacyInfoData | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [isEditMode, setIsEditMode] = useState(false);
  const [form, setForm] = useState<FormState>({ name: '', phone: '', ownerPhone: '', taxInvoiceEmail: '', zipCode: '', baseAddress: '', detailAddress: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = useCallback(async () => {
    try {
      const result = await getPharmacyInfo();
      setData(result);
      setLoadState('loaded');
    } catch {
      setLoadState('error');
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const enterEditMode = () => {
    if (!data) return;
    setForm(dataToForm(data));
    setErrors([]);
    setSuccessMsg('');
    setIsEditMode(true);
  };

  const cancelEdit = () => {
    setIsEditMode(false);
    setErrors([]);
  };

  const updateField = (field: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const validate = (): string[] => {
    const errs: string[] = [];
    if (!form.name.trim() || form.name.trim().length < 2) {
      errs.push('약국명은 2자 이상 입력해 주세요.');
    }
    if (form.taxInvoiceEmail && !/^\S+@\S+\.\S+$/.test(form.taxInvoiceEmail)) {
      errs.push('세금계산서 이메일 형식이 올바르지 않습니다.');
    }
    if (form.baseAddress && form.baseAddress.trim().length === 0) {
      errs.push('기본주소를 입력해 주세요.');
    }
    return errs;
  };

  const handleSave = async () => {
    const validationErrors = validate();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors([]);
    setIsSaving(true);

    try {
      const addressDetail: StoreAddress | undefined =
        form.baseAddress.trim()
          ? { zipCode: form.zipCode || undefined, baseAddress: form.baseAddress.trim(), detailAddress: form.detailAddress.trim() || undefined }
          : undefined;

      await updatePharmacyInfo({
        name: form.name.trim(),
        phone: digitsOnly(form.phone) || undefined,
        ownerPhone: digitsOnly(form.ownerPhone) || undefined,
        taxInvoiceEmail: form.taxInvoiceEmail.trim() || undefined,
        addressDetail,
      });

      await loadData();
      setIsEditMode(false);
      setSuccessMsg('약국 정보가 저장되었습니다.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setErrors(['저장에 실패했습니다. 다시 시도해 주세요.']);
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Loading / Error states ───
  if (loadState === 'loading') {
    return (
      <div style={styles.container}>
        <div style={styles.loadingBox}>
          <p style={styles.loadingText}>약국 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // WO-KPA-PHARMACY-OWNER-WITHOUT-STORE-HANDLING-V1: 데이터 없음 → 게이트로 리다이렉트
  if (loadState === 'error' || !data) {
    return <Navigate to="/pharmacy" replace />;
  }

  // ─── View / Edit Mode ───
  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.pageTitle}>약국 정보</h1>
        <p style={styles.pageDesc}>약국 기본 정보를 확인하고 수정할 수 있습니다.</p>
      </header>

      {successMsg && (
        <div style={styles.successBox}>
          <span>{successMsg}</span>
        </div>
      )}

      {errors.length > 0 && (
        <div style={styles.errorMsgBox}>
          {errors.map((e, i) => <p key={i} style={styles.errorMsgText}>{e}</p>)}
        </div>
      )}

      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <span style={styles.cardIcon}>🏥</span>
          <h2 style={styles.cardTitle}>기본 정보</h2>
          {!isEditMode && (
            <button type="button" style={styles.editBtn} onClick={enterEditMode}>수정</button>
          )}
        </div>

        {isEditMode ? (
          /* ── Edit Mode ── */
          <div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>약국명 *</label>
              <input
                style={styles.formInput}
                value={form.name}
                onChange={e => updateField('name', e.target.value)}
                placeholder="약국명을 입력하세요"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>약국 전화번호</label>
              <input
                style={styles.formInput}
                value={form.phone}
                onChange={e => updateField('phone', digitsOnly(e.target.value))}
                placeholder="숫자만 입력"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>개설자 연락처</label>
              <input
                style={styles.formInput}
                value={form.ownerPhone}
                onChange={e => updateField('ownerPhone', digitsOnly(e.target.value))}
                placeholder="숫자만 입력"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>사업자등록번호</label>
              <input
                style={{ ...styles.formInput, backgroundColor: colors.neutral100, cursor: 'not-allowed' }}
                value={data.businessNumber || ''}
                disabled
              />
              <span style={styles.formHint}>사업자등록번호 변경은 관리자에게 문의해 주세요.</span>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>세금계산서 이메일</label>
              <input
                style={styles.formInput}
                value={form.taxInvoiceEmail}
                onChange={e => updateField('taxInvoiceEmail', e.target.value)}
                placeholder="tax@example.com"
                type="email"
              />
            </div>

            <div style={styles.formDivider} />

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>우편번호</label>
              <input
                style={{ ...styles.formInput, maxWidth: '200px' }}
                value={form.zipCode}
                onChange={e => updateField('zipCode', e.target.value)}
                placeholder="00000"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>기본주소</label>
              <input
                style={styles.formInput}
                value={form.baseAddress}
                onChange={e => updateField('baseAddress', e.target.value)}
                placeholder="도로명 또는 지번 주소"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>상세주소</label>
              <input
                style={styles.formInput}
                value={form.detailAddress}
                onChange={e => updateField('detailAddress', e.target.value)}
                placeholder="동/호수 등"
              />
            </div>

            <div style={styles.formActions}>
              <button
                type="button"
                style={styles.cancelBtn}
                onClick={cancelEdit}
                disabled={isSaving}
              >
                취소
              </button>
              <button
                type="button"
                style={{ ...styles.saveBtn, opacity: isSaving ? 0.7 : 1 }}
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        ) : (
          /* ── View Mode ── */
          <div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>약국명</span>
              <span style={styles.infoValue}>{data.name || '-'}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>약국 전화번호</span>
              <span style={styles.infoValue}>{data.phone || '-'}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>개설자 연락처</span>
              <span style={styles.infoValue}>{data.ownerPhone || '-'}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>사업자등록번호</span>
              <span style={styles.infoValue}>
                {data.businessNumber || '-'}
                {data.businessNumber && <span style={styles.readOnlyBadge}>변경 불가</span>}
              </span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>세금계산서 이메일</span>
              <span style={styles.infoValue}>{data.taxInvoiceEmail || '-'}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>주소</span>
              <span style={styles.infoValue}>{composeDisplayAddress(data.addressDetail)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '24px',
  },
  header: {
    marginBottom: '24px',
  },
  pageTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: colors.neutral900,
    margin: '0 0 4px',
  },
  pageDesc: {
    fontSize: '0.875rem',
    color: colors.neutral500,
    margin: 0,
  },

  // Card
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    padding: '24px',
    marginBottom: '16px',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: `1px solid ${colors.neutral100}`,
  },
  cardIcon: {
    fontSize: '1.25rem',
  },
  cardTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: colors.neutral800,
    margin: 0,
    flex: 1,
  },

  // Info rows (View mode)
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: `1px solid ${colors.neutral100}`,
  },
  infoLabel: {
    fontSize: '0.875rem',
    color: colors.neutral500,
    flexShrink: 0,
  },
  infoValue: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: colors.neutral800,
    textAlign: 'right',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  readOnlyBadge: {
    fontSize: '0.6875rem',
    color: colors.neutral500,
    backgroundColor: colors.neutral100,
    padding: '2px 6px',
    borderRadius: '4px',
  },

  // Edit button (card header)
  editBtn: {
    padding: '6px 16px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: borderRadius.md,
    fontSize: '0.8125rem',
    fontWeight: 500,
    cursor: 'pointer',
  },

  // Form (Edit mode)
  formGroup: {
    marginBottom: '16px',
  },
  formLabel: {
    display: 'block',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: colors.neutral700,
    marginBottom: '6px',
  },
  formInput: {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: borderRadius.md,
    fontSize: '0.875rem',
    color: colors.neutral800,
    outline: 'none',
    boxSizing: 'border-box',
  },
  formHint: {
    display: 'block',
    fontSize: '0.75rem',
    color: colors.neutral500,
    marginTop: '4px',
  },
  formDivider: {
    height: '1px',
    backgroundColor: colors.neutral200,
    margin: '20px 0',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '24px',
    paddingTop: '16px',
    borderTop: `1px solid ${colors.neutral100}`,
  },
  cancelBtn: {
    padding: '10px 20px',
    backgroundColor: 'transparent',
    color: colors.neutral600,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: borderRadius.md,
    fontSize: '0.875rem',
    cursor: 'pointer',
  },
  saveBtn: {
    padding: '10px 24px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: borderRadius.md,
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
  },

  // Feedback
  successBox: {
    padding: '12px 16px',
    backgroundColor: '#dcfce7',
    color: '#166534',
    borderRadius: borderRadius.md,
    marginBottom: '16px',
    fontSize: '0.875rem',
    fontWeight: 500,
  },
  errorMsgBox: {
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    color: '#991b1b',
    borderRadius: borderRadius.md,
    marginBottom: '16px',
    border: '1px solid #fecaca',
  },
  errorMsgText: {
    margin: '0 0 4px',
    fontSize: '0.8125rem',
  },

  // Loading/Error
  loadingBox: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '300px',
  },
  loadingText: {
    color: colors.neutral500,
    fontSize: '0.9375rem',
  },
  errorBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
    gap: '16px',
  },
  errorText: {
    color: colors.neutral600,
    fontSize: '0.9375rem',
  },
  backButton: {
    padding: '8px 20px',
    backgroundColor: colors.primary,
    color: colors.white,
    textDecoration: 'none',
    borderRadius: borderRadius.md,
    fontSize: '0.875rem',
    fontWeight: 500,
  },
};
