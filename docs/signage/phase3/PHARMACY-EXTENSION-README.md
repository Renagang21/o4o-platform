# Pharmacy Extension - Development Guide

> **Work Order:** WO-SIGNAGE-PHASE3-DEV-PHARMACY
> **Status:** Complete
> **Date:** 2025-01-20

---

## 1. 개요

Pharmacy Extension은 GlycoPharm/KPA 약국 서비스를 위한 Digital Signage 확장 모듈입니다.

### 1.1 핵심 기능

- **Global Content**: 본부(HQ)에서 약국으로 콘텐츠 배포
- **Force Content**: 필수 복약 안내 등 강제 표시 콘텐츠
- **Category/Campaign**: OTC/건강기능식품 카테고리 및 계절 캠페인 관리
- **Template Preset**: 약국 전용 템플릿 프리셋

### 1.2 Phase 3 Design 준수

- Core 수정 금지 (Adapter 통해서만 접근)
- Force 허용: `pharmacy-hq`만
- Schema: `signage_pharmacy`
- API 경로: `/api/signage/:serviceKey/ext/pharmacy/...`

---

## 2. 디렉토리 구조

```
apps/api-server/src/routes/signage/extensions/pharmacy/
├── entities/
│   ├── PharmacyCategory.entity.ts
│   ├── PharmacySeasonalCampaign.entity.ts
│   ├── PharmacyTemplatePreset.entity.ts
│   ├── PharmacyContent.entity.ts
│   └── index.ts
├── dto/
│   └── index.ts
├── repositories/
│   └── pharmacy.repository.ts
├── services/
│   └── pharmacy.service.ts
├── controllers/
│   └── pharmacy.controller.ts
├── pharmacy.routes.ts
└── index.ts
```

---

## 3. Entity 설계

### 3.1 PharmacyCategory

OTC/건강기능식품 카테고리 관리

```typescript
{
  id: string;
  organizationId: string;
  name: string;
  code: string;           // 'otc_cold', 'supplement_vitamin', etc.
  parentId: string | null;
  iconUrl: string | null;
  displayOrder: number;
  isActive: boolean;
}
```

### 3.2 PharmacySeasonalCampaign

계절별 건강 캠페인 관리

```typescript
{
  id: string;
  organizationId: string;
  name: string;
  season: 'spring' | 'summer' | 'fall' | 'winter' | 'year_round';
  healthCondition: string | null;  // '감기', '알레르기', etc.
  categoryId: string;
  productKeywords: string[];
  startDate: string;
  endDate: string;
  priority: number;
  scope: 'global' | 'store';
  isForced: boolean;
  isActive: boolean;
}
```

### 3.3 PharmacyTemplatePreset

약국 전용 템플릿 프리셋

```typescript
{
  id: string;
  organizationId: string;
  name: string;
  type: 'medication_guide' | 'health_tip' | 'product_promo' | 'event' | 'notice';
  coreTemplateId: string | null;  // Core Template ID 참조만
  config: {
    layout: 'horizontal' | 'vertical' | 'grid';
    colorScheme: 'default' | 'health' | 'promo' | 'alert';
    fontFamily: string;
    placeholders: { ... };
  };
  thumbnailUrl: string | null;
  isActive: boolean;
}
```

### 3.4 PharmacyContent

약국 HQ/공급자 콘텐츠 (Global Content 구현)

```typescript
{
  id: string;
  organizationId: string;
  supplierId: string | null;
  title: string;
  description: string | null;
  contentType: 'product_card' | 'health_info' | 'medication_guide' | 'promo' | 'notice';
  categoryId: string | null;
  campaignId: string | null;
  templatePresetId: string | null;
  mediaData: { imageUrl?, videoUrl?, duration? };
  source: 'pharmacy-hq' | 'pharmacy-supplier';
  scope: 'global' | 'store';
  isForced: boolean;           // pharmacy-hq만 true 가능
  parentContentId: string | null;  // Clone 추적
  validFrom: string | null;
  validUntil: string | null;
  status: 'draft' | 'published' | 'archived';
  isActive: boolean;
  cloneCount: number;
  viewCount: number;
}
```

---

## 4. API 엔드포인트

### 4.1 HQ/Operator Routes (Operator 전용)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/hq/contents` | 콘텐츠 목록 조회 |
| GET | `/hq/contents/:id` | 콘텐츠 상세 조회 |
| POST | `/hq/contents` | 콘텐츠 생성 |
| PATCH | `/hq/contents/:id` | 콘텐츠 수정 |
| DELETE | `/hq/contents/:id` | 콘텐츠 삭제 |
| GET | `/hq/stats` | 콘텐츠 통계 |

### 4.2 Category Routes (Operator 전용)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/categories` | 카테고리 목록 |
| GET | `/categories/:id` | 카테고리 상세 |
| POST | `/categories` | 카테고리 생성 |
| PATCH | `/categories/:id` | 카테고리 수정 |
| DELETE | `/categories/:id` | 카테고리 삭제 |

