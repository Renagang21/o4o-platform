/**
 * PageContainer
 * WO-O4O-HORIZONTAL-SPACING-AND-CONTAINER-STANDARD-V1
 *
 * O4O 공통 가로 정렬 컨테이너.
 * max-w-7xl + responsive horizontal padding 표준.
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

export interface PageContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/**
 * 가로 정렬 기준 컨테이너.
 * 모든 Home / Hub 섹션의 콘텐츠는 이 컨테이너 안에 있어야 한다.
 *
 * WO-O4O-TEMPLATE-RESPONSIVE-LAYOUT-V1:
 * TemplateProvider가 있으면 layout.container 토큰을 사용하고,
 * 없으면 max-w-7xl 기본값을 유지한다.
 *
 * @example
 * <PageSection>
 *   <PageContainer>
 *     <NoticeSection />
 *   </PageContainer>
 * </PageSection>
 */
export function PageContainer({ children, className, ...props }: PageContainerProps) {
  const tpl = useTemplate();
  const container = tpl?.layout?.container ?? 'max-w-7xl';
  return (
    <div
      className={[`mx-auto w-full ${container} px-4 sm:px-6 lg:px-8`, className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}
