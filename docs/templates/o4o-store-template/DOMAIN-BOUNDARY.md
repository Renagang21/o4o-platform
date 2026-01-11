# Domain Boundary Definition

> **Phase 8 확정 문서**
> O4O 매장과 Core 간의 책임 경계를 정의한다.

## 1. 책임 분리 원칙

O4O 플랫폼은 **Core**와 **Store(매장)**로 책임이 명확히 분리된다.

```
┌─────────────────────────────────────────────────────────────┐
│                         O4O Platform                         │
├─────────────────────────────┬───────────────────────────────┤
│         Core 영역           │         Store 영역            │
├─────────────────────────────┼───────────────────────────────┤
│  • 주문 생성/저장           │  • 상품/콘텐츠 관리           │
│  • 결제 처리                │  • 카테고리/분류              │
│  • 환불 처리                │  • 가격 정책                  │
│  • 정산 집계                │  • 패키지 구성                │
│  • 통합 리포트              │  • 매장별 메타데이터          │
│  • 주문 이력 조회           │  • 도메인 특화 로직           │
├─────────────────────────────┼───────────────────────────────┤
│  checkout_orders            │  {store}_products             │
│  checkout_payments          │  {store}_categories           │
│  order_logs                 │  {store}_packages             │
└─────────────────────────────┴───────────────────────────────┘
```

## 2. Core 책임

### 2.1 주문 관리 (Order Management)

| 기능 | 담당 | 테이블 |
|------|------|--------|
| 주문 생성 | Core | `checkout_orders` |
| 주문 상태 변경 | Core | `checkout_orders` |
| 주문 취소 | Core | `checkout_orders` |
| 주문 이력 조회 | Core | `checkout_orders` |

### 2.2 결제 관리 (Payment Management)

| 기능 | 담당 | 테이블 |
|------|------|--------|
| 결제 요청 | Core | `checkout_payments` |
| 결제 완료 처리 | Core | `checkout_payments` |
| 환불 처리 | Core | `checkout_payments` |
| 결제 이력 조회 | Core | `checkout_payments` |

### 2.3 정산/리포트 (Settlement/Reports)

| 기능 | 담당 | 기준 |
|------|------|------|
| 정산 대상 집계 | Core | `paidAt` 기준 |
| 서비스별 리포트 | Core | `orderType` 기준 |
| 기간별 리포트 | Core | `paidAt` 기준 |

## 3. Store 책임

### 3.1 상품 관리 (Product Management)

매장은 자체 상품/콘텐츠를 관리한다.

```typescript
// 예시: Tourism 패키지
@Entity('tourism_packages')
export class TourismPackage {
  id: string;
  name: string;
  description: string;
  durationHours: number;
  minParticipants: number;
  // ... 도메인 특화 필드
}
```

### 3.2 가격 관리 (Price Management)

매장은 자체 가격 정책을 관리한다.

```typescript
// 예시: Cosmetics 가격 정책
@Entity('cosmetics_price_policies')
export class CosmeticsPricePolicy {
  id: string;
  productId: string;
  basePrice: number;
  discountRate: number;
  // ... 가격 관련 필드
}
```

### 3.3 메타데이터 정의 (Metadata Definition)

매장은 주문에 포함할 메타데이터를 정의한다.

```typescript
// 예시: Tourism 메타데이터
interface TourismOrderMetadata {
  packageId: string;
  packageName: string;
  tourDate: string;
  participants: number;
  pickupLocation?: string;
}
```

## 4. 경계 위반 사례

### 4.1 Store가 Core 영역 침범 (금지)

```typescript
// ❌ 금지: Store에서 주문 테이블 직접 생성
@Entity('tourism_orders')
export class TourismOrder { ... }

// ❌ 금지: Store에서 결제 처리
await this.paymentService.processPayment({ ... });

// ❌ 금지: Store에서 정산 로직 구현
async calculateSettlement() { ... }
```

### 4.2 Core가 Store 영역 침범 (금지)

```typescript
// ❌ 금지: Core에서 매장 상품 직접 관리
@Entity('checkout_products')
export class CheckoutProduct { ... }

// ❌ 금지: Core에서 매장별 가격 정책 구현
async getCosmeticsPrice(productId: string) { ... }
```

## 5. 올바른 연동 패턴

### 5.1 주문 생성 시

```
[사용자] → [Store API] → checkoutService.createOrder() → [checkout_orders]
              │
              └── 상품 정보 조회 → [store_products]
              └── 가격 계산 → [store_price_policies]
              └── 메타데이터 구성 → 주문에 포함
```

### 5.2 주문 조회 시

```
[사용자] → [Store API] → checkoutService.findByBuyerId() → [checkout_orders]
              │
              └── orderType 필터링
              └── 메타데이터 해석
              └── Store 응답 형식으로 변환
```

### 5.3 정산 시

```
[Admin] → [Core API] → checkoutService.getSettlementSummary()
              │
              └── orderType 별 집계
              └── supplierId 별 집계
              └── 기간별 집계
```

## 6. 테이블 네이밍 규칙

### 6.1 Core 테이블

Core 테이블은 `checkout_` 접두사를 사용한다.

| 테이블 | 용도 |
|--------|------|
| `checkout_orders` | 통합 주문 원장 |
| `checkout_payments` | 결제 이력 |
| `order_logs` | 주문 상태 변경 로그 |

### 6.2 Store 테이블

Store 테이블은 `{store}_` 접두사를 사용한다.

| 예시 | 용도 |
|------|------|
| `tourism_packages` | Tourism 패키지 |
| `tourism_destinations` | Tourism 관광지 |
| `cosmetics_products` | Cosmetics 상품 |
| `cosmetics_brands` | Cosmetics 브랜드 |

## 7. 금지 테이블

다음 테이블은 생성이 금지된다.

| 금지 테이블 | 이유 |
|-------------|------|
| `{store}_orders` | Core 영역 침범 |
| `{store}_payments` | Core 영역 침범 |
| `{store}_settlements` | Core 영역 침범 |

## 8. 위반 시 조치

| 위반 유형 | 조치 |
|-----------|------|
| 금지 테이블 생성 | 마이그레이션 롤백, 테이블 삭제 |
| Core 우회 주문 생성 | 코드 즉시 제거 |
| 경계 침범 로직 | 적절한 영역으로 이전 |

---

*Phase 8 (2026-01-11) - O4O Store Template Standardization*
