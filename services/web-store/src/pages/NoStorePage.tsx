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
    <p>이 계정으로 접근할 수 있는 매장(조직)이 없습니다. 약국 경영자 회원 등록이 승인되면 내 매장이 자동으로 연결됩니다. 별도 매장 신청은 필요하지 않습니다.</p>
    <p className="muted">직원 초대 수락·승인 상태는 My Home에서도 확인할 수 있습니다. 최종 승인 후 매장을 이용할 수 있습니다.</p>
    <div className="actions">
      <Link className="button-link" to={WORKSPACE_PATHS.pharmacyEnrollment}>회원 등록·매장 연결 안내</Link>
      <Link className="link-button secondary-link" to={WORKSPACE_PATHS.enrollment}>매장 시작하기(약국 외 업종)</Link>
      <Link className="link-button secondary-link" to={WORKSPACE_PATHS.invitations}>받은 초대 확인</Link>
      <a className="link-button secondary-link" href={PLATFORM_ORIGIN}>Neture 홈에서 서비스 보기</a>
      <button className="link-button secondary-link" type="button" onClick={reload}>다시 확인</button>
    </div>
  </section></main>;
}
