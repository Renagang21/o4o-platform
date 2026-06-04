/**
 * OperatorAreaShell — Cross-service Operator area layout shell
 *
 * WO-O4O-CROSSSERVICE-OPERATOR-LAYOUT-WRAPPER-COMMON-COMPONENT-V1
 *
 * 목적:
 *   KPA-Society / GlycoPharm / K-Cosmetics 의 operator layout wrapper 가 각각 보유하던
 *   동일한 layout shell (outer div + container + flex + DomainIASidebar + main/Outlet) 을
 *   단일 공통 컴포넌트로 추출. 기능 변경 없는 중복 제거 리팩토링.
 *
 * 공통화 범위 (IR-O4O-CROSSSERVICE-OPERATOR-LAYOUT-WRAPPER-COMMONIZATION-AUDIT-V1 §4):
 *   - outer `min-h-screen flex flex-col bg-gray-50`
 *   - `max-w-[1400px]` content container
 *   - `flex gap-6` 구조
 *   - DomainIASidebar (sidebarTopOffset 기본 'top-20')
 *   - `main flex-1 min-w-0` + Outlet/children
 *
 * 공통화 제외 (서비스별 유지):
 *   - header 는 slot 으로 받는다 (서비스별 *GlobalHeader 브릿지 — brand / profile dropdown /
 *     NotificationBell / credit badge / 내 매장 / fallback dashboard 등 모두 header 내부).
 *   - menuItems / capabilities 는 서비스 wrapper 가 계산하여 props 로 주입.
 *
 * 명명 주의:
 *   GlycoPharm App.tsx 에 지역 함수 OperatorAreaLayout() 이 이미 존재하므로 공통 컴포넌트는
 *   `OperatorAreaShell` 로 명명하여 import 충돌을 회피한다.
 */

import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import type { OperatorGroupKey, OperatorMenuItem } from '@o4o/ui';
import type { OperatorCapability } from '@o4o/types';
import { DomainIASidebar } from '../sidebar/DomainIASidebar';
import type { OperatorDomainIAConfig } from '../sidebar/operatorDomainIA';

export interface OperatorAreaShellProps {
  /** 서비스별 GlobalHeader 브릿지 (예: <KpaGlobalHeader/>) */
  header: ReactNode;
  /** 이미 role-filter 된 메뉴 (filterMenuByRole 결과) */
  menuItems: Partial<Record<OperatorGroupKey, OperatorMenuItem[]>>;
  /** 서비스 활성 capability */
  capabilities: OperatorCapability[];
  /** sidebar sticky offset (default 'top-20' — GlobalHeader 사용 기준) */
  sidebarTopOffset?: string;
  /** content. 미지정 시 <Outlet/> (route element layout 기본) */
  children?: ReactNode;
  /** 서비스별 domain IA. 미주입 시 DomainIASidebar 의 default(KPA 계열) — 기존 3 서비스 무변화.
   *  WO-O4O-OPERATOR-UX-CORE-DOMAINIASIDEBAR-IA-CONFIG-PARAM-V1 */
  domainIAConfig?: OperatorDomainIAConfig;
}

export function OperatorAreaShell({
  header,
  menuItems,
  capabilities,
  sidebarTopOffset = 'top-20',
  children,
  domainIAConfig,
}: OperatorAreaShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {header}
      <div className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* WO-O4O-OPERATOR-MOBILE-NAV-DRAWER-V1: mobile column(토글 바 위 → 본문) / desktop row */}
        <div className="flex flex-col md:flex-row md:gap-6">
          <DomainIASidebar
            menuItems={menuItems}
            capabilities={capabilities}
            sidebarTopOffset={sidebarTopOffset}
            domainIAConfig={domainIAConfig}
          />
          <main className="flex-1 min-w-0">{children ?? <Outlet />}</main>
        </div>
      </div>
    </div>
  );
}
