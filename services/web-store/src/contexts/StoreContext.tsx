/**
 * Unified Store Context — WO-O4O-UNIFIED-STORE-WORKSPACE-FOUNDATION-V1 §3-②·③
 *
 *   Authenticated User
 *     → GET /work-scope/accessible-stores            (접근 가능한 매장 전부 · 자동 선택 없음)
 *     → Store Selector: 1개=자동 진입 · 2개 이상=선택(sessionStorage 복원) · 0개=안내
 *     → GET /work-scope/store-services?organizationId (서버가 매 요청 소유권 재검증 → 그 매장의 enrollment)
 *     → { organizationId, organizationName, services[] }
 *
 * 서비스 하나를 고정하지 않는다. `createRequireStoreOwner` 의 serviceKey 없는 자동 org 선택(is_primary → joined_at → id)은
 * 이 경로에서 쓰지 않는다 — 후보가 2개 이상이면 반드시 사용자가 고른다.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import {
  fetchAccessibleStores,
  fetchStoreServices,
  type AccessibleStore,
  type StoreServiceMembership,
} from '../lib/storeApi';
import {
  clearSelectedOrganizationId,
  readSelectedOrganizationId,
  writeSelectedOrganizationId,
} from '../lib/storeSelection';
import {
  isUnifiedServiceKey,
  pickCommonServiceContext,
  setActiveServiceContext,
  type UnifiedServiceKey,
} from '../lib/serviceContext';

export type StoreContextStatus =
  | 'idle'          // 비로그인
  | 'loading'       // 매장 목록 조회 중
  | 'error'         // 목록 조회 실패 (가입 없음으로 바꾸지 않는다)
  | 'none'          // 접근 가능한 매장 0
  | 'select'        // 2개 이상 · 아직 선택 전
  | 'resolving'     // 선택됨 · enrollment 조회 중
  | 'ready';        // 선택된 매장 + services 확정

export interface UnifiedStoreContextValue {
  status: StoreContextStatus;
  stores: AccessibleStore[];
  organizationId: string | null;
  organizationName: string | null;
  services: StoreServiceMembership[];
  /**
   * §8-4 서비스 문맥(2차 축). 이 매장의 활성 enrollment 중 canonical 우선순위(KPA → KCos → PH)로 고른 공통 문맥.
   * 내 매장(/store) · 매장 HUB(/hub) 의 백엔드 호출은 이 문맥으로 나간다. null = 이용 가능한 서비스 업무공간 없음.
   */
  commonServiceKey: UnifiedServiceKey | null;
  /** 서비스 업무(/work/:serviceKey) 진입 가능한 enrollment 의 serviceKey 목록(활성 + workspace 제공) */
  workServiceKeys: UnifiedServiceKey[];
  error: string | null;
  selectStore: (organizationId: string) => void;
  clearStore: () => void;
  reload: () => void;
}

const StoreContext = createContext<UnifiedStoreContextValue | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [stores, setStores] = useState<AccessibleStore[]>([]);
  const [listState, setListState] = useState<'loading' | 'error' | 'done'>('loading');
  const [selectedId, setSelectedId] = useState<string | null>(() => readSelectedOrganizationId());
  const [services, setServices] = useState<StoreServiceMembership[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // 1) 접근 가능한 매장 목록
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { setStores([]); setListState('done'); setServices(null); return; }
    let cancelled = false;
    setListState('loading');
    setError(null);
    fetchAccessibleStores()
      .then((list) => { if (!cancelled) { setStores(list); setListState('done'); } })
      .catch(() => { if (!cancelled) { setStores([]); setListState('error'); setError('접근 가능한 매장을 불러오지 못했습니다.'); } });
    return () => { cancelled = true; };
  }, [isAuthenticated, authLoading, user?.id, tick]);

  // 2) Selector 규칙: 1개 자동 · 저장값이 목록에 있으면 복원 · 아니면 선택 대기
  const effectiveId = useMemo(() => {
    if (listState !== 'done' || stores.length === 0) return null;
    if (stores.length === 1) return stores[0].organizationId;
    return selectedId && stores.some((s) => s.organizationId === selectedId) ? selectedId : null;
  }, [listState, stores, selectedId]);

  // 3) 선택된 매장의 enrollment — 서버 재검증
  useEffect(() => {
    if (!effectiveId) { setServices(null); return; }
    let cancelled = false;
    setServices(null);
    fetchStoreServices(effectiveId)
      .then((r) => {
        if (cancelled) return;
        if (r.status === 'resolved' && r.organizationId === effectiveId) {
          setServices(r.services.filter((s) => s.organizationId === effectiveId));
          return;
        }
        // NOT_STORE_MEMBER 등 — 서버 판정이 정본. 선택값을 버리고 다시 고르게 한다.
        clearSelectedOrganizationId();
        setSelectedId(null);
        setError('선택한 매장에 대한 접근 권한이 확인되지 않습니다. 매장을 다시 선택해 주세요.');
        setTick((t) => t + 1);
      })
      .catch(() => { if (!cancelled) setError('매장의 서비스 목록을 불러오지 못했습니다.'); });
    return () => { cancelled = true; };
  }, [effectiveId]);

  const selectStore = useCallback((organizationId: string) => {
    writeSelectedOrganizationId(organizationId);
    setError(null);
    setSelectedId(organizationId);
  }, []);
  const clearStore = useCallback(() => {
    clearSelectedOrganizationId();
    setSelectedId(null);
    setServices(null);
  }, []);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  const status: StoreContextStatus = !isAuthenticated
    ? 'idle'
    : listState === 'loading' ? 'loading'
    : listState === 'error' ? 'error'
    : stores.length === 0 ? 'none'
    : !effectiveId ? 'select'
    : services === null ? 'resolving'
    : 'ready';

  const current = effectiveId ? stores.find((s) => s.organizationId === effectiveId) ?? null : null;

  const workServiceKeys = useMemo<UnifiedServiceKey[]>(
    () => (services ?? [])
      .filter((s) => s.enrollmentStatus === 'active' && s.workspaceAvailable)
      .map((s) => s.serviceKey)
      .filter(isUnifiedServiceKey),
    [services],
  );
  const commonServiceKey = useMemo(() => pickCommonServiceContext(workServiceKeys), [workServiceKeys]);
  // 모듈 전역 서비스 문맥의 SSOT — 매장이 바뀌면 공통 문맥도 바뀐다. (/work/:serviceKey 는 ServiceWorkLayout 이 덮어쓴다)
  useEffect(() => { setActiveServiceContext(commonServiceKey); }, [commonServiceKey]);

  return <StoreContext.Provider value={{
    status,
    stores,
    organizationId: current?.organizationId ?? null,
    organizationName: current?.organizationName ?? null,
    services: services ?? [],
    commonServiceKey,
    workServiceKeys,
    error,
    selectStore,
    clearStore,
    reload,
  }}>{children}</StoreContext.Provider>;
}

export function useUnifiedStore(): UnifiedStoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useUnifiedStore must be used within StoreProvider');
  return ctx;
}
