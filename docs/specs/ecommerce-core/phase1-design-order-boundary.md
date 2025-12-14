# E-commerce Core 도입 Phase 1: Order 책임 경계 설계

> **작업 브랜치**: `feature/ecommerce-core-introduction-phase1`
> **문서 상태**: Phase 1 설계 확정
> **최종 업데이트**: 2025-12-13

---

## 1. 개요

### 1.1 목적

Dropshipping Core가 암묵적으로 담당하고 있는 "판매 발생 사실"과 "공급/정산 분기"를 분리하여,
**E-commerce Core를 판매 원장(Source of Truth)**으로 정렬한다.

### 1.2 Phase 1 범위

- 구조 정렬 및 설계 확정까지만 수행
- **기능 변경, API 변경, Migration 실행은 Phase 2에서 수행**

---

## 2. E-commerce Core Order 개념 정의

### 2.1 핵심 원칙

E-commerce Order는 **판매 발생의 원장(Source of Truth)**으로서:

1. **판매 유형에 무관**한 주문 기록 (retail, dropshipping, B2B 등)
2. **결제 상태**와 **주문 상태**의 단일 진실
3. **하위 시스템**(Dropshipping, Retail 등)이 참조하는 기준점

### 2.2 최소 필드 목록 (Phase 2에서 Entity 생성)

```typescript
interface EcommerceOrder {
  // === 식별자 ===
  id: string;                    // UUID, PK
  orderNumber: string;           // 내부 주문 번호 (ORD-YYYYMMDD-XXXX)
  externalOrderId?: string;      // 외부 채널 주문 ID (스마트스토어, 쿠팡 등)

  // === 당사자 ===
  buyerId: string;               // 구매자 ID (User 또는 Organization)
  buyerType: 'user' | 'organization';
  sellerId: string;              // 판매자 ID (Seller 또는 Organization)
  sellerType: 'individual' | 'organization';

  // === 금액 ===
  subtotal: number;              // 상품 금액 합계
  shippingFee: number;           // 배송비
  discount: number;              // 할인 금액
  totalAmount: number;           // 최종 결제 금액
  currency: string;              // 통화 (KRW 기본)

  // === 결제 ===
  paymentStatus: PaymentStatus;
  paymentMethod?: string;        // 결제 수단
  paidAt?: Date;                 // 결제 완료 시점

  // === 주문 유형 ===
  orderType: OrderType;          // 'retail' | 'dropshipping' | 'b2b' | 'subscription'

  // === 상태 ===
  status: OrderStatus;

  // === 배송 정보 ===
  shippingAddress: ShippingAddress;

  // === 메타데이터 ===
  metadata?: Record<string, any>;

  // === 타임스탬프 ===
  createdAt: Date;
  updatedAt: Date;
}

// 결제 상태
enum PaymentStatus {
  PENDING = 'pending',           // 결제 대기
  PAID = 'paid',                 // 결제 완료
  FAILED = 'failed',             // 결제 실패
  REFUNDED = 'refunded',         // 환불 완료
  PARTIAL_REFUND = 'partial_refund', // 부분 환불
}

// 주문 유형
enum OrderType {
  RETAIL = 'retail',             // 일반 소매
  DROPSHIPPING = 'dropshipping', // 드랍쉬핑
  B2B = 'b2b',                   // B2B 거래
  SUBSCRIPTION = 'subscription', // 정기 구독
}

// 주문 상태
enum OrderStatus {
  CREATED = 'created',           // 주문 생성
  CONFIRMED = 'confirmed',       // 주문 확정
  PROCESSING = 'processing',     // 처리 중
  SHIPPED = 'shipped',           // 배송 시작
  DELIVERED = 'delivered',       // 배송 완료
  COMPLETED = 'completed',       // 주문 완료
  CANCELLED = 'cancelled',       // 주문 취소
}

// 배송 주소
interface ShippingAddress {
  recipientName: string;
  phone: string;
  zipCode: string;
  address1: string;
  address2?: string;
  memo?: string;
}
```

### 2.3 관련 Entity (Phase 2에서 생성)

| Entity | 설명 | 관계 |
|--------|------|------|
| `EcommerceOrder` | 주문 원장 | 1:N OrderItem |
| `EcommerceOrderItem` | 주문 상품 | N:1 Order |
| `EcommercePayment` | 결제 기록 | N:1 Order |

