/**
 * HubExplorationLayout — Orchestrator
 *
 * WO-O4O-HUB-EXPLORATION-UNIFORM-STRUCTURE-V1: 필수 섹션 항상 렌더링
 * WO-O4O-HUB-REVENUE-PRIORITY-IMPLEMENTATION-V1: 매출 중심 섹션 재배치
 *
 * 섹션 순서:
 *   1. Hero (mandatory)
 *   2. B2B Revenue (optional)
 *   3. Ads (optional)
 *   4. Product Development (optional)
 *   5. Recent Updates (mandatory)
 *   6. Core Services (mandatory, 가로형)
 *   7. Promotions (optional)
 *   8. AI Placeholder (mandatory)
 */

import type { HubExplorationLayoutProps } from '../types.js';
import { HUB_FIXED_TABS } from '../types.js';
import { DEFAULT_THEME, NEUTRALS } from '../theme.js';
import { HeroCarousel } from './HeroCarousel.js';
import { B2BRevenueSection } from './B2BRevenueSection.js';
import { AdSection } from './AdSection.js';
import { ProductDevelopmentSection } from './ProductDevelopmentSection.js';
import { RecentUpdatesTabs } from './RecentUpdatesTabs.js';
import { CoreServiceBanners } from './CoreServiceBanners.js';
import { ServicePromotionBanners } from './ServicePromotionBanners.js';
import { AIPlaceholder } from './AIPlaceholder.js';

export function HubExplorationLayout({
  theme,
  hero,
  b2bRevenue,
  ads,
  productDevelopment,
  recentUpdates,
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

          {/* Section 2: B2B Revenue (optional — revenue priority) */}
          {b2bRevenue && <B2BRevenueSection {...b2bRevenue} />}

          {/* Section 3: Ads (optional — admin-controlled) */}
          {ads && <AdSection {...ads} />}

          {/* Section 4: Product Development (optional — CMS-driven) */}
          {productDevelopment && <ProductDevelopmentSection {...productDevelopment} />}

          {/* Section 5: Recent Updates (mandatory — fixed tabs) */}
          <RecentUpdatesTabs {...recentUpdatesProps} />

          {/* Section 6: Core Services (mandatory — horizontal list) */}
          <CoreServiceBanners {...coreServicesProps} />

          {/* Section 7: Promotions (optional — admin-controlled) */}
          {promotions && <ServicePromotionBanners {...promotions} />}

          {/* Section 8: AI Placeholder (mandatory) */}
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
