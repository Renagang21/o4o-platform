/**
 * @o4o/hub-exploration-core — Type definitions
 *
 * WO-O4O-HUB-EXPLORATION-CORE-V1
 *
 * All data shapes that services must provide via props.
 * This package does NOT fetch data — services handle API calls.
 */

import type { ReactNode } from 'react';

// ──────────────────────────────────────────────
// Fixed Tab Constants (WO-O4O-HUB-EXPLORATION-UNIFORM-STRUCTURE-V1)
// 모든 서비스에서 동일한 탭 구조를 사용한다. 서비스별 분기 금지.
// ──────────────────────────────────────────────

export const HUB_FIXED_TABS: readonly RecentUpdateTab[] = [
  { key: 'all', label: '전체' },
  { key: 'b2b', label: 'B2B' },
  { key: 'content', label: '콘텐츠' },
  { key: 'service', label: '서비스' },
] as const;

// ──────────────────────────────────────────────
// Theme
// ──────────────────────────────────────────────

export interface HubExplorationTheme {
  primaryColor?: string;
  backgroundColor?: string;
  maxWidth?: string;
  sectionGap?: string;
}

// ──────────────────────────────────────────────
// Section 1: HeroCarousel
// ──────────────────────────────────────────────

export interface HeroSlide {
  id: string;
  backgroundImage?: string;
  backgroundColor?: string;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
}

export interface HeroCarouselProps {
  slides: HeroSlide[];
  autoInterval?: number;
  height?: string;
}

// ──────────────────────────────────────────────
// Section 2: RecentUpdatesTabs
// ──────────────────────────────────────────────

export interface RecentUpdateTab {
  key: string;
  label: string;
}

export interface RecentUpdateItem {
  id: string;
  tabKey: string;
  title: string;
  description?: string;
  date?: string;
  badge?: string;
  badgeColor?: string;
  onClick?: () => void;
}

export interface RecentUpdatesTabsProps {
  tabs: RecentUpdateTab[];
  items: RecentUpdateItem[];
  maxItems?: number;
  moreLabel?: string;
  onMoreClick?: () => void;
}

// ──────────────────────────────────────────────
// Section 3: AdSection
// ──────────────────────────────────────────────

export interface AdItem {
  id: string;
  tier: 'premium' | 'normal';
  imageUrl: string;
  alt: string;
  onClick?: () => void;
}

export interface AdSectionProps {
  ads: AdItem[];
  title?: string;
}

// ──────────────────────────────────────────────
// Section 4: CoreServiceBanners
// ──────────────────────────────────────────────

export interface CoreServiceBanner {
  id: string;
  icon?: string | ReactNode;
  title: string;
  description?: string;
  badge?: string;
  onClick?: () => void;
}

export interface CoreServiceBannersProps {
  banners: CoreServiceBanner[];
  title?: string;
}

// ──────────────────────────────────────────────
// Section 5: ServicePromotionBanners
// ──────────────────────────────────────────────

export interface PromotionBanner {
  id: string;
  imageUrl: string;
  alt: string;
  title?: string;
  subtitle?: string;
  onClick?: () => void;
}

export interface ServicePromotionBannersProps {
  banners: PromotionBanner[];
  title?: string;
}

// ──────────────────────────────────────────────
// Section 6: AIPlaceholder
// ──────────────────────────────────────────────

export interface AIPlaceholderProps {
  title?: string;
  description?: string;
  icon?: string | ReactNode;
}

// ──────────────────────────────────────────────
// Orchestrator
// ──────────────────────────────────────────────

export interface HubExplorationLayoutProps {
  theme?: HubExplorationTheme;
  hero: HeroCarouselProps;
  recentUpdates?: RecentUpdatesTabsProps;
  ads?: AdSectionProps;
  coreServices?: CoreServiceBannersProps;
  promotions?: ServicePromotionBannersProps;
  aiPlaceholder?: AIPlaceholderProps;
  beforeSections?: ReactNode;
  afterSections?: ReactNode;
  footerNote?: string;
}
