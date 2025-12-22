# Extension Interface Specification v1

> **Version:** 1.0.0
> **Date:** 2025-12-22
> **Status:** Active

---

## 1. Overview

이 문서는 O4O Platform에서 **Core와 Extension 간의 상호작용 규칙**을 정의합니다.

### 1.1 핵심 원칙

| 원칙 | 설명 |
|------|------|
| **단방향 의존성** | Extension → Core (허용), Core → Extension (금지) |
| **Hook 기반 확장** | Extension은 Core의 Hook을 통해서만 동작 변경 가능 |
| **등록/해제 패턴** | Extension은 activate/deactivate 시 명시적으로 등록/해제 |
| **ProductType 분리** | 산업군별 Extension은 특정 productType에만 영향 |

### 1.2 적용 범위

이 스펙은 다음 Core에 적용됩니다:

- `dropshipping-core` - 드롭쉬핑 프레임워크
- `ecommerce-core` - 판매 원장
- `partner-core` - 파트너/제휴 프로그램
- `forum-core` - 커뮤니티 포럼
- `lms-core` - 학습 관리 시스템

---

## 2. Dropshipping Core Extension Interface

### 2.1 Interface 정의

```typescript
interface DropshippingCoreExtension {
  // === 필수 ===
  appId: string;

  // === 선택 ===
  displayName?: string;
  version?: string;
  supportedProductTypes?: string[];  // 미지정 시 전체 적용

  // === Offer Hooks ===
  beforeOfferCreate?: (context: OfferCreationContext) => Promise<ValidationResult>;
  afterOfferCreate?: (context: OfferCreationContext & { offerId: string }) => Promise<void>;

  // === Listing Hooks ===
  beforeListingCreate?: (context: ListingCreationContext) => Promise<ValidationResult>;
  afterListingCreate?: (context: ListingCreationContext & { listingId: string }) => Promise<void>;

  // === Order Hooks ===
  beforeOrderCreate?: (context: OrderCreationContext) => Promise<ValidationResult>;
  afterOrderCreate?: (context: OrderCreationContext & { orderId: string }) => Promise<void>;

  // === Settlement Hooks ===
  beforeSettlementCreate?: (context: SettlementCreationContext) => Promise<ValidationResult>;

  // === Commission Hooks ===
  beforeCommissionApply?: (context: CommissionContext) => Promise<ValidationResult>;
  afterCommissionApply?: (context: CommissionContext & { commissionAmount: number }) => Promise<void>;

  // === Lifecycle Hooks ===
  onActivate?: () => Promise<void>;
  onDeactivate?: () => Promise<void>;
}
```

### 2.2 ValidationResult 형식

```typescript
interface ValidationResult {
  valid: boolean;
  errors: Array<{
    code: string;
    message: string;
    field?: string;
  }>;
}
```

### 2.3 사용 예시

```typescript
// packages/dropshipping-cosmetics/src/extension.ts
import { DropshippingCoreExtension } from '@o4o/dropshipping-core';

export const cosmeticsExtension: DropshippingCoreExtension = {
  appId: 'dropshipping-cosmetics',
  displayName: '화장품 확장',
  supportedProductTypes: ['cosmetics'],

  async beforeOfferCreate(context) {
    // 화장품 인증 검증
    if (!context.metadata?.cosmeticsLicense) {
      return {
        valid: false,
        errors: [{ code: 'COSMETICS_LICENSE_REQUIRED', message: '화장품 판매 라이센스가 필요합니다.' }]
      };
    }
    return { valid: true, errors: [] };
  },

  async afterOrderCreate(context) {
    // 화장품 주문 시 특별 처리
    console.log(`[Cosmetics] Order created: ${context.orderId}`);
  }
};
```

### 2.4 등록 방법

```typescript
// packages/dropshipping-cosmetics/src/lifecycle/activate.ts
import { registerExtension } from '@o4o/dropshipping-core';
import { cosmeticsExtension } from '../extension.js';

export async function activate() {
  registerExtension(cosmeticsExtension);
}
```

