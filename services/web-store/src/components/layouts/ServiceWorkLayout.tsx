/**
 * ServiceWorkLayout — 서비스 업무(/work/:serviceKey) 골격. WO-O4O-UNIFIED-STORE-WORKSPACE-FOUNDATION-V1 §8-3·§8-4
 *
 * 서비스 클릭 = **workspace 안의 문맥 전환**(handoff 아님).
 *   - :serviceKey 가 이 매장의 활성 enrollment(workServiceKeys)에 없으면 안내만 한다(서버가 SSOT — 화면은 표시 분기).
 *   - 렌더 시점에 모듈 전역 서비스 문맥을 그 서비스로 set 한다. 자식 effect 가 부모 effect 보다 먼저 실행되므로
 *     effect 가 아니라 렌더 중에 set 해야 자식 페이지의 첫 fetch 가 올바른 prefix 로 나간다(멱등 대입).
 *   - 벗어나면(cleanup) 내 매장 문맥(effectiveServiceKey = 고정 서비스 ?? 공통 우선순위)으로 되돌린다(§21-13).
 *   - `key={serviceKey}` 로 서비스가 바뀌면 하위 트리를 다시 mount 한다(이전 서비스 데이터 잔존 방지).
 */
import { useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useUnifiedStore } from '../../contexts/StoreContext';
import { SERVICE_WORK_CONFIGS } from '../../config/storeMenu';
import { WORKSPACE_PATHS } from '../../config/workspace';
import { isUnifiedServiceKey, setActiveServiceContext, type UnifiedServiceKey } from '../../lib/serviceContext';
import { StoreAgreementGate, StoreWorkDashboard } from './UnifiedStoreLayout';

/** /work/<serviceKey>/... 의 서비스 키 — 정적 route(/work/kpa-society) 와 동적 route(/work/:serviceKey) 모두 지원 */
function useWorkServiceKey(): string | undefined {
  const { serviceKey } = useParams<{ serviceKey: string }>();
  const { pathname } = useLocation();
  if (serviceKey) return serviceKey;
  const m = pathname.match(new RegExp(`^${WORKSPACE_PATHS.serviceWork}/([^/]+)`));
  return m?.[1];
}

function ServiceWorkBody({ serviceKey, restoreServiceKey }: { serviceKey: UnifiedServiceKey; restoreServiceKey: UnifiedServiceKey | null }) {
  setActiveServiceContext(serviceKey);
  useEffect(() => {
    setActiveServiceContext(serviceKey);
    return () => { setActiveServiceContext(restoreServiceKey); };
  }, [serviceKey, restoreServiceKey]);
  return (
    <StoreAgreementGate serviceKey={serviceKey}>
      <StoreWorkDashboard config={SERVICE_WORK_CONFIGS[serviceKey]} />
    </StoreAgreementGate>
  );
}

export default function ServiceWorkLayout() {
  const serviceKey = useWorkServiceKey();
  const { workServiceKeys, effectiveServiceKey } = useUnifiedStore();
  if (!isUnifiedServiceKey(serviceKey) || !workServiceKeys.includes(serviceKey)) {
    return (
      <main className="center-card"><section className="card" data-testid="service-work-unavailable">
        <h1>이용할 수 없는 서비스 업무입니다</h1>
        <p>이 매장이 가입한 서비스가 아니거나 아직 업무공간이 제공되지 않는 서비스입니다.</p>
        <Link className="button-link" to={WORKSPACE_PATHS.serviceWork}>서비스 업무로 돌아가기</Link>
      </section></main>
    );
  }
  return <ServiceWorkBody key={serviceKey} serviceKey={serviceKey} restoreServiceKey={effectiveServiceKey} />;
}

/** /work 인덱스 — 이 매장의 서비스 업무 진입점 목록 */
export function ServiceWorkIndexPage() {
  const { organizationName, services, workServiceKeys } = useUnifiedStore();
  return <main className="page"><section className="hero">
    <span className="eyebrow">{organizationName}</span>
    <h1>서비스 업무</h1>
    <p className="muted">서비스에 종속된 업무(거래 대상 상품 · 주문 · 서비스 고유 프로그램)입니다. 공통 매장 업무는 <Link to={WORKSPACE_PATHS.myStore}>내 매장</Link>에 있습니다.</p>
    {workServiceKeys.length === 0 && <p data-testid="service-work-empty">이용 가능한 서비스 업무공간이 없습니다.</p>}
    <ul className="option-list" data-testid="service-work-list">
      {services.map((s) => {
        const enterable = isUnifiedServiceKey(s.serviceKey) && workServiceKeys.includes(s.serviceKey);
        return <li key={s.serviceKey}>
          {enterable
            ? <Link className="option" to={`${WORKSPACE_PATHS.serviceWork}/${s.serviceKey}`}>
                <span className="option-name">{s.serviceName}</span>
                <span className="option-meta">서비스 업무 열기 →</span>
              </Link>
            : <span className="option unavailable">
                <span className="option-name">{s.serviceName}</span>
                <span className="option-meta">{s.enrollmentStatus === 'active' ? '업무공간 제공 전' : '비활성'}</span>
              </span>}
        </li>;
      })}
    </ul>
  </section></main>;
}

/** /work/:serviceKey 인덱스 — 그 서비스 업무의 홈(메뉴 안내) */
export function ServiceWorkHomePage() {
  const serviceKey = useWorkServiceKey();
  if (!isUnifiedServiceKey(serviceKey)) return null;
  const config = SERVICE_WORK_CONFIGS[serviceKey];
  const sections = (config.menuSections ?? []).filter((s) => s.label);
  return (
    <div className="space-y-6" data-testid={`service-work-home-${serviceKey}`}>
      <header>
        <h1 className="text-2xl font-bold text-slate-900">{config.serviceName} 서비스 업무</h1>
        <p className="text-sm text-slate-500 mt-1">이 서비스에서만 쓰는 업무입니다. 매장 공통 업무는 내 매장에서 처리합니다.</p>
      </header>
      {sections.map((section) => (
        <section key={section.label} className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-500 mb-3">{section.label}</h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {section.items.map((item) => (
              <li key={item.key}>
                <Link to={`${config.basePath}${item.subPath}`} className="block rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-800 hover:border-slate-400">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
