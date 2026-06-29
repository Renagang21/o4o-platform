/**
 * PharmacyHubLayout — 약국 HUB 좌측 사이드바 + 우측 본문 레이아웃
 *
 * WO-KPA-PHARMACY-HUB-SIDEBAR-LAYOUT-AND-PRODUCT-TABS-FIX-V1
 * WO-O4O-PHARMACY-HUB-LAYOUT-MOBILE-V1:
 *   AdminLayout drawer 패턴 적용. mobile에서 sidebar가 본문을 압박/덮는 문제 해소.
 *   - mobile-only sticky 토글 바 (햄버거 + "허브 메뉴")
 *   - aside: mobile fixed drawer (slide-in transform + backdrop) / desktop static flex-item
 *   - 메뉴 항목 클릭 시 drawer 자동 닫힘
 *   메뉴 구조 / 라우팅 / 권한 변경 없음.
 *
 * 상단 섹션 나열형 구조에서 좌측 사이드바 메뉴 + 우측 본문 구조로 전환.
 * Outlet으로 선택된 메뉴의 페이지를 렌더링한다.
 */

import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  Menu,
  Home,
  PackageSearch,
  MonitorPlay,
  Megaphone,
  ShoppingCart,
  Files,
  Newspaper,
  StickyNote,
  QrCode,
  Video,
  type LucideIcon,
} from 'lucide-react';
import { colors } from '../../styles/theme';
import { eventOfferApi } from '../../api/eventOffer';

interface HubMenuItem {
  label: string;
  path: string;
  // WO-O4O-KPA-STORE-HUB-ICON-ALIGNMENT-V1:
  // O4O-GLOBAL-ICON-SYSTEM-STANDARD-V1 — emoji 제거, lucide line icon 통일
  icon: LucideIcon;
  description: string;
  /** WO-O4O-KPA-STORE-HUB-MENU-ALIGNMENT-WITH-MY-STORE-V1: 진행 중 이벤트 수 배지 표시 대상 */
  showEventBadge?: boolean;
  /** 광고·홍보 성격 강조(이벤트·특가) */
  accent?: boolean;
}

/** 그룹 헤더(빈 문자열이면 헤더 미표시) + 항목 */
interface HubMenuGroup {
  label: string;
  items: HubMenuItem[];
}

/**
 * WO-O4O-KPA-STORE-HUB-MENU-ALIGNMENT-WITH-MY-STORE-V1:
 *   약국 운영 허브 메뉴를 내 약국(/store) 상위 그룹 축(홈 → 약국 상품·거래 → 약국 경영지원 →
 *   약국 자료함 → 디지털 사이니지)에 정렬. 허브는 '탐색·가져오기' 공간이므로 자원이 있는 그룹만 노출
 *   (온라인 판매/분석/설정 등 빈 그룹 미생성). 라우트/페이지/API 무변경 — 메뉴 재배치·라벨 정비만.
 *   이벤트·특가: 독립 최상위 메뉴 제거 → '약국 상품·거래' 하위로 편입(광고·홍보 성격 보존,
 *   메가폰 아이콘 + 진행 중 이벤트 수 배지). /store-hub/event-offers 직접 접근·기존 API 유지.
 */
