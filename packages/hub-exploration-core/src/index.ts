/**
 * @o4o/hub-exploration-core
 *
 * WO-O4O-HUB-EXPLORATION-CORE-V1
 *
 * Hub Exploration UI core — market exploration layout for O4O Platform services.
 * This package provides the "discovery hub" layout (not the operator hub).
 *
 * Usage:
 *   import { HubExplorationLayout } from '@o4o/hub-exploration-core';
 *   <HubExplorationLayout hero={...} coreServices={...} />
 */

// Types
export type {
  HubExplorationTheme,
  HeroSlide,
  HeroCarouselProps,
  RecentUpdateTab,
  RecentUpdateItem,
  RecentUpdatesTabsProps,
  AdItem,
  AdSectionProps,
  CoreServiceBanner,
  CoreServiceBannersProps,
  PromotionBanner,
  ServicePromotionBannersProps,
  B2BPreviewItem,
  B2BRevenueSectionProps,
  ProductDevItem,
  ProductDevelopmentSectionProps,
  HubListItem,
  HubListProps,
  PlatformContentItem,
  PlatformContentSectionProps,
  AIPlaceholderProps,
  HubExplorationLayoutProps,
} from './types.js';

// Fixed constants (WO-O4O-HUB-EXPLORATION-UNIFORM-STRUCTURE-V1)
export { HUB_FIXED_TABS } from './types.js';

// Components
export { HubExplorationLayout } from './components/HubExplorationLayout.js';
export { HeroCarousel } from './components/HeroCarousel.js';
export { RecentUpdatesTabs } from './components/RecentUpdatesTabs.js';
export { AdSection } from './components/AdSection.js';
export { B2BRevenueSection } from './components/B2BRevenueSection.js';
export { ProductDevelopmentSection } from './components/ProductDevelopmentSection.js';
export { HubList } from './components/HubList.js';
export { PlatformContentSection } from './components/PlatformContentSection.js';
export { CoreServiceBanners } from './components/CoreServiceBanners.js';
export { ServicePromotionBanners } from './components/ServicePromotionBanners.js';
export { AIPlaceholder } from './components/AIPlaceholder.js';

// Theme defaults
export { DEFAULT_THEME, NEUTRALS, SHADOWS } from './theme.js';
