# IR-O4O-KPA-GROUPBUY-ARCHITECTURE-AUDIT-V1

> **KPA 공동구매 아키텍처 정밀 감사**
> 작성일: 2026-03-04
> 상태: READ-ONLY 조사 완료
> 목적: KPA 공동구매가 O4O Commerce 위에 올라간 서비스인지 확인

---

## 조사 배경

KPA 공동구매는 O4O 구조에서 **KPA ↔ Commerce가 연결되는 유일한 지점**이다.

설계 기준:
```
Neture (공급자) → Product → KPA 공동구매 → 약국 주문 → Store HUB
```

이 흐름이 실제 코드와 일치하는지 검증한다.

---

## Phase 1. 공동구매 상품 생성 구조

### 1.1 전용 패키지: groupbuy-yaksa

공동구매는 **독립 Extension 패키지**로 구현되어 있다.

```
packages/groupbuy-yaksa/
├── src/backend/
│   ├── entities/
│   │   ├── GroupbuyCampaign.ts      ← groupbuy_campaigns
│   │   ├── CampaignProduct.ts       ← campaign_products
│   │   ├── GroupbuyOrder.ts         ← groupbuy_orders
│   │   └── SupplierProfile.ts       ← groupbuy_supplier_profiles
│   ├── services/
│   │   ├── GroupbuyCampaignService.ts
│   │   ├── CampaignProductService.ts
│   │   └── GroupbuyOrderService.ts
│   └── routes/
│       └── groupbuy.routes.ts
├── src/manifest.ts
└── src/lifecycle/install.ts
```

### 1.2 상품 생성 흐름

```
1. Operator: POST /campaigns
   → GroupbuyCampaign(status='draft') 생성

2. Operator: POST /campaigns/:id/products
   → CampaignProduct 등록
   {
     productId      ← dropshipping-core Product (Neture 공급자 상품)
     supplierId     ← dropshipping-core Supplier
     groupPrice     ← 공동구매 협상가
     minTotalQuantity ← 최소 수량 (threshold)
     maxTotalQuantity ← 최대 수량 (cap, optional)
     startDate, endDate
   }

3. Operator: POST /campaigns/:id/activate
   → status = 'active' → 약국에 노출
```

### 1.3 CampaignProduct 엔티티 (핵심)

소스: `packages/groupbuy-yaksa/src/backend/entities/CampaignProduct.ts`

| 필드 | 타입 | 설명 |
|------|------|------|
| `campaignId` | UUID FK | 캠페인 참조 |
| `productId` | UUID | **dropshipping-core Product** 참조 |
| `supplierId` | UUID | **dropshipping-core Supplier** 참조 |
| `groupPrice` | decimal(12,2) | 공동구매 협상가 |
| `minTotalQuantity` | int | 최소 주문 수량 (threshold) |
| `maxTotalQuantity` | int? | 최대 주문 수량 |
| `orderedQuantity` | int | 현재 주문 수량 (denormalized) |
| `confirmedQuantity` | int | 확정 수량 (denormalized) |
| `status` | enum | `active` → `threshold_met` → `closed` |

### 1.4 organization_product_listings 연동

소스: `apps/api-server/src/routes/kpa/entities/organization-product-listing.entity.ts`

```sql
-- 공동구매 상품 목록 조회
SELECT * FROM organization_product_listings
WHERE service_key = 'kpa-groupbuy' AND is_active = true
```

| 필드 | 역할 |
|------|------|
| `service_key` | `'kpa-groupbuy'` — 공동구매 경계 마커 |
| `master_id` | ProductMaster FK (Neture 불변 상품) |
| `offer_id` | SupplierProductOffer FK (Neture 공급 조건) |
| `price` | KPA 소매가 (override 가능) |

**답변: 공동구매 상품은 Neture 공급자 상품(dropshipping-core Product)을 기반으로 생성된다.**

---

## Phase 2. 공동구매 주문 구조

### 2.1 2중 주문 모델

공동구매는 **자체 주문 테이블 + E-commerce 연결**의 2중 구조이다.

