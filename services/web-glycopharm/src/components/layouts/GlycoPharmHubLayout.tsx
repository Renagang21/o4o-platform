/**
 * GlycoPharmHubLayout — 매장 운영 허브 탐색 레이아웃
 *
 * WO-O4O-GLYCOPHARM-STORE-HUB-PORT-V1
 *
 * KPA PharmacyHubLayout 패턴:
 * - 좌측 고정 사이드바 (홈 + 메뉴 4개)
 * - 우측 Outlet (메뉴별 페이지)
 * - NavLink 활성 상태 표시기
 */

import { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Home, ShoppingCart, Monitor, FileText, Tag, BookOpen, Megaphone, QrCode, Menu } from 'lucide-react';
// WO-O4O-STORE-FACING-FOOTER-COVERAGE-V1: store-facing compact 푸터
import { StoreFacingFooter } from '@o4o/shared-space-ui';
import { loadFooterLegal } from '../../lib/footerLegal';

type HubMenuItem =
  | { key: string; label: string; desc: string; icon: React.ComponentType<{ className?: string }>; to: string; end: boolean; badge?: undefined }
  | { key: string; label: string; desc: string; icon: React.ComponentType<{ className?: string }>; badge: string; to?: undefined; end?: undefined };

const HUB_MENU: HubMenuItem[] = [
  {
    key: 'home',
    label: '홈',
    desc: '자원 탐색 허브 · 운영 흐름 안내',
    icon: Home,
    to: '/store-hub',
    end: true,
  },
  {
    // WO-O4O-GLYCOPHARM-STORE-HUB-B2B-CATALOG-KPA-ALIGNMENT-V1: KPA canonical 정합
    key: 'b2b',
    label: '상품 카탈로그',
    desc: '공급 가능 상품 탐색 · 내 매장에 추가',
    icon: ShoppingCart,
    to: '/store-hub/b2b',
    end: false,
  },
  {
    key: 'signage',
    label: '사이니지',
    desc: '매장 디스플레이에 활용할 미디어를 탐색합니다',
    icon: Monitor,
    to: '/store-hub/signage',
    end: false,
  },
  {
    key: 'content',
    label: '콘텐츠',
    desc: '플랫폼 콘텐츠를 탐색하고 내 매장에 적용합니다',
    icon: FileText,
    to: '/store-hub/content',
    end: false,
  },
  {
    key: 'blog',
    label: '블로그',
    desc: '운영자 블로그를 탐색하고 내 매장에 가져갑니다',
    icon: BookOpen,
    to: '/store-hub/blog',
    end: false,
  },
  // WO-O4O-GLYCOPHARM-HUB-POP-QR-LIBRARY-PAGES-V1: POP / QR Hub Library 페이지 활성화 (조회 전용)
  {
    key: 'pop',
    label: 'POP',
    desc: '매장용 POP 자료를 탐색합니다',
    icon: Megaphone,
    to: '/store-hub/pop',
    end: false,
  },
  {
    key: 'qr',
    label: 'QR 코드',
    desc: 'QR 코드 자료를 탐색합니다',
    icon: QrCode,
    to: '/store-hub/qr',
    end: false,
  },
  {
    key: 'event-offers',
    label: '이벤트/특가',
    desc: 'GlycoPharm 이벤트 상품을 확인하고 신청합니다',
    icon: Tag,
    to: '/store-hub/event-offers',
    end: false,
  },
  // WO-O4O-EVENT-OFFER-TO-CART-CROSSSERVICE-V2: 내 장바구니
  {
    key: 'cart',
    label: '내 장바구니',
    desc: '장바구니에 담은 상품 확인 · 주문 확정',
    icon: ShoppingCart,
    to: '/store-hub/cart',
    end: false,
  },
];

export function GlycoPharmHubLayout() {
  // WO-O4O-RESPONSIVE-SIDEBAR-P0-BROKEN-MOBILE-DRAWER-FIX-V1:
  //   <1024px(lg) 에서 sidebar 를 drawer 로 전환 (hamburger + overlay + 자동 close + ESC).
  //   desktop(>=lg) 은 기존 sticky 사이드바 동작 유지. 메뉴/라우팅/권한 변경 없음.
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = () => setMobileOpen(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="max-w-5xl mx-auto px-4 py-8 w-full flex-1">
        {/* Mobile-only sidebar toggle — desktop(lg) 숨김 */}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="허브 메뉴 열기"
          aria-expanded={mobileOpen}
          aria-controls="glyco-hub-sidebar"
          className="lg:hidden mb-4 flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Menu className="w-5 h-5" />
          허브 메뉴
        </button>

        {/* Mobile drawer backdrop */}
        {mobileOpen && (
          <div
            className="lg:hidden fixed inset-x-0 top-16 bottom-0 bg-black/40 z-30"
            onClick={closeMobile}
            aria-hidden="true"
          />
        )}

        <div className="flex gap-6 items-start">
          {/* ── 좌측 사이드바 (mobile drawer / desktop sticky) ── */}
          <aside
            id="glyco-hub-sidebar"
            className={`bg-white border border-slate-200 overflow-y-auto z-40 w-72 max-w-[85%] fixed left-0 top-16 bottom-0 transition-transform duration-200 ease-out lg:static lg:top-20 lg:bottom-auto lg:left-auto lg:z-auto lg:w-52 lg:max-w-none lg:shrink-0 lg:self-start lg:rounded-xl lg:overflow-hidden lg:transition-none lg:translate-x-0 lg:sticky ${
              mobileOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <div className="px-4 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800">매장 운영 허브</h2>
              <p className="text-xs text-slate-400 mt-0.5">플랫폼 자원을 탐색하고 내 매장에 가져갑니다</p>
            </div>

            <nav className="py-2">
              {HUB_MENU.map((item) => {
                const Icon = item.icon;
                if (item.badge !== undefined) {
                  return (
                    <div
                      key={item.key}
                      className="flex items-start gap-3 px-4 py-3 opacity-50 cursor-not-allowed"
                    >
                      <Icon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm text-slate-500">{item.label}</span>
                          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-400 rounded">
                            {item.badge}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{item.desc}</p>
                      </div>
                    </div>
                  );
                }

                return (
                  <NavLink
                    key={item.key}
                    to={item.to}
                    end={item.end}
                    onClick={closeMobile}
                    className={({ isActive }) =>
                      `flex items-start gap-3 px-4 py-3 transition-colors relative ${
                        isActive
                          ? 'bg-teal-50 text-teal-700'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-teal-500 rounded-l" />
                        )}
                        <Icon
                          className={`w-4 h-4 mt-0.5 shrink-0 ${isActive ? 'text-teal-600' : 'text-slate-400'}`}
                        />
                        <div className="flex-1 min-w-0">
                          <span className={`text-sm font-medium ${isActive ? 'text-teal-700' : 'text-slate-700'}`}>
                            {item.label}
                          </span>
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{item.desc}</p>
                        </div>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </nav>

            <div className="px-4 py-3 border-t border-slate-100">
              <p className="text-[11px] text-slate-400 leading-relaxed">
                탐색한 자원은 내 약국 (/store)에서 설정·운영합니다.
              </p>
            </div>
          </aside>

          {/* ── 우측 본문 ── */}
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>

      {/* WO-O4O-STORE-FACING-FOOTER-COVERAGE-V1: 매장 HUB compact 푸터 */}
      <StoreFacingFooter
        serviceKey="glycopharm"
        serviceName="GlycoPharm"
        loadProfile={loadFooterLegal}
        links={{ terms: '/terms', privacy: '/privacy', contact: '/contact' }}
      />
    </div>
  );
}
