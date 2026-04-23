/**
 * PageSection / PageHero
 * WO-O4O-GLOBAL-VERTICAL-RHYTHM-SYSTEM-V1
 *
 * 소비자향 페이지(Home, Hub)의 Vertical Rhythm을 표준화하는 래퍼.
 * Operator Dashboard의 AGSection과 구분된다.
 *
 * 규칙:
 *   Hero  → mb-16 (4rem / 64px)  — Hero 아래 첫 Section까지
 *   PageSection → mb-12 (3rem / 48px) — Section 간
 */

import React, { HTMLAttributes, ReactNode } from 'react';

// ─── PageHero ──────────────────────────────────────────────────────────────

export interface PageHeroProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
}

/**
 * Hero 영역 래퍼. 하단에 항상 mb-16(64px) 여백을 둔다.
 *
 * @example
 * <PageHero>
 *   <HeroBannerSection ... />
 * </PageHero>
 */
export function PageHero({ children, className, ...props }: PageHeroProps) {
  return (
    <section
      className={['mb-16', className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </section>
  );
}

// ─── PageSection ───────────────────────────────────────────────────────────

export interface PageSectionProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  /** 마지막 섹션처럼 하단 여백을 제거할 때 사용 */
  last?: boolean;
}

/**
 * 페이지 콘텐츠 섹션 래퍼. 하단에 항상 mb-12(48px) 여백을 둔다.
 * 마지막 섹션은 last={true}로 여백을 제거할 수 있다.
 *
 * @example
 * <PageSection>
 *   <NewsNoticesSection ... />
 * </PageSection>
 *
 * <PageSection last>
 *   <CtaGuidanceSection ... />
 * </PageSection>
 */
export function PageSection({ children, className, last = false, ...props }: PageSectionProps) {
  const base = last ? '' : 'mb-12';
  return (
    <section
      className={[base, className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </section>
  );
}
