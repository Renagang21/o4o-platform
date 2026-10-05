import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { storeMembershipApi, type EnrollableServiceKey } from '../api/storeMembership';
import { WORKSPACE_PATHS } from '../config/workspace';
import { useUnifiedStore } from '../contexts/StoreContext';

/**
 * Store 시작하기 — 사업자 가입
 *
 * WO-O4O-STORE-BUSINESS-ENROLLMENT-AND-MEMBER-ACCESS-V1 §8 · §16
 * 정책 정본: `docs/baseline/O4O-STORE-ACCESS-AND-MEMBERSHIP-V1.md`
 *
 * 매장이 없는 로그인 사용자가 자기 매장을 여는 유일한 화면이다. 조직·역할을 **화면이 만들지
 * 않는다** — 서버가 공용 프로비저닝 helper 로 처리하고, 여기서는 업종과 이름만 받는다.
 * 이미 매장이 있으면 서버가 그 매장을 그대로 돌려준다(중복 생성 0).
 *
 * WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1: 약국은 여기서 열지 않는다(서버 ENROLLABLE_SERVICE_KEYS 에서 kpa 제거).
 * 약국은 Neture 약국 기본 가입(`/start-pharmacy`) — 사업자번호 · 약사 면허번호를 운영자가 확인한 뒤 승인된다.
 */

const SERVICES: ReadonlyArray<{ key: EnrollableServiceKey; label: string; hint: string }> = [
  { key: 'cosmetics', label: '화장품 · 일반소매', hint: '화장품 · 소매 사업자 운영 서비스' },
  { key: 'pharmacy-hub', label: '병원 약국', hint: '병원 약국 운영 서비스' },
];

const errorMessage = (e: unknown): string =>
  e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string'
    ? (e as { message: string }).message
    : '요청을 처리하지 못했습니다.';

export default function StoreEnrollmentPage() {
  const navigate = useNavigate();
  const { reload } = useUnifiedStore();
  const [serviceKey, setServiceKey] = useState<EnrollableServiceKey>('cosmetics');
  const [businessName, setBusinessName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (busy || !businessName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await storeMembershipApi.enroll(serviceKey, businessName.trim());
      // 매장이 방금 생겼다 — context 를 갱신하지 않으면 홈이 여전히 "매장 없음" 으로 보인다.
      reload();
      navigate(WORKSPACE_PATHS.home, { replace: true });
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <main className="center-card" data-testid="store-enrollment">
      <section className="card">
        <h1>매장 시작하기</h1>
        <p>사업자 정보를 등록하면 매장 업무공간이 열립니다. 이미 연결된 매장이 있으면 그 매장으로 들어갑니다.</p>
        <p className="muted" data-testid="pharmacy-enrollment-link">
          약국은 <Link to={WORKSPACE_PATHS.pharmacyEnrollment}>약국 기본 가입</Link>으로 신청합니다(운영자 승인 후 매장이 열립니다).
        </p>

        <form onSubmit={submit}>
          <fieldset>
            <legend>업종</legend>
            {SERVICES.map((s) => (
              <label key={s.key} className="option">
                <input
                  type="radio"
                  name="serviceKey"
                  value={s.key}
                  checked={serviceKey === s.key}
                  onChange={() => setServiceKey(s.key)}
                  disabled={busy}
                />
                <span className="option-name">{s.label}</span>
                <span className="option-meta">{s.hint}</span>
              </label>
            ))}
          </fieldset>

          <label htmlFor="business-name">사업자(매장) 이름</label>
          <input
            id="business-name"
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="예: 가나상점"
            disabled={busy}
          />

          <button type="submit" disabled={busy || !businessName.trim()}>
            {busy ? '처리 중...' : '매장 열기'}
          </button>
        </form>

        {error && <p className="error" role="alert">{error}</p>}
      </section>
    </main>
  );
}
