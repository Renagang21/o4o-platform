import { Link } from 'react-router-dom';
import { PLATFORM_ORIGIN, WORKSPACE_PATHS } from '../config/workspace';
import { useUnifiedStore } from '../contexts/StoreContext';

/**
 * 접근 가능한 매장 0 — 가입 유도(§3-③). 매장 신청·승인은 각 서비스가 소유하므로 대표 홈으로 안내만 한다
 * (여기서 조직·membership 을 만들지 않는다).
 */
export default function NoStorePage() {
  const { reload } = useUnifiedStore();
  return <main className="center-card"><section className="card" data-testid="no-store">
    <h1>연결된 매장이 없습니다</h1>
    <p>이 계정으로 접근할 수 있는 매장(조직)이 없습니다. 이용 중인 서비스에서 매장 경영자 신청·승인이 끝나면 여기서 매장 업무공간을 열 수 있습니다.</p>
    <p className="muted">서비스별 매장 신청은 내 매장 신청 절차를 따릅니다.</p>
    {/*
      WO-O4O-STORE-BUSINESS-ENROLLMENT-AND-MEMBER-ACCESS-V1 §8 · §16:
        매장이 없는 사용자가 여기서 막히면 더 갈 곳이 없었다. 자가 가입과 받은 초대 수락,
        두 출구를 같이 둔다.
      WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1: 약국은 내 매장(약국) 신청(/start-pharmacy) — 승인 대기 중에도 여기서 상태를 본다.
    */}
    <div className="actions">
      <Link className="button-link" to={WORKSPACE_PATHS.pharmacyEnrollment}>내 매장(약국) 신청 · 신청 상태</Link>
      <Link className="link-button secondary-link" to={WORKSPACE_PATHS.enrollment}>매장 시작하기(약국 외 업종)</Link>
      <Link className="link-button secondary-link" to={WORKSPACE_PATHS.invitations}>받은 초대 확인</Link>
      <a className="link-button secondary-link" href={PLATFORM_ORIGIN}>Neture 홈에서 서비스 보기</a>
      <button className="link-button secondary-link" type="button" onClick={reload}>다시 확인</button>
    </div>
  </section></main>;
}
