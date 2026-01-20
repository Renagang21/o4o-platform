# Cosmetics Extension - Digital Signage Phase 3

## Work Order: WO-SIGNAGE-PHASE3-DEV-COSMETICS

### 개요

Digital Signage Phase 3의 두 번째 Extension입니다.
화장품 매장(K-Cosmetics)의 브랜드별 콘텐츠 관리를 위한 전문 확장 모듈입니다.

### 핵심 특징

1. **Global Content + Clone 모델**
   - HQ에서 생성한 콘텐츠를 매장에서 Clone하여 사용
   - Force 기능 없음 (Pharmacy와 다름)
   - 모든 콘텐츠는 Clone 가능

2. **브랜드 중심 설계**
   - CosmeticsBrand: 브랜드 관리 (예: 설화수, 헤라, 라네즈)
   - CosmeticsBrandContent: 브랜드별 콘텐츠
   - CosmeticsContentPreset: 콘텐츠 템플릿 프리셋
   - CosmeticsTrendCard: 트렌드/룩북 카드

3. **ESM 규칙 준수**
   - TypeORM Entity 관계는 문자열 참조 사용
   - `.js` 확장자 import 필수

---

## API 엔드포인트

Base URL: `/api/signage/:serviceKey/ext/cosmetics`

### 브랜드 관리 (Operator)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/brands` | 브랜드 목록 조회 |
| GET | `/brands/:id` | 브랜드 상세 조회 |
| POST | `/brands` | 브랜드 생성 |
| PATCH | `/brands/:id` | 브랜드 수정 |
| DELETE | `/brands/:id` | 브랜드 삭제 |

### 콘텐츠 프리셋 (Operator)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/presets` | 프리셋 목록 조회 |
| GET | `/presets/:id` | 프리셋 상세 조회 |
| POST | `/presets` | 프리셋 생성 |
| PATCH | `/presets/:id` | 프리셋 수정 |

### 브랜드 콘텐츠 (Operator)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/contents` | 콘텐츠 목록 조회 |
| GET | `/contents/:id` | 콘텐츠 상세 조회 |
| POST | `/contents` | 콘텐츠 생성 |
| PATCH | `/contents/:id` | 콘텐츠 수정 |
| DELETE | `/contents/:id` | 콘텐츠 삭제 (soft delete) |

### 트렌드 카드 (Operator)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/trends` | 트렌드 카드 목록 조회 |
| GET | `/trends/:id` | 트렌드 카드 상세 조회 |
| POST | `/trends` | 트렌드 카드 생성 |
| PATCH | `/trends/:id` | 트렌드 카드 수정 |
| DELETE | `/trends/:id` | 트렌드 카드 삭제 |

### 글로벌 콘텐츠 (Store)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/global/contents` | 글로벌 콘텐츠 목록 (매장용) |
| POST | `/global/contents/:id/clone` | 콘텐츠 Clone |

### 통계 (Operator)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/stats` | 콘텐츠 통계 조회 |

---

## 데이터 모델

### CosmeticsBrand

```typescript
{
  id: string;              // UUID
  organizationId: string;  // 조직 ID
  name: string;            // 브랜드명
  code: string;            // 브랜드 코드 (unique)
  description: string;     // 설명
  logoUrl: string;         // 로고 URL
  colorScheme: {           // 색상 스키마
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  category: string;        // 카테고리
  displayOrder: number;    // 표시 순서
  isActive: boolean;       // 활성화 여부
}
```

### CosmeticsBrandContent

```typescript
{
  id: string;
  organizationId: string;
  brandId: string;              // 브랜드 참조
  title: string;
  description: string;
  contentType: 'product' | 'brand-story' | 'promotion' | 'lookbook' | 'tutorial';
  mediaAssets: {
    imageUrl?: string;
    videoUrl?: string;
    thumbnailUrl?: string;
    additionalImages?: string[];
  };
  season: string;               // 시즌 (예: "2025-SS")
  source: 'cosmetics-brand';    // 항상 고정
  scope: 'global' | 'store';
  isForced: false;              // 항상 false (Cosmetics 특성)
  parentContentId: string;      // Clone된 경우 원본 ID
  campaignStart: Date;
  campaignEnd: Date;
  status: 'draft' | 'published' | 'archived';
  isActive: boolean;
  cloneCount: number;
  viewCount: number;
}
```

