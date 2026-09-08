/**
 * WorkScopeContext — active Work Scope 상태
 *
 * WO-O4O-WORK-SCOPE-CONTRACT-V0 §7
 *
 * active scope 는 **저장하지 않고 파생한다.** (route + 인증 상태) → scope.
 * 저장된 값을 신뢰하면 권한이 바뀐 뒤에도 낡은 scope 가 남는다.
 *
 * 보관 위치 우선순위(§7)는 `1. React context → 2. session storage → 3. URL` 이고
 * V0 는 1번만 쓴다. DB 저장은 하지 않는다(§7: V0 에서 DB 저장 우선하지 않는다).
 * sessionStorage 는 "마지막으로 확정된 업무 축"을 **표시 목적**으로만 기억한다 —
 * 인가 입력이 아니며, 없거나 오염돼도 판정에 영향을 주지 않는다.
 *
 * Phase 3(중앙 AI 입력)의 연결점이 `useWorkScope()` 다:
 *   입력 → useWorkScope() 로 현재 scope 확인 → AI 요청에 주입
 * 이번 WO 에서 AI 를 호출하지 않는다(§14).
 */

import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { resolveWorkScope, type WorkScope, type Workspace } from '../lib/work-scope';

/** 표시 목적 전용 키. 인가에 쓰지 않는다. */
const LAST_WORKSPACE_KEY = 'o4o.workScope.lastWorkspace';

interface WorkScopeContextValue {
  /** 현재 route·인증 상태에서 파생된 scope. */
  workScope: WorkScope;
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

  const workScope = useMemo(
    () => resolveWorkScope({ pathname: location.pathname, user, isAuthenticated }),
    [location.pathname, user, isAuthenticated],
  );

  useEffect(() => {
    if (workScope.status !== 'resolved' || workScope.workspace === 'home') return;
    try {
      sessionStorage.setItem(LAST_WORKSPACE_KEY, workScope.workspace);
    } catch {
      // 저장 실패는 무시한다 — 표시 편의일 뿐이다.
    }
  }, [workScope.status, workScope.workspace]);

  // 개발 환경 관측용(§19). 프로덕션 번들에는 포함되지 않는다.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as { __O4O_WORK_SCOPE__?: WorkScope }).__O4O_WORK_SCOPE__ = workScope;
    console.info('[WorkScope]', location.pathname, workScope);
  }, [workScope, location.pathname]);

  const value = useMemo<WorkScopeContextValue>(
    () => ({ workScope, lastResolvedWorkspace: readLastWorkspace() }),
    [workScope],
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
