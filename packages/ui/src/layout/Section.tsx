/**
 * PageSection / PageHero
 * WO-O4O-GLOBAL-VERTICAL-RHYTHM-SYSTEM-V1
 * WO-O4O-TEMPLATE-EXPAND-COMPONENT-V1: template prop 지원
 * WO-O4O-TEMPLATE-PROVIDER-V1: Context 자동 소비
 *
 * 소비자향 페이지(Home, Hub)의 Vertical Rhythm을 표준화하는 래퍼.
 * Operator Dashboard의 AGSection과 구분된다.
 *
 * 규칙:
 *   Hero  → mb-16 (4rem / 64px)  — Hero 아래 첫 Section까지
 *   PageSection → mb-12 (3rem / 48px) — Section 간
 *
 * Template 우선순위:
 *   1. 명시적 template prop (최우선)
 *   2. TemplateProvider Context (자동)
 *   3. 기본값 (template 없음)
 */

import React, { HTMLAttributes, ReactNode } from 'react';
import { useTemplate } from './TemplateContext';

// ─── Template Types (structural typing — no import needed) ───────────────

/** Hero template tokens: bg/border/padding className strings */
export interface HeroTemplate {
  bg: string;
  border: string;
  padding: string;
}

/** Section template tokens: spacing className string */
export interface SectionTemplate {
  spacing: string;
}

// ─── PageHero ──────────────────────────────────────────────────────────────

export interface PageHeroProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  /** Template tokens — auto-applies hero bg/border/padding classes */
  template?: HeroTemplate;
}

/**
 * Hero 영역 래퍼. 하단에 항상 mb-16(64px) 여백을 둔다.
 * template prop > Context > 없음 순으로 template를 결정한다.
 *
 * @example
 * // TemplateProvider가 있으면 prop 없이도 자동 적용
 * <PageHero>
 *   <HeroBannerSection ... />
 * </PageHero>
 */
export function PageHero({ children, className, template, ...props }: PageHeroProps) {
  const ctx = useTemplate();
  const resolved = template ?? ctx?.hero;
  const tpl = resolved
    ? `${resolved.bg} ${resolved.border} ${resolved.padding}`
    : '';
  return (
    <section
      className={['mb-16', tpl, className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </section>
  );
}

// ─── PageSection ───────────────────────────────────────────────────────────

/**
 * Section spacing variant (mobile-first).
 *
 * - `compact`: mb-6 md:mb-8 (24px → 32px) — Hub 내부 dense layout
 * - `default`: mb-8 md:mb-12 (32px → 48px) — 일반 콘텐츠 섹션
 * - `relaxed`: mb-12 md:mb-16 lg:mb-20 (48px → 64px → 80px) — Hero 인접, breathing layout
 *
 * 기존 사용처 호환을 위해 prop 미지정 시 `default`를 적용한다.
 * 단, `default`는 mb-12 단일값에서 mb-8 md:mb-12로 mobile-first 축소된다.
 */
export type PageSectionSpacing = 'compact' | 'default' | 'relaxed';

const sectionSpacingMap: Record<PageSectionSpacing, string> = {
  compact: 'mb-6 md:mb-8',
  default: 'mb-8 md:mb-12',
  relaxed: 'mb-12 md:mb-16 lg:mb-20',
};

export interface PageSectionProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  /** 마지막 섹션처럼 하단 여백을 제거할 때 사용 */
  last?: boolean;
  /** Template tokens — auto-applies section spacing class */
  template?: SectionTemplate;
  /**
   * Section spacing variant (mobile-first).
   * 미지정 시 `default` (mb-8 md:mb-12).
   * template prop 또는 Context의 section.spacing이 있으면 그 값이 우선.
   */
  spacing?: PageSectionSpacing;
}

/**
 * 페이지 콘텐츠 섹션 래퍼. 하단에 mobile-first margin을 둔다.
 * 마지막 섹션은 last={true}로 여백을 제거할 수 있다.
 *
 * 우선순위:
 *   1. template prop (있으면)
 *   2. TemplateProvider Context의 section
 *   3. spacing prop variant (없으면 'default')
 *
 * @example
 * <PageSection spacing="compact">
 *   <KpiGrid ... />
 * </PageSection>
 */
export function PageSection({
  children,
  className,
  last = false,
  template,
  spacing = 'default',
  ...props
}: PageSectionProps) {
  const ctx = useTemplate();
  const resolved = template ?? ctx?.section;
  const base = last ? '' : sectionSpacingMap[spacing];
  const tpl = resolved?.spacing ?? '';
  return (
    <section
      className={[base, tpl, className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </section>
  );
}
