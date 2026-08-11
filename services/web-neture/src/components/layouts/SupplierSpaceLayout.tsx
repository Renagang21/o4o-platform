/**
 * SupplierSpaceLayout - 공급자 운영 공간 레이아웃
 *
 * Work Order: WO-O4O-DASHBOARD-SIDEBAR-CONVERSION-V1
 *
 * 구조:
 * - 상단: Neture 헤더 (h-14)
 * - 좌측: 사이드바 (w-60, collapsible groups)
 * - 모바일: 수평 아이콘 바
 * - 스코프: /supplier/*
 */

import { useState, useMemo, useEffect } from 'react';
import { Link, Outlet, useLocation, Navigate } from 'react-router-dom';
import {
  Home,
  Package,
  ShoppingCart,
  MessageSquare,
  Boxes,
  Settings,
  FileText,
  ChevronRight,
  ChevronDown,
  Menu,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { NetureGlobalHeader } from '../NetureGlobalHeader';
import { NetureBottomNav } from '../NetureBottomNav';
import { SUPPLIER_ACCESS_ROLES } from '../../lib/role-constants';

// WO-NETURE-SUPPLIER-PRODUCT-LIST-WIDE-TABLE-VIEW-APPLY-V1
// 자식 페이지가 본문 영역의 max-width 제약을 해제할 수 있도록 컨텍스트 제공
export type SupplierSpaceOutletContext = {
  wideMode: boolean;
  setWideMode: (next: boolean) => void;
};

/* ------------------------------------------------------------------ */
/*  Sidebar 그룹 정의                                                   */
/* ------------------------------------------------------------------ */

type SidebarItem = { label: string; path: string; exact?: boolean };
type SidebarGroup = { label: string; icon: LucideIcon; items: SidebarItem[] };

// WO-O4O-NETURE-SUPPLIER-PRODUCT-REGISTRATION-IA-V1:
//   제품 관리 / 공급 오퍼 / 유통참여형 펀딩 / 이벤트 오퍼 / 주문·배송 / 설정 으로 IA 재구성.
//   - 제품 등록은 유형-우선 진입(/supplier/products/register) 으로 통일.
//   - 모든 항목은 실제 라우트로 연결 (데드링크 0). 기존 실기능 메뉴(Finance/Community) 유지.
const SUPPLIER_SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    label: '공급자 홈',
    icon: Home,
    items: [{ label: '대시보드', path: '/supplier/dashboard', exact: true }],
  },
  {
    label: '상품',
    icon: Package,
    // WO-O4O-NETURE-SUPPLIER-MENU-ASSISTANT-IA-CLEANUP-V1: IA 권장안 D 정렬.
    //   상품 등록 도우미→등록 도우미, B2B 콘텐츠→제품 콘텐츠 관리.
    //   CSV Import 는 독립 주요 메뉴에서 제거(대량 등록으로 흡수). 메뉴 진입점 제거됨.
    //   WO-O4O-NETURE-SUPPLIER-LEGACY-CSV-IMPORT-RETIREMENT-V1: 레거시 CSV Import 화면 은퇴 —
    //   라우트 /supplier/csv-import 는 canonical 대량 등록(/supplier/products/bulk)으로 영구 redirect.
    // WO-O4O-NETURE-SUPPLIER-DASHBOARD-STORE-MATERIALS-IA-V1:
    //   '제품 콘텐츠'(/supplier/b2b-content)를 이 그룹으로 이동. B2B offer 의
    //   businessShort/DetailDescription 직접 편집 = **도매 거래 상품 정보**이지 매장 제공 자료가 아니다
    //   (IR §8 — SPD 검수 큐와 다른 컬럼·다른 소비처인데 같은 그룹에 있어 혼동을 유발했다).
    //   route/page/API 무변경 — 그룹 소속만 이동(기능 은폐 0, 데드링크 0).
    items: [
      { label: '상품 목록', path: '/supplier/products' },
      { label: '상품 등록', path: '/supplier/products/register' },
      { label: '대량 등록', path: '/supplier/products/bulk' },
      { label: '등록 도우미', path: '/supplier/products/import-assistant' },
      { label: '제품 콘텐츠', path: '/supplier/b2b-content' },
    ],
  },
  // WO-O4O-NETURE-SUPPLIER-DASHBOARD-STORE-MATERIALS-IA-V1:
  //   '콘텐츠' → '매장 제공 자료'. 공급자 산출물이 매장에 닿는 3경로를 한 그룹으로 묶고
  //   상태 집계(검수·게시 현황)를 추가한다. 근거 IR-O4O-KPA-STORE-QR-TABLET-CONTENT-FLOW-AUDIT-V1 §9·§10.
  //
  //   QR·태블릿 코너 적용은 **메뉴로 만들지 않는다** — 공급자에게 백엔드가 차단한 기능이라
  //   (supplier-screen-set.controller.ts:33) 메뉴를 두면 403/빈 화면 dead-end 가 된다.
  //   대신 각 자료 화면의 StoreMaterialUsageNote 안내로 "매장이 어디에 쓸 수 있는지"만 알린다.
  //
  //   라벨 정합: 매장 측 canonical 어휘를 따른다(매장용 상품 설명서 / 태블릿 화면 / 디지털 사이니지).
  //   '매장용 설명서' → '매장용 상품 설명서' — 매장 사이드바의 동명 메뉴('상품 설명' = 매장 자체 상품
  //   store_local_products.detail_html)와 축이 다르다는 점을 드러내기 위해 '상품'을 명시한다(IR §4.1).
  {
    label: '매장 제공 자료',
    icon: FileText,
    items: [
      { label: '매장용 상품 설명서', path: '/supplier/store-descriptions' },
      { label: '태블릿 화면 자료', path: '/supplier/tablet-screen-sets' },
      { label: '디지털 사이니지', path: '/supplier/signage' },
      { label: '검수·게시 현황', path: '/supplier/store-materials-status' },
    ],
  },
  {
    label: '유통',
    icon: Boxes,
    items: [
      { label: '공급 오퍼', path: '/supplier/supply-offers' },
      { label: '판매자 모집', path: '/supplier/recruitments' },
      { label: '유통참여형 펀딩', path: '/supplier/market-trial' },
      { label: '이벤트 오퍼', path: '/supplier/event-offers' },
    ],
  },
  {
    label: '주문·정산',
    icon: ShoppingCart,
    items: [
      { label: '주문 현황', path: '/supplier/orders' },
      { label: '재고 관리', path: '/supplier/inventory' },
      { label: '정산 내역', path: '/supplier/settlements' },
      { label: '파트너 수수료', path: '/supplier/partner-commissions' },
    ],
  },
  {
    label: '커뮤니티',
    icon: MessageSquare,
    items: [
      { label: '공급자 포럼', path: '/supplier/forum' },
      { label: '내 포럼', path: '/supplier/my-forum' },
    ],
  },
  {
    label: '설정',
    icon: Settings,
    items: [{ label: '공급자 정보', path: '/mypage/business-profile' }],
  },
];

