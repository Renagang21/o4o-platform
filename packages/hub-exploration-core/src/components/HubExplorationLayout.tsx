import type { HubExplorationLayoutProps } from '../types.js';
import { HUB_FIXED_TABS } from '../types.js';
import { DEFAULT_THEME, NEUTRALS } from '../theme.js';
import { HeroCarousel } from './HeroCarousel.js';
import { RecentUpdatesTabs } from './RecentUpdatesTabs.js';
import { AdSection } from './AdSection.js';
import { CoreServiceBanners } from './CoreServiceBanners.js';
import { ServicePromotionBanners } from './ServicePromotionBanners.js';
import { AIPlaceholder } from './AIPlaceholder.js';

/**
 * HubExplorationLayout — Orchestrator
 *
 * WO-O4O-HUB-EXPLORATION-UNIFORM-STRUCTURE-V1:
 * 모든 필수 섹션(Hero, RecentUpdates, CoreServices, AIPlaceholder)은 항상 렌더링된다.
 * 데이터가 없어도 빈 상태 UI를 표시하며, 섹션을 제거하지 않는다.
 */
export function HubExplorationLayout({
  theme,
  hero,
  recentUpdates,
  ads,
  coreServices,
  promotions,
  aiPlaceholder,
  beforeSections,
  afterSections,
  footerNote,
}: HubExplorationLayoutProps) {
  const maxWidth = theme?.maxWidth ?? DEFAULT_THEME.maxWidth;
  const sectionGap = theme?.sectionGap ?? DEFAULT_THEME.sectionGap;
  const bgColor = theme?.backgroundColor ?? DEFAULT_THEME.backgroundColor;

  // Mandatory: recentUpdates always renders with HUB_FIXED_TABS fallback
  const recentUpdatesProps = recentUpdates ?? { tabs: [...HUB_FIXED_TABS], items: [] };

  // Mandatory: coreServices always renders (empty state if no banners)
  const coreServicesProps = coreServices ?? { banners: [] };

  return (
    <div style={{ backgroundColor: bgColor, minHeight: '100vh' }}>
      <div style={{ maxWidth, margin: '0 auto', padding: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: sectionGap }}>
          {beforeSections}

          {/* Section 1: Hero (mandatory) */}
          <HeroCarousel {...hero} />

          {/* Section 2: Recent Updates (mandatory — fixed tabs) */}
          <RecentUpdatesTabs {...recentUpdatesProps} />

          {/* Section 3: Ads (optional — admin-controlled) */}
          {ads && <AdSection {...ads} />}

          {/* Section 4: Core Services (mandatory) */}
          <CoreServiceBanners {...coreServicesProps} />

          {/* Section 5: Promotions (optional — admin-controlled) */}
          {promotions && <ServicePromotionBanners {...promotions} />}

          {/* Section 6: AI Placeholder (mandatory) */}
          <AIPlaceholder {...(aiPlaceholder ?? {})} />

          {afterSections}

          {/* Footer note */}
          {footerNote && (
            <div style={S.footerNote}>
              <span style={S.footerIcon}>💡</span>
              <span>{footerNote}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  footerNote: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '18px 22px',
    backgroundColor: `${DEFAULT_THEME.primaryColor}08`,
    borderRadius: '12px',
    border: `1px solid ${DEFAULT_THEME.primaryColor}20`,
    fontSize: '0.875rem',
    color: NEUTRALS[600],
    lineHeight: 1.5,
  },
  footerIcon: {
    fontSize: '18px',
    flexShrink: 0,
  },
};
