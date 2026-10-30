import { useState, useEffect, useCallback, useId, type ComponentType, type CSSProperties } from 'react';
import { Navigate } from 'react-router-dom';
import { BusinessRegistrationFields } from './BusinessRegistrationFields.js';
import { getBusinessEntityTypeLabel, isSelectableBusinessEntityType } from '@o4o/types';
/** Store / KPA adapters retain API clients, routing guards and theme ownership. */
export interface PharmacyBusinessAddress {
  zipCode?: string;
  baseAddress: string;
  detailAddress?: string;
  region?: string;
}

type AddressFields = 'zipCode' | 'baseAddress' | 'detailAddress';
export interface PharmacyBusinessInfoData extends Partial<Record<Exclude<keyof FormState, AddressFields>, string | null>> {
  name: string;
  businessNumber?: string | null;
  address?: string | null;
  addressDetail?: PharmacyBusinessAddress | null;
}

export type PharmacyBusinessInfoPatch = Pick<FormState, 'name'> &
  Partial<Omit<FormState, 'name' | AddressFields>> & { addressDetail?: PharmacyBusinessAddress };

interface AddressSearchProps {
  zipCode: string;
  address: string;
  addressDetail: string;
  disabled: boolean;
  onChange: (value: { zipCode: string; address: string; addressDetail: string }) => void;
}

export interface PharmacyBusinessInfoTheme {
  colors: Record<'primary' | 'white' | 'neutral100' | 'neutral200' | 'neutral300' |
    'neutral500' | 'neutral600' | 'neutral700' | 'neutral800' | 'neutral900', string>;
  shadows: { sm: string };
  borderRadius: { md: string; lg: string };
}

export interface PharmacyBusinessInfoProps {
  loadInfo: () => Promise<PharmacyBusinessInfoData | null>;
  saveInfo: (patch: PharmacyBusinessInfoPatch) => Promise<unknown>;
  theme: PharmacyBusinessInfoTheme;
  AddressSearch: ComponentType<AddressSearchProps>;
}

type LoadState = 'loading' | 'loaded' | 'error';

// WO-O4O-KPA-PHARMACY-INFO-VIEW-EDIT-CANONICAL-ALIGNMENT-V1:
//   담당자 전화는 개인·약국 전화와 별도로 선택 입력한다.
// WO-O4O-MYPAGE-BUSINESS-INFO-EDIT-P2-P4-ADD-V1:
//   사업자등록증 P2/P4 fields (업태/종목/사업자유형/개업일) 표시·수정 추가.
interface FormState {
  name: string;
  phone: string;
  ownerPhone: string;
  ceoName: string;
  contactName: string;
  managerPhone: string;
  taxInvoiceEmail: string;
  // 사업자 연락처 이메일 2종 — WO-O4O-KPA-BUSINESS-CONTACT-EMAIL-FIELDS-UI-EXTEND-V1
  businessEmail: string;
  contactEmail: string;
  zipCode: string;
  baseAddress: string;
  detailAddress: string;
  // P2/P4 사업자등록증 fields
  businessType: string;
  businessItem: string;
  businessEntityType: string;
  businessStartDate: string;
}

