# Digital Signage - Extension API Contract V1

> **Phase:** 3 Design
> **Status:** FROZEN
> **Date:** 2025-01-20
> **Authority:** 이 문서는 API 구현의 기준이며, 엔드포인트 변경 시 Work Order 필요

---

## 1. 문서 상태

| Status | Description |
|--------|-------------|
| **FROZEN** | API 계약 확정, 구현 시 경로/권한 임의 변경 금지 |

---

## 2. API 공통 규칙

### 2.1 Base Path

```
Core:      /api/signage/:serviceKey/...
Extension: /api/signage/:serviceKey/ext/{extension}/...
```

### 2.2 Authentication

모든 Extension API는 Core 인증 미들웨어 사용:
- `ensureAuthenticated` - JWT 검증
- `validateServiceKey` - 서비스 키 검증

### 2.3 Response Format

```typescript
// Success
interface SuccessResponse<T> {
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
  };
}

// Error
interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
}
```

### 2.4 Role Middleware

| Middleware | Description |
|------------|-------------|
| `requirePharmacyOperator` | Pharmacy Operator 전용 |
| `requireCosmeticsOperator` | Cosmetics Operator 전용 |
| `requireSellerPartner` | Seller/Partner 전용 |
| `allowStoreRead` | Store 읽기 허용 |

---

## 3. signage-pharmacy-extension API

### 3.1 Category Management

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/ext/pharmacy/categories` | Operator, Store | 카테고리 목록 |
| POST | `/ext/pharmacy/categories` | Operator | 카테고리 생성 |
| GET | `/ext/pharmacy/categories/:id` | Operator, Store | 카테고리 상세 |
| PATCH | `/ext/pharmacy/categories/:id` | Operator | 카테고리 수정 |
| DELETE | `/ext/pharmacy/categories/:id` | Operator | 카테고리 삭제 |

### 3.2 Seasonal Campaign Management

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/ext/pharmacy/campaigns` | Operator, Store | 캠페인 목록 |
| POST | `/ext/pharmacy/campaigns` | Operator | 캠페인 생성 |
| GET | `/ext/pharmacy/campaigns/:id` | Operator, Store | 캠페인 상세 |
| PATCH | `/ext/pharmacy/campaigns/:id` | Operator | 캠페인 수정 |
| DELETE | `/ext/pharmacy/campaigns/:id` | Operator | 캠페인 삭제 |
| POST | `/ext/pharmacy/campaigns/:id/publish` | Operator | 캠페인 발행 |

### 3.3 Template Preset Management

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/ext/pharmacy/templates` | Operator, Store | 템플릿 프리셋 목록 |
| POST | `/ext/pharmacy/templates` | Operator | 템플릿 프리셋 생성 |
| GET | `/ext/pharmacy/templates/:id` | Operator, Store | 템플릿 프리셋 상세 |
| PATCH | `/ext/pharmacy/templates/:id` | Operator | 템플릿 프리셋 수정 |
| DELETE | `/ext/pharmacy/templates/:id` | Operator | 템플릿 프리셋 삭제 |
| POST | `/ext/pharmacy/templates/:id/preview` | Operator, Store | 미리보기 생성 |

### 3.4 Content Management

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/ext/pharmacy/contents` | Operator, Store | 콘텐츠 목록 |
| POST | `/ext/pharmacy/contents` | Operator | 콘텐츠 생성 |
| GET | `/ext/pharmacy/contents/:id` | Operator, Store | 콘텐츠 상세 |
| PATCH | `/ext/pharmacy/contents/:id` | Operator | 콘텐츠 수정 |
| DELETE | `/ext/pharmacy/contents/:id` | Operator | 콘텐츠 삭제 |
| POST | `/ext/pharmacy/contents/:id/publish` | Operator | 콘텐츠 발행 |

### 3.5 Global Content (Store Read)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/ext/pharmacy/global/contents` | Store | 글로벌 콘텐츠 목록 |
| GET | `/ext/pharmacy/global/campaigns` | Store | 글로벌 캠페인 목록 |
| POST | `/ext/pharmacy/global/contents/:id/clone` | Store | 콘텐츠 Clone |

