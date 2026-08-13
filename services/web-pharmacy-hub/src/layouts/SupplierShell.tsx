/**
 * SupplierShell — Pharmacy-Hub 공급자 영역 셸 wrapper
 *
 * WO-O4O-PHARMACY-HUB-SUPPLIER-SHELL-COMMON-CORE-ADOPTION-V1
 *
 * 조사 결과 재사용 가능한 **공통 Supplier Shell 은 존재하지 않는다** (CHECK §2):
 *   - packages/** 에 supplier layout/shell 없음
 *   - KPA = 공급자 영역 없음 · K-Cosmetics = RoleNotAvailablePage · Neture = 서비스 전용 385줄 layout
 *   - @o4o/operator-ux-core 의 OperatorAreaShell 은 DomainIASidebar + OperatorGroupKey /
 *     OperatorCapability 라는 **운영자 도메인 어휘**에 결합돼 있다. 공급자 메뉴를 운영자
 *     capability 로 위장해 넣는 것은 WO 가 금지한 "무리한 재사용" 이다.
 *   - @o4o/store-ui-core 의 StoreDashboardLayout 은 구조는 범용이지만 StoreSidebar 가
 *     `내 매장 관리` / `{조직명} 매장` 을 **prop 으로 덮을 수 없게 하드코딩**한다.
 *     공급자에게 "내 매장 관리" 를 보여주게 되고, 이를 고치려면 4개 서비스가 소비하는
 *     공통 패키지 변경이 필요하다. 또한 store-ui-core 는 Store Layer(F3 Freeze) 자산이라
 *     공급자 주체를 얹는 것은 계층 경계 drift 다.
 *
 * 따라서 WO 작업순서 3 에 따라 **최소 구조만 갖춘 서비스 thin wrapper** 로 구성한다.
 * 레이아웃 골격(container / sticky sidebar / Outlet)은 공통 OperatorAreaShell 과 동일한
 * 클래스 규격을 그대로 따라, 이후 공통 Supplier Shell 이 생기면 교체가 기계적이 되게 한다.
 * 메뉴는 이 파일이 아니라 config/supplierMenu.ts 가 소유한다.
 *
 * 가드는 기존과 동일하게 MembershipGate (service_memberships.status 축) 만 유지한다 —
 * 권한 체계 변경은 본 WO 범위 밖이며, 실제 경계는 backend pharmacy-hub scope guard 가 강제한다.
 */

import { NavLink, Outlet } from 'react-router-dom';
import { MembershipGate } from '../components/MembershipGate';
import { SupplierHeader } from '../components/supplier/SupplierHeader';
import { SUPPLIER_MENU_SECTIONS } from '../config/supplierMenu';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'block rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  ].join(' ');

function SupplierNav() {
  return (
    <nav
      aria-label="공급자 메뉴"
      /* mobile: 본문 위 가로 스크롤 바 / desktop(lg~): 좌측 sticky 컬럼.
       * sticky top-14 = SupplierHeader 높이(h-14)와 정렬. */
      className="mb-4 lg:mb-0 lg:w-60 lg:shrink-0 lg:sticky lg:top-14 lg:self-start"
    >
      <div className="flex gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 lg:block lg:space-y-4 lg:overflow-visible lg:p-3">
        {SUPPLIER_MENU_SECTIONS.map((section) => (
          <div key={section.label || '__root__'} className="shrink-0 lg:shrink">
            {section.label && (
              <p className="hidden px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400 lg:block">
                {section.label}
              </p>
            )}
            <div className="flex gap-2 lg:block lg:space-y-1">
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.exact}
                  className={linkClass}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
}

export function SupplierShell() {
  return (
    <MembershipGate>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <SupplierHeader />
        <div className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:gap-6">
            <SupplierNav />
            <main className="flex-1 min-w-0">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </MembershipGate>
  );
}
