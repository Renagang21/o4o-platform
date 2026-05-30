/**
 * K-Cosmetics StoreInfoPage — 매장/사업자 정보 조회·수정
 *
 * WO-O4O-KCOSMETICS-STORE-PROFILE-EDIT-PAGE-V1
 *
 * K-Cosmetics 매장 경영자 (cosmetics:store_owner / store_owner subRole) 가 가입 후
 * 자신의 매장·사업자 정보를 확인하고 수정할 수 있는 화면.
 *
 * 저장 source: users.businessInfo JSONB (canonical signup source).
 * Read-only: businessRegistrationNumber (변경 불가 정책).
 * 계좌 정보 미포함 (canonical 정책).
 *
 * 패턴 동일: services/web-glycopharm/src/pages/store/PharmacyInfoPage.tsx
 * 용어 차이: 약국 → 매장
 */

import { useState, useEffect, useCallback } from 'react';
import { Save, Loader2, AlertCircle, CheckCircle, FileText, Phone, Mail } from 'lucide-react';
import { BusinessRegistrationFields } from '@o4o/account-ui';
import { getBusinessEntityTypeLabel } from '@o4o/types';
import {
  cosmeticsMypageApi,
  type CosmeticsBusinessInfo,
  type UpdateCosmeticsBusinessInfoPayload,
} from '@/api/mypage';

type LoadState = 'loading' | 'loaded' | 'error' | 'forbidden';

interface FormState {
  storeName: string;
  businessName: string;
  representativeName: string;
  businessAddress: string;
  businessPhone: string;
  businessType: string;
  businessItem: string;
  businessEntityType: string;
  businessStartDate: string;
  taxInvoiceEmail: string;
}

const EMPTY_FORM: FormState = {
  storeName: '',
  businessName: '',
  representativeName: '',
  businessAddress: '',
  businessPhone: '',
  businessType: '',
  businessItem: '',
  businessEntityType: '',
  businessStartDate: '',
  taxInvoiceEmail: '',
};

