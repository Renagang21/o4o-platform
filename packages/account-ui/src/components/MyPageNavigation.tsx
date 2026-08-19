/**
 * MyPageNavigation — My Page 공통 navigation
 *
 * WO-O4O-CROSS-SERVICE-MYPAGE-SHELL-LAYOUT-COMMONIZATION-V1
 *
 * Navigation 계약 (WO §11):
 *   공통 nav item model + 서비스 config.
 *   서비스별 정책(어떤 역할에게 어떤 항목을 보이는가)은 이 컴포넌트가 판정하지 않는다.
 *   서비스가 자신의 기존 role/capability helper 로 계산한 결과를 `visible` 로 주입한다.
 *   → 이 파일에는 role 문자열이 하나도 없다 (역할 판정 로직 신설 금지).
 *
 * Mobile 계약 (WO §12):
 *   - 가로 스크롤 tab strip 을 유지하되, 활성 tab 이 화면 밖에 있으면 자동으로 보이게 한다.
 *     (기존에는 항목이 많은 서비스에서 모바일 진입 시 활성 tab 이 오른쪽 밖에 잘려 보였다.)
 *   - `mobileVisible: false` 는 좁은 폭에서만 숨긴다. 기본값은 true —
 *     "모바일에서 기능 진입이 사라지는 구조 금지" 가 기본 동작이다.
 */

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

export interface MyPageNavItem {
  label: string;
  /** basePath 기준 상대 경로. 빈 문자열이면 basePath 자신(허브). */
  path: string;
  /**
   * 절대 경로. 지정하면 basePath + path 대신 이 값을 사용한다.
   * My Page 축에 속하지만 basePath 밖에 있는 화면(예: 가입 상태)을 위한 탈출구.
   */
  href?: string;
  /** 좌측 아이콘 (선택). */
  icon?: ReactNode;
  /**
   * false 면 렌더하지 않는다. 기본 true.
   * 서비스가 자신의 role/capability helper 결과를 그대로 넣는다.
   */
  visible?: boolean;
  /** false 면 좁은 폭(sm 미만)에서 숨긴다. 기본 true. */
  mobileVisible?: boolean;
  /** IA 그룹 라벨 (현재 표시에는 쓰지 않지만 서비스 config 의 의미를 보존한다). */
  group?: string;
  /** true 면 활성 판정을 정확히 일치로 한다. 기본은 prefix 일치. */
  end?: boolean;
}

const DEFAULT_ITEMS: MyPageNavItem[] = [
  { label: '마이페이지', path: '' },
  { label: '프로필', path: '/profile' },
  { label: '설정', path: '/settings' },
];

interface MyPageNavigationProps {
  /** Base path for mypage routes (default: '/mypage') */
  basePath?: string;
  /** Custom navigation items. Paths are relative to basePath. */
  items?: MyPageNavItem[];
}

/** nav item 의 최종 URL — `href` 가 있으면 그대로, 없으면 basePath + path. */
export function resolveMyPageNavHref(item: MyPageNavItem, basePath: string): string {
  if (item.href) return item.href;
  const normalizedBase = basePath.replace(/\/+$/, '');
  return item.path ? `${normalizedBase}${item.path}` : normalizedBase;
}

/** `visible === false` 인 항목을 제거한다. 서비스가 config 단계에서 쓸 수 있도록 내보낸다. */
export function resolveMyPageNavItems(items: MyPageNavItem[]): MyPageNavItem[] {
  return items.filter((item) => item.visible !== false);
}

export function MyPageNavigation({
  basePath = '/mypage',
  items = DEFAULT_ITEMS,
}: MyPageNavigationProps) {
  const location = useLocation();
  const normalizedBase = basePath.replace(/\/+$/, '');
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef<HTMLAnchorElement | null>(null);

  const visibleItems = resolveMyPageNavItems(items);

  // 활성 tab 이 가로 스크롤 영역 밖이면 보이도록 당겨온다 (모바일 진입 누락 방지).
  useEffect(() => {
    const scroller = scrollerRef.current;
    const active = activeRef.current;
    if (!scroller || !active) return;
    const overflowsLeft = active.offsetLeft < scroller.scrollLeft;
    const overflowsRight =
      active.offsetLeft + active.offsetWidth > scroller.scrollLeft + scroller.clientWidth;
    if (!overflowsLeft && !overflowsRight) return;
    // 활성 항목을 스크롤 영역 가운데로 (스크롤 영역 안에서만 움직인다 — 페이지는 스크롤하지 않는다)
    scroller.scrollLeft = Math.max(
      0,
      active.offsetLeft - (scroller.clientWidth - active.offsetWidth) / 2,
    );
  }, [location.pathname]);

  return (
    <nav className="mb-6 border-b border-gray-200" aria-label="마이페이지">
      <div ref={scrollerRef} className="flex overflow-x-auto whitespace-nowrap">
        {visibleItems.map((item) => {
          const fullPath = resolveMyPageNavHref(item, normalizedBase);
          const isHome = !item.href && !item.path;

          const isActive =
            isHome || item.end
              ? location.pathname === fullPath
              : location.pathname.startsWith(fullPath);

          return (
            <Link
              key={fullPath}
              to={fullPath}
              ref={isActive ? activeRef : undefined}
              aria-current={isActive ? 'page' : undefined}
              className={[
                'px-5 py-3 text-sm font-medium whitespace-nowrap -mb-px border-b-2 transition-colors',
                // 터치 타깃 — py-3 + text-sm 로 44px 근처를 유지한다.
                item.icon ? 'inline-flex items-center gap-2' : '',
                item.mobileVisible === false ? 'hidden sm:block' : '',
                isActive
                  ? 'text-primary-600 border-primary-600 font-semibold'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