---

## 3. Dropshipping Core Order 관련 요소 전수 조사

### 3.1 현재 구조

#### Entities

| Entity | 파일 | 설명 |
|--------|------|------|
| `OrderRelay` | `entities/OrderRelay.entity.ts` | 주문 relay 엔티티 |
| `CommissionTransaction` | `entities/CommissionTransaction.entity.ts` | 수수료 트랜잭션 |
| `SettlementBatch` | `entities/SettlementBatch.entity.ts` | 정산 배치 |

#### OrderRelay 필드 분석

```
OrderRelay
├── id                  (PK)
├── listingId           (FK → SellerListing)
├── externalOrderId     (외부 채널 주문 ID) → [A] E-commerce로 이동
├── orderNumber         (내부 주문 번호) → [A] E-commerce로 이동
├── quantity            (수량)
├── unitPrice           (단가)
├── totalPrice          (총 금액) → [A] E-commerce로 이동
├── status              (relay 상태) → [B] 유지
├── shippingInfo        (배송 정보) → [A] E-commerce로 이동
├── customerInfo        (고객 정보) → [A] E-commerce로 이동
├── relayedAt           (relay 시점) → [B] 유지
├── confirmedAt         (확인 시점) → [B] 유지
├── shippedAt           (출고 시점) → [B] 유지
├── deliveredAt         (배송 완료 시점) → [B] 유지
└── metadata            (메타데이터)
```

#### Services

| Service | 파일 | 주요 메서드 |
|---------|------|-------------|
| `OrderRelayService` | `services/OrderRelayService.ts` | createOrder, relayToSupplier, confirmOrder, shipOrder, deliverOrder |

#### Controllers

| Controller | API 경로 |
|------------|----------|
| `OrdersController` | `/api/v1/dropshipping/core/orders` |

#### Events

| Event | 설명 |
|-------|------|
| `order.created` | 주문 생성 (→ E-commerce Core로 이동 검토) |
| `order.relay.dispatched` | 공급자 전달 완료 |
| `order.relay.fulfilled` | 배송 완료 |

### 3.2 책임 분류

#### [A] E-commerce Core 책임 (판매 사실)

| 구분 | 필드/개념 | 설명 |
|------|-----------|------|
| 주문 식별 | orderId, orderNumber | 주문 고유 식별자 |
| 당사자 | buyerId, sellerId | 구매자/판매자 정보 |
| 금액 | totalAmount, subtotal | 결제 금액 |
| 결제 | paymentStatus, paidAt | 결제 상태 |
| 배송지 | shippingAddress | 수령인, 주소 |
| 유형 | orderType | retail/dropshipping/b2b |
| 이벤트 | order.created | 주문 생성 이벤트 |

#### [B] Dropshipping Core 책임 (공급/정산 분기)

| 구분 | 필드/개념 | 설명 |
|------|-----------|------|
| Relay | OrderRelay.status | pending → relayed → confirmed → shipped → delivered |
| Relay | relayedAt, confirmedAt, shippedAt | 공급자 처리 타임스탬프 |
| 관계 | listingId, offerId | Seller Listing 참조 |
| 정산 | CommissionTransaction | 수수료 계산 |
| 정산 | SettlementBatch | 정산 배치 관리 |
| 이벤트 | order.relay.dispatched | 공급자 전달 이벤트 |
| 이벤트 | order.relay.fulfilled | 배송 완료 이벤트 |

---

## 4. 참조 구조 설계

### 4.1 핵심 원칙

**Dropshipping Order(OrderRelay)는 독립 Order가 아니라,
E-commerce Order를 참조하는 파생 엔티티**로 정의한다.

### 4.2 FK 구조 설계