function dataToForm(data: CosmeticsBusinessInfo): FormState {
  return {
    storeName: data.storeName || '',
    businessName: data.businessName || '',
    representativeName: data.representativeName || '',
    businessAddress: data.businessAddress || '',
    businessPhone: data.businessPhone || '',
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

export default function StoreInfoPage() {
  const [data, setData] = useState<CosmeticsBusinessInfo | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isEditMode, setIsEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = useCallback(async () => {
    setLoadState('loading');
    try {
      const result = await cosmeticsMypageApi.getBusinessInfo();
      setData(result);
      setLoadState('loaded');
    } catch (e: any) {
      if (e?.response?.status === 403) {
        setLoadState('forbidden');
      } else {
        setLoadState('error');
      }
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
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = (): string[] => {
    const errs: string[] = [];
    if (form.taxInvoiceEmail && !/^\S+@\S+\.\S+$/.test(form.taxInvoiceEmail)) {
      errs.push('세금계산서 이메일 형식이 올바르지 않습니다.');
    }
    if (form.businessStartDate && !/^\d{4}-\d{2}-\d{2}$/.test(form.businessStartDate)) {
      errs.push('개업일은 YYYY-MM-DD 형식이어야 합니다.');
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
    setSaving(true);

    try {
      const payload: UpdateCosmeticsBusinessInfoPayload = {
        storeName: form.storeName.trim() || undefined,
        businessName: form.businessName.trim() || undefined,
        representativeName: form.representativeName.trim() || undefined,
        businessAddress: form.businessAddress.trim() || undefined,
        businessPhone: digitsOnly(form.businessPhone) || undefined,
        businessType: form.businessType.trim() || undefined,
        businessItem: form.businessItem.trim() || undefined,
        businessEntityType: form.businessEntityType || undefined,
        businessStartDate: form.businessStartDate || undefined,
        taxInvoiceEmail: form.taxInvoiceEmail.trim() || undefined,
      };

      const updated = await cosmeticsMypageApi.updateBusinessInfo(payload);
      setData(updated);
      setIsEditMode(false);
      setSuccessMsg('매장/사업자 정보가 저장되었습니다.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setErrors(['저장에 실패했습니다. 다시 시도해 주세요.']);
    } finally {
      setSaving(false);
    }
  };

  // ── Loading / Error / Forbidden ──
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
            <p className="text-sm font-semibold text-amber-900">매장 경영자만 이용 가능합니다</p>
            <p className="text-xs text-amber-700 mt-1">
              본 페이지는 매장 경영자 등록이 완료된 사용자만 사용할 수 있습니다.
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
          <p className="text-sm text-red-700">사업자 정보를 불러오지 못했습니다.</p>
        </div>
      </div>
    );
  }

  // ── Render ──
  return (
    <div className="max-w-3xl mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">매장/사업자 정보</h1>
        <p className="text-sm text-gray-500 mt-1">
          가입 및 운영에 사용되는 매장 사업자 정보를 확인하고 수정합니다.
        </p>
      </header>

      {successMsg && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {successMsg}
        </div>
      )}

      {errors.length > 0 && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded">
          {errors.map((e, i) => (
            <p key={i} className="text-sm text-red-700">
              {e}
            </p>
          ))}
        </div>
      )}

      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <header className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-pink-600" />
            <h2 className="text-base font-semibold text-gray-800">기본 사업자 정보</h2>
          </div>
          {!isEditMode && (
            <button
              type="button"
              onClick={enterEditMode}
              className="px-3 py-1.5 text-sm font-medium bg-pink-600 text-white rounded hover:bg-pink-700"
            >
              수정
            </button>
          )}
        </header>

        <div className="p-6 space-y-5">
          {isEditMode ? (
            <>
              <Field label="매장명">
                <input
                  className={inputCls}
                  value={form.storeName}
                  onChange={(e) => updateField('storeName', e.target.value)}
                  placeholder="매장명을 입력하세요"
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

              {/* P2/P4 — 공통 BusinessRegistrationFields */}
              <BusinessRegistrationFields
                value={{
                  businessType: form.businessType,
                  businessItem: form.businessItem,
                  businessEntityType: (form.businessEntityType as any) || undefined,
                  businessStartDate: form.businessStartDate,
                }}
                onChange={(patch) => {
                  setForm((prev) => ({
                    ...prev,
                    ...(patch.businessType !== undefined ? { businessType: patch.businessType || '' } : {}),
                    ...(patch.businessItem !== undefined ? { businessItem: patch.businessItem || '' } : {}),
                    ...(patch.businessEntityType !== undefined
                      ? { businessEntityType: patch.businessEntityType || '' }
                      : {}),
                    ...(patch.businessStartDate !== undefined
                      ? { businessStartDate: patch.businessStartDate || '' }
                      : {}),
                  }));
                }}
                disabled={saving}
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

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={saving}
                  className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 text-sm bg-pink-600 text-white rounded hover:bg-pink-700 flex items-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? '저장 중...' : '저장'}
                </button>
              </div>
            </>
          ) : (
            <>
              <ViewRow label="매장명" value={data.storeName} />
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
              <ViewRow label="업태" value={data.businessType} />
              <ViewRow label="종목" value={data.businessItem} />
              <ViewRow
                label="사업자 유형"
                value={data.businessEntityType ? getBusinessEntityTypeLabel(data.businessEntityType) : null}
              />
              <ViewRow label="개업일" value={data.businessStartDate} />
              <ViewRow
                label="세금계산서 이메일"
                value={data.taxInvoiceEmail}
                icon={<Mail className="w-3.5 h-3.5 text-gray-400" />}
              />
            </>
          )}
        </div>
      </section>
    </div>
  );
}

const inputCls =
  'w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
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
  icon?: React.ReactNode;
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
          <span className="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-500 rounded">{badge}</span>
        )}
      </span>
    </div>
  );
}
