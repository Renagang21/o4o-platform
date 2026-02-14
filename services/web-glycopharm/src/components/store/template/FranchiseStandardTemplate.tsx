/**
 * Franchise Standard Template
 *
 * 프랜차이즈 표준 레이아웃
 * 섹션 순서 고정, 섹션 단위 ON/OFF 허용
 */

import type { PharmacyStore, StoreProduct, StoreCategory, TemplateSectionConfig, HeroContent } from '@/types/store';
import { DEFAULT_FRANCHISE_STANDARD_SECTIONS } from '@/types/store';
import {
  HeroSection,
  FeaturedProductsSection,
  CategoryGridSection,
  EventNoticeSection,
  LegalFooterSection,
} from './TemplateSection';

interface FranchiseStandardTemplateProps {
  store: PharmacyStore;
  storeSlug: string;
  products: StoreProduct[];
  categories: StoreCategory[];
  sectionConfig?: TemplateSectionConfig[];
  heroContents?: HeroContent[];
}

export function FranchiseStandardTemplate({
  store,
  storeSlug,
  products,
  categories,
  sectionConfig = DEFAULT_FRANCHISE_STANDARD_SECTIONS,
  heroContents,
}: FranchiseStandardTemplateProps) {
  // 섹션 활성화 여부 확인
  const isSectionEnabled = (type: string): boolean => {
    const section = sectionConfig.find((s) => s.type === type);
    return section?.enabled ?? true;
  };

  return (
    <div style={{ backgroundColor: 'var(--store-color-background)' }}>
      {/* 1. Hero Section */}
      {isSectionEnabled('hero') && (
        <HeroSection store={store} storeSlug={storeSlug} heroContents={heroContents} />
      )}

      {/* 2. Featured Products */}
      {isSectionEnabled('featured-products') && (
        <FeaturedProductsSection
          products={products}
          storeSlug={storeSlug}
        />
      )}

      {/* 3. Category Grid */}
      {isSectionEnabled('category-grid') && (
        <CategoryGridSection
          categories={categories}
          storeSlug={storeSlug}
        />
      )}

      {/* 4. Event/Notice Slot */}
      {isSectionEnabled('event-notice') && (
        <EventNoticeSection />
      )}

      {/* 5. Legal/Footer */}
      {isSectionEnabled('legal-footer') && (
        <LegalFooterSection store={store} />
      )}
    </div>
  );
}

export default FranchiseStandardTemplate;