```
GroupbuyOrder (수량 기록)
  └── status: pending → confirmed → cancelled
  └── dropshippingOrderId → EcommerceOrder (실제 주문)
```

### 2.2 GroupbuyOrder 엔티티

소스: `packages/groupbuy-yaksa/src/backend/entities/GroupbuyOrder.ts`

| 필드 | 타입 | 설명 |
|------|------|------|
| `campaignId` | UUID FK | 캠페인 |
| `campaignProductId` | UUID FK | 상품 |
| `pharmacyId` | UUID | 주문 약국 (organization) |
| `supplierId` | UUID | 공급자 (denormalized) |
| `quantity` | int | 주문 수량 |
| `orderStatus` | enum | `pending` / `confirmed` / `cancelled` |
| `dropshippingOrderId` | UUID? | **E-commerce 연결점** |

**금액 필드 없음** — Work Order 제약으로 명시적 배제.

### 2.3 주문 생성 흐름

소스: `packages/groupbuy-yaksa/src/backend/services/GroupbuyOrderService.ts`

```
약국: POST /orders
  → 검증: 캠페인 active, 상품 open, 수량 유효, 조직 스코프 일치
  → TRANSACTION (SELECT FOR UPDATE on campaign_products)
  → GroupbuyOrder(status='pending', dropshippingOrderId=null) 생성
  → orderedQuantity += quantity (atomic)
  → participantCount += 1 (if new)
```

### 2.4 주문 확정 (E-commerce 연결)

```
Operator: POST /orders/:id/confirm
  → { dropshippingOrderId: "ecommerce_orders.id" }
  → GroupbuyOrder.status = 'confirmed'
  → GroupbuyOrder.dropshippingOrderId = 실제 E-commerce 주문 ID
  → confirmedQuantity += quantity
  → threshold 확인 → status = 'threshold_met' (자동)
```

### 2.5 E-commerce 주문에서의 격리

```sql
-- 공동구매 주문 통계 (kpa.routes.ts)
SELECT COUNT(*)::int, COALESCE(SUM(eo.totalAmount), 0)
FROM ecommerce_orders eo
WHERE eo.metadata->>'serviceKey' = 'kpa-groupbuy'
  AND eo.status = 'paid'
```

**답변: 주문은 `groupbuy_orders`(수량)와 `ecommerce_orders`(실제 결제, `metadata.serviceKey='kpa-groupbuy'`)에 저장된다.**

---

## Phase 3. 수량 집계 구조

### 3.1 3단계 수량 추적

소스: `packages/groupbuy-yaksa/src/backend/services/GroupbuyOrderService.ts` (lines 688-753)

| 레벨 | 필드 | 설명 |
|------|------|------|
| **CampaignProduct** | `orderedQuantity` | 전체 주문 수량 (pending + confirmed) |
| **CampaignProduct** | `confirmedQuantity` | 확정 수량 only |
| **GroupbuyCampaign** | `totalOrderedQuantity` | 캠페인 전체 주문 수량 |
| **GroupbuyCampaign** | `totalConfirmedQuantity` | 캠페인 전체 확정 수량 |
| **GroupbuyCampaign** | `participantCount` | 참여 약국 수 |

### 3.2 집계 SQL 패턴

```sql
-- 캠페인별 총 수량
SELECT SUM(order.quantity) as total
FROM groupbuy_orders order
WHERE order.campaignId = :campaignId
  AND order.orderStatus != 'cancelled'

-- 공급자별 수량
SELECT order.supplierId, SUM(order.quantity)
GROUP BY order.supplierId

-- 상품별 수량
SELECT product.productId, order.supplierId, SUM(order.quantity)
GROUP BY product.productId, order.supplierId
```

### 3.3 금액 집계: 의도적 배제

엔티티 주석에 명시:
- GroupbuyOrder: `"금액 필드 없음 (Work Order 제약)"`
- GroupbuyCampaign: `"금액/수수료 필드 없음 (Work Order 제약)"`
- CampaignProduct: `"수수료율 없음 (Work Order 제약)"`