### CosmeticsContentPreset

```typescript
{
  id: string;
  organizationId: string;
  name: string;
  type: 'product-highlight' | 'brand-story' | 'promotion-banner' | 'lookbook-card' | 'tutorial-step';
  brandId: string;              // 브랜드별 프리셋 가능
  coreTemplateId: string;       // Core Template 참조
  visualConfig: {
    layout?: string;
    theme?: string;
    animation?: string;
    typography?: Record<string, unknown>;
    colors?: Record<string, string>;
  };
  thumbnailUrl: string;
  isActive: boolean;
}
```

### CosmeticsTrendCard

```typescript
{
  id: string;
  organizationId: string;
  title: string;
  description: string;
  trendType: 'color' | 'style' | 'technique' | 'ingredient';
  colorPalette: string[];       // 컬러 팔레트
  productReferences: string[];  // 관련 제품 참조
  thumbnailUrl: string;
  season: string;
  year: number;
  displayOrder: number;
  isActive: boolean;
}
```

---

## Pharmacy Extension과의 차이점

| 특성 | Pharmacy | Cosmetics |
|------|----------|-----------|
| Source | `pharmacy-hq`, `supplier` | `cosmetics-brand` |
| Force 기능 | ✅ 지원 (HQ만) | ❌ 미지원 |
| Clone 제한 | Force된 콘텐츠 불가 | 모든 콘텐츠 가능 |
| 주요 엔티티 | Category, Campaign | Brand, TrendCard |
| 콘텐츠 타입 | product-info, health-tip 등 | product, brand-story, lookbook 등 |

---

## 파일 구조

```
cosmetics/
├── COSMETICS-EXTENSION-README.md
├── index.ts
├── cosmetics.routes.ts
├── controllers/
│   └── cosmetics.controller.ts
├── services/
│   └── cosmetics.service.ts
├── repositories/
│   └── cosmetics.repository.ts
├── entities/
│   ├── index.ts
│   ├── CosmeticsBrand.entity.ts
│   ├── CosmeticsContentPreset.entity.ts
│   ├── CosmeticsBrandContent.entity.ts
│   └── CosmeticsTrendCard.entity.ts
└── dto/
    └── index.ts
```

---

## 사용 예시

### 브랜드 생성

```bash
POST /api/signage/my-service/ext/cosmetics/brands
Content-Type: application/json

{
  "name": "설화수",
  "code": "sulwhasoo",
  "description": "아모레퍼시픽 대표 럭셔리 브랜드",
  "category": "luxury",
  "colorScheme": {
    "primary": "#8B4513",
    "secondary": "#F5DEB3"
  }
}
```

### 브랜드 콘텐츠 생성

```bash
POST /api/signage/my-service/ext/cosmetics/contents
Content-Type: application/json

{
  "brandId": "uuid-of-brand",
  "title": "2025 S/S 신제품 런칭",
  "contentType": "promotion",
  "mediaAssets": {
    "imageUrl": "https://cdn.example.com/image.jpg",
    "thumbnailUrl": "https://cdn.example.com/thumb.jpg"
  },
  "season": "2025-SS",
  "scope": "global"
}
```

### 글로벌 콘텐츠 Clone

```bash
POST /api/signage/my-service/ext/cosmetics/global/contents/{contentId}/clone
Content-Type: application/json

{
  "title": "우리 매장용 프로모션"
}
```

---

## 참고 문서

- [CLAUDE.md](../../../../../../../../../CLAUDE.md) - 플랫폼 개발 규칙
- [Extension 공통 모듈](../common/README.md)
- [Pharmacy Extension](../pharmacy/PHARMACY-EXTENSION-README.md)

---

*Version: 1.0.0*
*Created: 2026-01-20*
*Work Order: WO-SIGNAGE-PHASE3-DEV-COSMETICS*
