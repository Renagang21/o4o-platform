/**
 * PageContainer
 * WO-O4O-HORIZONTAL-SPACING-AND-CONTAINER-STANDARD-V1
 * WO-O4O-RESPONSIVE-PRIMITIVES-AND-SAFE-AREA-V1: width variant 확장
 *
 * O4O 공통 가로 정렬 컨테이너.
 * mobile-first responsive horizontal padding + max-width variant.
 *
 * 사용 패턴:
 *   <PageSection>
 *     <PageContainer>
 *       <SectionContent />
 *     </PageContainer>
 *   </PageSection>
 *
 *   full-bleed 배경이 있을 때:
 *   <PageSection>
 *     <div className="bg-muted">
 *       <PageContainer>
 *         <SectionContent />
 *       </PageContainer>
 *     </div>
 *   </PageSection>
 */

import React, { HTMLAttributes, ReactNode } from 'react';
import { useTemplate } from './TemplateContext';

/**
 * Container width variant.
 *
 * - `narrow`: max-w-2xl (~672px) — Storefront mobile-first, 폼 단일 컬럼
 * - `form`:   max-w-3xl (~768px) — 약사회 폼/문서, Forum Detail
 * - `default`: max-w-7xl (1280px) — 기본값. 기존 사용처 호환
 * - `wide`:   max-w-[1400px] — Operator wrapper
 * - `full`:   max-w-none — 풀폭 (외부 wrapper가 폭 통제하는 경우)
 */
export type PageContainerWidth = 'narrow' | 'form' | 'default' | 'wide' | 'full';

const widthClassMap: Record<PageContainerWidth, string> = {
  narrow: 'max-w-2xl',
  form: 'max-w-3xl',
  default: 'max-w-7xl',
  wide: 'max-w-[1400px]',
  full: 'max-w-none',
};

export interface PageContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /**
   * 컨테이너 max-width variant.
   * 미지정 시 `default` (max-w-7xl) — 기존 동작 유지.
   * TemplateProvider의 layout.container 토큰이 있으면 그 값이 우선.
   */
  width?: PageContainerWidth;
}

/**
 * 가로 정렬 기준 컨테이너.
 * 모든 Home / Hub 섹션의 콘텐츠는 이 컨테이너 안에 있어야 한다.
 *
 * 우선순위:
 *   1. TemplateProvider의 layout.container (있으면)
 *   2. width prop (없으면 'default')
 *
 * @example
 * <PageSection>
 *   <PageContainer width="form">
 *     <ForumDetailBody />
 *   </PageContainer>
 * </PageSection>
 */
export function PageContainer({ children, className, width = 'default', ...props }: PageContainerProps) {
  const tpl = useTemplate();
  const container = tpl?.layout?.container ?? widthClassMap[width];
  return (
    <div
      className={[`mx-auto w-full ${container} px-4 sm:px-6 lg:px-8`, className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}
