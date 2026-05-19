/**
 * ContentCard
 * WO-O4O-RESPONSIVE-PRIMITIVES-AND-SAFE-AREA-V1
 *
 * O4O 표준 콘텐츠 카드 primitive.
 *
 * KPA-Society audit (IR-V1)에서 ServiceCard / LectureCard / EventCard /
 * 화면별 inline card div가 padding·radius·shadow·border 패턴이 모두 달랐던
 * 문제를 흡수한다.
 *
 * 기존 `Card` (shadcn 스타일, packages/ui/src/index.tsx)와 다른 점:
 *   - mobile-first padding variant
 *   - visual variant (outlined / elevated / flat)
 *   - interactive prop (hover 효과 + cursor-pointer)
 *   - 의미 토큰 (bg-card / border-card / shadow-dt-*) 우선 사용
 *
 * @example
 * <ContentCard variant="outlined" padding="default">
 *   <h3>제목</h3>
 *   <p>설명</p>
 * </ContentCard>
 *
 * @example interactive card
 * <ContentCard interactive onClick={() => navigate('/x')}>
 *   <LectureSummary ... />
 * </ContentCard>
 */

import React, { HTMLAttributes, ReactNode, forwardRef } from 'react';

/**
 * Card visual variant.
 *
 * - `outlined`: border + bg-card (기본). 가장 보수적.
 * - `elevated`: shadow-md + bg-card. 강조 카드.
 * - `flat`:     bg-card only. 배경 위 카드.
 */
export type ContentCardVariant = 'outlined' | 'elevated' | 'flat';

/**
 * Card padding (mobile-first).
 *
 * - `compact`: p-3 md:p-4 (12px → 16px)
 * - `default`: p-4 md:p-6 (16px → 24px)
 * - `relaxed`: p-6 md:p-8 (24px → 32px)
 * - `none`:    0 — 자식이 padding을 통제
 */
export type ContentCardPadding = 'compact' | 'default' | 'relaxed' | 'none';

const variantClassMap: Record<ContentCardVariant, string> = {
  outlined: 'bg-white border border-gray-200',
  elevated: 'bg-white shadow-md',
  flat: 'bg-white',
};

const paddingClassMap: Record<ContentCardPadding, string> = {
  compact: 'p-3 md:p-4',
  default: 'p-4 md:p-6',
  relaxed: 'p-6 md:p-8',
  none: '',
};

export interface ContentCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Card visual variant. 기본 'outlined'. */
  variant?: ContentCardVariant;
  /** Card padding. 기본 'default'. */
  padding?: ContentCardPadding;
  /** hover 효과 + cursor-pointer. 기본 false. */
  interactive?: boolean;
}

/**
 * O4O 표준 콘텐츠 카드.
 *
 * @remarks
 * `@o4o/ui` primitive는 service별 tailwind.config 차이에 영향받지 않도록
 * 표준 Tailwind 클래스(`bg-white`, `border-gray-200`, `shadow-md`)만 사용한다.
 * 서비스별 테마 색을 적용하려면 `className`으로 override.
 */
export const ContentCard = forwardRef<HTMLDivElement, ContentCardProps>(
  (
    {
      children,
      variant = 'outlined',
      padding = 'default',
      interactive = false,
      className,
      ...props
    },
    ref
  ) => {
    const classes = [
      'rounded-lg',
      variantClassMap[variant],
      paddingClassMap[padding],
      interactive
        ? 'cursor-pointer transition-shadow duration-200 hover:shadow-md hover:border-gray-300'
        : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={ref} className={classes} {...props}>
        {children}
      </div>
    );
  }
);

ContentCard.displayName = 'ContentCard';
