/**
 * ApplyForm — O4O 적용 문의 form (MVP)
 *
 * WO-O4O-NETURE-APPLY-FORM-MVP-V1
 *
 * 기존 production-live endpoint POST /api/v1/platform/inquiries 재사용.
 * backend / DB migration 없이 frontend-only 로 구현.
 *
 * 9 필드 (이름/회사·소속/연락처/이메일/사업자유형/관심업종/문의목적/문의내용/동의)
 * subject 자동 생성: [O4O 적용 문의] {purpose}
 * source: neture_o4o_apply[:{industry}]
 * message: metadata prepend + 사용자 본문
 * query prefill: ?industry={pharmacy|clinic|dental|optical|salon|other}
 */

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, AlertCircle, Mail, ArrowRight, ArrowLeft } from 'lucide-react';
import { api } from '../../lib/apiClient';

const CONTACT_EMAIL = 'contact@neture.co.kr';

const BUSINESS_TYPES = [
  '제조·유통 사업자',
  '프랜차이즈·본부',
  '협동조합·협회',
  '지역 기반 운영자',
  '신규 사업 기획자',
  '기타',
] as const;

const PURPOSES = [
  'O4O 적용 가능성 검토',
  '공급자 참여',
  '운영자 참여',
  '매장 도입',
  '기타',
] as const;

const INDUSTRY_OPTIONS: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'pharmacy', label: '약국' },
  { key: 'clinic',   label: '의원' },
  { key: 'dental',   label: '치과' },
  { key: 'optical',  label: '안경원' },
  { key: 'salon',    label: '미용실' },
  { key: 'other',    label: '기타' },
];

const INDUSTRY_KEYS = new Set(INDUSTRY_OPTIONS.map((i) => i.key));

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[\d\s\-()]+$/;

type FormState = {
  name: string;
  company: string;
  phone: string;
  email: string;
  businessType: string;
  industry: string;
  purpose: string;
  message: string;
  consent: boolean;
};

