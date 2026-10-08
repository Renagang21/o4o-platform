import { getAccessToken } from '@o4o/auth-client';
import { apiV1Base } from '../../lib/serviceContext';
/**
 * 내 매장(약국) 신청 · 승인 — DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1 §3-1
 *
 * 이 원장(`neture_pharmacy_memberships`)은 Neture 가입이 아니다. 신청 · 승인의 전제는 Neture 가입 승인(active)이며
 * 서버가 직접 확인한다(CHECK-NETURE-PHARMACY-STORE-COMMERCE-LOCAL-BROWSER-V1 §10 E2). 승인 전이면
 * `NETURE_MEMBERSHIP_REQUIRED` 로 거절되고, 이 화면은 Neture 가입 안내를 보인다.
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
import { PLATFORM_ORIGIN, WORKSPACE_PATHS } from '../../config/workspace';
import { useAuth } from '../../contexts/AuthContext';
import { useUnifiedStore } from '../../contexts/StoreContext';
import { withReturnTo } from '../../lib/returnTo';
import {
  neturePharmacyApi,
  pharmacyErrorCode,
  pharmacyErrorMessage,
  type PharmacyMembership,
  type PharmacyMembershipInput,
} from '../../api/neturePharmacy';
import { MEMBERSHIP_STATUS_LABEL, StatusBadge, formatDate } from './shared';

const EMPTY: PharmacyMembershipInput = { pharmacyName: '', businessNumber: '', pharmacistLicenseNumber: '', address: '', phone: '' };

const STATUS_HELP: Record<string, string> = {
  pending: 'Neture 운영자가 사업자등록증과 약사 면허번호를 확인하고 있습니다. 승인되면 내 매장을 이용할 수 있습니다.',
  active: '내 매장(약국) 신청이 승인되었습니다. 내 매장 기본 기능을 이용할 수 있습니다. 세미프랜차이즈는 내 매장에서 따로 가입 신청합니다.',
  rejected: '신청이 반려되었습니다. 정보를 확인한 뒤 다시 신청할 수 있습니다.',
  suspended: '이용이 정지되었습니다. Neture 운영자에게 문의해 주세요.',
  terminated: '이용이 종료되었습니다. 다시 신청할 수 있습니다.',
};

export default function PharmacyMembershipPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { reload } = useUnifiedStore();
  const [membership, setMembership] = useState<PharmacyMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<PharmacyMembershipInput>(EMPTY);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [netureRequired, setNetureRequired] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const m = await neturePharmacyApi.getMembership();
      setMembership(m);
      if (m) setForm((f) => ({ ...f, ...m.business_profile, pharmacyName: m.pharmacy_name, businessNumber: m.business_number, pharmacistLicenseNumber: m.pharmacist_license_number, address: m.address || m.business_profile?.address, phone: m.phone || f.phone }));
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
        <h1>내 매장(약국) 신청</h1>
        <p>로그인이 필요합니다.</p>
        <Link className="button-link" to={withReturnTo(WORKSPACE_PATHS.login, WORKSPACE_PATHS.pharmacyEnrollment)}>로그인</Link>
      </section></main>
    );
  }

  const canApply = !membership || membership.status === 'rejected' || membership.status === 'terminated';
  const set = (k: keyof PharmacyMembershipInput) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const ready = form.pharmacyName.trim() && form.businessNumber.trim() && form.pharmacistLicenseNumber.trim() && form.address?.trim() && form.representativeName?.trim() && form.businessType?.trim() && form.businessCategory?.trim() && form.phone?.trim() && (documentFile || form.businessRegistrationDocumentId);

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (busy || !ready) return;
    setBusy(true);
    setError(null);
    setNetureRequired(false);
    try {
      let documentId = form.businessRegistrationDocumentId;
      if (documentFile) {
        const body = new FormData(); body.append('file', documentFile);
        const response = await fetch(`${apiV1Base()}/neture/pharmacy/business-registration`, { method: 'POST', headers: { Authorization: `Bearer ${getAccessToken()}` }, body });
        const result = await response.json();
        if (!response.ok) throw Object.assign(new Error(typeof result.error === 'string' ? result.error : result.error?.message || '사업자등록증 업로드에 실패했습니다.'), { response: { data: result } });
        documentId = result.data.id;
        setForm((f) => ({ ...f, businessRegistrationDocumentId: documentId }));
        setDocumentFile(null);
      }
      const saved = await neturePharmacyApi.applyMembership({
        businessRegistrationDocumentId: documentId,
        representativeName: form.representativeName?.trim(),
        businessType: form.businessType?.trim(),
        businessCategory: form.businessCategory?.trim(),
        pharmacyName: form.pharmacyName.trim(),
        businessNumber: form.businessNumber.trim(),
        pharmacistLicenseNumber: form.pharmacistLicenseNumber.trim(),
        address: form.address?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
      });
      setMembership(saved);
    } catch (e) {
      setError(pharmacyErrorMessage(e));
      setNetureRequired(pharmacyErrorCode(e) === 'NETURE_MEMBERSHIP_REQUIRED');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="center-card" data-testid="pharmacy-membership">
      <section className="card">
        <h1>내 매장(약국) 신청</h1>
        <p>약국 매장을 이용하려면 내 매장(약국) 신청 승인이 필요합니다. 메인 이메일 확인을 마친 뒤 사업자등록증 기재 정보와 사본, 약사 면허번호를 제출해 주세요. 약국 여부는 운영자가 오프라인으로 확인합니다.</p>

        {loading ? (
          <p>가입 상태를 확인하는 중...</p>
        ) : loadError ? (
          <>
            <p className="error" role="alert">{loadError}</p>
            <button className="button-link" type="button" onClick={load}>다시 시도</button>
          </>
        ) : (
          <>
            {membership && (
              <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm" data-testid="pharmacy-membership-status">
                <div className="flex items-center gap-2">
                  <strong>{membership.pharmacy_name}</strong>
                  <StatusBadge status={membership.status} />
                </div>
                <p className="mt-2 text-slate-600">{STATUS_HELP[membership.status] ?? MEMBERSHIP_STATUS_LABEL[membership.status]}</p>
                {membership.reason && <p className="mt-1 text-slate-600">사유: {membership.reason}</p>}
                <p className="mt-1 text-xs text-slate-500">신청일 {formatDate(membership.applied_at)}{membership.decided_at ? ` · 처리일 ${formatDate(membership.decided_at)}` : ''}</p>
                {membership.status === 'active' && (
                  <div className="actions">
                    <Link className="button-link" to={WORKSPACE_PATHS.home} onClick={reload}>내 매장으로</Link>
                  </div>
                )}
              </div>
            )}

            {canApply && (
              <form onSubmit={submit}>
                <label htmlFor="pharmacy-name">약국 이름 *</label>
                <input id="pharmacy-name" type="text" value={form.pharmacyName} onChange={set('pharmacyName')} disabled={busy} />
                <label htmlFor="business-number">사업자등록번호 (10자리) *</label>
                <input id="business-number" type="text" inputMode="numeric" value={form.businessNumber} onChange={set('businessNumber')} placeholder="000-00-00000" disabled={busy} />
                <label htmlFor="license-number">약사 면허번호 *</label>
                <input id="license-number" type="text" value={form.pharmacistLicenseNumber} onChange={set('pharmacistLicenseNumber')} disabled={busy} />
                <label htmlFor="representative-name">대표자명 *</label>
                <input id="representative-name" value={form.representativeName || ''} onChange={set('representativeName')} disabled={busy} />
                <label htmlFor="business-type">업태 *</label>
                <input id="business-type" value={form.businessType || ''} onChange={set('businessType')} disabled={busy} />
                <label htmlFor="business-category">종목 *</label>
                <input id="business-category" value={form.businessCategory || ''} onChange={set('businessCategory')} disabled={busy} />
                <label htmlFor="registration-document">사업자등록증 사본 *</label>
                <input id="registration-document" type="file" accept="application/pdf,image/jpeg,image/png" disabled={busy} onChange={(e) => setDocumentFile(e.target.files?.[0] || null)} />
                <p>PDF, JPG, PNG · 최대 10MB. 약사면허증 파일은 받지 않습니다.{form.businessRegistrationDocumentId ? ' 기존 등록증을 재사용합니다.' : ''}</p>
                <label htmlFor="pharmacy-address">등록증의 사업장 주소 *</label>
                <input id="pharmacy-address" type="text" value={form.address ?? ''} onChange={set('address')} disabled={busy} />
                <label htmlFor="pharmacy-phone">약국 전화번호 *</label>
                <input id="pharmacy-phone" type="text" value={form.phone ?? ''} onChange={set('phone')} disabled={busy} />
                <button type="submit" disabled={busy || !ready}>
                  {busy ? '처리 중...' : membership ? '다시 신청' : '가입 신청'}
                </button>
              </form>
            )}
            {error && <p className="error" role="alert">{error}</p>}
            {netureRequired && (
              <div className="actions" data-testid="pharmacy-membership-neture-required">
                <a className="button-link" href={PLATFORM_ORIGIN}>Neture 가입 상태 확인 · 신청</a>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
