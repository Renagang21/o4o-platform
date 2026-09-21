import { Link } from 'react-router-dom';
import { BRAND, WORKSPACE_PATHS } from '../config/workspace';
import { useUnifiedStore } from '../contexts/StoreContext';

/** Workspace 홈 — 선택된 매장 + 서비스 요약 + 4 영역 진입(§8-3). */
export default function HomePage() {
  const { organizationName, services } = useUnifiedStore();
  const available = services.filter((s) => s.enrollmentStatus === 'active' && s.workspaceAvailable);
  return <main className="page"><section className="hero">
    <span className="eyebrow">Unified Store Workspace</span>
    <h1>{organizationName || BRAND.name}</h1>
    <p>{BRAND.tagline}</p>
    <p className="muted" data-testid="home-summary">
      이 매장은 {services.length}개 서비스에 가입되어 있고, 그중 {available.length}개의 매장 업무공간을 이용할 수 있습니다.
    </p>
    <div className="actions">
      <Link className="button-link" to={WORKSPACE_PATHS.myStore}>내 매장</Link>
      <Link className="secondary-link" to={WORKSPACE_PATHS.serviceWork}>서비스 업무</Link>
      <Link className="secondary-link" to={WORKSPACE_PATHS.storeHub}>매장 HUB</Link>
      <Link className="secondary-link" to={WORKSPACE_PATHS.myServices}>내 서비스</Link>
    </div>
  </section></main>;
}
