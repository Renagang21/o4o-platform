/**
 * BusinessProfileSection — 사업자 정보 조회·수정 공통 화면
 *
 * WO-O4O-CROSS-SERVICE-PROFILE-COMMONIZATION-V1
 *
 * GlycoPharm `PharmacyInfoPage` (488줄) 와 K-Cosmetics `StoreInfoPage` (475줄) 는
 * 엔티티 명칭(약국/매장) · accent 색 · 면허 행 유무만 다른 복제본이었다.
 * 그 차이를 props 로 받고 나머지 전부를 이 컴포넌트로 수렴한다.
 *
 * 저장 대상은 `users.businessInfo` (가입 입력 스냅샷) 이며 이 WO 에서 정본을 바꾸지 않는다.
 * 근거: CHECK-O4O-CROSS-SERVICE-PROFILE-DATA-OWNERSHIP-AND-WRITE-PATH-INTEGRITY-AUDIT-V1 §6
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle, FileText, Loader2, Mail, Phone, Save } from 'lucide-react';
import { getBusinessEntityTypeLabel } from '@o4o/types';
import { BusinessRegistrationFields } from './BusinessRegistrationFields.js';

export interface BusinessProfileData {
  /** 약국명 / 매장명 — 서비스별 엔티티 이름 (호출자가 매핑). */
  entityName: string | null;
  businessRegistrationNumber: string | null;
  businessName: string | null;
  representativeName: string | null;
  businessAddress: string | null;
  businessPhone: string | null;
  businessEmail: string | null;
  contactEmail: string | null;
  businessType: string | null;
  businessItem: string | null;
  businessEntityType: string | null;
  businessStartDate: string | null;
  taxInvoiceEmail: string | null;
  /** 자격 정보(약사면허 등). 정본은 서비스 profile 테이블 — 여기서는 읽기 전용. */
  licenseNumber?: string | null;
}

export type BusinessProfilePatch = Partial<
  Omit<BusinessProfileData, 'businessRegistrationNumber' | 'licenseNumber'>
>;

export type BusinessProfileAccent = 'emerald' | 'pink';

export interface BusinessProfileSectionProps {
  /** 엔티티 명칭 — '약국' / '매장'. 제목·라벨·안내문에 사용. */
  entityLabel: string;
  /** `{entityLabel} 대표 이메일` 대신 쓸 라벨 (K-Cosmetics: '회사 대표 이메일'). */
  businessEmailLabel?: string;
  accent?: BusinessProfileAccent;
  /** 자격(면허) 읽기 전용 행. GlycoPharm 전용. */
  licenseField?: { label: string; hint: string };
  load: () => Promise<BusinessProfileData>;
  save: (patch: BusinessProfilePatch) => Promise<BusinessProfileData>;
  /** 이메일 placeholder 도메인 (예: 'pharmacy.com'). */
  emailPlaceholderDomain?: string;
  /** 섹션 아래 추가 안내. */
  footer?: ReactNode;
}

type LoadState = 'loading' | 'loaded' | 'error' | 'forbidden';

interface FormState {
  entityName: string;
  businessName: string;
  representativeName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  contactEmail: string;
  businessType: string;
  businessItem: string;
  businessEntityType: string;
  businessStartDate: string;
  taxInvoiceEmail: string;
}

const EMPTY_FORM: FormState = {
  entityName: '',
  businessName: '',
  representativeName: '',
  businessAddress: '',
  businessPhone: '',
  businessEmail: '',
  contactEmail: '',
  businessType: '',
  businessItem: '',
  businessEntityType: '',
  businessStartDate: '',
  taxInvoiceEmail: '',
};

