/**
 * ResponsiveGrid
 * WO-O4O-RESPONSIVE-PRIMITIVES-AND-SAFE-AREA-V1
 *
 * mobile-first 반응형 그리드 primitive.
 *
 * 화면별로 `grid-cols-N` (또는 inline `gridTemplateColumns`) 하드코딩이
 * 만연하여 mobile에서 1열 fallback이 누락되는 패턴을 흡수한다.
 *
 * 정책:
 * - 기본 cols.base는 항상 1 (mobile 1열 강제)
 * - cols 객체로 sm/md/lg/xl breakpoint별 열 수 지정
 * - Tailwind는 정적 class를 요구하므로 lookup map으로 작성
 *
 * @example
 * <ResponsiveGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} gap="default">
 *   {items.map(...)}
 * </ResponsiveGrid>
 *
 * @example KPI 카드 — mobile 2열 허용
 * <ResponsiveGrid cols={{ base: 2, lg: 4 }} gap="compact">
 *   {kpis.map(...)}
 * </ResponsiveGrid>
 *
 * @example auto-fill 패턴
 * <ResponsiveGrid auto minItem="220px" gap="default">
 *   {services.map(...)}
 * </ResponsiveGrid>
 */

import React, { HTMLAttributes, ReactNode } from 'react';

export type GridCol = 1 | 2 | 3 | 4 | 5 | 6;
export type GridGap = 'compact' | 'default' | 'relaxed';

export interface ResponsiveGridCols {
  /** mobile 기본 (≤640px). 미지정 시 1. */
  base?: GridCol;
  sm?: GridCol;
  md?: GridCol;
  lg?: GridCol;
  xl?: GridCol;
}

const baseColMap: Record<GridCol, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
};
const smColMap: Record<GridCol, string> = {
  1: 'sm:grid-cols-1',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-4',
  5: 'sm:grid-cols-5',
  6: 'sm:grid-cols-6',
};
const mdColMap: Record<GridCol, string> = {
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
  5: 'md:grid-cols-5',
  6: 'md:grid-cols-6',
};
const lgColMap: Record<GridCol, string> = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
  6: 'lg:grid-cols-6',
};
const xlColMap: Record<GridCol, string> = {
  1: 'xl:grid-cols-1',
  2: 'xl:grid-cols-2',
  3: 'xl:grid-cols-3',
  4: 'xl:grid-cols-4',
  5: 'xl:grid-cols-5',
  6: 'xl:grid-cols-6',
};

const gapMap: Record<GridGap, string> = {
  compact: 'gap-2 md:gap-3',
  default: 'gap-3 md:gap-4 lg:gap-6',
  relaxed: 'gap-4 md:gap-6 lg:gap-8',
};

export interface ResponsiveGridProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /**
   * Breakpoint별 열 수. base 미지정 시 1.
   * `auto`가 true일 경우 무시됨.
   */
  cols?: ResponsiveGridCols;
  /**
   * auto-fill 모드. 자식 최소 폭에 맞춰 자동으로 열 수를 결정한다.
   * `minItem`과 함께 사용 (예: "220px").
   */
  auto?: boolean;
  /** auto 모드일 때 자식 최소 폭. 기본 "220px". */
  minItem?: string;
  /** Grid gap variant. 기본 'default'. */
  gap?: GridGap;
}

/**
 * mobile-first 반응형 그리드.
 */
export function ResponsiveGrid({
  children,
  cols,
  auto = false,
  minItem = '220px',
  gap = 'default',
  className,
  style,
  ...props
}: ResponsiveGridProps) {
  if (auto) {
    return (
      <div
        className={['grid', gapMap[gap], className].filter(Boolean).join(' ')}
        style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${minItem}, 1fr))`, ...style }}
        {...props}
      >
        {children}
      </div>
    );
  }

  const base = cols?.base ?? 1;
  const classes = [
    'grid',
    baseColMap[base],
    cols?.sm ? smColMap[cols.sm] : '',
    cols?.md ? mdColMap[cols.md] : '',
    cols?.lg ? lgColMap[cols.lg] : '',
    cols?.xl ? xlColMap[cols.xl] : '',
    gapMap[gap],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} style={style} {...props}>
      {children}
    </div>
  );
}
