/**
 * UnifiedStoreLayout — 내 매장(/store) 공통 골격. WO-O4O-UNIFIED-STORE-WORKSPACE-FOUNDATION-V1 §8-3
 *
 * KPA `KpaStoreLayoutWrapper` 의 역할을 Workspace 안에서 1회만 수행한다.
 *   - 상단 헤더·법정 footer 는 RootShell 이 이미 가지므로 `hideTopBar` + footer 미주입.
 *   - 사이드바 config = UNIFIED_STORE_CONFIG(공통 기능만). capability 필터는 KPA 와 같은 `fetchStoreCapabilities`.
 *   - orgName = Unified Store Context 의 organizationName(서비스 API 재조회 없음).
 *   - 매장 경영자 이용계약(428) 게이트는 공통 문맥 서비스(commonServiceKey) 기준으로 1회 통과한다.
 *
 * 공통 매장 API 는 `commonServiceKey` 문맥으로 호출된다(StoreContext 가 모듈 전역에 set). 이 layout 은 문맥을
 * 바꾸지 않는다 — /work/:serviceKey 에서 돌아오면 ServiceWorkLayout 의 cleanup 이 공통 문맥으로 되돌린다.
 */
import { useEffect, type ReactNode } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  COSMETICS_STORE_CONFIG,
  StoreDashboardLayout,
  resolveStoreMenu,
  useStoreCapabilities,
  type StoreDashboardConfig,
} from '@o4o/store-ui-core';
import { StoreOwnerAgreementGate } from '@o4o/shared-space-ui';
import { getUserDisplayName } from '@o4o/account-ui';
import { authClient, useAuth } from '../../contexts/AuthContext';
import { useUnifiedStore } from '../../contexts/StoreContext';
import { fetchStoreCapabilities } from '../../api/storeHub';
import { UNIFIED_STORE_CONFIG } from '../../config/storeMenu';
import { WORKSPACE_PATHS } from '../../config/workspace';
import {
  SERVICE_LABEL,
  isServiceStoreOwner,
  isUnifiedServiceKey,
  setActiveServiceContext,
  toServiceScopedStorePath,
  type UnifiedServiceKey,
} from '../../lib/serviceContext';

export function StoreAgreementGate({ serviceKey, children }: { serviceKey: UnifiedServiceKey | null; children: ReactNode }) {
  const { logout } = useAuth();
  if (!serviceKey) return <>{children}</>;
  return (
    <StoreOwnerAgreementGate serviceKey={serviceKey} serviceName={SERVICE_LABEL[serviceKey]} api={authClient.api} onLogout={logout}>
      {children}
    </StoreOwnerAgreementGate>
  );
}

/** 사이드바 + 본문(Outlet) — 내 매장 / 서비스 업무가 공유하는 골격 */
export function StoreWorkDashboard({ config, withCapabilities = false }: { config: StoreDashboardConfig; withCapabilities?: boolean }) {
  const { user, logout } = useAuth();
  const { organizationName } = useUnifiedStore();
  const navigate = useNavigate();
  const caps = useStoreCapabilities(withCapabilities ? fetchStoreCapabilities : undefined);
  return (
    <StoreDashboardLayout
      config={resolveStoreMenu(config, caps)}
      hideTopBar
      userName={user ? getUserDisplayName(user) : ''}
      orgName={organizationName ?? undefined}
      homeLink={WORKSPACE_PATHS.home}
      onLogout={() => { void logout(); navigate(WORKSPACE_PATHS.home); }}
    />
  );
}

export default function UnifiedStoreLayout() {
  // 서비스 고정(§21-13)이 있으면 그 서비스, 없으면 공통 우선순위 문맥으로 이용계약 게이트를 통과한다.
  const { effectiveServiceKey, scopedServiceKey } = useUnifiedStore();
  const { pathname, search, hash } = useLocation();
  // 서비스 지정 화면으로 고정된 상태에서 `/store/...` 링크를 따라오면 서비스가 보이는 URL 로 옮긴다(§21-14).
  const scopedPath = toServiceScopedStorePath(scopedServiceKey, `${pathname}${search}${hash}`);
  if (scopedPath) return <Navigate to={scopedPath} replace />;
  return (
    <StoreAgreementGate serviceKey={effectiveServiceKey}>
      <StoreWorkDashboard config={UNIFIED_STORE_CONFIG} withCapabilities />
    </StoreAgreementGate>
  );
}

/** `/work/<serviceKey>/store/...` 의 서비스 키 */
function useStoreScopeServiceKey(): string | undefined {
  const { pathname } = useLocation();
  const m = pathname.match(new RegExp(`^${WORKSPACE_PATHS.serviceWork}/([^/]+)/store(?:/|$)`));
  return m?.[1];
}

/**
 * 서비스 지정 매장 화면 — `store.neture.co.kr/work/<serviceKey>/store/*` (CHECK-O4O-URL-FIRST-CENSUS-V1 §21-13)
 *
 * 각 서비스 앱의 매장 경영자용 `/store` 화면을 서비스별 경로에서 연다. 화면은 내 매장(/store)과 같은
 * 컴포넌트이고, 서비스 문맥만 진입한 서비스로 고정한다(세션 유지 → 화면 안 `/store/...` 링크도 같은 서비스).
 *   - 이 매장의 활성 서비스가 아니면 안내만 한다(서버가 SSOT — 403 은 서버가 판정).
 *   - 렌더 시점에 문맥을 set 한다(자식 첫 fetch 가 올바른 prefix 로 나가도록 — ServiceWorkLayout 과 같은 이유).
 */