function dataToForm(data: BusinessProfileData): FormState {
  return {
    entityName: data.entityName || '',
    businessName: data.businessName || '',
    representativeName: data.representativeName || '',
    businessAddress: data.businessAddress || '',
    businessPhone: data.businessPhone || '',
    businessEmail: data.businessEmail || '',
    contactEmail: data.contactEmail || '',
    businessType: data.businessType || '',
    businessItem: data.businessItem || '',
    businessEntityType: data.businessEntityType || '',
    businessStartDate: data.businessStartDate || '',
    taxInvoiceEmail: data.taxInvoiceEmail || '',
  };
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

const EMAIL_RE = /^\S+@\S+\.\S+$/;

/** Tailwind 는 정적 클래스 문자열만 인식하므로 accent 는 명시 map 으로만 제공한다. */
const ACCENT: Record<
  BusinessProfileAccent,
  { icon: string; button: string; ring: string }
> = {
  emerald: {
    icon: 'text-emerald-600',
    button: 'bg-emerald-600 hover:bg-emerald-700',
    ring: 'focus:ring-emerald-500/30 focus:border-emerald-500',
  },
  pink: {
    icon: 'text-pink-600',
    button: 'bg-pink-600 hover:bg-pink-700',
    ring: 'focus:ring-pink-500/30 focus:border-pink-500',
  },
};

export function BusinessProfileSection({
  entityLabel,
  businessEmailLabel,
  accent = 'emerald',
  licenseField,
  load,
  save,
  emailPlaceholderDomain = 'example.com',
  footer,
}: BusinessProfileSectionProps) {
  const [data, setData] = useState<BusinessProfileData | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isEditMode, setIsEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState('');

  const a = ACCENT[accent];
  const inputCls = `w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 ${a.ring}`;
  const emailLabel = businessEmailLabel ?? `${entityLabel} 대표 이메일`;

  // load/save 는 호출자가 인라인 화살표로 넘길 수 있으므로 ref 로 고정한다
  // (의존성에 넣으면 매 렌더마다 재조회 루프가 된다).
  const loadRef = useRef(load);
  loadRef.current = load;

  const loadData = useCallback(async () => {
    setLoadState('loading');
    try {
      const result = await loadRef.current();
      setData(result);
      setLoadState('loaded');
    } catch (e: unknown) {
      // 403 은 "권한 없음" 으로 명시한다 — 조회 실패를 빈 상태로 삼키지 않는다.
      const status = (e as { response?: { status?: number } })?.response?.status;
      setLoadState(status === 403 ? 'forbidden' : 'error');
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const updateField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const enterEditMode = () => {
    if (data) setForm(dataToForm(data));
    setErrors([]);
    setSuccessMsg('');
    setIsEditMode(true);
  };

  const cancelEdit = () => {
    if (data) setForm(dataToForm(data));
    setErrors([]);
    setIsEditMode(false);
  };

  const validate = (): string[] => {
    const errs: string[] = [];
    if (form.taxInvoiceEmail && !EMAIL_RE.test(form.taxInvoiceEmail)) {
      errs.push('세금계산서 이메일 형식이 올바르지 않습니다.');
    }
    if (form.businessEmail && !EMAIL_RE.test(form.businessEmail)) {
      errs.push(`${emailLabel} 형식이 올바르지 않습니다.`);
    }
    if (form.contactEmail && !EMAIL_RE.test(form.contactEmail)) {
      errs.push('담당자 이메일 형식이 올바르지 않습니다.');
    }
    return errs;
  };

  const handleSave = async () => {
    const errs = validate();
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    setSaving(true);
    try {
      const updated = await save({
        entityName: form.entityName.trim() || undefined,
        businessName: form.businessName.trim() || undefined,
        representativeName: form.representativeName.trim() || undefined,
        businessAddress: form.businessAddress.trim() || undefined,
        businessPhone: digitsOnly(form.businessPhone) || undefined,
        businessEmail: form.businessEmail.trim() || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
        businessType: form.businessType.trim() || undefined,
        businessItem: form.businessItem.trim() || undefined,
        businessEntityType: form.businessEntityType.trim() || undefined,
        businessStartDate: form.businessStartDate.trim() || undefined,
        taxInvoiceEmail: form.taxInvoiceEmail.trim() || undefined,
      });
      setData(updated);
      setIsEditMode(false);
      setSuccessMsg(`${entityLabel}/사업자 정보가 저장되었습니다.`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setErrors(['저장에 실패했습니다. 다시 시도해 주세요.']);
    } finally {
      setSaving(false);
    }
  };

  if (loadState === 'loading') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (loadState === 'forbidden') {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900">
              {entityLabel} 경영자만 이용 가능합니다
            </p>
            <p className="text-xs text-amber-700 mt-1">
              본 페이지는 {entityLabel} 경영자 등록이 완료된 사용자만 사용할 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loadState === 'error' || !data) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-700">사업자 정보를 불러오지 못했습니다.</p>
            <button
              type="button"
              onClick={() => void loadData()}
              className="mt-2 text-xs font-medium text-red-700 underline"
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">{entityLabel}/사업자 정보</h1>
        <p className="text-sm text-gray-500 mt-1">
          가입 및 운영에 사용되는 {entityLabel} 사업자 정보를 확인하고 수정합니다.
        </p>
      </header>

      {successMsg && (
        <div className="mb-4 p-3 border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm rounded flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {successMsg}
        </div>
      )}

      {errors.length > 0 && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded space-y-1">
          {errors.map((e) => (
            <p key={e} className="text-sm text-red-700">
              {e}
            </p>
          ))}
        </div>
      )}

      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <header className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className={`w-5 h-5 ${a.icon}`} />
            <h2 className="text-base font-semibold text-gray-800">기본 사업자 정보</h2>
          </div>
          {!isEditMode && (
            <button
              type="button"
              onClick={enterEditMode}
              className={`px-3 py-1.5 text-sm font-medium text-white rounded ${a.button}`}
            >
              수정
            </button>
          )}
        </header>

        <div className="p-6 space-y-5">
          {isEditMode ? (
            <>
              <Field label={`${entityLabel}명`}>
                <input
                  className={inputCls}
                  value={form.entityName}
                  onChange={(e) => updateField('entityName', e.target.value)}
                  placeholder={`${entityLabel}명을 입력하세요`}
                  maxLength={200}
                />
              </Field>

              <Field label="사업자등록번호">
                <input
                  className={`${inputCls} bg-gray-100 cursor-not-allowed`}
                  value={data.businessRegistrationNumber || ''}
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">
                  사업자등록번호 변경은 관리자에게 문의해 주세요.
                </p>
              </Field>

              <Field label="상호 / 사업자명">
                <input
                  className={inputCls}
                  value={form.businessName}
                  onChange={(e) => updateField('businessName', e.target.value)}
                  maxLength={200}
                />
              </Field>

              <Field label="대표자명">
                <input
                  className={inputCls}
                  value={form.representativeName}
                  onChange={(e) => updateField('representativeName', e.target.value)}
                  maxLength={50}
                />
              </Field>

              <Field label="사업장 주소">
                <input
                  className={inputCls}
                  value={form.businessAddress}
                  onChange={(e) => updateField('businessAddress', e.target.value)}
                  placeholder="시도 시군구 도로명 등"
                  maxLength={500}
                />
              </Field>

              <Field label="사업장 전화번호">
                <input
                  className={inputCls}
                  value={form.businessPhone}
                  onChange={(e) => updateField('businessPhone', digitsOnly(e.target.value))}
                  placeholder="숫자만 입력"
                />
              </Field>

              <Field label={emailLabel}>
                <input
                  type="email"
                  className={inputCls}
                  value={form.businessEmail}
                  onChange={(e) => updateField('businessEmail', e.target.value)}
                  placeholder={`info@${emailPlaceholderDomain}`}
                />
              </Field>

              <Field label="담당자 이메일">
                <input
                  type="email"
                  className={inputCls}
                  value={form.contactEmail}
                  onChange={(e) => updateField('contactEmail', e.target.value)}
                  placeholder={`manager@${emailPlaceholderDomain}`}
                />
              </Field>

              {/* 업태 / 종목 / 사업자 유형 / 개업일 — 공통 BusinessRegistrationFields */}
              <BusinessRegistrationFields
                value={{
                  businessType: form.businessType,
                  businessItem: form.businessItem,
                  businessEntityType: form.businessEntityType || undefined,
                  businessStartDate: form.businessStartDate,
                }}
                onChange={(patch) => {
                  setForm((prev) => ({
                    ...prev,
                    ...(patch.businessType !== undefined
                      ? { businessType: patch.businessType || '' }
                      : {}),
                    ...(patch.businessItem !== undefined
                      ? { businessItem: patch.businessItem || '' }
                      : {}),
                    ...(patch.businessEntityType !== undefined
                      ? { businessEntityType: patch.businessEntityType || '' }
                      : {}),
                    ...(patch.businessStartDate !== undefined
                      ? { businessStartDate: patch.businessStartDate || '' }
                      : {}),
                  }));
                }}
                disabled={saving}
                className="space-y-5"
                inputClassName={inputCls}
                labelClassName="block text-sm font-medium text-gray-700 mb-1.5"
              />

              <Field label="세금계산서 이메일">
                <input
                  type="email"
                  className={inputCls}
                  value={form.taxInvoiceEmail}
                  onChange={(e) => updateField('taxInvoiceEmail', e.target.value)}
                  placeholder="tax@example.com"
                />
              </Field>

              {licenseField && (
                <Field label={licenseField.label}>
                  <input
                    className={`${inputCls} bg-gray-100 cursor-not-allowed`}
                    value={data.licenseNumber || ''}
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">{licenseField.hint}</p>
                </Field>
              )}

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={saving}
                  className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className={`px-4 py-2 text-sm text-white rounded flex items-center gap-2 disabled:opacity-50 ${a.button}`}
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {saving ? '저장 중...' : '저장'}
                </button>
              </div>
            </>
          ) : (
            <>
              <ViewRow label={`${entityLabel}명`} value={data.entityName} />
              <ViewRow
                label="사업자등록번호"
                value={data.businessRegistrationNumber}
                badge="변경 불가"
              />
              <ViewRow label="상호 / 사업자명" value={data.businessName} />
              <ViewRow label="대표자명" value={data.representativeName} />
              <ViewRow label="사업장 주소" value={data.businessAddress} />
              <ViewRow
                label="사업장 전화번호"
                value={data.businessPhone}
                icon={<Phone className="w-3.5 h-3.5 text-gray-400" />}
              />
              <ViewRow
                label={emailLabel}
                value={data.businessEmail}
                icon={<Mail className="w-3.5 h-3.5 text-gray-400" />}
              />
              <ViewRow
                label="담당자 이메일"
                value={data.contactEmail}
                icon={<Mail className="w-3.5 h-3.5 text-gray-400" />}
              />
              <ViewRow label="업태" value={data.businessType} />
              <ViewRow label="종목" value={data.businessItem} />
              <ViewRow
                label="사업자 유형"
                value={
                  data.businessEntityType
                    ? getBusinessEntityTypeLabel(data.businessEntityType)
                    : null
                }
              />
              <ViewRow label="개업일" value={data.businessStartDate} />
              <ViewRow
                label="세금계산서 이메일"
                value={data.taxInvoiceEmail}
                icon={<Mail className="w-3.5 h-3.5 text-gray-400" />}
              />
              {licenseField && (
                <ViewRow
                  label={licenseField.label}
                  value={data.licenseNumber ?? null}
                  badge="변경 불가"
                />
              )}
            </>
          )}
        </div>
      </section>

      {footer}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function ViewRow({
  label,
  value,
  badge,
  icon,
}: {
  label: string;
  value: string | null;
  badge?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500 flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span className="text-sm text-gray-800 font-medium text-right flex items-center gap-2">
        {value || '-'}
        {badge && value && (
          <span className="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-500 rounded">
            {badge}
          </span>
        )}
      </span>
    </div>
  );
}