function dataToForm(data: PharmacyBusinessInfoData): FormState {
  return {
    name: data.name || '',
    phone: data.phone || '',
    ownerPhone: data.ownerPhone || '',
    ceoName: data.ceoName || '',
    contactName: data.contactName || '',
    managerPhone: data.managerPhone || '',
    taxInvoiceEmail: data.taxInvoiceEmail || '',
    businessEmail: data.businessEmail || '',
    contactEmail: data.contactEmail || '',
    zipCode: data.addressDetail?.zipCode || '',
    baseAddress: data.addressDetail?.baseAddress || '',
    detailAddress: data.addressDetail?.detailAddress || '',
    businessType: data.businessType || '',
    businessItem: data.businessItem || '',
    businessEntityType: data.businessEntityType || '',
    businessStartDate: data.businessStartDate || '',
  };
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

function isBusinessEmail(value: string): boolean {
  const at = value.indexOf('@');
  if (at < 1 || /\s/.test(value)) return false;
  const dot = value.indexOf('.', at + 2);
  return dot >= 0 && dot < value.length - 1;
}

export function PharmacyBusinessInfo({ loadInfo, saveInfo, theme, AddressSearch }: Readonly<PharmacyBusinessInfoProps>) {
  const formId = useId();
  const { colors } = theme;
  const styles = createStyles(theme);
  const [data, setData] = useState<PharmacyBusinessInfoData | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [isEditMode, setIsEditMode] = useState(false);
  const [form, setForm] = useState<FormState>({ name: '', phone: '', ownerPhone: '', ceoName: '', contactName: '', managerPhone: '', taxInvoiceEmail: '', businessEmail: '', contactEmail: '', zipCode: '', baseAddress: '', detailAddress: '', businessType: '', businessItem: '', businessEntityType: '', businessStartDate: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = useCallback(async () => {
    try {
      const result = await loadInfo();
      setData(result);
      setLoadState('loaded');
    } catch {
      setLoadState('error');
    }
  }, [loadInfo]);

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
    if (form.businessEntityType && !isSelectableBusinessEntityType(form.businessEntityType)) {
      errs.push('세금계산서 발행을 위한 개인 / 법인 구분을 선택해 주세요.');
    }
    if (!form.name.trim() || form.name.trim().length < 2) {
      errs.push('약국명은 2자 이상 입력해 주세요.');
    }
    if (form.taxInvoiceEmail && !isBusinessEmail(form.taxInvoiceEmail)) {
      errs.push('세금계산서 이메일 형식이 올바르지 않습니다.');
    }
    // WO-O4O-KPA-BUSINESS-CONTACT-EMAIL-FIELDS-UI-EXTEND-V1
    if (form.businessEmail && !isBusinessEmail(form.businessEmail)) {
      errs.push('약국 대표 이메일 형식이 올바르지 않습니다.');
    }
    if (form.contactEmail && !isBusinessEmail(form.contactEmail)) {
      errs.push('담당자 이메일 형식이 올바르지 않습니다.');
    }
    if (form.baseAddress.length > 0 && form.baseAddress.trim().length === 0) {
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
      const addressDetail: PharmacyBusinessAddress | undefined =
        form.baseAddress.trim()
          ? { zipCode: form.zipCode || undefined, baseAddress: form.baseAddress.trim(), detailAddress: form.detailAddress.trim() || undefined }
          : undefined;

      // WO-O4O-KPA-PHARMACY-INFO-VIEW-EDIT-CANONICAL-ALIGNMENT-V1:
      //   담당자 연락처는 명시적으로 저장하며 비운 값도 반영한다.
      // WO-O4O-MYPAGE-BUSINESS-INFO-EDIT-P2-P4-ADD-V1:
      //   P2/P4 4 fields 추가 — users.businessInfo SSOT 로 저장.
      await saveInfo({
        name: form.name.trim(),
        phone: digitsOnly(form.phone) || undefined,
        ownerPhone: digitsOnly(form.ownerPhone) || undefined,
        ceoName: form.ceoName.trim() || undefined,
        contactName: form.contactName.trim(),
        managerPhone: digitsOnly(form.managerPhone),
        taxInvoiceEmail: form.taxInvoiceEmail.trim(),
        // WO-O4O-KPA-BUSINESS-CONTACT-EMAIL-FIELDS-UI-EXTEND-V1
        businessEmail: form.businessEmail.trim() || undefined,
        contactEmail: form.contactEmail.trim(),
        addressDetail,
        businessType: form.businessType.trim() || undefined,
        businessItem: form.businessItem.trim() || undefined,
        businessEntityType: form.businessEntityType || undefined,
        businessStartDate: form.businessStartDate || undefined,
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
          {errors.map((e) => <p key={e} style={styles.errorMsgText}>{e}</p>)}
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
              <label htmlFor={`${formId}-name`} style={styles.formLabel}>약국명 *</label>
              <input
                id={`${formId}-name`}
                style={styles.formInput}
                value={form.name}
                onChange={e => updateField('name', e.target.value)}
                placeholder="약국명을 입력하세요"
              />
            </div>

            <div style={styles.formGroup}>
              <label htmlFor={`${formId}-phone`} style={styles.formLabel}>약국 전화번호</label>
              <input
                id={`${formId}-phone`}
                style={styles.formInput}
                value={form.phone}
                onChange={e => updateField('phone', digitsOnly(e.target.value))}
                placeholder="숫자만 입력"
              />
            </div>

            <div style={styles.formGroup}>
              <label htmlFor={`${formId}-ownerPhone`} style={styles.formLabel}>개설자 연락처</label>
              <input
                id={`${formId}-ownerPhone`}
                style={styles.formInput}
                value={form.ownerPhone}
                onChange={e => updateField('ownerPhone', digitsOnly(e.target.value))}
                placeholder="숫자만 입력"
              />
            </div>

            <div style={styles.formGroup}>
              <label htmlFor={`${formId}-ceoName`} style={styles.formLabel}>대표자명</label>
              <input
                id={`${formId}-ceoName`}
                style={styles.formInput}
                value={form.ceoName}
                onChange={e => updateField('ceoName', e.target.value)}
                placeholder="사업자등록증 대표자명"
                maxLength={50}
              />
            </div>

            <div style={styles.formGroup}>
              <label htmlFor={`${formId}-contactName`} style={styles.formLabel}>담당자명</label>
              <input
                id={`${formId}-contactName`}
                style={styles.formInput}
                value={form.contactName}
                onChange={e => updateField('contactName', e.target.value)}
                placeholder="담당자 이름 (선택)"
                maxLength={50}
              />
            </div>

            <div style={styles.formGroup}>
              <label htmlFor={`${formId}-businessNumber`} style={styles.formLabel}>사업자등록번호</label>
              <input
                id={`${formId}-businessNumber`}
                style={{ ...styles.formInput, backgroundColor: colors.neutral100, cursor: 'not-allowed' }}
                value={data.businessNumber || ''}
                disabled
              />
              <span style={styles.formHint}>사업자등록번호 변경은 관리자에게 문의해 주세요.</span>
            </div>

            <div style={styles.formGroup}>
              <label htmlFor={`${formId}-managerPhone`} style={styles.formLabel}>담당자 전화번호</label>
              <input id={`${formId}-managerPhone`} type="tel" style={styles.formInput} value={form.managerPhone} onChange={e => updateField('managerPhone', digitsOnly(e.target.value))} />
            </div>

            <div style={styles.formGroup}>
              <label htmlFor={`${formId}-taxInvoiceEmail`} style={styles.formLabel}>세금계산서 이메일</label>
              <input
                id={`${formId}-taxInvoiceEmail`}
                style={styles.formInput}
                value={form.taxInvoiceEmail}
                onChange={e => updateField('taxInvoiceEmail', e.target.value)}
                placeholder="tax@example.com"
                type="email"
              />
            </div>

            {/* WO-O4O-KPA-BUSINESS-CONTACT-EMAIL-FIELDS-UI-EXTEND-V1: 약국 대표 이메일 / 담당자 이메일 */}
            <div style={styles.formGroup}>
              <label htmlFor={`${formId}-businessEmail`} style={styles.formLabel}>약국 대표 이메일</label>
              <input
                id={`${formId}-businessEmail`}
                style={styles.formInput}
                value={form.businessEmail}
                onChange={e => updateField('businessEmail', e.target.value)}
                placeholder="info@pharmacy.com (선택)"
                type="email"
              />
            </div>
            <div style={styles.formGroup}>
              <label htmlFor={`${formId}-contactEmail`} style={styles.formLabel}>담당자 이메일</label>
              <input
                id={`${formId}-contactEmail`}
                style={styles.formInput}
                value={form.contactEmail}
                onChange={e => updateField('contactEmail', e.target.value)}
                placeholder="manager@pharmacy.com (선택)"
                type="email"
              />
            </div>

            {/* WO-O4O-MYPAGE-BUSINESS-INFO-EDIT-P2-P4-ADD-V1:
                  사업자등록증 P2/P4 fields — 공통 BusinessRegistrationFields 재사용 */}
            <div style={styles.formGroup}>
              <BusinessRegistrationFields
                value={{
                  businessType: form.businessType,
                  businessItem: form.businessItem,
                  businessEntityType: form.businessEntityType as any || undefined,
                  businessStartDate: form.businessStartDate,
                }}
                onChange={(patch) => {
                  setForm(prev => ({
                    ...prev,
                    ...(patch.businessType !== undefined ? { businessType: patch.businessType || '' } : {}),
                    ...(patch.businessItem !== undefined ? { businessItem: patch.businessItem || '' } : {}),
                    ...(patch.businessEntityType !== undefined ? { businessEntityType: patch.businessEntityType || '' } : {}),
                    ...(patch.businessStartDate !== undefined ? { businessStartDate: patch.businessStartDate || '' } : {}),
                  }));
                }}
                disabled={isSaving}
              />
            </div>

            <div style={styles.formDivider} />

            <div style={styles.formGroup}>
              <div style={styles.formLabel}>약국 주소</div>
              <AddressSearch
                zipCode={form.zipCode}
                address={form.baseAddress}
                addressDetail={form.detailAddress}
                onChange={({ zipCode, address, addressDetail }) =>
                  setForm(prev => ({
                    ...prev,
                    zipCode,
                    baseAddress: address,
                    detailAddress: addressDetail,
                  }))
                }
                disabled={isSaving}
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
            <PharmacyInfoRows data={data} styles={styles} />
          </div>
        )}
      </div>
    </div>
  );
}

function PharmacyInfoRows({ data, styles }: Readonly<{
  data: PharmacyBusinessInfoData;
  styles: Record<string, CSSProperties>;
}>) {
  const rows = [
    ['약국명', data.name],
    ['약국 전화번호', data.phone],
    ['개설자 연락처', data.ownerPhone],
    ['대표자명', data.ceoName],
    ['담당자명', data.contactName],
    ['담당자 전화번호', data.managerPhone],
    ['사업자등록번호', data.businessNumber],
    ['세금계산서 이메일', data.taxInvoiceEmail],
    ['약국 대표 이메일', data.businessEmail],
    ['담당자 이메일', data.contactEmail],
    ['업태', data.businessType],
    ['종목', data.businessItem],
    ['사업자 유형', data.businessEntityType ? getBusinessEntityTypeLabel(data.businessEntityType) : null],
    ['개업일', data.businessStartDate],
    ...(data.addressDetail || data.address ? [
      ...(data.addressDetail?.zipCode ? [['우편번호', data.addressDetail.zipCode]] : []),
      ['기본주소', data.addressDetail?.baseAddress || data.address],
      ...(data.addressDetail?.detailAddress ? [['상세주소', data.addressDetail.detailAddress]] : []),
    ] : [['주소', null]]),
  ];
  return (
    <>
      {rows.map(([label, value]) => (
        <div key={label} style={styles.infoRow}>
          <span style={styles.infoLabel}>{label}</span>
          <span style={styles.infoValue}>
            {value || '-'}
            {label === '사업자등록번호' && value && <span style={styles.readOnlyBadge}>변경 불가</span>}
          </span>
        </div>
      ))}
    </>
  );
}

function createStyles({ colors, shadows, borderRadius }: PharmacyBusinessInfoTheme): Record<string, CSSProperties> {
  return {
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
}
