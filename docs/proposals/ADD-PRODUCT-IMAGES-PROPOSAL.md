# Proposal: Add Product Images to Sample Dataset

**Related WO**: WO-SAMPLE-PRODUCT-DATASET-V1
**Date**: 2026-01-29
**Status**: Proposed
**Blocking Issue**: Cannot display products in e-commerce UI without images

---

## Problem Statement

The current sample product dataset (57 products) has **zero visual assets**. This blocks:
- Product card display in listing pages
- Product detail page visual appeal
- Shopping cart item previews
- Order confirmation displays
- Any user-facing e-commerce operation

**Impact**: Dataset is backend-valid but completely unsuitable for UI validation.

---

## Current State

### Product Image Support by Schema

| Schema | Entity Field | Type | Status |
|--------|--------------|------|--------|
| **Cosmetics** | `images` | `CosmeticsProductImage[]` | ✅ Supported |
| **Neture** | `images` | `NetureProductImage[]` | ✅ Supported |
| **Glycopharm** | N/A | N/A | ❌ **Not Supported** |

### Image Interface (Cosmetics & Neture)

```typescript
interface ProductImage {
  url: string;           // Required: Image URL
  alt?: string;          // Optional: Alt text for accessibility
  is_primary: boolean;   // Required: Main product image flag
  order?: number;        // Optional: Display order
}
```

**Critical Gap**: Glycopharm products don't have an `images` field in the entity schema.

---

## Proposed Solution

### Phase 1: Add Images to Cosmetics & Neture (Immediate - 2 hours)

**Approach**: Use placeholder image service with product-specific text overlay

**Service**: `https://placehold.co/600x600/png?text={ProductName}`

**Benefits**:
- ✅ No file hosting required
- ✅ Instant implementation
- ✅ Product-specific visual differentiation
- ✅ Responsive (600x600px square format)
- ✅ Professional appearance
- ✅ Free service

**Example**:
```typescript
images: [
  {
    url: 'https://placehold.co/600x600/EEE/333?text=세라마이드+진정+크림',
    alt: '세라마이드 진정 크림 제품 이미지',
    is_primary: true,
    order: 1
  }
]
```

### Phase 2: Add Images Field to Glycopharm (2 hours)

**Step 1**: Create migration to add `images` column

```typescript
// apps/api-server/src/migrations/YYYYMMDDHHMMSS-AddImagesToGlycopharmProducts.ts
await queryRunner.query(`
  ALTER TABLE public.glycopharm_products
  ADD COLUMN IF NOT EXISTS images JSONB
`);
```

**Step 2**: Update entity

```typescript
// glycopharm-product.entity.ts
@Column({ type: 'jsonb', nullable: true })
images?: GlycopharmProductImage[] | null;

export interface GlycopharmProductImage {
  url: string;
  alt?: string;
  is_primary: boolean;
  order?: number;
}
```

**Step 3**: Update seed script to include images for S1 products

### Phase 3: Migrate to Stock Images (Future - 1 week)

**Sources**:
- Unsplash (free, high-quality)
- Pexels (free, commercial use)
- Pixabay (free)

**Categories**:
- Pharmaceuticals: medicine bottles, ointment tubes, medical devices
- Health supplements: vitamin bottles, capsules, powder containers
- Cosmetics: cosmetic jars, serums, creams
- Lifestyle: health devices, support bands, thermometers

**Implementation**: Replace placeholder URLs with curated stock image URLs

---

## Implementation Plan

### Task Breakdown

| Task | Effort | Blocker | Output |
|------|--------|---------|--------|
| 1. Create image enhancement script | 1h | None | Python/Node script to generate image data |
| 2. Add images to S2 products (Neture) | 20min | Task 1 | 12 products with images |
| 3. Add images to S3 products (Cosmetics) | 20min | Task 1 | 15 products with images |
| 4. Add images to S4 products (Neture) | 15min | Task 1 | 10 products with images |
| 5. Add images to S5 products (Neture) | 15min | Task 1 | 10 products with images |
| 6. Create Glycopharm migration | 30min | None | Migration file |
| 7. Update Glycopharm entity | 15min | Task 6 | Entity with images field |
| 8. Add images to S1 products (Glycopharm) | 15min | Task 7 | 10 products with images |
| 9. Test seed script | 20min | Tasks 2-8 | All 57 products seeded with images |
| 10. Verify UI display | 30min | Task 9 | Product cards/details show images |

**Total Effort**: ~4 hours
**Blockers**: Glycopharm migration must run before seeding S1 products with images

---

## Image URL Strategy

### Option A: Placehold.co (Recommended for Phase 1)

**Pros**:
- ✅ Free, no API key required
- ✅ Supports Korean text (URL-encoded)
- ✅ Customizable colors, sizes
- ✅ Fast CDN delivery
- ✅ No file storage needed

**Cons**:
- ⚠️ External dependency
- ⚠️ Generic placeholder appearance
- ⚠️ Service availability risk

**URL Format**:
```
https://placehold.co/600x600/BGCOLOR/TEXTCOLOR/png?text=ENCODED_TEXT
```

**Example**:
```
https://placehold.co/600x600/F5F5F5/333333/png?text=후시딘+연고
```

### Option B: via.placeholder.com (Alternative)

**Pros**:
- ✅ Simple URL structure
- ✅ Widely used, stable service

**Cons**:
- ⚠️ Limited Korean text support
- ⚠️ Less customization

### Option C: Local Placeholder Generator (Future)

Create a simple Express endpoint in api-server to generate SVG placeholders:

```typescript
GET /api/v1/placeholder/:width/:height/:text
Returns: SVG image with text overlay
```

**Pros**:
- ✅ No external dependency
- ✅ Full control
- ✅ Can add branding, product category icons

**Cons**:
- ⚠️ Requires implementation (2-3 hours)
- ⚠️ Server load for image generation

---

## Sample Data with Images

### Cosmetics Example

```typescript
{
  name: '세라마이드 진정 크림',
  subtitle: '민감성 피부 보습 장벽 케어',
  sku: 'COS-S3-001',
  // ... other fields
  images: [
    {
      url: 'https://placehold.co/600x600/FFE4E1/8B4513/png?text=세라마이드+진정+크림',
      alt: '세라마이드 진정 크림 - 민감성 피부 보습 장벽 케어',
      is_primary: true,
      order: 1
    },
    {
      url: 'https://placehold.co/600x600/FFF8DC/CD853F/png?text=성분정보',
      alt: '세라마이드 진정 크림 성분 정보',
      is_primary: false,
      order: 2
    }
  ]
}
```

### Neture Example

```typescript
{
  name: '멀티비타민 미네랄 종합영양제',
  subtitle: '하루 1정으로 영양 보충',
  sku: 'HLT-S2-001',
  // ... other fields
  images: [
    {
      url: 'https://placehold.co/600x600/E0F2F7/01579B/png?text=멀티비타민',
      alt: '멀티비타민 미네랄 종합영양제',
      is_primary: true,
      order: 1
    }
  ]
}
```

---

## Color Coding by Product Category

To improve visual differentiation, use category-specific colors:

| Category | Background | Text | Use Case |
|----------|------------|------|----------|
| **Pharmaceutical** | `#FFE4E1` (MistyRose) | `#8B0000` (DarkRed) | S1: 의약외품 |
| **Health Supplement** | `#E0F2F7` (LightBlue) | `#01579B` (DarkBlue) | S2: 건강기능식품 |
| **Cosmetics** | `#FFF8DC` (Cornsilk) | `#CD853F` (Peru) | S3: 화장품 |
| **Health Devices** | `#F0FFF0` (Honeydew) | `#228B22` (ForestGreen) | S4: 의료기기 |
| **Pilot Brands** | `#F5F5DC` (Beige) | `#8B4513` (SaddleBrown) | S5: 신규 브랜드 |

---

## Rollout Plan

### Week 1: Immediate (Placeholders)

**Day 1-2**:
- ✅ Create image data for all 57 products
- ✅ Add Glycopharm migration
- ✅ Update entities
- ✅ Update seed script
- ✅ Test seeding
- ✅ Verify UI display

**Deliverable**: All products display with placeholder images

### Week 2: Stock Images

**Day 3-5**:
- Research and curate stock images by category
- Map products to relevant stock photos
- Update image URLs in seed data
- Re-seed database

**Deliverable**: Products display with professional stock photos

### Future: Real Product Photos

**Month 2+**:
- Work with suppliers to obtain actual product photos
- Professional photography for custom products
- Build image CDN/storage solution

**Deliverable**: Production-ready product catalog

---

## Success Criteria

- [ ] All 57 products have at least 1 image
- [ ] `is_primary: true` image set for each product
- [ ] Product cards render images in listing pages
- [ ] Product detail pages show image gallery
- [ ] Shopping cart shows product thumbnails
- [ ] Mobile view displays images correctly
- [ ] Images load within 2 seconds
- [ ] Alt text present for accessibility
- [ ] No broken image links

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Placehold.co service down | Low | High | Fallback to via.placeholder.com or local generator |
| Korean text rendering issues | Medium | Medium | Use simple Latin text or product SKU |
| Image loading performance | Low | Medium | Use CDN, lazy loading in UI |
| Glycopharm migration conflicts | Low | High | Test migration on dev DB first |

---

## Next Steps

1. **Get Approval** on using placeholder images
2. **Create Glycopharm Migration** for images field
3. **Update Seed Script** with image data
4. **Test End-to-End**: Seed → API → UI display
5. **Document**: Update completeness report

---

## Appendix: Image Generation Script

```typescript
// scripts/generate-product-images.ts
import { URL } from 'url';

interface ImageSpec {
  productName: string;
  category: 'pharmaceutical' | 'health' | 'cosmetics' | 'device' | 'pilot';
  sku: string;
}

function generatePlaceholderImage(spec: ImageSpec): ProductImage {
  const colorMap = {
    pharmaceutical: { bg: 'FFE4E1', fg: '8B0000' },
    health: { bg: 'E0F2F7', fg: '01579B' },
    cosmetics: { bg: 'FFF8DC', fg: 'CD853F' },
    device: { bg: 'F0FFF0', fg: '228B22' },
    pilot: { bg: 'F5F5DC', fg: '8B4513' }
  };

  const colors = colorMap[spec.category];
  const text = encodeURIComponent(spec.productName.substring(0, 20)); // Limit length

  return {
    url: `https://placehold.co/600x600/${colors.bg}/${colors.fg}/png?text=${text}`,
    alt: `${spec.productName} 제품 이미지`,
    is_primary: true,
    order: 1
  };
}

// Usage
const image = generatePlaceholderImage({
  productName: '세라마이드 진정 크림',
  category: 'cosmetics',
  sku: 'COS-S3-001'
});
```

---

*Proposal Date: 2026-01-29*
*Expected Completion: 2026-01-30*
*Estimated Effort: 4 hours*