```typescript
// packages/dropshipping-cosmetics/src/lifecycle/deactivate.ts
import { unregisterExtension } from '@o4o/dropshipping-core';

export async function deactivate() {
  unregisterExtension('dropshipping-cosmetics');
}
```

---

## 3. Ecommerce Core Extension Interface

### 3.1 Interface 정의

Ecommerce Core는 **OrderType** 기반 분기를 제공합니다.

```typescript
// OrderType Enum
enum OrderType {
  RETAIL = 'retail',
  DROPSHIPPING = 'dropshipping',
  B2B = 'b2b',
  SUBSCRIPTION = 'subscription',
}
```

Extension은 OrderType을 통해 자신의 주문만 처리합니다.

### 3.2 확장 패턴

```typescript
// Extension은 OrderType 필터링을 통해 주문 조회
const myOrders = await ecommerceOrderService.findByType(OrderType.DROPSHIPPING);
```

### 3.3 Event 기반 통합

Ecommerce Core는 Event를 발행하고, Extension은 이를 구독합니다.

| Event | 발행 시점 | Payload |
|-------|----------|---------|
| `order.created` | 주문 생성 완료 | `{ orderId, orderType, buyerId, sellerId, total }` |
| `order.paid` | 결제 완료 | `{ orderId, paymentId, amount }` |
| `order.shipped` | 배송 시작 | `{ orderId, trackingNumber }` |
| `order.completed` | 주문 완료 | `{ orderId, completedAt }` |
| `order.cancelled` | 주문 취소 | `{ orderId, reason }` |

---

## 4. Partner Core Extension Interface

### 4.1 Interface 정의

```typescript
interface PartnerCoreExtension {
  appId: string;
  displayName?: string;
  supportedProductTypes?: string[];

  // === Visibility Hooks ===
  validatePartnerVisibility?: (context: VisibilityContext) => Promise<ValidationResult>;

  // === Commission Hooks ===
  beforePartnerCommissionApply?: (context: CommissionContext) => Promise<ValidationResult>;
  afterPartnerCommissionApply?: (context: CommissionContext) => Promise<void>;

  // === Settlement Hooks ===
  beforePartnerSettlementCreate?: (context: SettlementContext) => Promise<ValidationResult>;
  afterPartnerSettlementCreate?: (context: SettlementContext) => Promise<void>;
}
```

### 4.2 Event 기반 통합

| Event | 발행 시점 | Payload |
|-------|----------|---------|
| `partner.click.recorded` | 링크 클릭 기록 | `{ linkId, partnerId, referrer }` |
| `partner.conversion.created` | 전환 발생 | `{ conversionId, orderId, partnerId, amount }` |
| `partner.commission.created` | 커미션 계산 | `{ commissionId, partnerId, amount }` |
| `partner.settlement.closed` | 정산 완료 | `{ batchId, totalAmount, partnerCount }` |

---

## 5. Forum Core Extension Interface

### 5.1 Interface 정의

```typescript
interface ForumCoreExtension {
  appId: string;
  displayName?: string;

  // === Post Hooks ===
  beforePostCreate?: (context: PostContext) => Promise<ValidationResult>;
  afterPostCreate?: (context: PostContext & { postId: string }) => Promise<void>;

  // === ACF Metadata ===
  extendPostMetadata?: (post: ForumPost) => Promise<Record<string, any>>;
}
```

### 5.2 ACF 기반 확장

Forum Extension은 ACF 필드를 통해 메타데이터를 확장합니다.

```typescript
// forum-yaksa의 ACF 확장 예시
const yaksaAcfFields = {
  groupId: 'pharmacy_meta',
  fields: [
    { name: 'drugName', type: 'string' },
    { name: 'drugCode', type: 'string' },
    { name: 'category', type: 'select', options: ['복약지도', '부작용', '상호작용', '조제'] },
    { name: 'severity', type: 'select', options: ['일반', '주의', '경고'] },
  ]
};
```

---

## 6. LMS Core Extension Interface

### 6.1 Interface 정의