const HUB_MENU_GROUPS: HubMenuGroup[] = [
  { label: '', items: [
    { label: '홈', path: '/store-hub', icon: Home, description: '자원 탐색 허브 · 운영 흐름 안내' },
  ]},
  { label: '약국 상품·거래', items: [
    { label: '상품 카탈로그', path: '/store-hub/b2b', icon: PackageSearch, description: '공급 가능 상품 탐색 · 취급 신청' },
    // 이벤트·특가 = 별도 시스템(event_offers). 광고·홍보성으로 시인성 강조(메가폰 + 진행 수 배지).
    { label: '이벤트·특가', path: '/store-hub/event-offers', icon: Megaphone, description: '진행 중 이벤트·특가 상품 · 신청', showEventBadge: true, accent: true },
    // WO-O4O-EVENT-OFFER-TO-CART-PHASE1A-FOLLOWUP-V1: 이벤트오퍼 담기 → 장바구니 확인
    { label: '장바구니', path: '/store-hub/cart', icon: ShoppingCart, description: '장바구니에 담은 상품 확인 · 수량 조정' },
  ]},
  { label: '약국 경영지원', items: [
    // WO-O4O-STORE-HUB-BLOG-CONTENT-IMPORT-V1: 매장 HUB 블로그 진열 + 가져가기
    { label: '블로그', path: '/store-hub/blog', icon: Newspaper, description: '운영자 게시 블로그 · 내 약국으로 가져가기' },
    // WO-O4O-KPA-STORE-HUB-POP-CONTENT-IMPORT-V1: 매장 HUB POP 진열 + 가져가기
    { label: 'POP', path: '/store-hub/pop', icon: StickyNote, description: '운영자 게시 POP · 내 약국으로 가져가기' },
    // WO-O4O-KPA-STORE-HUB-QR-CONTENT-IMPORT-V1: 매장 HUB QR 진열 + 가져가기
    // 매장 사본은 기존 StoreQRPage (/store/marketing/qr) 가 그대로 표시 — 별도 사본 관리 화면 없음.
    { label: 'QR-code', path: '/store-hub/qr', icon: QrCode, description: '운영자 게시 QR 템플릿 · 내 약국으로 가져가기' },
    // WO-O4O-KPA-QR-CODE-VIDEO-CONTENT-V1: 매장 HUB 동영상 진열 + 가져가기 (QR 전용)
    { label: '동영상', path: '/store-hub/video', icon: Video, description: '운영자 게시 동영상 · 내 약국으로 가져가기 · QR 연결' },
  ]},
  { label: '약국 자료함', items: [
    { label: '콘텐츠 가져오기', path: '/store-hub/content', icon: Files, description: 'CMS 콘텐츠 탐색 · 내 약국으로 복사' },
  ]},
  { label: '디지털 사이니지', items: [
    { label: '사이니지 콘텐츠', path: '/store-hub/signage', icon: MonitorPlay, description: '매장 화면 송출 콘텐츠 · 플레이리스트' },
  ]},
];

function isMenuActive(pathname: string, menuPath: string): boolean {
  if (menuPath === '/store-hub') {
    return pathname === '/store-hub';
  }
  return pathname.startsWith(menuPath);
}

