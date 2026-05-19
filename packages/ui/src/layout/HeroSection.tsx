/**
 * HeroSection
 * WO-O4O-RESPONSIVE-PRIMITIVES-AND-SAFE-AREA-V1
 *
 * Hero 영역의 구조화된 primitive.
 * mobile-first text sizing + breakpoint별 padding으로 화면별 hero drift를 흡수한다.
 *
 * - title fontSize: text-2xl md:text-3xl lg:text-4xl (점프 1단계 제한)
 * - padding: py-10 md:py-14 lg:py-20 (mobile-first)
 *
 * 기존 `PageHero` (단순 wrapper)와 공존한다.
 * - `PageHero`: 임의 콘텐츠를 mb-16 등으로 감싸는 wrapper
 * - `HeroSection`: title/subtitle/icon/actions 구조를 강제하는 primitive
 *
 * @example
 * <HeroSection
 *   title="대한약사회"
 *   subtitle="약사 전문 커뮤니티 플랫폼"
 *   actions={<Button>가입하기</Button>}
 * />
 *
 * @example variant="compact" — Operator/Hub용 작은 hero
 * <HeroSection
 *   variant="compact"
 *   eyebrow="Operator"
 *   title="포럼 운영"
 *   subtitle="포럼 게시글과 신고 관리"
 * />
 */

import React, { HTMLAttributes, ReactNode } from 'react';

/**
 * Hero variant.
 *
 * - `default`: 공개 페이지 hero. py-10 md:py-14 lg:py-20, title 2xl→3xl→4xl
 * - `compact`: Hub/Operator 페이지 상단 헤더. py-6 md:py-8, title xl→2xl
 */
export type HeroSectionVariant = 'default' | 'compact';

/**
 * Hero alignment.
 */
export type HeroSectionAlign = 'left' | 'center';

const variantClassMap: Record<HeroSectionVariant, { wrapper: string; title: string; subtitle: string; eyebrow: string }> = {
  default: {
    wrapper: 'py-10 md:py-14 lg:py-20',
    title: 'text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight',
    subtitle: 'mt-3 text-sm md:text-base lg:text-lg text-muted-foreground',
    eyebrow: 'text-xs md:text-sm font-semibold uppercase tracking-wider text-primary',
  },
  compact: {
    wrapper: 'py-6 md:py-8',
    title: 'text-xl md:text-2xl font-semibold tracking-tight',
    subtitle: 'mt-1.5 text-sm text-muted-foreground',
    eyebrow: 'text-xs font-semibold uppercase tracking-wider text-primary',
  },
};

const alignClassMap: Record<HeroSectionAlign, { container: string; meta: string }> = {
  left: { container: 'text-left', meta: 'justify-start' },
  center: { container: 'text-center', meta: 'justify-center' },
};

export interface HeroSectionProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** Optional small eyebrow label above title (e.g. "Operator", "공지") */
  eyebrow?: ReactNode;
  /** Optional leading icon. mobile에서 자동 축소. */
  icon?: ReactNode;
  /** Optional badge — title 우측에 inline 표시. mobile에서는 title 아래로 wrap. */
  badge?: ReactNode;
  /** Hero 메인 제목 */
  title: ReactNode;
  /** Hero 보조 설명 */
  subtitle?: ReactNode;
  /** CTA 버튼 그룹 등 액션 요소 (자동 wrap) */
  actions?: ReactNode;
  /** 추가 자식 — title block 아래에 렌더됨 */
  children?: ReactNode;
  /** Hero variant. 기본 'default'. */
  variant?: HeroSectionVariant;
  /** 텍스트 정렬. 기본 'left'. */
  align?: HeroSectionAlign;
}

/**
 * 구조화된 Hero primitive. mobile-first text sizing 보장.
 */
export function HeroSection({
  eyebrow,
  icon,
  badge,
  title,
  subtitle,
  actions,
  children,
  variant = 'default',
  align = 'left',
  className,
  ...props
}: HeroSectionProps) {
  const v = variantClassMap[variant];
  const a = alignClassMap[align];

  return (
    <section
      className={[v.wrapper, a.container, className].filter(Boolean).join(' ')}
      {...props}
    >
      {eyebrow && <div className={`${v.eyebrow} mb-2`}>{eyebrow}</div>}

      <div className={`flex items-start gap-3 md:gap-4 ${align === 'center' ? 'flex-col items-center' : ''}`}>
        {icon && (
          <div className="flex-shrink-0 [&>svg]:w-8 [&>svg]:h-8 md:[&>svg]:w-10 md:[&>svg]:h-10">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className={`flex flex-wrap items-center gap-2 md:gap-3 ${a.meta}`}>
            <h1 className={v.title}>{title}</h1>
            {badge && <div className="flex-shrink-0">{badge}</div>}
          </div>
          {subtitle && <p className={v.subtitle}>{subtitle}</p>}
        </div>
      </div>

      {children && <div className="mt-4 md:mt-6">{children}</div>}

      {actions && (
        <div className={`mt-5 md:mt-6 flex flex-wrap gap-2 md:gap-3 ${a.meta}`}>
          {actions}
        </div>
      )}
    </section>
  );
}
