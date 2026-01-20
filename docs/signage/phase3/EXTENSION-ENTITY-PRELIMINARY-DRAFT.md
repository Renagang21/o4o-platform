# Digital Signage - Extension Entity Preliminary Draft

> **Phase:** 3 Pre-Design
> **Status:** Draft (Not for Implementation)
> **Date:** 2025-01-20

---

## 1. Overview

이 문서는 Phase 3 산업별 확장앱의 엔티티 초안입니다.
**아직 구현 단계가 아니며**, 설계 검토용입니다.

---

## 2. signage-pharmacy-extension Entities

### 2.1 PharmacyCategory

OTC/건강기능식품 카테고리 분류

```typescript
@Entity({ name: 'pharmacy_signage_categories', schema: 'signage_pharmacy' })
export class PharmacyCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  code: string; // 'otc', 'supplement', 'skincare', etc.

  @Column({ type: 'varchar', length: 255, nullable: true })
  iconUrl: string;

  @Column({ type: 'int', default: 0 })
  displayOrder: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
```

### 2.2 PharmacySeasonalRecommendation

계절/시즌별 추천 로직

```typescript
@Entity({ name: 'pharmacy_seasonal_recommendations', schema: 'signage_pharmacy' })
export class PharmacySeasonalRecommendation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  season: string; // 'spring', 'summer', 'fall', 'winter'

  @Column({ type: 'varchar', length: 100, nullable: true })
  condition: string; // '감기', '알레르기', '피부건조' etc.

  @Column({ type: 'uuid' })
  categoryId: string;

  @Column({ type: 'jsonb', default: [] })
  productKeywords: string[];

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date' })
  endDate: string;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
```

### 2.3 PharmacyTemplatePreset

약국 전용 템플릿 프리셋

```typescript
@Entity({ name: 'pharmacy_template_presets', schema: 'signage_pharmacy' })
export class PharmacyTemplatePreset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  type: string; // 'medication-guide', 'health-tip', 'promotion', 'event'

  @Column({ type: 'uuid', nullable: true })
  coreTemplateId: string; // Reference to Core SignageTemplate

  @Column({ type: 'jsonb' })
  config: {
    layout: string;
    colorScheme: string;
    fontFamily: string;
    placeholders: Record<string, string>;
  };

  @Column({ type: 'varchar', length: 255, nullable: true })
  thumbnailUrl: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
```

### 2.4 PharmacySupplierContent

약국 공급자 콘텐츠

```typescript
@Entity({ name: 'pharmacy_supplier_contents', schema: 'signage_pharmacy' })
export class PharmacySupplierContent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  supplierId: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 50 })
  contentType: string; // 'product-card', 'promotion', 'health-info'

  @Column({ type: 'uuid', nullable: true })
  categoryId: string;

  @Column({ type: 'jsonb' })
  mediaData: {
    imageUrl?: string;
    videoUrl?: string;
    duration?: number;
  };

  @Column({ type: 'boolean', default: false })
  isForced: boolean;

  @Column({ type: 'date', nullable: true })
  validFrom: string;

  @Column({ type: 'date', nullable: true })
  validUntil: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
```

---

## 3. signage-cosmetics-extension Entities

### 3.1 CosmeticsContentPreset

화장품 콘텐츠 프리셋

```typescript
@Entity({ name: 'cosmetics_signage_presets', schema: 'signage_cosmetics' })
export class CosmeticsContentPreset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  type: string; // 'new-product', 'trend', 'lookbook', 'beauty-tip'

  @Column({ type: 'uuid', nullable: true })
  brandId: string; // Reference to CosmeticsBrand

  @Column({ type: 'jsonb' })
  visualConfig: {
    primaryColor: string;
    secondaryColor: string;
    fontStyle: string;
    imageLayout: string;
  };

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
```

### 3.2 CosmeticsBrandContent

브랜드 공급자 콘텐츠

```typescript
@Entity({ name: 'cosmetics_brand_contents', schema: 'signage_cosmetics' })
export class CosmeticsBrandContent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  brandId: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'varchar', length: 50 })
  contentType: string; // 'product-launch', 'campaign', 'tutorial'

  @Column({ type: 'jsonb' })
  mediaAssets: {
    mainImage: string;
    subImages?: string[];
    video?: string;
  };

  @Column({ type: 'varchar', length: 50, nullable: true })
  season: string;

  @Column({ type: 'boolean', default: false })
  isForced: boolean;

  @Column({ type: 'date', nullable: true })
  campaignStart: string;

  @Column({ type: 'date', nullable: true })
  campaignEnd: string;
}
```

### 3.3 CosmeticsTrendCard

트렌드/룩북 카드

```typescript
@Entity({ name: 'cosmetics_trend_cards', schema: 'signage_cosmetics' })
export class CosmeticsTrendCard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'varchar', length: 50 })
  trendType: string; // 'color', 'style', 'technique'

  @Column({ type: 'jsonb' })
  colorPalette: string[];

  @Column({ type: 'jsonb' })
  productReferences: string[]; // Product IDs

  @Column({ type: 'varchar', length: 255 })
  thumbnailUrl: string;

  @Column({ type: 'varchar', length: 50 })
  season: string;

  @Column({ type: 'int' })
  year: number;
}
```

---

## 4. signage-tourist-extension Entities

### 4.1 TouristMultilingualContent