**답변: 수량만 집계한다. 금액 집계는 의도적으로 배제되었으며, 금전 처리는 downstream(dropshipping-core/E-commerce Core)에 위임된다.**

---

## Phase 4. Store HUB 연결

### 4.1 Store HUB 컨트롤러 조사

| 컨트롤러 | 공동구매 참조 | 설명 |
|----------|:-----------:|------|
| `store-hub.controller.ts` | **X** | Products: Glycopharm/Cosmetics만 집계 |
| `store-events.controller.ts` | **X** | 프로모션/배너만 |
| `product-marketing.controller.ts` | **X** | QR/POP/Library/Signage만 |
| `store-channel-products.controller.ts` | **X** | B2C/KIOSK 채널만 |

### 4.2 유일한 연결: 프론트엔드 Cross-Navigation

소스: `services/web-kpa-society/src/pages/groupbuy/KpaGroupbuyPage.tsx` (line 136)

```tsx
// WO-O4O-GROUPBUY-IA-ALIGNMENT-V1
<Link to="/store/products?tab=kpa-groupbuy">
```

KPA 공동구매 페이지에서 Store 상품 페이지로의 **링크만** 존재한다.
Store HUB Overview/KPI에 공동구매 데이터는 포함되지 않는다.

### 4.3 격리 확인

| 구분 | Store HUB | KPA 공동구매 |
|------|-----------|-------------|
| 테이블 | `checkout_orders`, `organization_channels` | `groupbuy_campaigns`, `groupbuy_orders` |
| 인증 | `resolveStoreAccess()` (org-based) | `requireKpaScope('kpa:operator')` |
| 경로 | `/api/v1/store-hub/*` | `/api/v1/kpa/groupbuy-admin/*` |
| 캐시 | `cacheAside()` TTL 30s | `supplierStatsService` TTL 30min |

**답변: Store HUB와 공동구매는 프론트엔드 링크만 있고, 백엔드에서는 완전히 독립이다.**

---

## Phase 5. Neture 연결

### 5.1 상품 원천

```
Neture 공급자 시스템              KPA 공동구매
─────────────────────           ─────────────────
ProductMaster                   CampaignProduct
(MFDS 불변: barcode,            (campaignId, productId,
 regulatory, manufacturer)       supplierId, groupPrice,
        ↓                        minTotalQuantity)
SupplierProductOffer                    ↓
(분배정책, 승인,                  OrganizationProductListing
 가격 tier)                      (service_key='kpa-groupbuy',
        ↓                        master_id → ProductMaster,
NetureSupplier                    offer_id → SupplierProductOffer)
(공급자 계약)
```

### 5.2 연결 관계

| 항목 | 연결 | 설명 |
|------|------|------|
| `CampaignProduct.productId` | dropshipping-core Product | Neture 상품 간접 참조 |
| `CampaignProduct.supplierId` | dropshipping-core Supplier | Neture 공급자 간접 참조 |
| `OrganizationProductListing.master_id` | ProductMaster | Neture 불변 상품 직접 참조 |
| `OrganizationProductListing.offer_id` | SupplierProductOffer | Neture 공급 조건 직접 참조 |

### 5.3 판정

**공동구매 상품 = Neture 공급자 상품이다.**

- `CampaignProduct`는 dropshipping-core를 경유하여 Neture 상품을 참조
- `OrganizationProductListing`은 ProductMaster/SupplierProductOffer를 직접 참조
- KPA 독립 상품(Neture 무관)은 존재하지 않음

**답변: 공동구매 상품은 Neture 공급자 상품이다. KPA 독립 상품이 아니다.**

---

## Phase 6. 결제 구조

### 6.1 공동구매 자체 결제: 없음

GroupbuyOrder 엔티티에는 **price, amount, paymentStatus 필드가 없다**.

공동구매는 **수량 집계 + 확정 계층**이며, 결제 자체는 처리하지 않는다.

### 6.2 결제 위임 경로

