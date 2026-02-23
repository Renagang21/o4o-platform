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
// Section: B2BRevenueSection
// WO-O4O-HUB-REVENUE-PRIORITY-IMPLEMENTATION-V1
// ──────────────────────────────────────────────

export interface B2BPreviewItem {
  id: string;
  name: string;
  imageUrl?: string;
  badge?: string;
  badgeColor?: string;
  price?: string;
  supplierName?: string;
  onClick?: () => void;
}

export interface B2BRevenueSectionProps {
  items: B2BPreviewItem[];
  title?: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
}

// ──────────────────────────────────────────────
// Section: ProductDevelopmentSection
// WO-O4O-HUB-REVENUE-PRIORITY-IMPLEMENTATION-V1
// ──────────────────────────────────────────────

export interface ProductDevItem {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  badge?: string;
  marginInfo?: string;
  recruitmentStatus?: string;
  detailLabel?: string;
  onDetail?: () => void;
  actionLabel?: string;
  onAction?: () => void;
  onClick?: () => void;
}

export interface ProductDevelopmentSectionProps {
  items: ProductDevItem[];
  title?: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
}

// ──────────────────────────────────────────────
// HubList (공용 리스트 컴포넌트)
// WO-O4O-HUB-LIST-UI-UNIFICATION-V1
// ──────────────────────────────────────────────

export interface HubListItem {
  id: string;
  thumbnail?: string;
  primaryText: string;
  secondaryText?: string;
  tertiaryText?: string;
  infoText?: string;
  actionLabel?: string;
  onAction?: () => void;
  onClick?: () => void;
}

export interface HubListProps {
  items: HubListItem[];
  pageSize?: number;
  title?: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
  backgroundColor?: string;
  emptyMessage?: string;
}

// ──────────────────────────────────────────────
// HUB Content Producer (통합 제작 주체)
// IR-O4O-HUB-CONTENT-POLICY-UNIFICATION-V1
// ──────────────────────────────────────────────

export type HubProducer = 'operator' | 'supplier' | 'community';

export interface HubContentItem {
  id: string;
  type: 'cms' | 'signage-media' | 'signage-playlist';
  producer: HubProducer;
  title: string;
  description?: string;
  date?: string;
  thumbnail?: string;
  onCopy?: () => void;
}

export const HUB_PRODUCER_TABS: readonly ContentAuthorTab[] = [
  { key: 'all', label: '전체' },
  { key: 'operator', label: '운영자' },
  { key: 'supplier', label: '공급자' },
  { key: 'community', label: '커뮤니티' },
] as const;

// ──────────────────────────────────────────────
// Section: PlatformContentSection (신규)
// WO-O4O-HUB-LIST-UI-UNIFICATION-V1
// ──────────────────────────────────────────────

export interface PlatformContentItem {
  id: string;
  icon?: string;
  title: string;
  description?: string;
  date?: string;
  /** WO-O4O-CMS-VISIBILITY-EXTENSION-PHASE1-V1: 작성자 역할 */
  authorRole?: string;
  /** IR-O4O-HUB-CONTENT-POLICY-UNIFICATION-V1: 통합 제작 주체 */
  producer?: HubProducer;
  onCopy?: () => void;
}

/** WO-O4O-CMS-VISIBILITY-EXTENSION-PHASE1-V1: author_role tab filter config */
export interface ContentAuthorTab {
  key: string;    // 'all' | 'admin' | 'service_admin' | 'supplier' | 'community'
  label: string;  // '전체', '관리자', '운영자', '공급자', '커뮤니티'
}

export interface PlatformContentSectionProps {
  items: PlatformContentItem[];
  title?: string;
  pageSize?: number;
  ctaLabel?: string;
  onCtaClick?: () => void;
  /** WO-O4O-CMS-VISIBILITY-EXTENSION-PHASE1-V1: author_role tab filter */
  authorTabs?: ContentAuthorTab[];
  activeAuthorTab?: string;
  onAuthorTabChange?: (tabKey: string) => void;
}

// ──────────────────────────────────────────────
// Section: CoreServiceBanners
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
// B2BTableList (운영용 테이블)
// WO-O4O-B2B-OPERATION-TABLE-STRUCTURE-V1
// ──────────────────────────────────────────────

export interface B2BTableItem {
  id: string;
  name: string;
  /** 상품명 아래 보조 설명 (1줄) */
  description?: string;
  unit?: string;
  price?: number;
  supplyPrice?: number;
  /** 할인율 (0-100). 표시 준비용, 계산은 서비스 측 */
  discountRate?: number;
  supplierName?: string;
  /** 공급처 인증 여부 — true이면 체크 아이콘 표시 */
  supplierVerified?: boolean;
  legalCategory?: string;
  note?: string;
  createdAt?: string;
  /** 판매 신청 여부 */
  isApplied?: boolean;
  /** 승인 여부 */
  isApproved?: boolean;
  /** 상품 상태 */
  status?: 'available' | 'pending' | 'soldout';
  /** 잔여 재고 — ≤10이면 자동 limited 강조 */
  stockRemaining?: number;
  onApply?: () => void;
  onClick?: () => void;
}

export type B2BTableSortKey = 'name' | 'supplierName' | 'createdAt';

export interface B2BTableListProps {
  items: B2BTableItem[];
  categories?: string[];
  activeCategory?: string;
  onCategoryChange?: (category: string) => void;
  sortKey?: B2BTableSortKey;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (key: B2BTableSortKey) => void;
  pageSize?: number;
  title?: string;
  emptyMessage?: string;
}

// ──────────────────────────────────────────────
// Orchestrator
// ──────────────────────────────────────────────

export interface HubExplorationLayoutProps {
  theme?: HubExplorationTheme;
  hero: HeroCarouselProps;
  b2bRevenue?: B2BRevenueSectionProps;
  platformContent?: PlatformContentSectionProps;
  ads?: AdSectionProps;
  productDevelopment?: ProductDevelopmentSectionProps;
  recentUpdates?: RecentUpdatesTabsProps;
  coreServices?: CoreServiceBannersProps;
  promotions?: ServicePromotionBannersProps;
  aiPlaceholder?: AIPlaceholderProps;
  beforeSections?: ReactNode;
  afterSections?: ReactNode;
  footerNote?: string;
}