```typescript
interface LMSCoreExtension {
  appId: string;
  displayName?: string;

  // === Course Hooks ===
  beforeCourseEnroll?: (context: EnrollmentContext) => Promise<ValidationResult>;
  afterCourseComplete?: (context: CompletionContext) => Promise<void>;

  // === Certificate Hooks ===
  beforeCertificateIssue?: (context: CertificateContext) => Promise<ValidationResult>;
}
```

---

## 7. 의존성 규칙

### 7.1 허용되는 의존성

```
Extension → Core (O)
Feature → Core (O)
Service → Core (O)
Service → Extension (O)
```

### 7.2 금지되는 의존성

```
Core → Extension (X)
Core → Service (X)
Extension → Service (X)
```

### 7.3 의존성 선언

Extension의 `manifest.ts`에 Core 의존성을 명시합니다.

```typescript
// packages/dropshipping-cosmetics/src/manifest.ts
export const manifest = {
  appId: 'dropshipping-cosmetics',
  appType: 'extension',
  dependencies: {
    core: ['dropshipping-core'],
    optional: [],
  },
  // ...
};
```

---

## 8. Extension 개발 가이드라인

### 8.1 필수 체크리스트

- [ ] `manifest.ts`에 `appType: 'extension'` 명시
- [ ] `dependencies.core`에 Core 패키지 명시
- [ ] `lifecycle/activate.ts`에서 Extension 등록
- [ ] `lifecycle/deactivate.ts`에서 Extension 해제
- [ ] Hook 구현 시 `ValidationResult` 형식 준수

### 8.2 Best Practices

1. **Hook은 빠르게 반환**: Hook에서 무거운 작업 금지
2. **에러 처리 철저**: Hook 실패 시 명확한 에러 코드 제공
3. **ProductType 필터링**: 불필요한 Hook 호출 방지
4. **테스트 작성**: 각 Hook에 대한 단위 테스트 필수

### 8.3 금지 사항

- Core 파일 직접 수정
- Core Entity에 컬럼 추가
- Core API 경로 override
- Core Service 메서드 monkey-patch

---

## 9. 등록된 Extension 목록

### 9.1 Dropshipping Core Extensions

| Extension | ProductType | Status |
|-----------|-------------|--------|
| `dropshipping-cosmetics` | cosmetics | Active |
| `pharmaceutical-core` | pharmaceutical | Active (재분류 예정) |
| `health-extension` | health | Active |

### 9.2 Forum Core Extensions

| Extension | Domain | Status |
|-----------|--------|--------|
| `forum-yaksa` | 약사회 | Active |
| `forum-cosmetics` | 화장품 | Active |

### 9.3 LMS Core Extensions

| Extension | Domain | Status |
|-----------|--------|--------|
| `lms-yaksa` | 약사회 교육 | Active |

---

## Appendix A: Context 타입 정의

### OfferCreationContext

```typescript
interface OfferCreationContext {
  productMasterId: string;
  productType: string;
  supplierId: string;
  supplier: {
    id: string;
    name: string;
    metadata?: Record<string, any>;
  };
  pricing: {
    wholesalePrice: number;
    retailPrice?: number;
  };
  metadata?: Record<string, any>;
}
```

### ListingCreationContext

```typescript
interface ListingCreationContext {
  offerId: string;
  productType: string;
  sellerId: string;
  seller: {
    id: string;
    name: string;
    metadata?: Record<string, any>;
  };
  pricing: {
    listPrice: number;
    salePrice?: number;
  };
  metadata?: Record<string, any>;
}
```

### OrderCreationContext

```typescript
interface OrderCreationContext {
  listingId?: string;
  offerId?: string;
  productType: string;
  buyerId: string;
  buyerInfo?: {
    organizationType?: string;
    metadata?: Record<string, any>;
  };
  sellerId: string;
  quantity: number;
  totalAmount: number;
  metadata?: Record<string, any>;
}
```

---

*Document Version: 1.0.0*
*Created: 2025-12-22*
*Part of: WO-APPSTORE-CORE-BOUNDARY-PHASE2*