```
GroupbuyOrder(status='pending')
  ↓ Operator: confirmOrder(dropshippingOrderId)
GroupbuyOrder(status='confirmed')
  ↓ dropshippingOrderId 링크
EcommerceOrder (E-commerce Core)
  ↓ metadata.serviceKey = 'kpa-groupbuy'
CheckoutService.createOrder()
  ↓
Toss PG (결제)
  ↓
CheckoutPayment (결제 기록)
```

### 6.3 E-commerce Core 결제 흐름

소스: `apps/api-server/src/services/checkout.service.ts`

```typescript
// createOrder() — 실제 주문 생성 (가격 포함)
{
  buyerId, sellerId, supplierId,
  items: [{ productId, quantity, unitPrice, subtotal }],
  totalAmount: subtotal + shippingFee - discount,
  metadata: { serviceKey: 'kpa-groupbuy', ... }
}

// completePayment() — Toss PG 결제 확인
{
  paymentKey, method, cardCompany, amount,
  status: 'SUCCESS' | 'FAILED' | 'REFUNDED'
}
```

### 6.4 OrderType

E-commerce Core에 `OrderType.GROUPBUY`는 **존재하지 않는다**.
공동구매 주문은 `OrderType.DROPSHIPPING`으로 처리되며, `metadata.serviceKey = 'kpa-groupbuy'`로 격리된다.

**답변: 공동구매 자체는 수량만 집계한다. 결제는 E-commerce Core(CheckoutService) + Toss PG를 통한 O4O 공통 결제이다.**

---

## Phase 7. UI 구조

### 7.1 약국 소유자 여정

| 단계 | 페이지 | 경로 | 파일 |
|------|--------|------|------|
| 1 | 공동구매 목록 | `/groupbuy` | `pages/groupbuy/KpaGroupbuyPage.tsx` |
| 2 | 상품 상세 | `/groupbuy/:id` | `pages/groupbuy/GroupbuyDetailPage.tsx` |
| 3 | 주문 | "주문하기" 버튼 | **현재 준비 중** (placeholder alert) |
| 4 | 참여 내역 | `/groupbuy/history` | `pages/groupbuy/GroupbuyHistoryPage.tsx` |
| 5 | Store 연동 | `/store/products?tab=kpa-groupbuy` | Cross-navigation 링크 |

### 7.2 운영자 여정

| 단계 | 페이지 | 경로 | 파일 |
|------|--------|------|------|
| 1 | 공동구매 관리 | `/intranet/groupbuy` | `pages/intranet/groupbuy/GroupbuyManagePage.tsx` |
| 2 | 상품 관리 | 동일 페이지 | 노출순서, 가시성 토글, 삭제 |
| 3 | 통계 조회 | 동일 페이지 (토글) | 총 주문, 참여자, 상품별 집계 |

### 7.3 접근 제어

```
약국 소유자: user.isStoreOwner === true → 주문 가능
비소유자: "매장 등록 후 참여 가능" 메시지
운영자: officer / chair / admin roles → 관리 대시보드
```

### 7.4 주문 위치

**현재 상태:**
- KPA 사이트(`/groupbuy/:id`)에서 "주문하기" 버튼 존재하나, **placeholder** (alert: "주문 기능은 준비 중입니다")
- Store HUB로의 cross-navigation 링크 존재 (`/store/products?tab=kpa-groupbuy`)

**답변: 주문은 KPA 사이트에서 이루어지며(미완성), Store HUB는 보조 경로이다.**

---

## 전체 구조도

