/**
 * InfoPageLayout - 정보 페이지용 공통 레이아웃
 *
 * WO-KPA-HOME-SERVICE-SECTION-V1
 * WO-O4O-INFO-PAGE-LAYOUT-RESPONSIVE-V1:
 *   inline style 전면 제거 → @o4o/ui responsive primitive 적용
 *   - PageContainer width="form" (max-w-3xl ≈ 기존 800px)
 *   - HeroSection align="center" (mobile-first title/icon sizing)
 *   - ContentCard variant="outlined" padding="relaxed"
 *
 * WO-O4O-KPA-PHARMACYHUB-COMMUNITY-HOME-AND-NAV-CANONICAL-CONVERGENCE-V1 §3·§6·§9:
 *   자체 PlatformHeader/PlatformFooter(지부·분회 시대 잔재) 제거.
 *   header/footer 는 canonical Layout(KpaGlobalHeader + Footer) 하나만 쓴다.
 *   badgeType('도입 검토용 데모' / '독립 운영 가능') 도 지부·분회 잔재라 제거했다
 *   (실제 소비처 4곳 모두 'none' 이었다).
 *
 * 서비스 상세 소개 및 참여 안내 페이지에서 사용
 * (LmsServicePage / ForumServicePage / PharmacyServicePage / PharmacyJoinPage)
 */

import React from 'react';
import { PageContainer, HeroSection, ContentCard } from '@o4o/ui';


export interface InfoPageLayoutProps {
  children: React.ReactNode;
  /** 페이지 제목 */
  title: string;
  /** 페이지 설명 (한 줄) */
  subtitle?: string;
  /** 상단 아이콘 (emoji 문자열) */
  icon?: string;
}

export function InfoPageLayout({
  children,
  title,
  subtitle,
  icon,
}: InfoPageLayoutProps) {
  return (
    <div className="flex-1 bg-slate-50">
        <PageContainer width="form" className="py-8 md:py-12">
          {/*
            HeroSection 자체의 py(`py-10 md:py-14 lg:py-20`)는 외부 PageContainer
            의 py-8/12와 합쳐져 hero 영역이 과도해지므로 `!py-0`로 무효화하고,
            hero ↓ content 간격은 `mb-8 md:mb-12`로 명시.
          */}
          <HeroSection
            align="center"
            title={title}
            subtitle={subtitle}
            icon={
              icon ? (
                <span
                  aria-hidden="true"
                  className="block text-5xl md:text-6xl leading-none"
                >
                  {icon}
                </span>
              ) : undefined
            }
            className="!py-0 mb-8 md:mb-12"
          />
          {/*
            기존 content 시각 (borderRadius 16px + shadow + border + 32px padding) 을
            ContentCard variant="outlined" padding="relaxed" + rounded-2xl + shadow-sm 로 복원.
          */}
          <ContentCard
            variant="outlined"
            padding="relaxed"
            className="rounded-2xl shadow-sm"
          >
            {children}
          </ContentCard>
        </PageContainer>
    </div>
  );
}

export default InfoPageLayout;
