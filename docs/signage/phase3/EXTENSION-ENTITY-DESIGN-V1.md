# Digital Signage - Extension Entity Design V1

> **Phase:** 3 Design
> **Status:** FROZEN
> **Date:** 2025-01-20
> **Authority:** 이 문서는 Entity 구현의 기준이며, 필드 변경 시 Work Order 필요

---

## 1. 문서 상태

| Status | Description |
|--------|-------------|
| **FROZEN** | 설계 확정, 구현 시 필드 임의 변경 금지 |

---

## 2. 공통 규칙

### 2.1 Entity 설계 원칙

```typescript
// ✅ 허용: ID 참조
@Column({ type: 'uuid', nullable: true })
coreTemplateId: string;

// ❌ 금지: 직접 관계
@ManyToOne(() => SignageTemplate)
template: SignageTemplate;
```

### 2.2 공통 필드

모든 Extension Entity는 다음 필드 포함:

```typescript
interface ExtensionEntityBase {
  id: string;              // UUID PK
  organizationId: string;  // Multi-tenant
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}
```

### 2.3 Scope 패턴

```typescript
type ContentScope = 'global' | 'store';
type ContentSource =
  | 'pharmacy-hq'
  | 'cosmetics-brand'
  | 'seller-partner'
  | 'tourism-authority';
```

---

## 3. signage-pharmacy-extension Entities

### 3.1 PharmacyCategory

**목적:** OTC/건강기능식품 카테고리 관리

```typescript
@Entity({ name: 'pharmacy_categories', schema: 'signage_pharmacy' })
export class PharmacyCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;
  // 'otc_cold', 'otc_allergy', 'supplement_vitamin', 'skincare_basic'

  @Column({ type: 'uuid', nullable: true })
  parentId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  iconUrl: string;

  @Column({ type: 'int', default: 0 })
  displayOrder: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 3.2 PharmacySeasonalCampaign

**목적:** 계절별 건강 캠페인 관리

```typescript
@Entity({ name: 'pharmacy_seasonal_campaigns', schema: 'signage_pharmacy' })
export class PharmacySeasonalCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  season: string;
  // 'spring', 'summer', 'fall', 'winter', 'year_round'

  @Column({ type: 'varchar', length: 100, nullable: true })
  healthCondition: string;
  // '감기', '알레르기', '피부건조', '탈수', '관절'

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

  @Column({ type: 'varchar', length: 20, default: 'global' })
  scope: 'global' | 'store';

  @Column({ type: 'boolean', default: false })
  isForced: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 3.3 PharmacyTemplatePreset

**목적:** 약국 전용 템플릿 프리셋

```typescript
@Entity({ name: 'pharmacy_template_presets', schema: 'signage_pharmacy' })
export class PharmacyTemplatePreset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  type: string;
  // 'medication_guide', 'health_tip', 'product_promo', 'event', 'notice'

  @Column({ type: 'uuid', nullable: true })
  coreTemplateId: string; // Core SignageTemplate 참조 (ID만)

  @Column({ type: 'jsonb' })
  config: {
    layout: 'horizontal' | 'vertical' | 'grid';
    colorScheme: 'default' | 'health' | 'promo' | 'alert';
    fontFamily: string;
    placeholders: {
      title?: string;
      description?: string;
      productName?: string;
      price?: string;
      warning?: string;
    };
  };

  @Column({ type: 'varchar', length: 255, nullable: true })
  thumbnailUrl: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 3.4 PharmacyContent

**목적:** 약국 공급자/HQ 콘텐츠

```typescript
@Entity({ name: 'pharmacy_contents', schema: 'signage_pharmacy' })
export class PharmacyContent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'uuid', nullable: true })
  supplierId: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 50 })
  contentType: string;
  // 'product_card', 'health_info', 'medication_guide', 'promo', 'notice'

  @Column({ type: 'uuid', nullable: true })
  categoryId: string;

  @Column({ type: 'uuid', nullable: true })
  campaignId: string;

  @Column({ type: 'uuid', nullable: true })
  templatePresetId: string;

  @Column({ type: 'jsonb' })
  mediaData: {
    imageUrl?: string;
    videoUrl?: string;
    duration?: number;
  };

  @Column({ type: 'varchar', length: 20, default: 'pharmacy-hq' })
  source: 'pharmacy-hq' | 'pharmacy-supplier';

  @Column({ type: 'varchar', length: 20, default: 'global' })
  scope: 'global' | 'store';

  @Column({ type: 'boolean', default: false })
  isForced: boolean;

  @Column({ type: 'date', nullable: true })
  validFrom: string;

  @Column({ type: 'date', nullable: true })
  validUntil: string;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: 'draft' | 'published' | 'archived';

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