```
┌─────────────────────────────────────────────────────────────┐
│                    E-commerce Core                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              EcommerceOrder (원장)                   │   │
│  │  - id (PK)                                          │   │
│  │  - orderNumber                                       │   │
│  │  - buyerId, sellerId                                │   │
│  │  - totalAmount, paymentStatus                       │   │
│  │  - orderType: 'dropshipping' | 'retail' | ...       │   │
│  │  - shippingAddress                                  │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                   │
└─────────────────────────┼───────────────────────────────────┘
                          │ ecommerceOrderId (FK)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Dropshipping Core                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              OrderRelay (파생)                       │   │
│  │  - id (PK)                                          │   │
│  │  - ecommerceOrderId (FK) ← NEW                      │   │
│  │  - listingId (FK → SellerListing)                   │   │
│  │  - relayStatus                                      │   │
│  │  - relayedAt, confirmedAt, shippedAt, deliveredAt  │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                   │
│  ┌──────────────────────┴──────────────────────────────┐   │
│  │           CommissionTransaction                      │   │
│  │  - orderRelayId (FK)                                │   │
│  │  - commissionAmount                                 │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 OrderRelay 수정 계획 (Phase 2)

```typescript
// 현재
@Entity('dropshipping_order_relays')
export class OrderRelay {
  @Column({ type: 'varchar', length: 255, nullable: true })
  externalOrderId?: string;  // 외부 채널 주문 ID (제거 예정)

  @Column({ type: 'varchar', length: 255 })
  orderNumber!: string;      // 내부 주문 번호 (제거 예정)

  @Column({ type: 'jsonb', nullable: true })
  shippingInfo?: Record<string, any>;  // E-commerce Order로 이동

  @Column({ type: 'jsonb', nullable: true })
  customerInfo?: Record<string, any>;  // E-commerce Order로 이동
}

// Phase 2 이후
@Entity('dropshipping_order_relays')
export class OrderRelay {
  @Column({ type: 'uuid' })
  ecommerceOrderId!: string;  // FK → EcommerceOrder (NEW)

  @ManyToOne(() => EcommerceOrder)
  @JoinColumn({ name: 'ecommerceOrderId' })
  ecommerceOrder?: EcommerceOrder;

  // relay 전용 필드만 유지
  @Column({ type: 'enum', enum: RelayStatus })
  relayStatus!: RelayStatus;

  // ... relayedAt, confirmedAt 등 유지
}
```

### 4.4 데이터 흐름 설계

```
[주문 발생]
    │
    ▼
┌─────────────────────────────────────────┐
│  1. E-commerce Core: EcommerceOrder 생성 │
│     - orderType: 'dropshipping'         │
│     - paymentStatus: 'pending' → 'paid' │
│     - Event: order.created              │
└───────────────────┬─────────────────────┘
                    │
                    ▼ (orderType === 'dropshipping')
┌─────────────────────────────────────────┐
│  2. Dropshipping Core: OrderRelay 생성   │
│     - ecommerceOrderId: FK              │
│     - listingId: FK                     │
│     - relayStatus: 'pending'            │
│     - Event: orderRelay.created         │
└───────────────────┬─────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│  3. Dropshipping Core: Supplier Relay    │
│     - relayStatus: 'relayed'            │
│     - Event: order.relay.dispatched     │
└───────────────────┬─────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│  4. 배송 완료                            │
│     - relayStatus: 'delivered'          │
│     - Event: order.relay.fulfilled      │
│     - Commission 계산, Settlement 처리   │
└─────────────────────────────────────────┘
```

---

## 5. Dropshipping Extension 진입 기준 재정의

### 5.1 현재 상태

현재 Dropshipping Extension(예: `dropshipping-cosmetics`)은
**OrderCreationContext**를 통해 주문 생성 시점에 검증을 수행한다.

```typescript
// 현재: Extension이 주문 생성 검증
interface OrderCreationContext {
  listing: SellerListing;
  orderData: Partial<OrderRelay>;
  buyerInfo?: { ... };
  productType?: string;
}
```

### 5.2 문제점

1. **판매 유형 판단 위치 불명확**: "드랍쉬핑 여부"를 Extension이 판단
2. **책임 혼재**: Extension이 판매 사실과 공급 분기를 모두 처리
3. **확장성 제한**: 새로운 판매 유형 추가 시 수정 범위 과다

### 5.3 재정의된 진입 기준

#### Service App (Cosmetics Store 등)

| 역할 | 설명 |
|------|------|
| **판매 유형 판단** | orderType 결정 (retail / dropshipping) |
| **E-commerce Order 생성 요청** | 판매 사실 기록 |
| **UI/UX** | 사용자 facing 기능 |

#### Dropshipping Extension (dropshipping-cosmetics 등)

| 역할 | 설명 |
|------|------|
| **공급자 선택 정책** | 상품 유형별 공급자 매칭 |
| **정산 정책** | 화장품 특화 수수료 정책 |
| **검증 정책** | 화장품 규제 검증 (validateOfferCreation 등) |

#### 책임 이동 요약

```
┌──────────────────────────────────────────────────────────────┐
│  현재 (Before)                                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Dropshipping Extension                                 ││
│  │  - 드랍쉬핑 여부 판단                                    ││
│  │  - 주문 생성                                            ││
│  │  - 공급자 선택                                          ││
│  │  - 정산 정책                                            ││
│  └─────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  이후 (After)                                                │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Service App (cosmetics-store 등)                       ││
│  │  - 판매 유형 판단 (orderType 결정)                       ││
│  │  - E-commerce Order 생성 요청                           ││
│  └─────────────────────────────────────────────────────────┘│
│                          │                                   │
│                          ▼ (orderType === 'dropshipping')    │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Dropshipping Extension                                 ││
│  │  - 공급자 선택 정책                                      ││
│  │  - 정산 정책                                            ││
│  └─────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

