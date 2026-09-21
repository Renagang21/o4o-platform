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
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { StoreDashboardLayout, resolveStoreMenu, useStoreCapabilities, type StoreDashboardConfig } from '@o4o/store-ui-core';
import { StoreOwnerAgreementGate } from '@o4o/shared-space-ui';
import { getUserDisplayName } from '@o4o/account-ui';
import { authClient, useAuth } from '../../contexts/AuthContext';
import { useUnifiedStore } from '../../contexts/StoreContext';
import { fetchStoreCapabilities } from '../../api/storeHub';
import { UNIFIED_STORE_CONFIG } from '../../config/storeMenu';
import { WORKSPACE_PATHS } from '../../config/workspace';
import { SERVICE_LABEL, type UnifiedServiceKey } from '../../lib/serviceContext';

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
  const { commonServiceKey } = useUnifiedStore();
  return (
    <StoreAgreementGate serviceKey={commonServiceKey}>
      <StoreWorkDashboard config={UNIFIED_STORE_CONFIG} withCapabilities />
    </StoreAgreementGate>
  );
}
