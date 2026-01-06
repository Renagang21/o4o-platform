/**
 * Template Section Components
 *
 * Franchise Standard 템플릿의 섹션 블록들
 * 각 섹션은 구조만 담당하고, 스타일은 Theme CSS Variable 사용
 *
 * 콘텐츠 우선순위 규칙:
 * - Hero: 운영자 > 약국 > 기본
 * - Featured Products: 운영자 지정 > Market Trial > 자동 추천
 * - Event/Notice: 운영자 콘텐츠 항상 우선 (고정)
 */

import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { ArrowRight, Package, Truck, Shield, Grid3X3, Star, Megaphone } from 'lucide-react';
import type {
  StoreProduct,
  StoreCategory,
  PharmacyStore,
  HeroContent,
  EventNoticeContent,
} from '@/types/store';

// ============================================================================
// Section Wrapper
// ============================================================================

interface SectionWrapperProps {
  children: ReactNode;
  className?: string;
}

function SectionWrapper({ children, className = '' }: SectionWrapperProps) {
  return (
    <section
      className={`py-8 md:py-12 ${className}`}
      style={{ backgroundColor: 'var(--store-color-background)' }}
    >
      <div className="max-w-6xl mx-auto px-4">
        {children}
      </div>
    </section>
  );
}

// ============================================================================
// Hero Section
// ============================================================================
// 콘텐츠 우선순위: 운영자 > 약국 > 기본

interface HeroSectionProps {
  store: PharmacyStore;
  storeSlug: string;
  /** Hero 콘텐츠 목록 (우선순위 순으로 정렬됨) */
  heroContents?: HeroContent[];
}

/**
 * Hero 콘텐츠를 우선순위에 따라 선택
 * 우선순위: operator > pharmacy > default
 */
function selectHeroContent(contents: HeroContent[]): HeroContent | null {
  if (contents.length === 0) return null;

  // source 우선순위: operator(0) > pharmacy(1) > default(2)
  const priorityMap = { operator: 0, pharmacy: 1, default: 2 };

  const sorted = [...contents]
    .filter((c) => c.isActive)
    .sort((a, b) => {
      // 먼저 source 우선순위로 정렬
      const sourceDiff = priorityMap[a.source] - priorityMap[b.source];
      if (sourceDiff !== 0) return sourceDiff;
      // 같은 source면 priority로 정렬
      return a.priority - b.priority;
    });

  return sorted[0] || null;
}