### 4.3 Campaign Routes (Operator 전용)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/campaigns` | 캠페인 목록 |
| GET | `/campaigns/:id` | 캠페인 상세 |
| POST | `/campaigns` | 캠페인 생성 |
| PATCH | `/campaigns/:id` | 캠페인 수정 |
| DELETE | `/campaigns/:id` | 캠페인 삭제 |

### 4.4 Template Preset Routes (Operator 전용)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/presets` | 프리셋 목록 |
| GET | `/presets/:id` | 프리셋 상세 |
| POST | `/presets` | 프리셋 생성 |
| PATCH | `/presets/:id` | 프리셋 수정 |

### 4.5 Global Content Routes (Store)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/global/contents` | Global 콘텐츠 목록 (Store용) |
| POST | `/global/contents/:id/clone` | 콘텐츠 Clone |

---

## 5. Force 규칙

### 5.1 Force 허용 Source

- `pharmacy-hq`: Force 허용 ✅
- `pharmacy-supplier`: Force 불허 ❌

### 5.2 Force 콘텐츠 동작

| 동작 | Force=true | Force=false |
|------|-----------|-------------|
| 삭제 | ❌ 불가 | ✅ 가능 |
| Clone | ❌ 불가 | ✅ 가능 |
| 순서 변경 | ❌ 불가 | ✅ 가능 |
| Player 표시 | 항상 표시 | 선택적 |

---

## 6. 사용 예시

### 6.1 콘텐츠 생성 (Operator)

```typescript
POST /api/signage/glycopharm/ext/pharmacy/hq/contents
{
  "title": "봄철 알레르기 예방 안내",
  "description": "황사 및 꽃가루 대비 복약 안내",
  "contentType": "medication_guide",
  "categoryId": "uuid-otc-allergy",
  "campaignId": "uuid-spring-campaign",
  "mediaData": {
    "imageUrl": "https://storage.example.com/allergy-guide.jpg",
    "duration": 15
  },
  "source": "pharmacy-hq",
  "scope": "global",
  "isForced": true,
  "validFrom": "2025-03-01",
  "validUntil": "2025-05-31"
}
```

### 6.2 Global 콘텐츠 조회 (Store)

```typescript
GET /api/signage/glycopharm/ext/pharmacy/global/contents?contentType=medication_guide

Response:
{
  "data": [
    {
      "id": "uuid-content-1",
      "title": "봄철 알레르기 예방 안내",
      "contentType": "medication_guide",
      "source": "pharmacy-hq",
      "scope": "global",
      "isForced": true,
      "canClone": false,
      "thumbnailUrl": "https://storage.example.com/allergy-guide.jpg"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "hasForced": true,
    "sources": ["pharmacy-hq"]
  }
}
```

### 6.3 콘텐츠 Clone (Store)

```typescript
POST /api/signage/glycopharm/ext/pharmacy/global/contents/{id}/clone
{
  "title": "우리 약국 맞춤 알레르기 안내"
}

Response:
{
  "data": {
    "content": { ... },
    "originalId": "uuid-original",
    "clonedAt": "2025-01-20T10:00:00Z"
  }
}
```

---

## 7. Role 체계

| Role | 설명 | 권한 |
|------|------|------|
| `signage:pharmacy:operator` | 약국 서비스 운영자 | 모든 기능 |
| `signage:pharmacy:store` | 약국 매장 | Global 조회, Clone |
| `signage:operator` (Core) | Core 운영자 | 모든 Extension 접근 |

---

## 8. 다음 단계

### 8.1 통합 작업 (별도 Work Order)

- [ ] Signage 메인 라우터에 Extension 라우터 등록
- [ ] Pharmacy Entity DataSource 등록
- [ ] Database Migration 생성 및 실행
- [ ] Frontend Operator Workspace 구현

### 8.2 관련 Work Order

- WO-SIGNAGE-PHASE3-DEV-COSMETICS (다음)
- WO-SIGNAGE-PHASE3-DEV-SELLER
- WO-SIGNAGE-PHASE3-DEV-INTEGRATION

---

## 9. 참조 문서

- [PHASE3-DESIGN-BASELINE.md](./PHASE3-DESIGN-BASELINE.md)
- [EXTENSION-ENTITY-DESIGN-V1.md](./EXTENSION-ENTITY-DESIGN-V1.md)
- [EXTENSION-API-CONTRACT-V1.md](./EXTENSION-API-CONTRACT-V1.md)
- [GLOBAL-CONTENT-FLOW-V4.md](./GLOBAL-CONTENT-FLOW-V4.md)
- [DEV-FOUNDATION-README.md](./DEV-FOUNDATION-README.md)

---

*Document: PHARMACY-EXTENSION-README.md*
*Work Order: WO-SIGNAGE-PHASE3-DEV-PHARMACY*
*Status: Complete*