```
┌─────────────────────────────────────────────────────────────────┐
│                    NETURE SUPPLIER SYSTEM                        │
│  NetureSupplier → SupplierProductOffer → ProductMaster          │
│  (공급자 계약)      (분배/가격 정책)        (MFDS 불변)           │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓ (productId, supplierId)
┌─────────────────────────────────────────────────────────────────┐
│                    KPA GROUPBUY (groupbuy-yaksa)                 │
│                                                                   │
│  GroupbuyCampaign ──→ CampaignProduct ──→ GroupbuyOrder          │
│  (draft→active→        (productId,          (pharmacyId,         │
│   closed→completed)     supplierId,          quantity,            │
│                         groupPrice,          status: pending      │
│                         minTotalQuantity)     → confirmed)        │
│                                                    │              │
│  수량만 추적. 금액 없음.                              │              │
└──────────────────────────────────────────────────────┼──────────┘
                                                       ↓
                                            dropshippingOrderId
                                                       ↓
┌─────────────────────────────────────────────────────────────────┐
│                    E-COMMERCE CORE                               │
│                                                                   │
│  EcommerceOrder (metadata.serviceKey = 'kpa-groupbuy')          │
│  ├── OrderType: DROPSHIPPING                                     │
│  ├── items: [{productId, quantity, unitPrice, subtotal}]        │
│  ├── totalAmount                                                 │
│  └── status: CREATED → PAID → SHIPPED → DELIVERED               │
│                    ↓                                              │
│  CheckoutPayment (Toss PG)                                       │
│  └── paymentKey, amount, method, status                          │
└─────────────────────────────────────────────────────────────────┘
                           ↓ (프론트엔드 링크만)
┌─────────────────────────────────────────────────────────────────┐
│                    STORE HUB                                     │
│  /store/products?tab=kpa-groupbuy (cross-navigation)            │
│  Store HUB Overview/KPI에는 공동구매 미포함                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 구조 판정

### 설계 기준 vs 실제 구현

| 설계 기준 | 실제 | 일치 |
|----------|------|:----:|
| KPA 공동구매 = 약사회 서비스 기능 | `groupbuy-yaksa` Extension 패키지 | **O** |
| 상품 = Neture 공급자 등록 | `CampaignProduct.productId` → dropshipping-core → Neture | **O** |
| 매장 = Store HUB | 프론트엔드 링크만 (백엔드 독립) | **PARTIAL** |
| 결제 = O4O 공통 결제 | `dropshippingOrderId` → E-commerce Core → Toss PG | **O** |

### 4대 질문 답변

| # | 질문 | 답변 |
|---|------|------|
| 1 | 공동구매 상품은 어디에서 생성되는가 | `groupbuy-yaksa` Extension, Neture 공급자 상품(dropshipping-core) 기반 |
| 2 | 공동구매 주문은 어디에 저장되는가 | `groupbuy_orders`(수량) + `ecommerce_orders`(결제, `metadata.serviceKey='kpa-groupbuy'`) |
| 3 | KPA 조직 화면은 왜 금액이 아닌 수량만 사용하는가 | Work Order 제약으로 의도적 배제. 금전 처리는 downstream(E-commerce Core)에 위임 |
| 4 | Store HUB와 공동구매 관계는 무엇인가 | 프론트엔드 cross-navigation 링크만 존재. 백엔드는 완전 독립 |

### 최종 판정: **SAFE**

```
KPA 공동구매는 O4O Commerce 위에 올라간 서비스인가?

→ YES.

정확한 구조:
  groupbuy-yaksa (수량 집계 Extension)
    ↓ dropshippingOrderId
  E-commerce Core (주문/결제)
    ↓ Toss PG
  CheckoutPayment (결제 확인)
