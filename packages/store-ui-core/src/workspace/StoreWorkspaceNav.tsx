/**
 * StoreWorkspaceNav — Store Workspace 상위 4 표면 탭 (Home · My Store · Store Hub · My Services)
 *
 * WO-O4O-STORE-WORKSPACE-INTEGRATION-AND-MY-SERVICES-V1 (§6 · §19)
 *
 * 합성 전용이다. MyStoreShell 의 `banner` 슬롯 · StoreHubShell 의 `headerSlot` · StoreWorkspaceShell
 * 상단에 **같은 컴포넌트**를 꽂아 데스크톱/모바일 어디서나 같은 상위 구조를 보이게 한다.
 * 기존 사이드바 · 모바일 하단 nav 는 그대로 두고 그 위에 한 줄만 얹는다.
 */

import { NavLink, useLocation } from 'react-router-dom';
import { STORE_ACCENT_CLASSES } from '../theme/storeAccent';
import type { StoreAccent } from '../theme/storeAccent';
import {
  buildStoreWorkspaceTabs,
  resolveActiveStoreWorkspaceTab,
  type StoreWorkspacePaths,
} from './storeWorkspace';

export interface StoreWorkspaceNavProps {
  paths: StoreWorkspacePaths;
  accent?: StoreAccent;
  /** 사이드바 안(headerSlot)처럼 좁은 곳에 넣을 때 세로 배치 */
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function StoreWorkspaceNav({
  paths,
  accent = 'blue',
  orientation = 'horizontal',
  className = '',
}: StoreWorkspaceNavProps) {
  const { pathname } = useLocation();
  const active = resolveActiveStoreWorkspaceTab(pathname, paths);
  const tokens = STORE_ACCENT_CLASSES[accent];
  const tabs = buildStoreWorkspaceTabs(paths);
  const vertical = orientation === 'vertical';

  return (
    <nav
      aria-label="매장 업무공간"
      data-testid="store-workspace-nav"
      className={`${vertical ? 'flex flex-col gap-1' : 'flex items-center gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3'} ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        const base = vertical
          ? 'rounded-md px-3 py-2 text-sm'
          : 'whitespace-nowrap border-b-2 px-3 py-2.5 text-sm';
        const state = isActive
          ? vertical
            ? tokens.navActive
            : tokens.tabActive
          : vertical
            ? 'text-slate-600 hover:bg-slate-50'
            : 'border-transparent text-slate-500 hover:text-slate-800';
        return (
          <NavLink
            key={tab.key}
            to={tab.to}
            end={tab.end}
            aria-current={isActive ? 'page' : undefined}
            className={`${base} ${state}`}
          >
            {tab.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
