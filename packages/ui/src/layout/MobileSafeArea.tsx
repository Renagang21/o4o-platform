/**
 * MobileSafeArea
 * WO-O4O-RESPONSIVE-PRIMITIVES-AND-SAFE-AREA-V1
 *
 * 모바일 하단 네비게이션 + iOS home-indicator safe area를 흡수하는 wrapper.
 *
 * 배경:
 * KPA-Society Layout은 main에 `pb-14 md:pb-0` (56px 고정)만 적용해
 * `env(safe-area-inset-bottom)`(iOS notch/home indicator)을 반영하지 못한다.
 * 또한 sticky bar(예: MyContentPage bulkBar)가 MobileBottomNav와 겹친다.
 *
 * 이 primitive는 두 가지 용도로 사용한다:
 * 1. 페이지 본문 wrapper — Layout `<main>`을 대체하거나 페이지 자체가
 *    bottom nav 영역만큼 패딩을 확보해야 할 때
 * 2. sticky bar wrapper — `bottom-0` 요소가 nav 위에 떠야 할 때
 *
 * 정책:
 * - 모바일 nav 높이는 기본 3.5rem(56px) — `MobileBottomNav.tsx`와 일치
 * - `env(safe-area-inset-bottom)`을 항상 추가 (notch 기기 대응)
 * - md 이상에서는 padding 0 (desktop은 bottom nav 없음)
 *
 * @example 페이지 본문에 적용
 * <MobileSafeArea as="main">
 *   {children}
 * </MobileSafeArea>
 *
 * @example sticky bar — nav 위로 띄움
 * <MobileSafeArea sticky>
 *   <BulkActionBar />
 * </MobileSafeArea>
 *
 * @example nav 영역 무시 (desktop only context 등)
 * <MobileSafeArea inset="safe-only">...</MobileSafeArea>
 */

import React, { CSSProperties, HTMLAttributes, ElementType, ReactNode } from 'react';

/**
 * Safe area inset 종류.
 *
 * - `nav`:       MobileBottomNav 높이(56px) + safe-area-inset-bottom 까지 확보. 기본값.
 * - `safe-only`: safe-area-inset-bottom 만 확보 (nav 없는 페이지)
 * - `none`:      padding 미적용 (sticky 모드에서 자동으로 사용)
 */
export type MobileSafeAreaInset = 'nav' | 'safe-only' | 'none';

export interface MobileSafeAreaProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  /**
   * 렌더링할 element type. 기본 'div'.
   * `as="main"`으로 Layout의 main 영역을 직접 감쌀 수 있다.
   */
  as?: ElementType;
  /**
   * Safe area 종류. 기본 'nav'.
   */
  inset?: MobileSafeAreaInset;
  /**
   * sticky bar 모드. true면 `sticky bottom-0` + nav 높이만큼 bottom offset.
   * 자식이 화면 하단에 고정되도록 한다.
   */
  sticky?: boolean;
}

/**
 * Tailwind는 동적으로 빌드된 calc()를 추출하지 못하므로 inline style을 사용.
 * primitive 내부에서만 inline style을 허용한다 — 소비자 코드에는 영향 없음.
 *
 * NOTE: 이 primitive는 MobileBottomNav 높이(3.5rem = 56px)를 가정한다.
 * MobileBottomNav 높이가 변경되면 이 값을 갱신해야 한다.
 */
const NAV_HEIGHT_REM = 3.5;

function getPaddingStyle(inset: MobileSafeAreaInset): CSSProperties {
  if (inset === 'none') return {};
  if (inset === 'safe-only') {
    return { paddingBottom: 'env(safe-area-inset-bottom, 0px)' };
  }
  // nav (default)
  return {
    paddingBottom: `calc(${NAV_HEIGHT_REM}rem + env(safe-area-inset-bottom, 0px))`,
  };
}

function getBottomStyle(): CSSProperties {
  return {
    bottom: `calc(${NAV_HEIGHT_REM}rem + env(safe-area-inset-bottom, 0px))`,
  };
}

/**
 * 모바일 하단 nav + safe-area 보정 wrapper.
 *
 * mobile에서만 padding/bottom offset을 적용하고, md 이상에서는 0이 되도록
 * media query 기반 inline style을 사용한다.
 */
export function MobileSafeArea({
  children,
  as: Component = 'div',
  inset = 'nav',
  sticky = false,
  className,
  style,
  ...props
}: MobileSafeAreaProps) {
  if (sticky) {
    // sticky bar 모드: 자식이 화면 하단에 떠야 한다.
    // mobile: bottom = nav 높이 + safe-area / md+: bottom = 0
    return (
      <Component
        className={['sticky md:!bottom-0', className].filter(Boolean).join(' ')}
        style={{ ...getBottomStyle(), ...style }}
        {...props}
      >
        {children}
      </Component>
    );
  }

  // 본문 wrapper 모드: mobile padding-bottom / md+ 0
  // Tailwind `md:!pb-0`로 desktop 무효화.
  return (
    <Component
      className={['md:!pb-0', className].filter(Boolean).join(' ')}
      style={{ ...getPaddingStyle(inset), ...style }}
      {...props}
    >
      {children}
    </Component>
  );
}
