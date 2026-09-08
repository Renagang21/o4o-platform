/**
 * WorkScopeContext — active Work Scope 상태
 *
 * WO-O4O-WORK-SCOPE-CONTRACT-V0 §7
 * WO-O4O-WORK-SCOPE-STORE-RESOLUTION-V0 §11·§12·§13
 *
 * active scope 는 **저장하지 않고 파생한다.**
 *
 *   route + auth        → base WorkScope        (resolveWorkScope — 기존 그대로)
 *   store workspace 면  → 서버 scope resolution  (GET /work-scope/store-resolution)
 *   merge               → active WorkScope
 *
 * 저장된 값을 신뢰하면 권한이 바뀐 뒤에도 낡은 scope 가 남는다. 그래서
 * organizationId/storeId 는 **어디에도 영구 저장하지 않는다** — localStorage 금지,
 * sessionStorage 금지, DB 금지(§13). 캐시는 React Query 메모리 캐시뿐이며
 * 키는 (사용자, serviceKey, workspace) 다.
 *
 * Phase 3(중앙 AI 입력)의 연결점이 `useWorkScope()` 다:
 *   입력 → useWorkScope() 로 현재 scope 확인 → AI 요청에 주입
 * 이번 WO 에서도 AI 를 호출하지 않는다.
 */

import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import {
  fetchStoreResolution,
  mergeStoreResolution,
  resolveWorkScope,
  shouldResolveStore,
  type WorkScope,
  type Workspace,
} from '../lib/work-scope';

/** 표시 목적 전용 키. 인가에 쓰지 않으며 매장 식별자를 담지 않는다. */
const LAST_WORKSPACE_KEY = 'o4o.workScope.lastWorkspace';

interface WorkScopeContextValue {
  /** 현재 route·인증 상태 + 서버 매장 해석이 합쳐진 scope. */
  workScope: WorkScope;
  /**
   * 서버 매장 해석이 진행 중인가.
   *
   * public WorkScope 계약을 넓히지 않기 위해 `WorkScope` 안이 아니라 여기에 둔다(§12).
   * **storeId 를 쓰기 전에 반드시 확인한다** — 로딩 중에는 위험한 기본값을 쓰지 않는다.
   */
  isResolvingStore: boolean;
  /**
   * 직전에 **확정된** 업무 축(home 제외). Home 화면이 "현재 작업 공간"을 보여줄 때 쓴다.
   * 표시용이며 권한 판정에 쓰지 않는다.
   */
  lastResolvedWorkspace: Workspace | null;
}

const WorkScopeContext = createContext<WorkScopeContextValue | undefined>(undefined);

function readLastWorkspace(): Workspace | null {
  try {
    return (sessionStorage.getItem(LAST_WORKSPACE_KEY) as Workspace) || null;
  } catch {
    // private mode 등에서 접근이 막힐 수 있다. 없으면 없는 대로 동작한다.
    return null;
  }
}

export function WorkScopeProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  const baseScope = useMemo(
    () => resolveWorkScope({ pathname: location.pathname, user, isAuthenticated }),
    [location.pathname, user, isAuthenticated],
  );

  const needsStore = shouldResolveStore(baseScope, isAuthenticated);

  // 캐시 키에 user.id 를 넣어 계정 전환 시 재해석되게 한다(§18 프런트 15·16).
  const { data: storeResolution, isFetching } = useQuery({
    queryKey: ['work-scope', 'store-resolution', user?.id ?? null, baseScope.serviceKey, baseScope.workspace],
    queryFn: () => fetchStoreResolution(baseScope.serviceKey, baseScope.workspace),
    enabled: needsStore,
    staleTime: 60_000,
    retry: false,
  });

  const workScope = useMemo(
    () => (needsStore ? mergeStoreResolution(baseScope, storeResolution) : baseScope),
    [needsStore, baseScope, storeResolution],
  );

  useEffect(() => {
    if (workScope.status !== 'resolved' || workScope.workspace === 'home') return;
    try {
      sessionStorage.setItem(LAST_WORKSPACE_KEY, workScope.workspace);
    } catch {
      // 저장 실패는 무시한다 — 표시 편의일 뿐이다.
    }
  }, [workScope.status, workScope.workspace]);

  // 개발 환경 관측용. 프로덕션 번들에는 포함되지 않는다.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as { __O4O_WORK_SCOPE__?: WorkScope }).__O4O_WORK_SCOPE__ = workScope;
    console.info('[WorkScope]', location.pathname, workScope);
  }, [workScope, location.pathname]);

  const value = useMemo<WorkScopeContextValue>(
    () => ({
      workScope,
      isResolvingStore: needsStore && isFetching,
      lastResolvedWorkspace: readLastWorkspace(),
    }),
    [workScope, needsStore, isFetching],
  );

  return <WorkScopeContext.Provider value={value}>{children}</WorkScopeContext.Provider>;
}

export function useWorkScope(): WorkScopeContextValue {
  const ctx = useContext(WorkScopeContext);
  if (ctx === undefined) {
    throw new Error('useWorkScope must be used within a WorkScopeProvider');
  }
  return ctx;
}