다국어 콘텐츠

```typescript
@Entity({ name: 'tourist_multilingual_contents', schema: 'signage_tourist' })
export class TouristMultilingualContent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  originalContentId: string;

  @Column({ type: 'varchar', length: 10 })
  languageCode: string; // 'ko', 'en', 'ja', 'zh', etc.

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  localizedAssets: {
    imageUrl?: string;
    audioUrl?: string;
  };

  @Column({ type: 'boolean', default: false })
  isAiGenerated: boolean;

  @Column({ type: 'boolean', default: false })
  isVerified: boolean;
}
```

### 4.2 TouristLocationCard

명소/장소 카드

```typescript
@Entity({ name: 'tourist_location_cards', schema: 'signage_tourist' })
export class TouristLocationCard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  locationName: string;

  @Column({ type: 'varchar', length: 50 })
  locationType: string; // 'landmark', 'restaurant', 'shopping', 'transport'

  @Column({ type: 'jsonb' })
  coordinates: {
    latitude: number;
    longitude: number;
  };

  @Column({ type: 'varchar', length: 255 })
  imageUrl: string;

  @Column({ type: 'jsonb' })
  operatingHours: Record<string, string>;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', default: [] })
  tags: string[];
}
```

### 4.3 TouristEventSchedule

행사/이벤트 스케줄

```typescript
@Entity({ name: 'tourist_event_schedules', schema: 'signage_tourist' })
export class TouristEventSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  eventName: string;

  @Column({ type: 'varchar', length: 50 })
  eventType: string; // 'festival', 'exhibition', 'performance', 'sale'

  @Column({ type: 'uuid', nullable: true })
  locationId: string;

  @Column({ type: 'timestamp' })
  startDateTime: Date;

  @Column({ type: 'timestamp' })
  endDateTime: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  imageUrl: string;

  @Column({ type: 'boolean', default: true })
  autoSchedule: boolean; // Auto-add to signage schedule
}
```

---

## 5. signage-seller-promo-extension Entities

### 5.1 SellerPromoCard

판매자 프로모션 카드

```typescript
@Entity({ name: 'seller_promo_cards', schema: 'signage_seller' })
export class SellerPromoCard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  sellerId: string; // Partner/Seller ID

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'varchar', length: 50 })
  promoType: string; // 'product', 'discount', 'bundle', 'event'

  @Column({ type: 'jsonb' })
  productInfo: {
    productId?: string;
    productName: string;
    originalPrice?: number;
    salePrice?: number;
    discountPercent?: number;
  };

  @Column({ type: 'varchar', length: 255 })
  imageUrl: string;

  @Column({ type: 'date', nullable: true })
  validFrom: string;

  @Column({ type: 'date', nullable: true })
  validUntil: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
```

### 5.2 SellerEditableTemplate

파트너 편집 가능 템플릿

```typescript
@Entity({ name: 'seller_editable_templates', schema: 'signage_seller' })
export class SellerEditableTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  sellerId: string;

  @Column({ type: 'uuid' })
  baseTemplateId: string; // Core Template reference

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'jsonb' })
  customizations: {
    text: Record<string, string>;
    colors: Record<string, string>;
    images: Record<string, string>;
  };

  @Column({ type: 'boolean', default: false })
  isPublished: boolean;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt: Date;
}
```

### 5.3 SellerContentAnalytics

파트너 콘텐츠 분석

```typescript
@Entity({ name: 'seller_content_analytics', schema: 'signage_seller' })
export class SellerContentAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  sellerId: string;

  @Column({ type: 'uuid' })
  contentId: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'int', default: 0 })
  impressions: number;

  @Column({ type: 'int', default: 0 })
  uniqueDisplays: number;

  @Column({ type: 'int', default: 0 })
  totalDuration: number; // seconds

  @Column({ type: 'jsonb', nullable: true })
  locationBreakdown: Record<string, number>;
}
```

---

## 6. 공통 패턴

### 6.1 Extension Content Base

모든 Extension 콘텐츠의 공통 인터페이스

```typescript
interface ExtensionContentBase {
  id: string;
  extensionType: 'pharmacy' | 'cosmetics' | 'tourist' | 'seller';
  source: string; // Extension-specific source
  isForced: boolean;
  validFrom?: string;
  validUntil?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### 6.2 Core 연결 참조

Extension은 Core를 ID로만 참조

```typescript
// Extension에서 Core 참조 시
coreTemplateId: string;    // ✅ OK - ID 참조
corePlaylistId: string;    // ✅ OK - ID 참조

// FK/Join 금지
@ManyToOne(() => SignageTemplate)  // ❌ NO - Direct relation
template: SignageTemplate;
```

---

## 7. 스키마 분리 전략

| Extension | Schema |
|-----------|--------|
| Pharmacy | `signage_pharmacy` |
| Cosmetics | `signage_cosmetics` |
| Tourist | `signage_tourist` |
| Seller | `signage_seller` |

각 Extension은 독립 스키마를 사용하여 Core와 완전 분리

---

## 8. 다음 단계

이 초안이 확정되면:
1. Entity 구현 시작
2. Migration 작성
3. Repository/Service 구현
4. API 엔드포인트 생성

---

*Document: EXTENSION-ENTITY-PRELIMINARY-DRAFT.md*
*Phase 3 Pre-Design*
*Status: Draft - Not for Implementation*
