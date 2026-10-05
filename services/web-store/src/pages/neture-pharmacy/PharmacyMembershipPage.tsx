/**
 * Neture 약국 기본 가입 — DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1 §3-1
 * 화면 계약: docs/baseline/O4O-NETURE-PHARMACY-SIGNUP-APPROVAL-CONTRACT-V1.md §3-1 · §4 · §5 (signupContract.ts)
 *
 * 로그인만 된 사용자가 약국 매장을 여는 유일한 경로다(약국은 `/start-store` 자가 가입 대상이 아니다).
 *   GET  /api/v1/neture/pharmacy/membership  → 내 신청 원장(없으면 null)
 *   POST /api/v1/neture/pharmacy/membership  → 신청 · 재신청(반려 · 종료 상태에서 같은 행)
 * 자격 확인은 Neture 운영자가 한다(자동 검증 없음). 기본 승인은 세미프랜차이즈 가입을 만들지 않는다.
 *
 * `/start-pharmacy`(StoreGate 밖 — 매장이 아직 없는 사용자)와 내 매장 메뉴(`/store/pharmacy/membership`) 두 곳에서 연다.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { WORKSPACE_PATHS } from '../../config/workspace';
import { useAuth } from '../../contexts/AuthContext';
import { useUnifiedStore } from '../../contexts/StoreContext';
import { withReturnTo } from '../../lib/returnTo';
import {
  neturePharmacyApi,
  pharmacyErrorMessage,
  type PharmacyMembership,
  type PharmacyMembershipInput,
} from '../../api/neturePharmacy';
import { StatusBadge, formatDate, pharmacyStorePath } from './shared';
import {
  AFTER_APPROVAL_GUIDE,
  BASIC_MEMBERSHIP_VIEW,
  SEMI_FRANCHISE_TIMING_NOTICE,
  SIGNUP_STEPS,
  canReapplyBasic,
  completedSteps,
  formatBusinessNumber,
  normalizeBusinessNumber,
  validateSignup,
  type SignupFieldErrors,
  type StatusView,
} from './signupContract';

const EMPTY: PharmacyMembershipInput = { pharmacyName: '', businessNumber: '', pharmacistLicenseNumber: '', address: '', phone: '' };

const TONE_CLASS: Record<StatusView['tone'], string> = {
  info: 'border-sky-200 bg-sky-50',
  success: 'border-emerald-200 bg-emerald-50',
  warn: 'border-amber-200 bg-amber-50',
  error: 'border-red-200 bg-red-50',
  muted: 'border-slate-200 bg-slate-50',
};

const REASON_LABEL: Record<string, string> = { rejected: '반려 사유', suspended: '정지 사유', terminated: '종료 사유' };

const INPUT = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none disabled:bg-slate-50';

function Steps({ done }: { done: number }) {
  return (
    <ol className="mb-6 flex items-center gap-2 text-xs" data-testid="pharmacy-signup-steps">
      {SIGNUP_STEPS.map((label, i) => {
        const state = i < done ? 'done' : i === done ? 'current' : 'todo';
        const cls = state === 'done'
          ? 'border-emerald-500 bg-emerald-500 text-white'
          : state === 'current'
            ? 'border-indigo-600 text-indigo-700'
            : 'border-slate-300 text-slate-400';
        return (
          <li key={label} className="flex flex-1 items-center gap-2" aria-current={state === 'current' ? 'step' : undefined}>
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-semibold ${cls}`}>{i + 1}</span>
            <span className={state === 'todo' ? 'text-slate-400' : 'font-medium text-slate-700'}>{label}</span>
            {i < SIGNUP_STEPS.length - 1 && <span className="h-px flex-1 bg-slate-200" />}
          </li>
        );
      })}
    </ol>
  );
}

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">{label}</label>
      {children}
      {error ? <p className="mt-1 text-xs text-red-600" role="alert">{error}</p> : hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export default function PharmacyMembershipPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { reload } = useUnifiedStore();
  const [membership, setMembership] = useState<PharmacyMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<PharmacyMembershipInput>(EMPTY);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const m = await neturePharmacyApi.getMembership();
      setMembership(m);
      if (m) setForm((f) => ({ ...f, pharmacyName: m.pharmacy_name, businessNumber: formatBusinessNumber(m.business_number), pharmacistLicenseNumber: m.pharmacist_license_number }));
    } catch (e) {
      setLoadError(pharmacyErrorMessage(e, '가입 상태를 불러오지 못했습니다.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) void load();
  }, [isAuthenticated, load]);

  if (authLoading) return <main className="center-card"><section className="card"><p>로그인 상태를 확인하는 중...</p></section></main>;
  if (!isAuthenticated) {
    return (
      <main className="center-card"><section className="card">
        <h1>약국 기본 가입</h1>
        <p>로그인이 필요합니다.</p>
        <Link className="button-link" to={withReturnTo(WORKSPACE_PATHS.login, WORKSPACE_PATHS.pharmacyEnrollment)}>로그인</Link>
      </section></main>
    );
  }

  const status = membership?.status ?? null;
  const view = status ? BASIC_MEMBERSHIP_VIEW[status] : null;
  const canApply = canReapplyBasic(status);
  const done = completedSteps(status);
  const fieldErrors: SignupFieldErrors = validateSignup(form);
  const valid = Object.keys(fieldErrors).length === 0;
  const shownErrors: SignupFieldErrors = touched ? fieldErrors : {};

  const set = (k: keyof PharmacyMembershipInput) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = k === 'businessNumber' ? formatBusinessNumber(e.target.value) : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setTouched(true);
    if (busy || !valid) return;
    setBusy(true);
    setError(null);
    try {
      const saved = await neturePharmacyApi.applyMembership({
        pharmacyName: form.pharmacyName.trim(),
        businessNumber: normalizeBusinessNumber(form.businessNumber) ?? form.businessNumber,
        pharmacistLicenseNumber: form.pharmacistLicenseNumber.trim(),
        address: form.address?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
      });
      setMembership(saved);
      setTouched(false);
    } catch (e) {
      setError(pharmacyErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10" data-testid="pharmacy-membership">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-slate-900">약국 기본 가입</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Neture 약국 매장을 이용하려면 기본 가입 승인이 필요합니다. 운영자가 사업자등록번호와 약사 면허번호를 확인합니다.
          기존 KPA 가입은 자격 근거로 쓰지 않습니다.
        </p>

        {loading ? (
          <p className="mt-6 text-sm text-slate-500">가입 상태를 확인하는 중...</p>
        ) : loadError ? (
          <div className="mt-6">
            <p className="error" role="alert">{loadError}</p>
            <button className="button-link" type="button" onClick={load}>다시 시도</button>
          </div>
        ) : (
          <div className="mt-6">
            {done !== null && <Steps done={done} />}

            {membership && view && (
              <div className={`mb-6 rounded-xl border p-4 text-sm ${TONE_CLASS[view.tone]}`} data-testid="pharmacy-membership-status">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-slate-900">{membership.pharmacy_name}</strong>
                  <StatusBadge status={membership.status} label={view.label} />
                </div>
                <p className="mt-2 text-slate-700">{view.summary}</p>
                {membership.reason && REASON_LABEL[membership.status] && (
                  <p className="mt-2 rounded-lg bg-white/70 px-3 py-2 text-slate-800" data-testid="pharmacy-membership-reason">
                    <span className="font-medium">{REASON_LABEL[membership.status]}:</span> {membership.reason}
                  </p>
                )}
                <p className="mt-2 text-slate-600">{view.next}</p>
                {membership.status === 'pending' && (
                  <dl className="mt-3 grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-xs text-slate-600">
                    <dt>사업자등록번호</dt><dd>{formatBusinessNumber(membership.business_number)}</dd>
                    <dt>약사 면허번호</dt><dd>{membership.pharmacist_license_number}</dd>
                  </dl>
                )}
                <p className="mt-3 text-xs text-slate-500">
                  신청일 {formatDate(membership.applied_at)}{membership.decided_at ? ` · 처리일 ${formatDate(membership.decided_at)}` : ''}
                </p>
                {membership.status === 'active' && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link className="button-link" to={WORKSPACE_PATHS.home} onClick={reload}>내 매장으로</Link>
                    <Link className="secondary-link self-center" to={pharmacyStorePath('semiFranchises')} onClick={reload}>세미프랜차이즈 가입 신청</Link>
                  </div>
                )}
              </div>
            )}

            {canApply && (
              <form onSubmit={submit} noValidate data-testid="pharmacy-membership-form">
                <h2 className="mb-3 text-base font-semibold text-slate-900">기본 정보 <span className="text-xs font-normal text-slate-500">(필수)</span></h2>
                <Field id="pharmacy-name" label="약국 이름" error={shownErrors.pharmacyName}>
                  <input id="pharmacy-name" className={INPUT} type="text" value={form.pharmacyName} onChange={set('pharmacyName')} disabled={busy} maxLength={255} />
                </Field>
                <Field id="business-number" label="사업자등록번호" hint="숫자 10자리" error={shownErrors.businessNumber}>
                  <input id="business-number" className={INPUT} type="text" inputMode="numeric" value={form.businessNumber} onChange={set('businessNumber')} placeholder="000-00-00000" disabled={busy} />
                </Field>
                <Field id="license-number" label="약사 면허번호" error={shownErrors.pharmacistLicenseNumber}>
                  <input id="license-number" className={INPUT} type="text" value={form.pharmacistLicenseNumber} onChange={set('pharmacistLicenseNumber')} disabled={busy} maxLength={30} />
                </Field>

                <h2 className="mb-1 mt-6 text-base font-semibold text-slate-900">추가 정보 <span className="text-xs font-normal text-slate-500">(선택)</span></h2>
                <p className="mb-3 text-xs text-slate-500">
                  {membership ? '비워 두면 이전에 입력한 값이 그대로 유지됩니다.' : '운영자 확인과 매장 정보에 쓰입니다.'}
                </p>
                <Field id="pharmacy-address" label="주소" error={shownErrors.address}>
                  <input id="pharmacy-address" className={INPUT} type="text" value={form.address ?? ''} onChange={set('address')} disabled={busy} maxLength={500} />
                </Field>
                <Field id="pharmacy-phone" label="전화번호" error={shownErrors.phone}>
                  <input id="pharmacy-phone" className={INPUT} type="tel" value={form.phone ?? ''} onChange={set('phone')} disabled={busy} maxLength={50} />
                </Field>

                {error && <p className="error mb-3 text-sm" role="alert">{error}</p>}
                <button type="submit" className="button-link border-0 disabled:opacity-50" disabled={busy}>
                  {busy ? '처리 중...' : membership ? '다시 신청' : '가입 신청'}
                </button>
              </form>
            )}

            {status !== 'active' && (
              <aside className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm" data-testid="pharmacy-after-approval-guide">
                <h2 className="font-semibold text-slate-900">승인 후 이용할 수 있는 것</h2>
                <ul className="mt-2 space-y-1 text-slate-700">
                  {AFTER_APPROVAL_GUIDE.map((g) => (
                    <li key={g.condition}><span className="font-medium">{g.condition}</span> — {g.features}</li>
                  ))}
                </ul>
                <p className="mt-3 text-slate-600">세미프랜차이즈 가입은 기본 가입과 별도로 신청하고, 그 세미프랜차이즈 담당 운영자가 따로 승인합니다.</p>
                <p className="mt-1 text-xs text-slate-500">{SEMI_FRANCHISE_TIMING_NOTICE}</p>
              </aside>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