/* ------------------------------------------------------------------ */
/*  SupplierSpaceLayout                                                */
/* ------------------------------------------------------------------ */

export default function SupplierSpaceLayout() {
  const { pathname } = useLocation();
  const location = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();

  const isItemActive = (path: string, exact?: boolean) => {
    if (exact) return pathname === path;
    // WO-O4O-NETURE-SUPPLIER-SIDEBAR-PRODUCTION-SMOKE-CLOSEOUT-V1:
    //   '상품 목록'(/supplier/products) 은 형제 메뉴(register/bulk/import-assistant) 의 prefix 라
    //   generic fallback 으로는 하위 경로에서 함께 활성되어 중복 활성이 발생한다.
    //   자체 메뉴가 없는 하위 경로만 각각 가장 가까운 메뉴에 귀속시킨다(그룹 자동 열림 유지).
    if (path === '/supplier/products') {
      return pathname === '/supplier/products' || pathname === '/supplier/products/library';
    }
    if (path === '/supplier/products/register') {
      return pathname === '/supplier/products/register' || pathname === '/supplier/products/new';
    }
    if (path === '/supplier/orders') {
      return pathname === '/supplier/orders' || pathname.startsWith('/supplier/orders/');
    }
    if (path === '/supplier/recruitments') {
      return pathname === '/supplier/recruitments' || pathname.startsWith('/supplier/recruitments/');
    }
    if (path === '/supplier/market-trial') {
      return pathname === '/supplier/market-trial' || pathname.startsWith('/supplier/market-trial/');
    }
    if (path === '/supplier/forum') {
      return pathname === '/supplier/forum' || pathname.startsWith('/supplier/forum/');
    }
    return pathname === path || pathname.startsWith(path + '/');
  };

  const isGroupActive = (group: SidebarGroup) =>
    group.items.some((item) => isItemActive(item.path, item.exact));

  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(SUPPLIER_SIDEBAR_GROUPS.filter((g) => isGroupActive(g)).map((g) => g.label)),
  );

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  // WO-NETURE-SUPPLIER-PRODUCT-LIST-WIDE-TABLE-VIEW-APPLY-V1
  // 자식 페이지가 opt-in 으로 본문 max-width 제약을 해제할 수 있게 한다.
  const [wideMode, setWideMode] = useState(false);
  const outletContext = useMemo<SupplierSpaceOutletContext>(
    () => ({ wideMode, setWideMode }),
    [wideMode],
  );

  // WO-O4O-RESPONSIVE-SIDEBAR-P0-BROKEN-MOBILE-DRAWER-FIX-V1:
  //   <1024px(lg) 에서 group-level 수평 탭(중첩 메뉴 도달 불가)을 전체 메뉴 drawer 로 교체.
  //   hamburger + overlay + 자동 close + ESC. desktop(>=lg) 은 기존 사이드바 동작 유지.
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = () => setMobileOpen(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  // 사이드바 nav 렌더 — desktop 사이드바 / mobile drawer 양쪽 재사용.
  //   onNavigate: 메뉴(Link) 선택 시 호출(mobile drawer 에서만 closeMobile 전달). 그룹 토글은 close 안 함.
  const renderNav = (onNavigate?: () => void) => (
    <>
      {SUPPLIER_SIDEBAR_GROUPS.map((group) => {
        const Icon = group.icon;
        const active = isGroupActive(group);
        const isOpen = openGroups.has(group.label);
        const isSingle = group.items.length === 1;

        if (isSingle) {
          const item = group.items[0];
          return (
            <Link
              key={group.label}
              to={item.path}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-l-2 ${
                isItemActive(item.path, item.exact)
                  ? 'bg-primary-50 text-primary-600 border-primary-600'
                  : 'text-gray-600 border-transparent hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        }

        return (
          <div key={group.label}>
            <button
              onClick={() => toggleGroup(group.label)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-l-2 ${
                active
                  ? 'text-primary-600 border-primary-600'
                  : 'text-gray-600 border-transparent hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon size={18} />
              <span className="flex-1 text-left">{group.label}</span>
              {isOpen ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}
            </button>

            {isOpen && (
              <div className="pb-1">
                {group.items.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onNavigate}
                    className={`block pl-11 pr-4 py-2 text-sm transition-colors ${
                      isItemActive(item.path, item.exact)
                        ? 'text-primary-600 bg-primary-50 font-medium'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  }

  const hasAccess = user.roles.some(r => SUPPLIER_ACCESS_ROLES.includes(r));
  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">접근 권한 없음</h1>
        <p className="text-gray-600 mb-6">이 페이지는 공급자 전용입니다.</p>
        <Link to="/" className="text-primary-600 hover:text-primary-700 font-medium">
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1: Layer A — GlobalHeader */}
      <NetureGlobalHeader />

      {/* Body: Sidebar + Content */}
      {/* WO-NETURE-SUPPLIER-PRODUCT-LIST-WIDE-TABLE-VIEW-APPLY-V1:
          wideMode 활성 시 max-w 제약 해제하여 wide table 가로 영역 확장 */}
      <div
        className={`flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 ${
          wideMode ? 'max-w-none' : 'max-w-[1400px]'
        }`}
      >
        {/* Mobile-only sidebar toggle — desktop(lg) 숨김 */}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="공급자 메뉴 열기"
          aria-expanded={mobileOpen}
          aria-controls="supplier-sidebar"
          className="lg:hidden mb-4 flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Menu className="w-5 h-5" />
          공급자 메뉴
        </button>

        {/* Mobile drawer backdrop */}
        {mobileOpen && (
          <div
            className="lg:hidden fixed inset-x-0 top-16 bottom-0 bg-black/40 z-30"
            onClick={closeMobile}
            aria-hidden="true"
          />
        )}

        <div className="flex gap-6">
          {/* Desktop Sidebar (>=lg) */}
          <aside className="w-60 flex-shrink-0 hidden lg:block">
            <nav className="bg-white rounded-xl border border-gray-200 overflow-hidden sticky top-20">
              {renderNav()}
            </nav>
          </aside>

          {/* Mobile drawer (<lg) — 전체 메뉴(중첩 포함) */}
          <aside
            id="supplier-sidebar"
            className={`lg:hidden fixed left-0 top-16 bottom-0 z-40 w-72 max-w-[85%] bg-white border-r border-gray-200 overflow-y-auto transition-transform duration-200 ease-out ${
              mobileOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <nav>{renderNav(closeMobile)}</nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <Outlet context={outletContext} />
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto shrink-0">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <p>&copy; 2026 Neture. 공급자 &middot; 파트너 협업 플랫폼</p>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              {/* WO-O4O-NETURE-SUPPLIER-CANONICAL-WORKSPACE-SMOKE-CLOSEOUT-V1:
                  `/about` 은 App.tsx 에 route 가 없고 catch-all 도 없어 클릭 시 빈 화면이 됐다.
                  대체 화면을 임의로 지정하지 않고 죽은 링크만 제거한다.
                  (WO-O4O-NETURE-ABOUT-LINK-AND-CATCH-ALL-ROUTE-V1 이후 catch-all 은 존재한다 —
                   `/about` 은 이제 빈 화면이 아니라 404 안내로 떨어진다. 링크는 여전히 두지 않는다.) */}
              <Link to="/contact" className="hover:text-primary-600 transition-colors">Contact Us</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* WO-O4O-NETURE-MOBILE-NAV-...-V1: 공급자 영역 모바일 하단 utility nav(알림/내정보). */}
      <NetureBottomNav />
    </div>
  );
}
