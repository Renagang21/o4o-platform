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

export interface PageContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/**
 * 가로 정렬 기준 컨테이너.
 * 모든 Home / Hub 섹션의 콘텐츠는 이 컨테이너 안에 있어야 한다.
 *
 * @example
 * <PageSection>
 *   <PageContainer>
 *     <NoticeSection />
 *   </PageContainer>
 * </PageSection>
 */
export function PageContainer({ children, className, ...props }: PageContainerProps) {
  return (
    <div
      className={['mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8', className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}
