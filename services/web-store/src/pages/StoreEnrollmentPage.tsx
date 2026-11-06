import { Link } from 'react-router-dom';
import { WORKSPACE_PATHS } from '../config/workspace';

/**
 * Store 시작하기 — 사업자 가입
 *
 * WO-O4O-STORE-BUSINESS-ENROLLMENT-AND-MEMBER-ACCESS-V1 §8 · §16
 * 정책 정본: `docs/baseline/O4O-STORE-ACCESS-AND-MEMBERSHIP-V1.md`
 *
 * WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1: 약국은 여기서 열지 않는다(서버 ENROLLABLE_SERVICE_KEYS 에서 kpa 제거).
 * 약국 경영자 회원 등록 승인 시 매장은 자동 연결된다. 별도 매장 신청은 받지 않는다.
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
          약국 경영자 회원 등록이 승인되면 매장이 자동 연결됩니다. <Link to={WORKSPACE_PATHS.pharmacyEnrollment}>회원 등록·매장 연결 안내</Link>에서 확인할 수 있습니다.
        </p>
        <a className="secondary-link" href={WORKSPACE_PATHS.home}>매장 홈으로</a>
      </section>
    </main>
  );
}