export function HeroSection({ store, storeSlug, heroContents = [] }: HeroSectionProps) {
  const selectedHero = selectHeroContent(heroContents);

  // 선택된 Hero 콘텐츠가 있으면 해당 콘텐츠 표시
  const title = selectedHero?.title || store.name;
  const subtitle = selectedHero?.subtitle || store.description || `${store.name}에 오신 것을 환영합니다.`;
  const ctaText = selectedHero?.ctaText || '상품 보기';
  const ctaLink = selectedHero?.ctaLink || `/store/${storeSlug}/products`;
  const backgroundImage = selectedHero?.imageUrl || store.bannerUrl;

  return (
    <section
      className="py-12 md:py-16 relative overflow-hidden"
      style={{
        backgroundColor: 'var(--store-color-primary)',
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* 배경 이미지 오버레이 */}
      {backgroundImage && (
        <div className="absolute inset-0 bg-black/40" />
      )}

      <div className="max-w-6xl mx-auto px-4 text-center text-white relative z-10">
        {store.logoUrl && (
          <img
            src={store.logoUrl}
            alt={store.name}
            className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/10 p-2"
          />
        )}
        <h1 className="text-2xl md:text-4xl font-bold mb-2">{title}</h1>
        <p className="text-white/80 mb-6 max-w-2xl mx-auto">
          {subtitle}
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <NavLink
            to={ctaLink}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary-600 font-semibold rounded-lg hover:bg-white/90 transition"
            style={{
              borderRadius: 'var(--store-button-radius)',
              color: 'var(--store-color-primary)',
            }}
          >
            {ctaText} <ArrowRight className="w-4 h-4" />
          </NavLink>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Featured Products Section
// ============================================================================
// 노출 우선순위: 운영자 지정 > Market Trial > 자동 추천

interface FeaturedProductsSectionProps {
  products: StoreProduct[];
  storeSlug: string;
  /** 최대 표시 개수 (기본값: 4) */
  maxItems?: number;
}

/**
 * Featured Products 우선순위 정렬
 * 우선순위: 운영자 지정 > Market Trial > 자동 추천 (isFeatured)
 */
function sortFeaturedProducts(products: StoreProduct[]): StoreProduct[] {
  return [...products].sort((a, b) => {
    // 1순위: 운영자 지정 (isFeaturedByOperator)
    if (a.isFeaturedByOperator && !b.isFeaturedByOperator) return -1;
    if (!a.isFeaturedByOperator && b.isFeaturedByOperator) return 1;

    // 2순위: Market Trial
    if (a.isMarketTrial && !b.isMarketTrial) return -1;
    if (!a.isMarketTrial && b.isMarketTrial) return 1;

    // 3순위: isFeatured (일반 추천)
    if (a.isFeatured && !b.isFeatured) return -1;
    if (!a.isFeatured && b.isFeatured) return 1;

    // 동순위면 최신순
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function FeaturedProductsSection({
  products,
  storeSlug,
  maxItems = 4,
}: FeaturedProductsSectionProps) {
  if (products.length === 0) return null;

  // 우선순위에 따라 정렬
  const sortedProducts = sortFeaturedProducts(products);

  return (
    <SectionWrapper>
      <div className="flex items-center justify-between mb-6">
        <h2
          className="text-xl md:text-2xl font-bold"
          style={{ color: 'var(--store-color-text)' }}
        >
          인기 상품
        </h2>
        <NavLink
          to={`/store/${storeSlug}/products`}
          className="flex items-center gap-1 text-sm font-medium hover:underline"
          style={{ color: 'var(--store-color-primary)' }}
        >
          전체보기 <ArrowRight className="w-4 h-4" />
        </NavLink>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {sortedProducts.slice(0, maxItems).map((product) => (
          <NavLink
            key={product.id}
            to={`/store/${storeSlug}/products/${product.id}`}
            className="group block rounded-lg overflow-hidden transition hover:shadow-lg"
            style={{
              backgroundColor: 'var(--store-color-surface)',
              borderRadius: 'var(--store-card-radius)',
              boxShadow: 'var(--store-shadow)',
            }}
          >
            <div className="aspect-square bg-slate-100 overflow-hidden">
              {product.thumbnailUrl ? (
                <img
                  src={product.thumbnailUrl}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-12 h-12 text-slate-300" />
                </div>
              )}
            </div>
            <div className="p-3">
              <h3
                className="font-medium text-sm line-clamp-2 mb-1"
                style={{ color: 'var(--store-color-text)' }}
              >
                {product.name}
              </h3>
              <div className="flex items-center gap-1 mb-2">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span className="text-xs" style={{ color: 'var(--store-color-text-muted)' }}>
                  {product.rating.toFixed(1)}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                {product.salePrice ? (
                  <>
                    <span
                      className="font-bold"
                      style={{ color: 'var(--store-color-primary)' }}
                    >
                      {product.salePrice.toLocaleString()}원
                    </span>
                    <span
                      className="text-xs line-through"
                      style={{ color: 'var(--store-color-text-muted)' }}
                    >
                      {product.price.toLocaleString()}원
                    </span>
                  </>
                ) : (
                  <span
                    className="font-bold"
                    style={{ color: 'var(--store-color-text)' }}
                  >
                    {product.price.toLocaleString()}원
                  </span>
                )}
              </div>
            </div>
          </NavLink>
        ))}
      </div>
    </SectionWrapper>
  );
}

// ============================================================================
// Category Grid Section
// ============================================================================

interface CategoryGridSectionProps {
  categories: StoreCategory[];
  storeSlug: string;
}

export function CategoryGridSection({ categories, storeSlug }: CategoryGridSectionProps) {
  if (categories.length === 0) return null;

  return (
    <SectionWrapper className="bg-white">
      <h2
        className="text-xl md:text-2xl font-bold mb-6"
        style={{ color: 'var(--store-color-text)' }}
      >
        카테고리
      </h2>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
        {categories.map((category) => (
          <NavLink
            key={category.id}
            to={`/store/${storeSlug}/products?category=${category.id}`}
            className="flex flex-col items-center p-4 rounded-lg transition hover:bg-slate-50"
            style={{ borderRadius: 'var(--store-card-radius)' }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mb-2"
              style={{ backgroundColor: 'var(--store-color-primary)', opacity: 0.1 }}
            >
              <Grid3X3 className="w-6 h-6" style={{ color: 'var(--store-color-primary)' }} />
            </div>
            <span
              className="text-sm font-medium text-center"
              style={{ color: 'var(--store-color-text)' }}
            >
              {category.name}
            </span>
            <span
              className="text-xs"
              style={{ color: 'var(--store-color-text-muted)' }}
            >
              {category.productCount}개
            </span>
          </NavLink>
        ))}
      </div>
    </SectionWrapper>
  );
}

// ============================================================================
// Event/Notice Section
// ============================================================================
// 운영자 콘텐츠 항상 우선 (고정, 숨김/위치변경 불가)

interface EventNoticeSectionProps {
  /** Event/Notice 콘텐츠 목록 */
  contents?: EventNoticeContent[];
  /** 최대 표시 개수 (기본값: 3) */
  maxItems?: number;
}

/**
 * Event/Notice 콘텐츠 정렬
 * 규칙: 운영자(operator) 콘텐츠가 항상 먼저, 그 다음 약국(pharmacy) 콘텐츠
 */
function sortEventNoticeContents(contents: EventNoticeContent[]): EventNoticeContent[] {
  return [...contents]
    .filter((c) => c.isActive)
    .sort((a, b) => {
      // 1순위: isPinned (고정 콘텐츠)
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      // 2순위: owner (operator 우선)
      if (a.owner === 'operator' && b.owner !== 'operator') return -1;
      if (a.owner !== 'operator' && b.owner === 'operator') return 1;

      // 3순위: 최신순
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}

export function EventNoticeSection({ contents = [], maxItems = 3 }: EventNoticeSectionProps) {
  const sortedContents = sortEventNoticeContents(contents);
  const displayContents = sortedContents.slice(0, maxItems);

  // 콘텐츠가 없으면 기본 메시지 표시
  if (displayContents.length === 0) {
    return (
      <SectionWrapper>
        <div
          className="rounded-lg p-6 text-center"
          style={{
            backgroundColor: 'var(--store-color-surface)',
            borderRadius: 'var(--store-card-radius)',
            boxShadow: 'var(--store-shadow)',
          }}
        >
          <h3
            className="font-bold mb-2"
            style={{ color: 'var(--store-color-text)' }}
          >
            공지사항
          </h3>
          <p
            className="text-sm"
            style={{ color: 'var(--store-color-text-muted)' }}
          >
            현재 진행 중인 이벤트가 없습니다.
          </p>
        </div>
      </SectionWrapper>
    );
  }

  return (
    <SectionWrapper>
      <h2
        className="text-xl md:text-2xl font-bold mb-6"
        style={{ color: 'var(--store-color-text)' }}
      >
        공지 & 이벤트
      </h2>

      <div className="space-y-3">
        {displayContents.map((content) => (
          <div
            key={content.id}
            className="flex items-center gap-4 p-4 rounded-lg"
            style={{
              backgroundColor: 'var(--store-color-surface)',
              borderRadius: 'var(--store-card-radius)',
              boxShadow: 'var(--store-shadow)',
              borderLeft: content.owner === 'operator'
                ? '4px solid var(--store-color-primary)'
                : '4px solid var(--store-color-border)',
            }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: content.type === 'event'
                  ? 'var(--store-color-accent)'
                  : 'var(--store-color-primary)',
                opacity: 0.15,
              }}
            >
              <Megaphone
                className="w-5 h-5"
                style={{
                  color: content.type === 'event'
                    ? 'var(--store-color-accent)'
                    : 'var(--store-color-primary)',
                }}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: content.type === 'event'
                      ? 'var(--store-color-accent)'
                      : 'var(--store-color-primary)',
                    color: '#ffffff',
                    opacity: content.type === 'event' ? 1 : 0.9,
                  }}
                >
                  {content.type === 'event' ? '이벤트' : '공지'}
                </span>
                {content.owner === 'operator' && (
                  <span
                    className="text-xs"
                    style={{ color: 'var(--store-color-text-muted)' }}
                  >
                    본부 공지
                  </span>
                )}
              </div>
              <h3
                className="font-medium text-sm truncate"
                style={{ color: 'var(--store-color-text)' }}
              >
                {content.title}
              </h3>
              {content.summary && (
                <p
                  className="text-xs truncate mt-1"
                  style={{ color: 'var(--store-color-text-muted)' }}
                >
                  {content.summary}
                </p>
              )}
            </div>

            {content.link && (
              <NavLink
                to={content.link}
                className="flex-shrink-0"
                style={{ color: 'var(--store-color-primary)' }}
              >
                <ArrowRight className="w-5 h-5" />
              </NavLink>
            )}
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
}

// ============================================================================
// Legal/Footer Section
// ============================================================================

interface LegalFooterSectionProps {
  store: PharmacyStore;
}

export function LegalFooterSection({ store }: LegalFooterSectionProps) {
  return (
    <section
      className="py-8 border-t"
      style={{
        backgroundColor: 'var(--store-color-surface)',
        borderColor: 'var(--store-color-border)',
      }}
    >
      <div className="max-w-6xl mx-auto px-4">
        {/* Trust Badges */}
        <div className="flex flex-wrap justify-center gap-6 mb-6">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5" style={{ color: 'var(--store-color-primary)' }} />
            <span className="text-sm" style={{ color: 'var(--store-color-text-muted)' }}>
              정품 보장
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5" style={{ color: 'var(--store-color-primary)' }} />
            <span className="text-sm" style={{ color: 'var(--store-color-text-muted)' }}>
              {store.shippingInfo.freeShippingThreshold.toLocaleString()}원 이상 무료배송
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" style={{ color: 'var(--store-color-primary)' }} />
            <span className="text-sm" style={{ color: 'var(--store-color-text-muted)' }}>
              안전결제
            </span>
          </div>
        </div>

        {/* Store Info */}
        <div
          className="text-center text-xs space-y-1"
          style={{ color: 'var(--store-color-text-muted)' }}
        >
          <p>{store.businessName} | 대표: {store.representativeName}</p>
          <p>사업자등록번호: {store.businessNumber}</p>
          {store.onlineSalesNumber && (
            <p>통신판매업: {store.onlineSalesNumber}</p>
          )}
          <p>{store.address} | {store.phone}</p>
        </div>
      </div>
    </section>
  );
}