export function PharmacyHubLayout() {
  const { pathname } = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  // WO-O4O-KPA-STORE-HUB-MENU-ALIGNMENT-WITH-MY-STORE-V1:
  //   이벤트·특가 시인성 — 진행 중(active) 이벤트 수 배지. 실패/0건 시 배지 미표시(조용한 실패).
  const [activeEventCount, setActiveEventCount] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    eventOfferApi
      .getEnrichedOffers({ status: 'active', limit: 1 })
      .then(res => { if (!cancelled) setActiveEventCount(res?.pagination?.total ?? null); })
      .catch(() => { if (!cancelled) setActiveEventCount(null); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={layoutStyles.wrapper} className="flex-col md:flex-row">
      {/* Mobile-only sidebar toggle bar — desktop 숨김 */}
      <div className="md:hidden sticky top-16 z-20 bg-white border-b border-slate-200 px-4 py-2 flex items-center">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="HUB 메뉴 열기"
          aria-expanded={mobileMenuOpen}
          aria-controls="pharmacy-hub-sidebar"
          className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-indigo-600 transition-colors"
        >
          <Menu className="w-5 h-5" />
          허브 메뉴
        </button>
      </div>

      {/* Mobile drawer backdrop */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-x-0 top-16 bottom-0 bg-black/40 z-30"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — mobile drawer (fixed) / desktop static flex-item */}
      <aside
        id="pharmacy-hub-sidebar"
        style={layoutStyles.sidebar}
        className={`fixed left-0 top-16 bottom-0 z-40 transition-transform duration-200 ease-out md:static md:top-auto md:bottom-auto md:z-auto md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div style={layoutStyles.sidebarHeader}>
          <h2 style={layoutStyles.sidebarTitle}>약국 운영 허브</h2>
          <p style={layoutStyles.sidebarSubtitle}>
            플랫폼이 제공하는 자원을 탐색하고 내 약국으로 가져갑니다
          </p>
        </div>

        <nav style={layoutStyles.nav}>
          {HUB_MENU_GROUPS.map(group => (
            <div key={group.label || '_root'} style={layoutStyles.group}>
              {group.label && (
                <span style={layoutStyles.groupHeader}>{group.label}</span>
              )}
              {group.items.map(item => {
                const active = isMenuActive(pathname, item.path);
                const Icon = item.icon;
                const showBadge = item.showEventBadge && activeEventCount != null && activeEventCount > 0;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={closeMobileMenu}
                    style={{
                      ...layoutStyles.menuItem,
                      ...(active ? layoutStyles.menuItemActive : {}),
                    }}
                  >
                    <span style={layoutStyles.menuIcon}>
                      <Icon
                        size={18}
                        color={active ? colors.primary : item.accent ? '#dc2626' : colors.neutral600}
                      />
                    </span>
                    <div style={layoutStyles.menuText}>
                      <span style={layoutStyles.menuLabelRow}>
                        <span
                          style={{
                            ...layoutStyles.menuLabel,
                            ...(active ? layoutStyles.menuLabelActive : {}),
                            ...(item.accent && !active ? layoutStyles.menuLabelAccent : {}),
                          }}
                        >
                          {item.label}
                        </span>
                        {showBadge && (
                          <span style={layoutStyles.eventBadge}>진행 {activeEventCount}</span>
                        )}
                      </span>
                      <span style={layoutStyles.menuDesc}>{item.description}</span>
                    </div>
                    {active && <span style={layoutStyles.activeIndicator} />}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div style={layoutStyles.sidebarFooter}>
          <span style={layoutStyles.footerNote}>
  탐색한 자원은 내 약국 (/store)에서 설정·운영합니다.
          </span>
        </div>
      </aside>

      {/* Content */}
      <main style={layoutStyles.content}>
        <Outlet />
      </main>
    </div>
  );
}

const layoutStyles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    minHeight: 'calc(100vh - 120px)',
    maxWidth: '1400px',
    margin: '0 auto',
  },

  /* ── Sidebar ── */
  sidebar: {
    width: '260px',
    flexShrink: 0,
    backgroundColor: colors.white,
    borderRight: `1px solid ${colors.neutral200}`,
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 0',
  },
  sidebarHeader: {
    padding: '0 20px 20px',
    borderBottom: `1px solid ${colors.neutral100}`,
    marginBottom: '8px',
  },
  sidebarTitle: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: 700,
    color: colors.neutral900,
  },
  sidebarSubtitle: {
    margin: '6px 0 0',
    fontSize: '0.75rem',
    color: colors.neutral400,
    lineHeight: 1.4,
  },

  /* ── Nav ── */
  nav: {
    flex: 1,
    padding: '8px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  group: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    marginBottom: '10px',
  },
  groupHeader: {
    padding: '8px 14px 4px',
    fontSize: '0.6875rem',
    fontWeight: 700,
    letterSpacing: '0.02em',
    color: colors.neutral400,
    textTransform: 'none' as const,
  },
  menuLabelRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    minWidth: 0,
  },
  menuLabelAccent: {
    color: '#dc2626',
    fontWeight: 600,
  },
  eventBadge: {
    display: 'inline-block',
    padding: '1px 6px',
    fontSize: '0.625rem',
    fontWeight: 700,
    lineHeight: 1.4,
    color: '#fff',
    backgroundColor: '#dc2626',
    borderRadius: '9px',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    borderRadius: '8px',
    textDecoration: 'none',
    color: colors.neutral600,
    transition: 'all 0.15s ease',
    cursor: 'pointer',
    position: 'relative',
  },
  menuItemActive: {
    backgroundColor: `${colors.primary}0A`,
  },
  menuIcon: {
    fontSize: '18px',
    flexShrink: 0,
    width: '24px',
    textAlign: 'center',
  },
  menuText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
    flex: 1,
  },
  menuLabel: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: colors.neutral700,
  },
  menuLabelActive: {
    fontWeight: 600,
    color: colors.primary,
  },
  menuDesc: {
    fontSize: '0.6875rem',
    color: colors.neutral400,
    lineHeight: 1.3,
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: '8px',
    bottom: '8px',
    width: '3px',
    borderRadius: '0 3px 3px 0',
    backgroundColor: colors.primary,
  },

  /* ── Footer ── */
  sidebarFooter: {
    padding: '16px 20px',
    borderTop: `1px solid ${colors.neutral100}`,
    marginTop: 'auto',
  },
  footerNote: {
    fontSize: '0.6875rem',
    color: colors.neutral400,
    lineHeight: 1.4,
  },

  /* ── Content ── */
  content: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.neutral50,
  },
};