---

## 6. 이관 대상 필드/개념 리스트

### 6.1 OrderRelay → EcommerceOrder 이관

| 필드 | 현재 위치 | 이관 위치 | 설명 |
|------|-----------|-----------|------|
| `orderNumber` | OrderRelay | EcommerceOrder | 내부 주문 번호 |
| `externalOrderId` | OrderRelay | EcommerceOrder | 외부 채널 주문 ID |
| `totalPrice` | OrderRelay | EcommerceOrder.totalAmount | 결제 금액 |
| `shippingInfo` | OrderRelay | EcommerceOrder.shippingAddress | 배송 정보 |
| `customerInfo` | OrderRelay | EcommerceOrder (buyerId 참조) | 고객 정보 |

### 6.2 이벤트 재정의

| 이벤트 | 현재 발행 위치 | 변경 후 발행 위치 |
|--------|----------------|-------------------|
| `order.created` | Dropshipping Core | E-commerce Core |
| `order.relay.created` | (신규) | Dropshipping Core |
| `order.relay.dispatched` | Dropshipping Core | Dropshipping Core (유지) |
| `order.relay.fulfilled` | Dropshipping Core | Dropshipping Core (유지) |

### 6.3 OrderRelay 유지 필드

| 필드 | 설명 |
|------|------|
| `ecommerceOrderId` | FK → EcommerceOrder (NEW) |
| `listingId` | FK → SellerListing |
| `relayStatus` | relay 상태 |
| `relayedAt` | 공급자 전달 시점 |
| `confirmedAt` | 공급자 확인 시점 |
| `shippedAt` | 출고 시점 |
| `deliveredAt` | 배송 완료 시점 |
| `quantity`, `unitPrice` | 주문 상품 정보 (OrderItem 참조로 변경 검토) |

---

## 7. Phase 2 작업 예정 사항

### 7.1 Entity 생성

- [ ] `EcommerceOrder` Entity
- [ ] `EcommerceOrderItem` Entity
- [ ] `EcommercePayment` Entity

### 7.2 Migration

- [ ] `ecommerce_orders` 테이블 생성
- [ ] `ecommerce_order_items` 테이블 생성
- [ ] `dropshipping_order_relays` 테이블에 `ecommerceOrderId` 컬럼 추가
- [ ] 기존 OrderRelay 데이터 마이그레이션

### 7.3 Service 구현

- [ ] `EcommerceOrderService` 구현
- [ ] `OrderRelayService` 리팩토링 (ecommerceOrderId 참조)

### 7.4 API 변경

- [ ] `/api/v1/ecommerce/orders` 엔드포인트 추가
- [ ] `/api/v1/dropshipping/core/orders` 역할 조정

---

## 8. Definition of Done (Phase 1)

- [x] E-commerce Core Order 개념 정의 문서 존재
- [x] Dropshipping Core 책임 경계 문서화 완료
- [x] ecommerceOrderId 참조 구조 설계 완료
- [x] 서비스 Extension ↔ Dropshipping Core 진입 기준 명확화
- [x] 기능 동작 변경 없음

---

## 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|-----------|
| 2025-12-13 | 1.0.0 | Phase 1 설계 문서 최초 작성 |

---

*최종 업데이트: 2025-12-13*
