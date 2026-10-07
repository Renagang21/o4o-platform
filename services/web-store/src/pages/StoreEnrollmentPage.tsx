import { Link } from 'react-router-dom';
import { WORKSPACE_PATHS } from '../config/workspace';

/**
 * Store 시작하기 — 사업자 가입
 *
 * WO-O4O-STORE-BUSINESS-ENROLLMENT-AND-MEMBER-ACCESS-V1 §8 · §16
 * 정책 정본: `docs/baseline/O4O-STORE-ACCESS-AND-MEMBERSHIP-V1.md`
 *
 * WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1: 약국은 여기서 열지 않는다(서버 ENROLLABLE_SERVICE_KEYS 에서 kpa 제거).
 * 약국은 내 매장(약국) 신청(`/start-pharmacy`) — 사업자번호 · 약사 면허번호를 운영자가 확인한 뒤 승인된다.
 *
 * WO-O4O-KCOSMETICS-RETIREMENT-PHASE1B-STORE-API-ADMIN-V1: 유일한 자가 가입 업종이던 '화장품 · 일반소매'(K-Cosmetics)가
 * 종료돼 이 화면에서 새 매장을 열지 않는다. 그 업종으로 열린 매장은 쓸 화면 · API 가 없기 때문이다.
 * 서버 ENROLLABLE_SERVICE_KEYS 정리는 service identity 정리 단계에서 한다(이번 단계 DEFER).
 */
export default function StoreEnrollmentPage() {
  return (
    <main className="center-card" data-testid="store-enrollment">
      <section className="card">
        <h1>매장 시작하기</h1>
        <p>현재 이 화면에서 바로 열 수 있는 업종이 없습니다. 이미 연결된 매장이 있으면 매장 홈에서 들어갑니다.</p>
        <p className="muted" data-testid="pharmacy-enrollment-link">
          약국은 <Link to={WORKSPACE_PATHS.pharmacyEnrollment}>내 매장(약국) 신청</Link>으로 신청합니다(운영자 승인 후 매장이 열립니다).
        </p>
        <a className="secondary-link" href={WORKSPACE_PATHS.home}>매장 홈으로</a>
      </section>
    </main>
  );
}