### 3.6 AI Generation

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/ext/pharmacy/ai/generate-card` | Operator, Store | 제품 카드 자동 생성 |
| POST | `/ext/pharmacy/ai/generate-tip` | Operator | 건강 팁 자동 생성 |

---

## 4. signage-cosmetics-extension API

### 4.1 Content Preset Management

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/ext/cosmetics/presets` | Operator, Store | 프리셋 목록 |
| POST | `/ext/cosmetics/presets` | Operator | 프리셋 생성 |
| GET | `/ext/cosmetics/presets/:id` | Operator, Store | 프리셋 상세 |
| PATCH | `/ext/cosmetics/presets/:id` | Operator | 프리셋 수정 |
| DELETE | `/ext/cosmetics/presets/:id` | Operator | 프리셋 삭제 |

### 4.2 Brand Content Management

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/ext/cosmetics/brands/:brandId/contents` | Operator, Store | 브랜드별 콘텐츠 |
| POST | `/ext/cosmetics/brands/:brandId/contents` | Operator | 브랜드 콘텐츠 생성 |
| GET | `/ext/cosmetics/contents/:id` | Operator, Store | 콘텐츠 상세 |
| PATCH | `/ext/cosmetics/contents/:id` | Operator | 콘텐츠 수정 |
| DELETE | `/ext/cosmetics/contents/:id` | Operator | 콘텐츠 삭제 |
| POST | `/ext/cosmetics/contents/:id/publish` | Operator | 콘텐츠 발행 |

### 4.3 Trend Card Management

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/ext/cosmetics/trends` | Operator, Store | 트렌드 카드 목록 |
| POST | `/ext/cosmetics/trends` | Operator | 트렌드 카드 생성 |
| GET | `/ext/cosmetics/trends/:id` | Operator, Store | 트렌드 카드 상세 |
| PATCH | `/ext/cosmetics/trends/:id` | Operator | 트렌드 카드 수정 |
| DELETE | `/ext/cosmetics/trends/:id` | Operator | 트렌드 카드 삭제 |

### 4.4 Global Content (Store Read)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/ext/cosmetics/global/contents` | Store | 글로벌 콘텐츠 목록 |
| GET | `/ext/cosmetics/global/trends` | Store | 글로벌 트렌드 목록 |
| POST | `/ext/cosmetics/global/contents/:id/clone` | Store | 콘텐츠 Clone |

---

## 5. signage-seller-promo-extension API

### 5.1 Promo Card Management (Partner)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/ext/seller/promos` | Partner | 내 프로모션 목록 |
| POST | `/ext/seller/promos` | Partner | 프로모션 생성 |
| GET | `/ext/seller/promos/:id` | Partner | 프로모션 상세 |
| PATCH | `/ext/seller/promos/:id` | Partner | 프로모션 수정 |
| DELETE | `/ext/seller/promos/:id` | Partner | 프로모션 삭제 |
| POST | `/ext/seller/promos/:id/submit` | Partner | 승인 요청 |

### 5.2 Editable Template (Partner)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/ext/seller/templates` | Partner | 사용 가능 템플릿 목록 |
| GET | `/ext/seller/templates/:id` | Partner | 템플릿 상세 |
| POST | `/ext/seller/my-templates` | Partner | 내 템플릿 생성 |
| GET | `/ext/seller/my-templates` | Partner | 내 템플릿 목록 |
| PATCH | `/ext/seller/my-templates/:id` | Partner | 내 템플릿 수정 |
| POST | `/ext/seller/my-templates/:id/publish` | Partner | 템플릿 발행 |

### 5.3 Analytics (Partner)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/ext/seller/analytics/overview` | Partner | 성과 개요 |
| GET | `/ext/seller/analytics/contents/:id` | Partner | 콘텐츠별 성과 |
| GET | `/ext/seller/analytics/daily` | Partner | 일별 성과 |

