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
    <p>약국경영자로 가입해 승인을 받으면 내 매장이 자동으로 연결됩니다. 가입 검토 중이라면 My Home에서 상태를 확인하세요.</p>
    <div className="actions">
      <a className="button-link" href={`${PLATFORM_ORIGIN}/signup`}>가입 정보 확인</a>
      <Link className="link-button secondary-link" to={WORKSPACE_PATHS.enrollment}>매장 시작하기(약국 외 업종)</Link>
      <Link className="link-button secondary-link" to={WORKSPACE_PATHS.invitations}>받은 초대 확인</Link>
      <a className="link-button secondary-link" href={PLATFORM_ORIGIN}>Neture 홈에서 서비스 보기</a>
      <button className="link-button secondary-link" type="button" onClick={reload}>다시 확인</button>
    </div>
  </section></main>;
}