export function ServiceStoreLayout() {
  const serviceKey = useStoreScopeServiceKey();
  const { workServiceKeys, scopedServiceKey, setServiceScope } = useUnifiedStore();
  const mount = isUnifiedServiceKey(serviceKey) ? SERVICE_STORE_MOUNTS[serviceKey] : undefined;
  const valid = isUnifiedServiceKey(serviceKey) && workServiceKeys.includes(serviceKey) && !!mount;
  if (valid) setActiveServiceContext(serviceKey);
  useEffect(() => {
    if (valid && scopedServiceKey !== serviceKey) setServiceScope(serviceKey);
  }, [valid, serviceKey, scopedServiceKey, setServiceScope]);

  if (!valid || !mount || !isUnifiedServiceKey(serviceKey)) {
    return (
      <main className="center-card"><section className="card" data-testid="service-store-unavailable">
        <h1>이용할 수 없는 매장 화면입니다</h1>
        <p>이 매장이 가입한 서비스가 아니거나 아직 업무공간이 제공되지 않는 서비스입니다.</p>
        <Link className="button-link" to={WORKSPACE_PATHS.myStore}>내 매장으로 돌아가기</Link>
      </section></main>
    );
  }
  const config: StoreDashboardConfig = {
    ...mount.menu,
    serviceName: `${SERVICE_LABEL[serviceKey]} 매장`,
    basePath: `${WORKSPACE_PATHS.serviceWork}/${serviceKey}/store`,
  };
  const body = (
    <StoreAgreementGate serviceKey={serviceKey}>
      <StoreWorkDashboard config={config} withCapabilities />
    </StoreAgreementGate>
  );
  return mount.ownerOnly ? <ServiceRoleOnly serviceKey={serviceKey}>{body}</ServiceRoleOnly> : body;
}

/**
 * 서비스 지정 매장 화면의 서비스별 차이 — §21-13 · §21-15
 *   menu      : 사이드바(basePath 는 위에서 서비스 경로로 덮는다). KPA = 공통 트리 메뉴, KCos = 원본 앱 메뉴(`COSMETICS_STORE_CONFIG`).
 *   ownerOnly : 원본 앱이 `/store` 전체를 매장 경영자 가드로 막았는지(KCos `StoreOwnerGuard`). KPA 는 화면 단위(StoreOwnerOnly).
 */
const SERVICE_STORE_MOUNTS: Partial<Record<UnifiedServiceKey, { menu: StoreDashboardConfig; ownerOnly: boolean }>> = {
  'kpa-society': { menu: UNIFIED_STORE_CONFIG, ownerOnly: false },
  'k-cosmetics': { menu: COSMETICS_STORE_CONFIG, ownerOnly: true },
};

/**
 * 서비스 지정 역할 게이트 — 서비스 문맥 전환(effect) 전 첫 렌더에도 맞는 서비스로 판정하도록 serviceKey 를 직접 받는다.
 *   roles 미지정 = 매장 경영자 규칙(`isServiceStoreOwner`). 지정 시 그 목록만(예: KCos `/store/info` 는 operator 제외).
 */
export function ServiceRoleOnly({ serviceKey, roles, children }: { serviceKey: UnifiedServiceKey; roles?: readonly string[]; children: ReactNode }) {
  const { user } = useAuth();
  const ok = roles ? (user?.roles ?? []).some((r) => roles.includes(r)) : isServiceStoreOwner(user?.roles, serviceKey);
  if (ok) return <>{children}</>;
  return (
    <main className="center-card"><section className="card" data-testid="store-owner-only">
      <h1>매장 경영자만 이용할 수 있습니다</h1>
      <p>이 화면은 {SERVICE_LABEL[serviceKey]} 매장 경영자 권한이 필요합니다.</p>
      <Link className="button-link" to={WORKSPACE_PATHS.home}>홈으로</Link>
    </section></main>
  );
}

/**
 * 매장 경영자 전용 화면 — 각 서비스 앱의 owner-only 가드와 같은 규칙(현재 서비스 문맥 기준).
 *   KPA 는 `/store/my-products` · `/handled-products` · `/commerce/local-products` · `/products/multilingual/*`
 *   를 `PharmacyOwnerOnlyGuard` 로 막는다 — 옮긴 화면에서도 같은 권한 동작을 보존한다.
 */
export function StoreOwnerOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { effectiveServiceKey } = useUnifiedStore();
  if (!effectiveServiceKey || isServiceStoreOwner(user?.roles, effectiveServiceKey)) return <>{children}</>;
  return (
    <main className="center-card"><section className="card" data-testid="store-owner-only">
      <h1>매장 경영자만 이용할 수 있습니다</h1>
      <p>이 화면은 {SERVICE_LABEL[effectiveServiceKey]} 매장 경영자 권한이 필요합니다.</p>
      <Link className="button-link" to={WORKSPACE_PATHS.home}>홈으로</Link>
    </section></main>
  );
}
