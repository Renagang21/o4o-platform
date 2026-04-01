/**
 * ProductForm — 통합 상품 폼 컴포넌트
 *
 * WO-O4O-NETURE-PRODUCT-FORM-UNIFICATION-V1
 *
 * mode='edit'   → Drawer에서 사용 (상품명, 공급가, 소비자가, 재고, 활성, 유통정책, 서비스)
 * mode='create'  → 등록 Step 2에서 사용 (공급가, 소비자가, 재고, 유통정책, 서비스)
 *
 * WO-NETURE-DISTRIBUTION-SETTINGS-UX-V1 — 유통 설정을 edit 모드에서도 표시
 */

import { useState, useEffect, useCallback } from 'react';

// ─── Types (exported for consumers) ───

export interface ProductFormData {
  marketingName: string;
  priceGeneral: number | null;
  priceGold: number | null;
  consumerReferencePrice: number | null;
  stockQuantity: number;
  isActive: boolean;
  distributionType?: string;
  serviceKeys?: string[];
}

export interface ProductFormProps {
  mode: 'create' | 'edit';
  initialData?: Partial<ProductFormData>;
  onChange: (data: ProductFormData, isDirty: boolean) => void;
  disabled?: boolean;
}

// ─── Validation (exported) ───

export function validateProductForm(
  data: ProductFormData,
  mode: 'create' | 'edit',
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (mode === 'edit' && !data.marketingName?.trim()) {
    errors.marketingName = '상품명을 입력해주세요';
  }
  if (mode === 'create' && (!data.priceGeneral || data.priceGeneral <= 0)) {
    errors.priceGeneral = '공급가를 입력해주세요';
  }
  if (data.priceGeneral != null && data.priceGeneral < 0) {
    errors.priceGeneral = '0 이상 입력해주세요';
  }
  if (data.consumerReferencePrice != null && data.consumerReferencePrice < 0) {
    errors.consumerReferencePrice = '0 이상 입력해주세요';
  }
  if (data.distributionType === 'SERVICE' && (!data.serviceKeys || data.serviceKeys.length === 0)) {
    errors.serviceKeys = '서비스를 1개 이상 선택해주세요';
  }
  return errors;
}

// ─── Constants ───

const AVAILABLE_SERVICES = [
  { key: 'glycopharm', name: 'GlycoPharm' },
  { key: 'glucoseview', name: 'GlucoseView' },
  { key: 'kpa-society', name: 'KPA Society' },
  { key: 'k-cosmetics', name: 'K-Cosmetics' },
];

const DISTRIBUTION_OPTIONS = [
  { value: 'PRIVATE', label: '비공개', desc: '지정된 판매자에게만 노출 (기본)' },
  { value: 'SERVICE', label: '서비스', desc: '서비스 참여 승인 후 노출' },
  { value: 'PUBLIC', label: '공개', desc: '모든 판매자에게 자동 노출' },
];

// ─── Internal helpers ───