---

## 4. signage-cosmetics-extension Entities

### 4.1 CosmeticsContentPreset

**목적:** 화장품 콘텐츠 프리셋

```typescript
@Entity({ name: 'cosmetics_content_presets', schema: 'signage_cosmetics' })
export class CosmeticsContentPreset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  type: string;
  // 'new_product', 'trend', 'lookbook', 'beauty_tip', 'campaign'

  @Column({ type: 'uuid', nullable: true })
  brandId: string; // CosmeticsBrand 참조

  @Column({ type: 'uuid', nullable: true })
  coreTemplateId: string;

  @Column({ type: 'jsonb' })
  visualConfig: {
    primaryColor: string;
    secondaryColor: string;
    fontStyle: 'modern' | 'elegant' | 'playful';
    imageLayout: 'full' | 'split' | 'mosaic';
  };

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 4.2 CosmeticsBrandContent

**목적:** 브랜드 공급자 콘텐츠

```typescript
@Entity({ name: 'cosmetics_brand_contents', schema: 'signage_cosmetics' })
export class CosmeticsBrandContent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'uuid' })
  brandId: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 50 })
  contentType: string;
  // 'product_launch', 'campaign', 'tutorial', 'promotion'

  @Column({ type: 'jsonb' })
  mediaAssets: {
    mainImage: string;
    subImages?: string[];
    video?: string;
    duration?: number;
  };

  @Column({ type: 'varchar', length: 50, nullable: true })
  season: string;

  @Column({ type: 'varchar', length: 20, default: 'cosmetics-brand' })
  source: 'cosmetics-brand';

  @Column({ type: 'varchar', length: 20, default: 'global' })
  scope: 'global' | 'store';

  // Cosmetics는 Force 불허용
  @Column({ type: 'boolean', default: false })
  isForced: false;

  @Column({ type: 'date', nullable: true })
  campaignStart: string;

  @Column({ type: 'date', nullable: true })
  campaignEnd: string;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: 'draft' | 'published' | 'archived';

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 4.3 CosmeticsTrendCard

**목적:** 트렌드/룩북 카드

```typescript
@Entity({ name: 'cosmetics_trend_cards', schema: 'signage_cosmetics' })
export class CosmeticsTrendCard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 50 })
  trendType: string;
  // 'color', 'style', 'technique', 'ingredient'

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

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

---

## 5. signage-seller-promo-extension Entities

### 5.1 SellerPromoCard

**목적:** 판매자 프로모션 카드

```typescript
@Entity({ name: 'seller_promo_cards', schema: 'signage_seller' })
export class SellerPromoCard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'uuid' })
  sellerId: string; // Partner/Seller ID

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 50 })
  promoType: string;
  // 'product', 'discount', 'bundle', 'event', 'new_arrival'

  @Column({ type: 'jsonb' })
  productInfo: {
    productId?: string;
    productName: string;
    originalPrice?: number;
    salePrice?: number;
    discountPercent?: number;
    currency: string;
  };

  @Column({ type: 'varchar', length: 255 })
  imageUrl: string;

  @Column({ type: 'varchar', length: 20, default: 'seller-partner' })
  source: 'seller-partner';

  @Column({ type: 'varchar', length: 20, default: 'global' })
  scope: 'global' | 'store';

  // Seller는 Force 불허용
  @Column({ type: 'boolean', default: false })
  isForced: false;

  @Column({ type: 'date', nullable: true })
  validFrom: string;

  @Column({ type: 'date', nullable: true })
  validUntil: string;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: 'draft' | 'pending' | 'approved' | 'published' | 'rejected';

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 5.2 SellerEditableTemplate

**목적:** 파트너 편집 가능 템플릿