```

**KPA 공동구매는 O4O E-commerce Core의 "수요 집계 오버레이(demand aggregation overlay)"이다.**

- 자체 결제 없음
- 자체 배송 없음
- 자체 정산 없음
- **수량 집계 + threshold 판단 + E-commerce 연결**이 전부

---

## 발견 사항

### G-1: 주문 UI 미완성

- `GroupbuyDetailPage.tsx`의 "주문하기" 버튼이 placeholder (alert)
- 실제 주문 플로우가 프론트엔드에서 완성되지 않음
- **영향:** 약국 소유자가 KPA 사이트에서 직접 주문 불가

### G-2: Store HUB KPI에 공동구매 미포함

- `store-hub.controller.ts` Overview에 Glycopharm/Cosmetics만 집계
- 공동구매 주문/수량은 Store HUB에 반영되지 않음
- **영향:** 약국 소유자가 Store HUB에서 공동구매 현황을 볼 수 없음

### G-3: OrderType.GROUPBUY 부재

- E-commerce Core에 GROUPBUY 전용 OrderType이 없음
- DROPSHIPPING으로 처리, metadata로 격리
- **영향:** 없음 (현재 구조에서 문제 없음). 향후 공동구매 전용 정책 필요 시 고려

### G-4: 조직 스코프 강제 (Phase 5.1 완료)

- `createOrder()`에 `userOrganizationId` 검증 적용됨
- Pessimistic locking으로 동시성 보호
- **영향:** 없음 (이미 해결됨). SAFE

### G-5: 운영자 통계 캐시

- `supplierStatsService` TTL 30분
- 실시간 집계가 아닌 캐시 기반
- **영향:** 운영자가 최신 데이터를 보려면 수동 새로고침 필요

---

## 핵심 파일 목록

| 영역 | 파일 | 역할 |
|------|------|------|
| **엔티티** | `packages/groupbuy-yaksa/src/backend/entities/GroupbuyCampaign.ts` | 캠페인 컨테이너 |
| **엔티티** | `packages/groupbuy-yaksa/src/backend/entities/CampaignProduct.ts` | 상품 등록 + threshold |
| **엔티티** | `packages/groupbuy-yaksa/src/backend/entities/GroupbuyOrder.ts` | 수량 기록 + E-commerce 연결 |
| **엔티티** | `packages/groupbuy-yaksa/src/backend/entities/SupplierProfile.ts` | 공급자 설정 |
| **서비스** | `packages/groupbuy-yaksa/src/backend/services/GroupbuyOrderService.ts` | 주문 생성/확정/취소/집계 |
| **라우트** | `packages/groupbuy-yaksa/src/backend/routes/groupbuy.routes.ts` | API 엔드포인트 |
| **KPA 통합** | `apps/api-server/src/routes/kpa/kpa.routes.ts` (lines 2351-2591) | KPA 라우터 마운트 |
| **운영자** | `apps/api-server/src/routes/kpa/controllers/groupbuy-operator.controller.ts` | 운영자 통계 |
| **상품 목록** | `apps/api-server/src/routes/kpa/entities/organization-product-listing.entity.ts` | service_key 격리 |
| **E-commerce** | `packages/ecommerce-core/src/entities/EcommerceOrder.entity.ts` | 실제 주문 |
| **결제** | `apps/api-server/src/services/checkout.service.ts` | Toss PG 연동 |
| **프론트: 목록** | `services/web-kpa-society/src/pages/groupbuy/KpaGroupbuyPage.tsx` | 공동구매 목록 |
| **프론트: 상세** | `services/web-kpa-society/src/pages/groupbuy/GroupbuyDetailPage.tsx` | 상품 상세 |
| **프론트: 관리** | `services/web-kpa-society/src/pages/intranet/groupbuy/GroupbuyManagePage.tsx` | 운영자 대시보드 |

---

## 결론

**KPA 공동구매는 O4O Commerce 위에 올라간 "수요 집계 서비스"이다.**

1. **상품:** Neture 공급자 상품 기반 (dropshipping-core 경유)
2. **주문:** 자체 수량 기록 → E-commerce Core 실제 주문 연결
3. **집계:** 수량 only (금액 의도적 배제)
4. **결제:** O4O 공통 결제 (CheckoutService + Toss PG) 위임
5. **Store HUB:** 프론트엔드 링크만 (백엔드 독립)

설계 기준 `Neture → Product → KPA 공동구매 → 약국 주문 → Store HUB` 흐름은 **Store HUB 연결 약함**을 제외하면 정확하다.

---

*IR-O4O-KPA-GROUPBUY-ARCHITECTURE-AUDIT-V1 조사 완료*
*다음 WO: G-1(주문 UI 완성), G-2(Store HUB KPI 통합) 검토 권장*
