import { Link } from 'react-router-dom';
import { BRAND, WORKSPACE_PATHS } from '../config/workspace';
import { useUnifiedStore } from '../contexts/StoreContext';
import { pharmacyStorePath } from './neture-pharmacy/shared';
import { useRetiredOnlyStore } from '../components/layouts/UnifiedStoreLayout';

/** Workspace 홈 — 선택된 매장 + 서비스 요약 + 4 영역 진입(§8-3). */
export default function HomePage() {
  const { organizationName, effectiveServiceKey } = useUnifiedStore();
  // 약국 문맥은 매장 HUB 단계 없이 내 매장에서 바로 공급 상품을 주문한다(DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1 §6).
  const pharmacy = effectiveServiceKey === 'kpa-society';
  // 내 서비스와 같은 기준 — 이 앱이 열 수 있는 업무공간만 센다(종료 서비스 제외).
  const retiredOnly = useRetiredOnlyStore();
  return <main className="page"><section className="hero">
    <span className="eyebrow">Unified Store Workspace</span>
    <h1>{organizationName || BRAND.name}</h1>
    <p>{BRAND.tagline}</p>
    <p className="muted" data-testid="home-summary">
      내 매장 제품과 자료를 관리하고, 가입한 사업의 공급 상품·자료를 이용합니다.
    </p>
    <div className="actions">
      <Link className="button-link" to={WORKSPACE_PATHS.myStore}>내 매장</Link>
      <Link className="secondary-link" to="/store/my-products">내 매장 제품</Link>
      <Link className="secondary-link" to="/store/library/contents">내 자료함</Link>
      {pharmacy
        ? <Link className="secondary-link" to={pharmacyStorePath('supply')}>공급 상품</Link>
        : !retiredOnly && <Link className="secondary-link" to={WORKSPACE_PATHS.library}>제공 자료</Link>}
      <Link className="secondary-link" to={WORKSPACE_PATHS.myServices}>이용 사업</Link>
    </div>
  </section></main>;
}