### 5.4 Admin Approval (Operator)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/ext/seller/admin/pending` | Operator | 승인 대기 목록 |
| POST | `/ext/seller/admin/promos/:id/approve` | Operator | 승인 |
| POST | `/ext/seller/admin/promos/:id/reject` | Operator | 거부 |

### 5.5 Global Content (Store Read)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/ext/seller/global/promos` | Store | 승인된 프로모션 목록 |
| POST | `/ext/seller/global/promos/:id/clone` | Store | 프로모션 Clone |

---

## 6. signage-tourist-extension API (P4 - 설계만)

### 6.1 Location Card Management

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/ext/tourist/locations` | Operator, Store | 장소 카드 목록 |
| POST | `/ext/tourist/locations` | Operator | 장소 카드 생성 |
| GET | `/ext/tourist/locations/:id` | Operator, Store | 장소 카드 상세 |
| PATCH | `/ext/tourist/locations/:id` | Operator | 장소 카드 수정 |

### 6.2 Multilingual Content

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/ext/tourist/contents/:id/translations` | Operator, Store | 번역 목록 |
| POST | `/ext/tourist/contents/:id/translate` | Operator | AI 번역 요청 |
| PATCH | `/ext/tourist/translations/:id` | Operator | 번역 수정 |
| POST | `/ext/tourist/translations/:id/verify` | Operator | 번역 검수 완료 |

### 6.3 Event Schedule

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/ext/tourist/events` | Operator, Store | 이벤트 목록 |
| POST | `/ext/tourist/events` | Operator | 이벤트 생성 |
| PATCH | `/ext/tourist/events/:id` | Operator | 이벤트 수정 |

---

## 7. Request/Response 개념 구조

### 7.1 Pharmacy Content Create

```typescript
// POST /ext/pharmacy/contents
interface CreatePharmacyContentRequest {
  title: string;
  description?: string;
  contentType: 'product_card' | 'health_info' | 'medication_guide' | 'promo';
  categoryId?: string;
  campaignId?: string;
  templatePresetId?: string;
  mediaData: {
    imageUrl?: string;
    videoUrl?: string;
    duration?: number;
  };
  isForced?: boolean;
  validFrom?: string;
  validUntil?: string;
}

// Response
interface CreatePharmacyContentResponse {
  data: {
    id: string;
    title: string;
    status: 'draft';
    createdAt: string;
  };
}
```

### 7.2 Seller Promo Submit

```typescript
// POST /ext/seller/promos/:id/submit
interface SubmitPromoRequest {
  // No body required
}

// Response
interface SubmitPromoResponse {
  data: {
    id: string;
    status: 'pending';
    submittedAt: string;
  };
}
```

### 7.3 Clone Content

```typescript
// POST /ext/{extension}/global/contents/:id/clone
interface CloneContentRequest {
  // Optional customizations
  title?: string;
}

// Response
interface CloneContentResponse {
  data: {
    id: string;  // New cloned content ID
    originalId: string;
    scope: 'store';
    createdAt: string;
  };
}
```

---

## 8. Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `EXT_NOT_FOUND` | 404 | Extension 리소스 없음 |
| `EXT_FORBIDDEN` | 403 | Extension 권한 없음 |
| `EXT_INVALID_SCOPE` | 400 | 잘못된 scope 요청 |
| `EXT_CLONE_FAILED` | 500 | Clone 실패 |
| `EXT_PUBLISH_FAILED` | 500 | 발행 실패 |
| `EXT_FORCE_NOT_ALLOWED` | 403 | Force 권한 없음 |

---

## 9. Rate Limiting

| Extension | Endpoint Type | Rate Limit |
|-----------|---------------|------------|
| All | Read | 100 req/min |
| All | Write | 30 req/min |
| Pharmacy | AI Generate | 10 req/min |
| Tourist | AI Translate | 10 req/min |

---

## 10. API 버전 관리

```
/api/signage/:serviceKey/ext/pharmacy/v1/...
```

현재 버전: **v1**
하위 호환성: 유지 (최소 6개월)

---

*Document: EXTENSION-API-CONTRACT-V1.md*
*Status: FROZEN*
*Phase 3 Design*
