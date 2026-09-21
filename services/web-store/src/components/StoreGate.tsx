/**
 * StoreGate — Workspace 화면 공통 진입 판정(Unified Store Context 상태 → 화면).
 *   idle      → 로그인 안내
 *   loading/resolving → 대기
 *   error     → 재시도
 *   none      → 매장 없음 안내(NoStorePage)
 *   select    → Store Selector 로 이동
 *   ready     → children
 * 권한 SSOT 는 서버(`store-services` 소유권 재검증)다. 이 컴포넌트는 표시 분기만 한다.
 */
import type { ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { WORKSPACE_PATHS } from '../config/workspace';
import { useAuth } from '../contexts/AuthContext';
import { useUnifiedStore } from '../contexts/StoreContext';
import NoStorePage from '../pages/NoStorePage';

function Card({ title, children }: { title: string; children?: ReactNode }) {
  return <main className="center-card"><section className="card"><h1>{title}</h1>{children}</section></main>;
}

export function StoreGate({ children }: { children: ReactNode }) {
  const { isLoading: authLoading } = useAuth();
  const { status, error, reload } = useUnifiedStore();
  const location = useLocation();

  if (authLoading) return <Card title="내 매장"><p>로그인 상태를 확인하는 중...</p></Card>;
  switch (status) {
    case 'idle':
      return <Card title="내 매장"><p>로그인이 필요합니다.</p><Link className="button-link" to={WORKSPACE_PATHS.login}>로그인</Link></Card>;
    case 'loading':
      return <Card title="내 매장"><p>접근 가능한 매장을 확인하는 중...</p></Card>;
    case 'resolving':
      return <Card title="내 매장"><p>매장의 서비스 목록을 확인하는 중...</p></Card>;
    case 'error':
      return <Card title="매장 정보를 불러오지 못했습니다"><p>{error}</p><button className="button-link" type="button" onClick={reload}>다시 시도</button></Card>;
    case 'none':
      return <NoStorePage />;
    case 'select':
      return location.pathname === WORKSPACE_PATHS.select ? <>{children}</> : <Navigate to={WORKSPACE_PATHS.select} replace />;
    case 'ready':
      return <>{children}</>;
  }
}