```typescript
@Entity({ name: 'seller_editable_templates', schema: 'signage_seller' })
export class SellerEditableTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'uuid' })
  sellerId: string;

  @Column({ type: 'uuid' })
  baseTemplateId: string; // Core Template 참조

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'jsonb' })
  editableFields: string[];
  // ['title', 'price', 'image', 'cta_text']

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

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 5.3 SellerContentAnalytics

**목적:** 파트너 콘텐츠 분석

```typescript
@Entity({ name: 'seller_content_analytics', schema: 'signage_seller' })
export class SellerContentAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'uuid' })
  sellerId: string;

  @Column({ type: 'uuid' })
  contentId: string;

  @Column({ type: 'varchar', length: 50 })
  contentType: string; // 'promo_card', 'template'

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'int', default: 0 })
  impressions: number;

  @Column({ type: 'int', default: 0 })
  uniqueDisplays: number;

  @Column({ type: 'int', default: 0 })
  totalDurationSeconds: number;

  @Column({ type: 'jsonb', nullable: true })
  locationBreakdown: Record<string, number>;

  @CreateDateColumn()
  createdAt: Date;
}
```

---

## 6. signage-tourist-extension Entities (P4 - 설계만)

### 6.1 TouristMultilingualContent

```typescript
@Entity({ name: 'tourist_multilingual_contents', schema: 'signage_tourist' })
export class TouristMultilingualContent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'uuid' })
  originalContentId: string;

  @Column({ type: 'varchar', length: 10 })
  languageCode: string; // 'ko', 'en', 'ja', 'zh-CN', 'zh-TW'

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'boolean', default: false })
  isAiGenerated: boolean;

  @Column({ type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ type: 'uuid', nullable: true })
  verifiedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 6.2 TouristLocationCard

```typescript
@Entity({ name: 'tourist_location_cards', schema: 'signage_tourist' })
export class TouristLocationCard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'varchar', length: 200 })
  locationName: string;

  @Column({ type: 'varchar', length: 50 })
  locationType: string;
  // 'landmark', 'restaurant', 'shopping', 'transport', 'hotel'

  @Column({ type: 'jsonb' })
  coordinates: {
    latitude: number;
    longitude: number;
  };

  @Column({ type: 'varchar', length: 255 })
  imageUrl: string;

  @Column({ type: 'jsonb', nullable: true })
  operatingHours: Record<string, { open: string; close: string }>;

  @Column({ type: 'jsonb', default: [] })
  tags: string[];

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

---

## 7. Entity 관계 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│                     CORE (불변)                              │
├─────────────────────────────────────────────────────────────┤
│  SignagePlaylist ◄──────── ID 참조 ────────┐               │
│  SignageTemplate ◄──────── ID 참조 ────────┼───────────┐   │
└─────────────────────────────────────────────┼───────────┼───┘
                                              │           │
┌─────────────────────────────────────────────┼───────────┼───┐
│                  PHARMACY                    │           │   │
├─────────────────────────────────────────────┼───────────┼───┤
│  PharmacyCategory                           │           │   │
│       ▲                                     │           │   │
│       │                                     │           │   │
│  PharmacySeasonalCampaign                   │           │   │
│       │                                     │           │   │
│       ▼                                     │           │   │
│  PharmacyContent ──────────────────────────►│           │   │
│  PharmacyTemplatePreset ───────────────────────────────►│   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  COSMETICS                                   │
├─────────────────────────────────────────────────────────────┤
│  CosmeticsContentPreset ────────────────────► Core Template │
│  CosmeticsBrandContent                                      │
│  CosmeticsTrendCard                                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    SELLER                                    │
├─────────────────────────────────────────────────────────────┤
│  SellerPromoCard                                            │
│  SellerEditableTemplate ────────────────────► Core Template │
│  SellerContentAnalytics                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Migration 순서

| Order | Entity | Migration Name |
|-------|--------|----------------|
| 1 | PharmacyCategory | CreatePharmacyCategories |
| 2 | PharmacySeasonalCampaign | CreatePharmacySeasonalCampaigns |
| 3 | PharmacyTemplatePreset | CreatePharmacyTemplatePresets |
| 4 | PharmacyContent | CreatePharmacyContents |
| 5 | CosmeticsContentPreset | CreateCosmeticsContentPresets |
| 6 | CosmeticsBrandContent | CreateCosmeticsBrandContents |
| 7 | CosmeticsTrendCard | CreateCosmeticsTrendCards |
| 8 | SellerPromoCard | CreateSellerPromoCards |
| 9 | SellerEditableTemplate | CreateSellerEditableTemplates |
| 10 | SellerContentAnalytics | CreateSellerContentAnalytics |

---

*Document: EXTENSION-ENTITY-DESIGN-V1.md*
*Status: FROZEN*
*Phase 3 Design*