const INITIAL_STATE: FormState = {
  name: '',
  company: '',
  phone: '',
  email: '',
  businessType: '',
  industry: '',
  purpose: '',
  message: '',
  consent: false,
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

function validate(state: FormState): FieldErrors {
  const errors: FieldErrors = {};

  if (!state.name.trim()) errors.name = '이름을 입력해 주세요.';
  if (!state.company.trim()) errors.company = '회사명 또는 소속을 입력해 주세요.';

  const phoneDigits = state.phone.replace(/\D/g, '');
  if (!state.phone.trim()) {
    errors.phone = '연락처를 입력해 주세요.';
  } else if (!PHONE_REGEX.test(state.phone) || phoneDigits.length < 9 || phoneDigits.length > 15) {
    errors.phone = '올바른 연락처 형식이 아닙니다.';
  }

  if (!state.email.trim()) {
    errors.email = '이메일을 입력해 주세요.';
  } else if (!EMAIL_REGEX.test(state.email.trim())) {
    errors.email = '올바른 이메일 주소를 입력해 주세요.';
  }

  if (!state.businessType) errors.businessType = '사업자 유형을 선택해 주세요.';
  if (state.industry && !INDUSTRY_KEYS.has(state.industry)) errors.industry = '관심 업종이 올바르지 않습니다.';
  if (!state.purpose) errors.purpose = '문의 목적을 선택해 주세요.';
  if (state.message.trim().length < 10) errors.message = '문의 내용을 10자 이상 입력해 주세요.';
  if (!state.consent) errors.consent = '개인정보 수집·이용에 동의해 주세요.';

  return errors;
}

function buildPayload(state: FormState) {
  const industryLabel =
    INDUSTRY_OPTIONS.find((i) => i.key === state.industry)?.label ?? '미지정';

  const subject = `[O4O 적용 문의] ${state.purpose}`;
  const source = state.industry
    ? `neture_o4o_apply:${state.industry}`
    : 'neture_o4o_apply';

  const message =
`[O4O 적용 문의 정보]
사업자 유형: ${state.businessType}
관심 업종: ${industryLabel}
문의 목적: ${state.purpose}

[문의 내용]
${state.message}`;

  return {
    type: 'platform' as const,
    name: state.name.trim(),
    company: state.company.trim(),
    phone: state.phone.trim(),
    email: state.email.trim(),
    subject,
    source,
    message,
  };
}

type SubmitState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success'; inquiryId: string }
  | { status: 'error'; message: string };

export default function ApplyForm() {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submit, setSubmit] = useState<SubmitState>({ status: 'idle' });

  // ?industry= prefill (1회, URL 변경 없음)
  useEffect(() => {
    const raw = searchParams.get('industry');
    if (raw && INDUSTRY_KEYS.has(raw)) {
      setForm((prev) => ({ ...prev, industry: raw }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const focusFirstError = (errs: FieldErrors) => {
    const order: Array<keyof FormState> = [
      'name', 'company', 'phone', 'email',
      'businessType', 'industry', 'purpose', 'message', 'consent',
    ];
    const firstKey = order.find((k) => errs[k]);
    if (!firstKey) return;
    const el = document.getElementById(`apply-${firstKey}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
        el.focus();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      focusFirstError(errs);
      return;
    }

    setSubmit({ status: 'submitting' });
    try {
      const { data: result } = await api.post('/platform/inquiries', buildPayload(form));
      if (result?.success && result?.data?.id) {
        setSubmit({ status: 'success', inquiryId: result.data.id });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setSubmit({
          status: 'error',
          message: result?.error || '문의 접수 중 문제가 발생했습니다.',
        });
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { error?: string } } };
      const status = axiosErr.response?.status;
      const apiError = axiosErr.response?.data?.error;
      const message =
        status === 400 && apiError
          ? apiError
          : '문의 접수 중 문제가 발생했습니다.';
      setSubmit({ status: 'error', message });
    }
  };

  if (submit.status === 'success') {
    return <SuccessPanel inquiryId={submit.inquiryId} />;
  }

  const disabled = submit.status === 'submitting';

  return (
    <section className="bg-white py-20">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
            O4O 적용 문의
          </h2>
          <p className="text-base text-slate-500">
            아래 정보를 보내주시면 영업일 기준 2~3일 내에 회신드립니다.
          </p>
        </div>

        {submit.status === 'error' && (
          <ErrorBanner message={submit.message} />
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <fieldset disabled={disabled} className="space-y-5">
            <Field
              id="apply-name"
              label="이름"
              required
              error={errors.name}
            >
              <input
                id="apply-name"
                type="text"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder="홍길동"
                className={inputCls(!!errors.name)}
                autoComplete="name"
              />
            </Field>

            <Field
              id="apply-company"
              label="회사명 / 소속"
              required
              error={errors.company}
            >
              <input
                id="apply-company"
                type="text"
                value={form.company}
                onChange={(e) => setField('company', e.target.value)}
                placeholder="협동조합 / 약국명 / 매장명 등"
                className={inputCls(!!errors.company)}
                autoComplete="organization"
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field
                id="apply-phone"
                label="연락처"
                required
                error={errors.phone}
              >
                <input
                  id="apply-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setField('phone', e.target.value)}
                  placeholder="010-1234-5678"
                  className={inputCls(!!errors.phone)}
                  autoComplete="tel"
                />
              </Field>

              <Field
                id="apply-email"
                label="이메일"
                required
                error={errors.email}
              >
                <input
                  id="apply-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setField('email', e.target.value)}
                  placeholder="example@domain.com"
                  className={inputCls(!!errors.email)}
                  autoComplete="email"
                />
              </Field>
            </div>

            <Field
              id="apply-businessType"
              label="사업자 유형"
              required
              error={errors.businessType}
            >
              <select
                id="apply-businessType"
                value={form.businessType}
                onChange={(e) => setField('businessType', e.target.value)}
                className={selectCls(!!errors.businessType)}
              >
                <option value="">선택해 주세요</option>
                {BUSINESS_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Field>

            <Field
              id="apply-industry"
              label="관심 업종"
              error={errors.industry}
              hint="선택 사항입니다."
            >
              <select
                id="apply-industry"
                value={form.industry}
                onChange={(e) => setField('industry', e.target.value)}
                className={selectCls(!!errors.industry)}
              >
                <option value="">선택 안 함</option>
                {INDUSTRY_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>{opt.label}</option>
                ))}
              </select>
            </Field>

            <Field
              id="apply-purpose"
              label="문의 목적"
              required
              error={errors.purpose}
            >
              <select
                id="apply-purpose"
                value={form.purpose}
                onChange={(e) => setField('purpose', e.target.value)}
                className={selectCls(!!errors.purpose)}
              >
                <option value="">선택해 주세요</option>
                {PURPOSES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </Field>

            <Field
              id="apply-message"
              label="문의 내용"
              required
              error={errors.message}
              hint="사업 개요 / 현재 상황 / 검토하고 싶은 항목을 자유롭게 적어주세요."
            >
              <textarea
                id="apply-message"
                value={form.message}
                onChange={(e) => setField('message', e.target.value)}
                rows={6}
                placeholder="사업 개요, 현재 상황, 검토하고 싶은 항목을 적어주세요."
                className={`${inputCls(!!errors.message)} resize-y min-h-[140px]`}
              />
            </Field>

            <ConsentRow
              checked={form.consent}
              error={errors.consent}
              onChange={(v) => setField('consent', v)}
            />

            <div className="pt-2">
              <button
                type="submit"
                disabled={disabled}
                className="w-full inline-flex items-center justify-center px-8 py-4 bg-primary-600 text-white text-base font-semibold rounded-lg hover:bg-primary-700 transition-colors shadow-sm disabled:bg-slate-400 disabled:cursor-not-allowed"
              >
                {disabled ? '전송 중...' : '문의 보내기'}
              </button>
              <p className="text-xs text-slate-500 text-center mt-3">
                전송이 어려우면{' '}
                <a
                  href={`mailto:${CONTACT_EMAIL}?subject=O4O%20%EC%A0%81%EC%9A%A9%20%EA%B2%80%ED%86%A0%20%EB%AC%B8%EC%9D%98`}
                  className="text-primary-600 hover:text-primary-700 underline"
                >
                  {CONTACT_EMAIL}
                </a>
                {' '}로 직접 보내주셔도 됩니다.
              </p>
            </div>
          </fieldset>
        </form>
      </div>
    </section>
  );
}

// ─── 보조 컴포넌트 ─────────────────────────────────────────────────────────────

function Field({
  id, label, required, error, hint, children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

function ConsentRow({
  checked, error, onChange,
}: {
  checked: boolean;
  error?: string;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="pt-2 border-t border-slate-200">
      <label className="flex items-start gap-2.5 text-sm text-slate-700 cursor-pointer">
        <input
          id="apply-consent"
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4 mt-0.5 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
        />
        <span>
          <span className="text-red-500">*</span>{' '}
          문의 접수와 답변을 위해 입력한 개인정보(이름, 회사명, 연락처, 이메일)를
          수집·이용하는 데 동의합니다. 자세한 내용은{' '}
          <Link
            to="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:text-primary-700 underline"
          >
            개인정보처리방침
          </Link>
          을 참고해 주세요.
        </span>
      </label>
      {error && <p className="mt-1.5 ml-7 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <div className="text-sm text-red-800">
          <p className="font-semibold mb-1">{message}</p>
          <p>
            잠시 후 다시 시도하시거나, 아래 이메일로 직접 보내주세요:{' '}
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=O4O%20%EC%A0%81%EC%9A%A9%20%EA%B2%80%ED%86%A0%20%EB%AC%B8%EC%9D%98`}
              className="underline font-medium"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

function SuccessPanel({ inquiryId }: { inquiryId: string }) {
  return (
    <section className="bg-white py-20">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 sm:p-10 text-center">
          <CheckCircle className="w-14 h-14 text-emerald-600 mx-auto mb-5" />
          <h2 className="text-2xl font-bold text-slate-900 mb-3">
            문의가 접수되었습니다
          </h2>
          <p className="text-base text-slate-700 leading-relaxed mb-2">
            영업일 기준 2~3일 내에 입력하신 이메일·연락처로 회신드리겠습니다.
          </p>
          <p className="text-xs text-slate-500 mb-8">
            문의 ID: <span className="font-mono">{inquiryId}</span>
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/o4o"
              className="inline-flex items-center justify-center px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              O4O 메인으로 돌아가기
            </Link>
            <Link
              to="/"
              className="inline-flex items-center justify-center px-6 py-3 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
            >
              네처 메인으로
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
          <p className="text-xs text-slate-500 mt-6 flex items-center justify-center gap-1.5">
            <Mail className="w-3.5 h-3.5" />
            추가 문의는 {CONTACT_EMAIL} 로 보내주세요.
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── 스타일 헬퍼 ───────────────────────────────────────────────────────────────

function inputCls(hasError: boolean): string {
  const base =
    'w-full px-4 py-3 text-sm border rounded-lg bg-white transition-shadow ' +
    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ' +
    'disabled:bg-slate-50 disabled:text-slate-500';
  const borderCls = hasError ? 'border-red-300' : 'border-slate-200';
  return `${base} ${borderCls}`;
}

function selectCls(hasError: boolean): string {
  return inputCls(hasError);
}
