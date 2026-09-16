/**
 * StoreWorkspaceShell — Home / My Services 표면의 합성 전용 셸
 *
 * WO-O4O-STORE-WORKSPACE-INTEGRATION-AND-MY-SERVICES-V1 (§6)
 *
 * 도메인 로직 없음. MyStoreShell(사이드바 대시보드) · StoreHubShell(허브)을 대체하거나 감싸지 않는다 —
 * 사이드바가 없는 두 표면(Home · My Services)에 서비스 header/footer 슬롯 + 상위 탭 + 본문만 배치한다.
 * 서비스는 MyStoreShell 에 넘기던 header/footer/below 를 그대로 넘긴다.
 */

import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import type { StoreAccent } from '../theme/storeAccent';
import { StoreWorkspaceNav } from './StoreWorkspaceNav';
import type { StoreWorkspacePaths } from './storeWorkspace';

export interface StoreWorkspaceShellProps {
  paths: StoreWorkspacePaths;
  accent?: StoreAccent;
  /** 서비스 global header (MyStoreShell 의 header 슬롯과 같은 것) */
  header?: ReactNode;
  /** 서비스 footer (StoreFacingFooter 권장) */
  footer?: ReactNode;
  /** footer 아래 (모바일 하단 nav 등) */
  below?: ReactNode;
  /** 미지정 시 라우터 <Outlet/> */
  children?: ReactNode;
}

export function StoreWorkspaceShell({
  paths,
  accent = 'blue',
  header,
  footer,
  below,
  children,
}: StoreWorkspaceShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {header}
      <StoreWorkspaceNav paths={paths} accent={accent} />
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-6">
        {children ?? <Outlet />}
      </main>
      {footer}
      {below}
    </div>
  );
}
