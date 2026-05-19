/**
 * ResponsiveTabBar
 * WO-O4O-RESPONSIVE-TABBAR-PRIMITIVE-V1
 *
 * O4O 반응형 탭 네비게이션 primitive.
 *
 * KPA-Society 의 EducationTabs / EventsTabs / HubSubNav 3개 production
 * 컴포넌트에서 검증된 canonical 패턴만 캡슐화한다:
 *   - overflowX: auto + WebkitOverflowScrolling: touch (mobile 가로 스크롤)
 *   - flexShrink: 0 + whiteSpace: nowrap (좁은 폭에서 탭 압축 / wrap 방지)
 *   - data-active marker + useEffect + scrollIntoView({ inline: 'center' })
 *     (activeKey 변경 시 active 탭 자동 center 노출)
 *   - typeof scrollIntoView === 'function' guard (SSR/구형 환경 안전)
 *
 * routing / permission / API / query param / badge 계산 등 도메인 로직은
 * primitive 책임이 아니다. consumer 가 activeKey/onChange 또는 tabs[].to 로
 * 결정한다.
 *
 * 시각은 consumer 가 `style`/`tabStyle`/`activeTabStyle` 또는 className 으로
 * 통제한다. primitive 는 동작만 강제하고 디자인은 강제하지 않는다.
 *
 * @example controlled (button + onChange)
 * <ResponsiveTabBar
 *   tabs={[{ key: 'all', label: '전체' }, { key: 'new', label: '신규' }]}
 *   activeKey={current}
 *   onChange={(k) => setCurrent(k as MyTab)}
 *   tabStyle={tabBase}
 *   activeTabStyle={tabActive}
 * />
 *
 * @example navigation (Link + to)
 * <ResponsiveTabBar
 *   tabs={[{ key: '/x', label: 'X', to: '/x' }, { key: '/y', label: 'Y', to: '/y' }]}
 *   activeKey={derivedFromPathname}
 *   aria-label="섹션 내비게이션"
 * />
 */

import React, {
  CSSProperties,
  ReactNode,
  useEffect,
  useRef,
} from 'react';
import { Link } from 'react-router-dom';

export interface ResponsiveTabBarItem {
  /** 탭 고유 key. activeKey 와 일치 비교에 사용. */
  key: string;
  /** 탭 라벨. 문자열 또는 ReactNode. */
  label: ReactNode;
  /**
   * 값이 있으면 react-router-dom Link 로 렌더 (navigation tab).
   * 없으면 <button type="button"> 으로 렌더 (controlled tab).
   */
  to?: string;
}

export interface ResponsiveTabBarProps {
  /** 탭 항목 배열. */
  tabs: ResponsiveTabBarItem[];
  /** 현재 active 탭 key. tabs[].key 와 비교. */
  activeKey: string;
  /**
   * 탭 클릭 시 호출 (Link/button 모두). routing 은 consumer 책임.
   * navigation tab(to 있음)에서도 onChange 가 호출되므로, 부수 동작
   * (drawer close 등) 을 hook 할 수 있다.
   */
  onChange?: (key: string) => void;
  /** nav element 의 aria-label. */
  'aria-label'?: string;
  /** container className. */
  className?: string;
  /** container style. 내부 강제 속성과 spread 후 적용. */
  style?: CSSProperties;
  /** 각 탭 기본 className. */
  tabClassName?: string;
  /** 각 탭 기본 style. 내부 강제 속성(flexShrink/whiteSpace)과 spread 후 적용. */
  tabStyle?: CSSProperties;
  /** active 탭 추가 className. */
  activeTabClassName?: string;
  /** active 탭 추가 style. tabStyle 위로 spread. */
  activeTabStyle?: CSSProperties;
}

// ── 내부 강제 속성 ────────────────────────────────────────────────────────
// consumer 의 style/tabStyle 보다 먼저 적용되어, 사용자가 명시적으로 override
// 하지 않는 한 mobile 가로 스크롤 동작이 항상 보장된다.

const CONTAINER_BASE_STYLE: CSSProperties = {
  display: 'flex',
  overflowX: 'auto',
  WebkitOverflowScrolling: 'touch',
};

const TAB_BASE_STYLE: CSSProperties = {
  flexShrink: 0,
  whiteSpace: 'nowrap',
};

// ─────────────────────────────────────────────────────────────────────────

export function ResponsiveTabBar({
  tabs,
  activeKey,
  onChange,
  'aria-label': ariaLabel,
  className,
  style,
  tabClassName,
  tabStyle,
  activeTabClassName,
  activeTabStyle,
}: ResponsiveTabBarProps) {
  const navRef = useRef<HTMLElement>(null);

  // activeKey 변경 시 active 탭이 가로 스크롤 영역 바깥에 가려지지 않도록
  // center 자동 노출. 사용자 인터랙션과 충돌 없음 (active 가 이미 visible 이면
  // 브라우저가 no-op 처리).
  useEffect(() => {
    const active = navRef.current?.querySelector(
      '[data-active="true"]',
    ) as HTMLElement | null;
    if (active && typeof active.scrollIntoView === 'function') {
      active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeKey]);

  const containerStyle: CSSProperties = { ...CONTAINER_BASE_STYLE, ...style };

  return (
    <nav ref={navRef} aria-label={ariaLabel} className={className} style={containerStyle}>
      {tabs.map((item) => {
        const isActive = item.key === activeKey;
        const mergedStyle: CSSProperties = {
          ...TAB_BASE_STYLE,
          ...tabStyle,
          ...(isActive ? activeTabStyle : undefined),
        };
        const mergedClassName = [
          tabClassName,
          isActive ? activeTabClassName : '',
        ]
          .filter(Boolean)
          .join(' ') || undefined;
        const dataActive = isActive ? 'true' : 'false';

        if (item.to) {
          return (
            <Link
              key={item.key}
              to={item.to}
              data-active={dataActive}
              className={mergedClassName}
              style={mergedStyle}
              onClick={() => onChange?.(item.key)}
            >
              {item.label}
            </Link>
          );
        }

        return (
          <button
            key={item.key}
            type="button"
            data-active={dataActive}
            className={mergedClassName}
            style={mergedStyle}
            onClick={() => onChange?.(item.key)}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