function NumericInput({
  value,
  onChange,
  placeholder = '0',
  disabled = false,
  className = '',
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      value={value != null ? String(value) : ''}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const v = e.target.value.replace(/[^0-9]/g, '');
        onChange(v ? Number(v) : null);
      }}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400 ${className}`}
    />
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-slate-700 mb-1">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="mt-1 text-xs text-red-500">{error}</p>;
}

const DEFAULT_DATA: ProductFormData = {
  marketingName: '',
  priceGeneral: null,
  priceGold: null,
  consumerReferencePrice: null,
  stockQuantity: 0,
  isActive: true,
  distributionType: 'PRIVATE',
  serviceKeys: [],
};

// ─── Component ───

export default function ProductForm({ mode, initialData, onChange, disabled = false }: ProductFormProps) {
  const [data, setData] = useState<ProductFormData>(() => ({
    ...DEFAULT_DATA,
    ...initialData,
  }));
  const [initial] = useState<ProductFormData>(() => ({
    ...DEFAULT_DATA,
    ...initialData,
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState(false);

  // Sync initialData changes (e.g. when product changes in Drawer)
  useEffect(() => {
    const next = { ...DEFAULT_DATA, ...initialData };
    setData(next);
    setErrors({});
    setTouched(false);
  }, [initialData]);

  const isDirty = useCallback(() => {
    return JSON.stringify(data) !== JSON.stringify(initial);
  }, [data, initial]);

  // Notify parent on every change
  useEffect(() => {
    onChange(data, isDirty());
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateField = <K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
    setTouched(true);
    // Clear field error on change
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const toggleServiceKey = (key: string) => {
    const current = data.serviceKeys || [];
    const next = current.includes(key)
      ? current.filter((k) => k !== key)
      : [...current, key];
    updateField('serviceKeys', next);
  };

  // Validate on blur
  const handleBlur = () => {
    if (touched) {
      setErrors(validateProductForm(data, mode));
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Edit mode: 상품명 ── */}
      {mode === 'edit' && (
        <div>
          <FieldLabel required>상품명</FieldLabel>
          <input
            type="text"
            value={data.marketingName}
            onChange={(e) => updateField('marketingName', e.target.value)}
            onBlur={handleBlur}
            disabled={disabled}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
            placeholder="상품명 (마케팅명)"
          />
          <FieldError error={errors.marketingName} />
        </div>
      )}

      {/* ── 공급가 ── */}
      <div>
        <FieldLabel required={mode === 'create'}>공급가 (원)</FieldLabel>
        <NumericInput
          value={data.priceGeneral}
          onChange={(v) => updateField('priceGeneral', v)}
          disabled={disabled}
        />
        <FieldError error={errors.priceGeneral} />
      </div>

      {/* ── 서비스가 ── */}
      <div>
        <FieldLabel>서비스가 (원)</FieldLabel>
        <NumericInput
          value={data.priceGold}
          onChange={(v) => updateField('priceGold', v)}
          disabled={disabled}
          placeholder="서비스 채널용 공급가"
        />
      </div>

      {/* WO-NETURE-SPOT-PRICE-POLICY-FOUNDATION-V1: 스팟가는 별도 정책 섹션으로 이동 */}

      {/* ── 소비자 참고가 ── */}
      <div>
        <FieldLabel>소비자 가격 (원)</FieldLabel>
        <NumericInput
          value={data.consumerReferencePrice}
          onChange={(v) => updateField('consumerReferencePrice', v)}
          disabled={disabled}
          placeholder="선택"
        />
        <FieldError error={errors.consumerReferencePrice} />
      </div>

      {/* ── 재고 ── */}
      <div>
        <FieldLabel>
          재고 수량 {mode === 'create' && <span className="text-xs text-slate-400 font-normal">(선택)</span>}
        </FieldLabel>
        <NumericInput
          value={data.stockQuantity}
          onChange={(v) => updateField('stockQuantity', v ?? 0)}
          disabled={disabled}
        />
        {mode === 'create' && (
          <p className="mt-1 text-xs text-slate-400">미입력 시 0으로 처리됩니다</p>
        )}
      </div>

      {/* ── Edit mode: 활성 상태 ── */}
      {mode === 'edit' && (
        <div>
          <FieldLabel>활성 상태</FieldLabel>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={data.isActive}
              onChange={(e) => updateField('isActive', e.target.checked)}
              disabled={disabled}
              className="w-4 h-4 accent-blue-600 cursor-pointer"
            />
            <span className="text-sm text-slate-700">{data.isActive ? '활성' : '비활성'}</span>
          </label>
        </div>
      )}

      {/* ── 유통 정책 ── */}
      <div>
        <FieldLabel>유통 정책</FieldLabel>
        <div className="space-y-2">
          {DISTRIBUTION_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                data.distributionType === opt.value
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-slate-200 hover:bg-slate-50'
              } ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
            >
              <input
                type="radio"
                name="distributionType"
                value={opt.value}
                checked={data.distributionType === opt.value}
                onChange={() => updateField('distributionType', opt.value)}
                disabled={disabled}
                className="mt-1"
              />
              <div>
                <p className="font-medium text-slate-800">{opt.label}</p>
                <p className="text-sm text-slate-500">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
        {mode === 'edit' && (
          <p className="mt-2 text-xs text-slate-400">
            서비스 운영자가 상품을 검토 후 승인하면 해당 서비스에 노출됩니다.
          </p>
        )}
      </div>

      {/* ── 서비스 선택 ── */}
      <div>
        <FieldLabel>서비스 선택</FieldLabel>
        <p className="text-xs text-slate-400 mb-3">이 상품을 노출할 서비스를 선택하세요</p>
        <div className="grid grid-cols-2 gap-2">
          {AVAILABLE_SERVICES.map((svc) => {
            const selected = (data.serviceKeys || []).includes(svc.key);
            return (
              <label
                key={svc.key}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selected
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-200 hover:bg-slate-50'
                } ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleServiceKey(svc.key)}
                  disabled={disabled}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <span className="text-sm font-medium text-slate-700">
                  {svc.name}
                </span>
              </label>
            );
          })}
        </div>
        <FieldError error={errors.serviceKeys} />
      </div>
    </div>
  );
}
