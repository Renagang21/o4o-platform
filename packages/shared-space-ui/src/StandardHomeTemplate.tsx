/**
 * StandardHomeTemplate — KPA / GlycoPharm / K-Cosmetics 공통 Home 레이아웃
 *
 * WO-O4O-STANDARD-HOME-TEMPLATE-V1
 *
 * 레이아웃 담당:
 *   - heroSlot → 공지 2-column → AppEntry → CTA → Help (5블록)
 *   - PageSection / PageContainer 중복 제거
 *   - 2-column 공지 flex 구조 공통화
 *
 * 서비스 콘텐츠 (각 서비스 파일에 유지):
 *   - heroSlot: HeroBannerSection(KPA/KCOS) 또는 StatusHeroBlock(Glyco)
 *   - noticesRightSlot: 서비스별 외부 뉴스 placeholder
 *   - appEntryCards: 서비스별 카드 목록
 *   - cta / help: 서비스별 문구·링크
 */

import { type ReactNode, type CSSProperties } from 'react';
import { PageSection, PageContainer } from '@o4o/ui';
import { NewsNoticesSection } from './NewsNoticesSection';
import { AppEntrySection } from './AppEntrySection';
import { CtaGuidanceSection } from './CtaGuidanceSection';
import { O4OHelpSection } from './O4OHelpSection';
import type {
  NoticeItem,
  AppEntrySectionProps,
  CtaGuidanceSectionProps,
  O4OHelpSectionProps,
} from './types';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StandardHomeTemplateProps {
  /** Hero 블록 — PageHero 또는 서비스별 커스텀 wrapper 포함, 통째로 위임 */
  heroSlot: ReactNode;

  /** 공지 데이터 */
  notices: NoticeItem[];
  noticesLoading?: boolean;
  noticesTitle?: string;
  noticesAccentColor?: string;
  noticesAccentBg?: string;
  noticesViewAllHref?: string;

  /** 공지 우측 컬럼 — 서비스별 외부 뉴스 placeholder */
  noticesRightSlot: ReactNode;

  /** 2-column gap. KPA/Glyco: 'gap-4', K-Cosmetics: 'gap-5' */
  noticesGap?: 'gap-4' | 'gap-5';

  /** 최신 활동 섹션 — 공지 아래, 서비스 바로가기 위 (WO-O4O-KPA-HOME-LATEST-ACTIVITY-SECTION-V1) */
  latestSlot?: ReactNode;

  /**
   * 가치 / 역할별 활용 안내 슬롯 — 최신 활동 아래, 서비스 바로가기 위.
   *
   * WO-O4O-KPA-HOME-VALUE-CARDS-V1:
   * 사용자 흐름 "Hero (여기는 무엇을 하는 곳인가) → Value Cards (그래서 나는
   * 무엇을 하면 되는가) → AppEntry (실제로 시작하기)" 의 중간 단계.
   * 미전달 시 비활성 (다른 service 영향 0).
   */
  valueGuideSlot?: ReactNode;

  /**
   * valueGuideSlot 배치 위치.
   * - 'before-app-entry' (기본): 최신 활동 아래 · 서비스 바로가기 위 (WO-O4O-KPA-HOME-VALUE-CARDS-V1 원본 위치)
   * - 'after-help': 이용 가이드(Help) 아래 — "내 역할로 시작하기"를 안내 가이드 다음으로 내리는 서비스용
   *   (WO-O4O-KPA-HOME-VALUE-CARDS-AFTER-GUIDE-V1).
   * 미전달 서비스는 기존 위치 유지 (영향 0).
   */
  valueGuidePlacement?: 'before-app-entry' | 'after-help';

  /** AppEntry 카드 목록 */
  appEntryCards: AppEntrySectionProps['cards'];
  appEntryOnCardClick?: AppEntrySectionProps['onCardClick'];

  /** CTA 섹션 */
  cta: CtaGuidanceSectionProps;

  /** Help 섹션 */
  help: O4OHelpSectionProps;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function StandardHomeTemplate({
  heroSlot,
  notices,
  noticesLoading,
  noticesTitle = '공지',
  noticesAccentColor = 'var(--color-primary)',
  noticesAccentBg,
  noticesViewAllHref,
  noticesRightSlot,
  noticesGap = 'gap-4',
  latestSlot,
  valueGuideSlot,
  valueGuidePlacement = 'before-app-entry',
  appEntryCards,
  appEntryOnCardClick,
  cta,
  help,
}: StandardHomeTemplateProps) {
  const valueGuideAfterHelp = valueGuidePlacement === 'after-help' && !!valueGuideSlot;

  const valueGuideBlock = (isLast: boolean) =>
    valueGuideSlot ? (
      <PageSection last={isLast}>
        <PageContainer>
          {valueGuideSlot}
        </PageContainer>
      </PageSection>
    ) : null;

  return (
    <div style={styles.page}>
      {/* 1. Hero — 서비스별 완전 위임 */}
      {heroSlot}

      {/* 2. 공지 / 외부 뉴스 (2-column) */}
      <PageSection>
        <PageContainer>
          <div className={`flex flex-col md:flex-row ${noticesGap}`}>
            <div className="flex-1 min-w-0">
              <NewsNoticesSection
                title={noticesTitle}
                items={notices}
                loading={noticesLoading}
                accentColor={noticesAccentColor}
                accentBg={noticesAccentBg}
                viewAllHref={noticesViewAllHref}
              />
            </div>
            <div className="flex-1 min-w-0">
              {noticesRightSlot}
            </div>
          </div>
        </PageContainer>
      </PageSection>

      {/* 3. 최신 활동 — 선택적 슬롯 */}
      {latestSlot && (
        <PageSection>
          <PageContainer>
            {latestSlot}
          </PageContainer>
        </PageSection>
      )}

      {/* 3-1. 가치 / 역할별 활용 안내 — 선택적 슬롯 (기본 위치)
              WO-O4O-KPA-HOME-VALUE-CARDS-V1: AppEntry 진입 전 "내 역할로 시작하기".
              valueGuidePlacement='after-help' 인 서비스는 Help 아래로 이동(아래 블록 7). */}
      {!valueGuideAfterHelp && valueGuideBlock(false)}

      {/* 4. 서비스 바로가기 */}
      <PageSection>
        <PageContainer>
          <AppEntrySection
            accentColor="var(--color-primary)"
            cards={appEntryCards}
            onCardClick={appEntryOnCardClick}
          />
        </PageContainer>
      </PageSection>

      {/* 5. CTA */}
      <PageSection>
        <PageContainer>
          <CtaGuidanceSection {...cta} />
        </PageContainer>
      </PageSection>

      {/* 6. Help */}
      <PageSection last={!valueGuideAfterHelp}>
        <PageContainer>
          <O4OHelpSection {...help} />
        </PageContainer>
      </PageSection>

      {/* 7. 가치 / 역할별 활용 안내 — 'after-help' 배치 시 Help 아래
              WO-O4O-KPA-HOME-VALUE-CARDS-AFTER-GUIDE-V1 */}
      {valueGuideAfterHelp && valueGuideBlock(true)}
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: 'var(--color-bg-secondary, #f8fafc)',
  },
};
