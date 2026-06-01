# IR-O4O-ECOMMERCE-ORDERS-VS-CHECKOUT-ORDERS-SCHEMA-DIFF-V1

> **상태**: Read-only 조사 IR. 코드 / migration / DB / seed / route / menu / guard / safe-fallback / checkout transaction 변경 없음. 커밋·푸시는 사용자 확인 후.
> **선행 IR**: [IR-O4O-ECOMMERCE-ORDERS-TABLE-CROSSSERVICE-IMPACT-V1](IR-O4O-ECOMMERCE-ORDERS-TABLE-CROSSSERVICE-IMPACT-V1.md)
> **선행 완료 WO**: `WO-O4O-STORE-DASHBOARD-ORDER-METRICS-SAFE-FALLBACK-V1` (commit `8ccb79f55`) — `featureStatus: 'not_ready'` / `featureCode: 'ORDER_METRICS_NOT_READY'` 안전 분기. 사용자 노출 위험 1차 차단.
> **작성일**: 2026-05-31
> **범위**: legacy `ecommerce_orders` / `ecommerce_order_items` 참조 클러스터 (7 파일, 25 method) 를 canonical `checkout_orders` / `CheckoutOrder.items[]` JSONB 로 정렬 가능한지 정밀 비교.

---

## 1. 전체 판정

**판정: PARTIAL — 정렬 가능. 단순 치환 불가. 정책 결정 + 단계적 진행 필요.**

| 질문 | 답변 |
|---|---|
| `ecommerce_orders` → `checkout_orders` 정렬 가능한가? | **YES, 단계적으로.** canonical model 이 KPA / Neture 에서 이미 사용 중 (event-offer.service.ts:309-326 / kpa-checkout.controller.ts:442-450 검증). |
| 단순 치환만으로 충분한가? | **NO.** 25 method 중 9 (36%) 만 SIMPLE_RENAME. 나머지 16 는 QUERY_REWRITE / item-model jsonb_array_elements 재작성 / 정책 결정 / payment-transaction 제외. |
| 즉시 WO 가능한가? | **조건부 YES.** "정책 판정 → 대시보드 지표 정렬 → 결제 transaction 분리" 3-track 분할 권장. 사용자 의견대로 **하나의 통합 WO 가 아닌 분리** 권장. |
| `ecommerce_orders` CREATE TABLE 신규 생성? | **❌ 불권장.** 두 SSOT 병존은 drift 확대. canonical `checkout_orders` 기준 정렬이 philosophy 정합. |

### 핵심 결론 한 줄

> canonical `checkout_orders` 가 cross-service KPI 영역에서 이미 작동 중 (KPA event-offer + KPA checkout)이며, GlycoPharm / K-Cosmetics / Platform Admin 의 raw SQL 7 파일도 **`jsonb_array_elements(co.items)` 패턴 + `metadata->>'serviceKey'` 필터 + `status = 'paid'` 양성 predicate** 로 ~88% 재작성 가능. 단, `status != 'cancelled'` 단순 치환은 REFUNDED 포함 의미 변경 위험 + `store_id`/`sellerOrganizationId` 매핑 정책 결정 + 일부 item-level 정보 (sku/options) 정합 결정이 선행 필요.

---

## 2. 핵심 결론

| 항목 | 결론 |
|---|---|
| canonical `checkout_orders` 가 SSOT 로 충분한가? | **YES** (조건부) — KPA / KPA-checkout 영역에서 cross-service operational reference 검증됨 ([kpa/event-offer.service.ts:309-326](apps/api-server/src/routes/kpa/services/event-offer.service.ts#L309-L326), [kpa-checkout.controller.ts:442-450](apps/api-server/src/routes/kpa/controllers/kpa-checkout.controller.ts#L442-L450)). 단 store_id ↔ sellerOrganizationId 매핑 정책 + status 의미 정합 필요. |
| order item 모델이 있는가? | **JSONB embed.** `CheckoutOrder.items[]` JSONB array (productId / productName / quantity / unitPrice / subtotal). 별도 `checkout_order_items` 테이블 없음. **sku / options / per-item-status 컬럼 부재** → 일부 기능 (sku lookup, options parse) 즉시 치환 불가. JOIN 류 집계는 `CROSS JOIN jsonb_array_elements(co.items)` 패턴으로 재현 가능 (KPA 검증). |
| legacy query 의 몇 퍼센트가 치환 가능한가? | 25 method 기준 — **즉시 SIMPLE_RENAME 9 (36%)** + **JSONB 재작성 + status enum 정렬로 QUERY_REWRITE 11 (44%)** + **item-model item-level granularity gap 4 (16%, sku/options 등 — JSONB array 패턴으로 대부분 회피 가능, 실효 차단은 sku/options 직접 lookup 1-2건)** + **NEEDS_POLICY 1 (4%, action-queue status 의미)** + **DO_NOT_MIGRATE_YET 2 (8%, 결제 트랜잭션 FOR UPDATE)**. → 실용 치환 가능 ~88% (22/25). |
| 구조 정렬 전 반드시 필요한 정책 판단? | (1) **store_id → sellerOrganizationId 매핑 정책** (KPA 패턴 채택 가능). (2) **status 의미 정합** (legacy `status != 'cancelled'` ↔ canonical `status NOT IN ('cancelled','refunded')` + `paymentStatus = 'paid'`). (3) **action-queue active-orders 의미 재정의** (PENDING_PAYMENT 가 'active' 인가). (4) **sku/options/channel 정보 위치 결정** (metadata vs items JSONB vs 별도 보강). |

---

## 3. 테이블/컬럼 비교표

### 3-1. order-level (`ecommerce_orders` vs `checkout_orders`)

| Legacy 컬럼 | Canonical 컬럼 | 매핑 | 비고 |
|---|---|---|---|
| `id` (UUID) | `id` (UUID) | EXACT | |
| `"orderNumber"` (varchar) | `orderNumber` (varchar50) | EXACT | |
| `"sellerId"` (UUID/string) | `sellerId` (varchar100) | EXACT | KPA payment hook 이 동일 매핑 사용 ([GlycopharmPaymentEventHandler.ts:229](apps/api-server/src/services/glycopharm/GlycopharmPaymentEventHandler.ts#L229)) |
| `"totalAmount"` (decimal) | `totalAmount` (decimal12,2) | EXACT | |
| `status` (enum 10 values) | `status` (enum 5 values) | **SEMANTIC_DIFFERENT** | §4 status enum 비교 참조 |
| (none) | `paymentStatus` (enum 4) | MISSING_IN_LEGACY | canonical 가 order.status 와 payment.status 분리 — info gain |
| `"createdAt"` (timestamp) | `createdAt` (timestamp) | EXACT | |
| **`store_id` (UUID, polymorphic)** | (none direct) | **MISSING_IN_CHECKOUT** | **Critical gap.** canonical 은 `sellerOrganizationId` (UUID, nullable, indexed) — WO-CHECKOUT-ORG-BOUNDARY-FIX-V1 migration 으로 추가됨. legacy store_id 가 organization UUID 인 경우 1:1 매핑 가능. cosmetics_stores 의 store UUID 인 경우 추가 lookup 필요. |
| `metadata` (jsonb) | `metadata` (jsonb) | EXACT | 양쪽 모두 `metadata->>'serviceKey'` 필터 사용 가능 ✅ |
| `channel` (varchar50) | (none direct) | **MISSING_IN_CHECKOUT** | metadata.channel 로 위장 가능. legacy `getChannelBreakdown` 류 GROUP BY 영향. |
| (none) | `supplierId` (varchar100 NOT NULL) | MISSING_IN_LEGACY | Neture 공급자 attribution — legacy 미사용 |
| (none) | `sellerOrganizationId` (UUID, nullable, indexed) | MISSING_IN_LEGACY | canonical SSOT. store_id 대체 핵심. |
| (none) | `partnerId` (varchar100, nullable) | MISSING_IN_LEGACY | partner/affiliate 추적 |
| (none) | `paidAt` / `refundedAt` / `cancelledAt` (timestamps) | MISSING_IN_LEGACY | event markers — info gain |
| (none) | `shippingAddress` (jsonb structured) | MISSING_IN_LEGACY | |
| `"buyerId"` (UUID) | `buyerId` (UUID, indexed) | EXACT | KPA event-offer 가 사용 ([event-offer.service.ts:392-399](apps/api-server/src/routes/kpa/services/event-offer.service.ts#L392-L399)) |

### 3-2. item-level (`ecommerce_order_items` vs `CheckoutOrder.items[]`)

| Legacy 컬럼 | Canonical JSONB 필드 | 매핑 | 비고 |
|---|---|---|---|
| `id` (UUID PK) | (none — JSONB embed) | MISSING — implicit via parent | row-level PK 없음 |
| `"orderId"` (UUID FK) | (none — JSONB embed) | SEMANTIC_MATCH | parent order id 로 implicit |
| `"productId"` | `productId` | EXACT | KPA 가 `item->>'productId'` 로 access ([kpa-checkout.controller.ts:445](apps/api-server/src/routes/kpa/controllers/kpa-checkout.controller.ts#L445)) |
| `"productName"` | `productName` | EXACT | |
| `quantity` (int) | `quantity` (number) | EXACT | KPA 가 `(item->>'quantity')::int` 로 access |
| `"unitPrice"` (decimal) | `unitPrice` (number) | EXACT | precision 손실 (JSONB number) 잠재 위험 |
| `discount` (decimal) | (none) | **MISSING_IN_CHECKOUT** | per-item discount 표현 불가 |
| `subtotal` (decimal) | `subtotal` (number) | EXACT | |
| `sku` (varchar100) | (none) | **MISSING_IN_CHECKOUT** | SKU 기반 inventory / pricing 정합 불가 |
| `options` (jsonb) | (none) | **MISSING_IN_CHECKOUT** | 변형 옵션 (색상/사이즈 등) 표현 불가 |
| `status` (enum) | (none) | **MISSING_IN_CHECKOUT** | per-item 상태 (배송 진행/반품 등) 표현 불가 |
| `metadata` (jsonb) | (none) | **MISSING_IN_CHECKOUT** | per-item metadata 표현 불가 |
| `"createdAt"` / `"updatedAt"` | (none) | MISSING_IN_CHECKOUT | per-item audit 부재 |

### 3-3. 합계 / 정확도 / 일관성

- **totalAmount** 명명 일관 ✅ — 양쪽 동일.
- **createdAt** quoted 처리 양쪽 일관 (TypeORM camelCase quoted) ✅.
- **decimal precision**: order-level totalAmount 양쪽 `decimal(12,2)`. item-level JSONB number 는 IEEE 754 → 잠재 손실 위험 (정합성 우려).
- **인덱스**: canonical `sellerOrganizationId` / `buyerId` / `status` / `supplierId` indexed. legacy `store_id` indexed. cross-service bulk aggregation 시 `metadata->>'serviceKey'` 에 functional index 추가 권장.

### 3-4. Showstopper 컬럼 (counterpart 부재)

| 컬럼 | 위치 | 위험도 | 완화 경로 |
|---|---|---|---|
| `store_id` | adapter 4 파일 | **CRITICAL** | canonical `sellerOrganizationId` 로 매핑. **단**, legacy store_id 가 organization UUID 인지 cosmetics_stores UUID 인지 사전 audit 필요 |
| `channel` | cosmetics-store-summary.service:68, 125 | **HIGH** | `metadata->>'channel'` 로 마이그레이션 (양 모델 모두 metadata jsonb 보유) |
| `ecommerce_order_items.sku` | 직접 query 없음 (audit 기능에 필요) | MEDIUM | KPI 영역엔 비차단. inventory 정합 작업 시 추가. |
| `ecommerce_order_items.options` | 동일 | MEDIUM | KPI 영역 비차단 |
| `metadata->>'serviceKey'` 일관 주입 | 모든 file | **CRITICAL** | canonical `checkout_orders` 생성 시점에 metadata.serviceKey **반드시 주입** — 본 IR 시점 KPA 영역만 보장. GlycoPharm / K-Cosmetics 의 신규 주문 생성 경로 검증 필요. |

---

## 4. Status enum 비교

### 4-1. 양 모델의 status 정의

**Legacy `ecommerce_orders.status` (10 values)** (from `@o4o/ecommerce-core` `OrderStatus` enum):
```
CREATED / PENDING_PAYMENT / PAID / CONFIRMED / PROCESSING / SHIPPED / DELIVERED / COMPLETED / CANCELLED / REFUNDED
```

**Canonical `checkout_orders.status` (5 values)** ([CheckoutOrder.entity.ts:24-30](apps/api-server/src/entities/checkout/CheckoutOrder.entity.ts#L24-L30)):
```
CREATED / PENDING_PAYMENT / PAID / REFUNDED / CANCELLED
```

**Canonical `checkout_orders.paymentStatus` (4 values, 신규)**:
```
PENDING / PAID / FAILED / REFUNDED
```

### 4-2. legacy 의 검색·매핑

| 의도 | Legacy 리터럴 | Canonical 대응 | 매핑 |
|---|---|---|---|
| 주문 생성 직후 | `status = 'created'` | `status = 'created'` | 1:1 |
| 결제 대기 | (implicit `!= 'paid'`) | `status = 'pending_payment'` 또는 `paymentStatus = 'pending'` | 1:1 |
| 결제 완료 / 매출 인식 | `status = 'PAID'` (positive assertion) | `status = 'paid'` 또는 `paymentStatus = 'paid'` | 1:1 ✅ KPA event-offer 가 이미 사용 |
| 주문 확정 | `status = 'CONFIRMED'` | **부재** | unmapped — canonical 은 'paid' 후 곧장 fulfillment lifecycle 외부 |
| 처리·배송 중 | `status IN ('processing','shipped')` | **부재** | unmapped — canonical 은 fulfillment 단계 모델링 미수행 |
| 완료 | `status = 'completed'` | (effectively `paid` + no refund) | unmapped → policy decision |
| 취소 | `status = 'cancelled'` | `status = 'cancelled'` | 1:1 |
| 환불 | `status = 'refunded'` | `status = 'refunded'` 또는 `paymentStatus = 'refunded'` | 1:1 |
| 결제 실패 | (implicit) | `paymentStatus = 'failed'` | info gain (legacy 미수용) |
| 만료 (TTL) | (implicit cleanup query) | `status = 'created'` + age > 15min → `cancelled` 전이 | 1:1 |

### 4-3. **위험한 단순 치환 — `status != 'cancelled'`**

legacy 빈번한 패턴 (5+ 곳):
```sql
WHERE status != 'cancelled'
```

canonical 에 단순 치환 시 — 결과 set 에 **REFUNDED 포함됨** (실제 매출에서 빠져야 함). 추가로 **PENDING_PAYMENT 도 포함됨** (아직 결제 안 됨).

**Canonical safe predicate**:
```sql
-- 옵션 1: 양성 assertion (KPA 패턴)
WHERE status = 'paid'

-- 옵션 2: 음성 assertion 정밀화
WHERE status NOT IN ('cancelled', 'refunded')
  AND paymentStatus = 'paid'
```

**KPA reference 검증**: kpa/event-offer.service.ts:319 / 325 모두 `status = 'paid'` (양성 assertion) — **음성 assertion 회피 패턴 확립됨**.

### 4-4. action-queue `status IN ('pending', 'processing')`

[cosmetics action-definitions.ts:20-23](apps/api-server/src/routes/cosmetics/action-definitions.ts#L20-L23):
```sql
SELECT COUNT(*) FROM ecommerce_orders
WHERE service_key = 'cosmetics' AND status IN ('pending', 'processing')
```

- `'pending'` ≠ canonical `'pending_payment'`. 의미 같다고 가정 가능.
- `'processing'` 은 canonical 에 **부재**. legacy 의 "결제 완료 후 처리 중" 단계가 canonical 에서는 `paid` 안에 흡수됨.
- **NEEDS_POLICY**: K-Cosmetics action-queue 의 "active orders" 정의가 "결제 완료 후 미발송" 인가 / "처리 대기 전반" 인가 결정 필요.

### 4-5. FOR UPDATE locking — 결제 트랜잭션 영역

[glycopharm checkout.controller.ts:487-495](apps/api-server/src/routes/glycopharm/controllers/checkout.controller.ts#L487-L495) (legacy):
```sql
SELECT SUM(oi.quantity)::int
FROM ecommerce_order_items oi
JOIN ecommerce_orders o ON o.id = oi."orderId"
WHERE oi."productId" = $1 AND o."sellerId" = $2 AND o.status = 'PAID'
FOR UPDATE OF o
```

[kpa-checkout.controller.ts:442-450](apps/api-server/src/routes/kpa/controllers/kpa-checkout.controller.ts#L442-L450) (canonical reference):
```sql
SELECT SUM((item->>'quantity')::int)::int
FROM checkout_orders co
CROSS JOIN jsonb_array_elements(co.items) AS item
WHERE item->>'productId' = $1 AND co."sellerId" = $2
  AND co.status = 'paid' AND co.metadata->>'serviceKey' IN ('kpa-society', 'kpa')
FOR UPDATE OF co
```

→ **canonical 패턴 검증됨**. 단, 본 WO 의 **명시 제외 영역** (결제 트랜잭션). 본 IR 의 schema diff 범위 외, 별도 결제 정렬 WO 의 대상.

### 4-6. Showstopper status semantics

1. **`status != 'cancelled'` 단순 치환 금지** — REFUNDED 포함 위험.
2. **paymentStatus vs status 이중 추적**: canonical 이 `status='paid'` ∧ `paymentStatus='failed'` (error recovery edge case) 시 invariant 위반 가능. **모든 KPI predicate 는 양쪽 동시 검사 권장** 또는 invariant 문서화.
3. **fulfillment lifecycle 모델링 부재**: legacy CONFIRMED / PROCESSING / SHIPPED / DELIVERED 가 canonical 에 없음. 본 IR 는 미사용으로 추정하나, fulfillment 도메인 도입 시 사전 schema 보강 필요.

---

## 5. order item 모델 비교

| 비교 | Legacy | Canonical |
|---|---|---|
| 저장 방식 | 별도 테이블 `ecommerce_order_items` | JSONB array `CheckoutOrder.items[]` |
| PK | UUID per row | (none — parent FK 통해 implicit) |
| FK to order | `"orderId"` UUID | (none — embed) |
| GROUP BY product | `GROUP BY "productId", "productName"` 직접 가능 | `CROSS JOIN jsonb_array_elements(co.items)` + `GROUP BY item->>'productId', item->>'productName'` 가능 (KPA 검증) |
| sku | `sku` column | **부재** |
| options | `options` jsonb column | **부재** |
| status (per-item) | `status` enum | **부재** |
| metadata (per-item) | `metadata` jsonb | **부재** |
| FOR UPDATE | row-level lock 가능 | parent row lock + jsonb scan |
| 즉시 치환 가능? | — | **부분 가능** — 집계/sum/count 류는 JSONB 재작성으로 가능. sku/options 직접 lookup 류는 불가. |

### 5-1. `getTopProducts` 류 검증

GlycoPharm + Cosmetics 의 `getTopProducts` ([glycopharm-store-data.adapter.ts:83-108](apps/api-server/src/routes/glycopharm/services/glycopharm-store-data.adapter.ts#L83-L108)):
```sql
SELECT oi."productId", oi."productName",
       SUM(oi.quantity)::int as quantity,
       SUM(oi.subtotal)::numeric as revenue
FROM ecommerce_order_items oi
INNER JOIN ecommerce_orders o ON o.id = oi."orderId"
WHERE o.store_id = $1 AND o.metadata->>'serviceKey' = 'glycopharm'
  AND o."createdAt" >= $2 AND o.status != 'cancelled'
GROUP BY oi."productId", oi."productName"
ORDER BY revenue DESC LIMIT $3
```

**Canonical 재작성** (KPA 의 `event-offer.service.ts:392-399` 패턴 mirror):
```sql
SELECT item->>'productId' AS "productId",
       item->>'productName' AS "productName",
       SUM((item->>'quantity')::int)::int as quantity,
       SUM((item->>'subtotal')::numeric)::numeric as revenue
FROM checkout_orders co
CROSS JOIN jsonb_array_elements(co.items) AS item
WHERE co."sellerOrganizationId" = $1
  AND co.metadata->>'serviceKey' = 'glycopharm'
  AND co."createdAt" >= $2 AND co.status = 'paid'
GROUP BY item->>'productId', item->>'productName'
ORDER BY revenue DESC LIMIT $3
```

→ **QUERY_REWRITE 가능** (NEEDS_NEW_ITEM_MODEL 격하). 다만:
- `store_id` → `sellerOrganizationId` 매핑 정책 결정 후
- `status != 'cancelled'` → `status = 'paid'` 의미 정정 후

---

## 6. serviceKey / store / organization 연결 비교

### 6-1. legacy 의 스코핑 패턴

| Service | legacy 스코프 | reference |
|---|---|---|
| GlycoPharm | `store_id = $1 AND metadata->>'serviceKey' = 'glycopharm'` | [glycopharm-store-data.adapter.ts:40-41](apps/api-server/src/routes/glycopharm/services/glycopharm-store-data.adapter.ts#L40-L41) |
| K-Cosmetics | `store_id = $1 AND metadata->>'serviceKey' = 'cosmetics'` | [cosmetics-store-summary.service.ts:53-54](apps/api-server/src/routes/cosmetics/services/cosmetics-store-summary.service.ts#L53-L54) |
| K-Cosmetics action queue | `service_key = 'cosmetics'` (별도 column?) | [action-definitions.ts:22](apps/api-server/src/routes/cosmetics/action-definitions.ts#L22) — **불일치**: `metadata->>'serviceKey'` 가 아닌 `service_key` 평문 column 가정. legacy ecommerce_orders entity 의 `service_key` column 존재 여부 미검증. |
| Platform — cosmetics bulk | `store_id IN (SELECT id FROM cosmetics.cosmetics_stores)` | [store-network.service.ts:159-167](apps/api-server/src/routes/platform/store-network.service.ts#L159-L167) |
| Platform — glycopharm bulk | `store_id IN (SELECT o.id FROM organizations o JOIN organization_service_enrollments ose ...)` | [store-network.service.ts:185-194](apps/api-server/src/routes/platform/store-network.service.ts#L185-L194) |
| Platform — physical store | `INNER JOIN physical_store_links psl ON psl.service_store_id = o.store_id` | [physical-store.service.ts:192-272](apps/api-server/src/routes/platform/physical-store.service.ts#L192-L272) |

### 6-2. canonical 의 스코핑 패턴

| 식별자 | 컬럼 | 사용처 | 비고 |
|---|---|---|---|
| service | `metadata->>'serviceKey'` (JSONB path) | KPA event-offer / KPA checkout / GlycoPharm new orders | functional index 미설치 — bulk aggregation 시 추가 권장 |
| store / organization | `sellerOrganizationId` (UUID, nullable, indexed) | KPA event-offer / KPA checkout | WO-CHECKOUT-ORG-BOUNDARY-FIX-V1 으로 추가됨 |
| buyer | `buyerId` (UUID, indexed) | KPA / GlycoPharm 신규 주문 | |
| supplier | `supplierId` (varchar100 NOT NULL) | Neture 공급자 attribution | |
| seller | `sellerId` (varchar100) | GlycoPharm payment hook 가 매핑 사용 | |

### 6-3. 서비스별 사용 매트릭스

| Service | uses `checkout_orders`? | uses `ecommerce_orders`? | scoping column on checkout | translation from legacy |
|---|:---:|:---:|---|---|
| **KPA-Society** | ✅ (event-offer.service.ts + kpa-checkout.controller.ts) | ❌ | `metadata->>'serviceKey'` ∈ `{'kpa', 'kpa-society'}` + `sellerOrganizationId` | canonical reference baseline |
| **GlycoPharm** | ⚠️ partial (신규 checkout 경로) | ✅ (KPI / payment hook / FOR UPDATE) | `metadata->>'serviceKey' = 'glycopharm'` + `sellerOrganizationId` | store_id (organization UUID 가정) → sellerOrganizationId 직접 매핑 가능 (검증 필요) |
| **K-Cosmetics** | ⚠️ partial (Event Offer 영역) | ✅ (operator/dashboard + action queue) | `metadata->>'serviceKey' ∈ {'cosmetics', 'k-cosmetics-event-offer'}` | store_id (cosmetics_stores UUID) → 정책 결정 필요. 옵션 (a) cosmetics_stores.organization_id 를 sellerOrganizationId 로 보강 + (b) cosmetics_stores 자체 UUID 를 metadata.storeId 로 보존. |
| **Neture** | ❌ (`neture_orders` 별도 스키마 사용) | ❌ | (사용 안 함) | 영향 없음 — Neture 는 자체 supplier-direct workflow 보유 |
| **Platform Admin (network/physical)** | ❌ (legacy 만 사용) | ✅ | (canonical 전환 가능) `metadata->>'serviceKey'` IN list-based bulk aggregation | 본 IR 의 정렬 후 functional index 추가 권장 |

### 6-4. cross-service bulk aggregation 의 transition path

legacy ([store-network.service.ts:117-124](apps/api-server/src/routes/platform/store-network.service.ts#L117-L124)):
```sql
SELECT COUNT(*), SUM("totalAmount")
FROM ecommerce_orders
WHERE store_id IN (SELECT id FROM cosmetics.cosmetics_stores)
  AND "createdAt" >= $1 AND status != 'cancelled'
```

canonical 재작성:
```sql
SELECT COUNT(*), SUM("totalAmount")
FROM checkout_orders
WHERE metadata->>'serviceKey' = 'cosmetics'
  AND "createdAt" >= $1 AND status = 'paid'
```

→ **시각적으로 더 단순**. subquery JOIN 제거. 다만 service-level functional index 부재 → 대규모 데이터에서 sequential scan 위험. **migration 시점에 `CREATE INDEX idx_checkout_orders_servicekey_status_createdat ON checkout_orders ((metadata->>'serviceKey'), status, "createdAt")` 권장**.

---

## 7. Legacy raw SQL 7 파일별 치환 가능성

### 7-1. 종합 매트릭스

| Service | File | Methods | SIMPLE_RENAME | QUERY_REWRITE | NEEDS_NEW_ITEM_MODEL | NEEDS_POLICY | DO_NOT_MIGRATE_YET |
|---|---|:-:|:-:|:-:|:-:|:-:|:-:|
| GlycoPharm | glycopharm-store-data.adapter.ts | 6 | 4 | — | 1 (getTopProducts → JSONB) | — | — |
| K-Cosmetics | cosmetics-store-summary.service.ts | 7 | 5 | 1 (getAdminSummary status set) | 1 (getTopProducts → JSONB) | — | — |
| Platform | store-network.service.ts | 6 | — | 6 (subquery / status enum) | — | — | — |
| Platform | physical-store.service.ts | 3 | — | 3 (physical_store_links 의존) | — | — | — |
| K-Cosmetics | action-definitions.ts | 1 | — | 1 (status set) | — | 1 (active definition) | — |
| GlycoPharm | GlycopharmPaymentEventHandler.ts | 1 | — | — | 1 (validateSalesLimit → JSONB) | — | 1 (결제 hook) |
| GlycoPharm | checkout.controller.ts | 1 | — | — | 1 (FOR UPDATE JSONB) | — | 1 (결제 트랜잭션) |
| **TOTAL** | **7 파일** | **25** | **9** | **11** | **4** | **1** | **2** |

### 7-2. 비율 요약

- **즉시 SIMPLE_RENAME**: 9 / 25 = **36%** (`getOrderStats`, `getRecentOrders`, `getTotalOrderCount`, `getRevenueBetween`, `getChannelBreakdown`) — GlycoPharm + Cosmetics 의 기본 SUM/COUNT/ORDER 메서드
- **QUERY_REWRITE (정책 결정 후 가능)**: 11 / 25 = **44%** — Platform Admin 의 cross-service subquery + status enum 정렬 + action-queue status set 정합
- **NEEDS_NEW_ITEM_MODEL (사실상 QUERY_REWRITE 격하 가능)**: 4 / 25 = 16% — `getTopProducts` × 2 + payment-hook + checkout FOR UPDATE. JSONB `jsonb_array_elements` 패턴 (KPA 검증) 으로 재작성 가능. 단 결제 트랜잭션 2 건은 본 WO 명시 제외.
- **NEEDS_POLICY**: 1 / 25 = 4% — action queue active orders 정의
- **DO_NOT_MIGRATE_YET (결제 트랜잭션)**: 2 / 25 = 8% — payment hook + checkout FOR UPDATE

**실용 치환 가능률**: 22 / 25 = **88%** (DO_NOT_MIGRATE_YET 2건 제외).

### 7-3. Track 별 분할 권장

**Track A — 대시보드 지표 정렬 WO (안전, 단기)**
- 대상: GlycoPharm adapter + Cosmetics service + Platform network/physical (KPI 영역)
- 18 method (9 SIMPLE + 6 QUERY-platform + 3 item-JSONB rewrite)
- 전제: store_id → sellerOrganizationId 매핑 정책 + status 의미 정합 사전 합의

**Track B — Action queue 정책 + 작은 정합 (정책 IR 후)**
- 대상: K-Cosmetics action-definitions.ts (1 method)
- 전제: "active orders" 의미 결정 (`paymentStatus='paid' AND no shipping confirmed` 등)

**Track C — 결제 트랜잭션 정렬 (별도, 위험)**
- 대상: payment hook + checkout FOR UPDATE (2 method)
- 전제: Track A 완료 후 / 결제 흐름 hardening 별도 WO

---

## 8. canonical reference 분석

### 8-1. KPA-Society — 기준 reference

**`event-offer.service.ts:309-326`** ([file ref](apps/api-server/src/routes/kpa/services/event-offer.service.ts#L309-L326)):
```typescript
const result = await ds.query(`
  SELECT COUNT(*)::int AS "totalOrders",
         COALESCE(SUM("totalAmount"), 0)::numeric AS "totalRevenue",
         COALESCE(SUM(
           (SELECT COALESCE(SUM((elem->>'quantity')::int), 0)
            FROM jsonb_array_elements(items) AS elem)
         ), 0)::int AS "totalQuantity"
  FROM checkout_orders
  WHERE metadata->>'serviceKey' = $1 AND status = 'paid'
`, [serviceKey]);
```

**검증 포인트**:
- `metadata->>'serviceKey'` 패턴 ✅
- `status = 'paid'` 양성 assertion ✅
- `jsonb_array_elements(items)` 패턴 ✅ — item-level GROUP BY 가능 증명

### 8-2. KPA Checkout — FOR UPDATE 패턴 검증

[kpa-checkout.controller.ts:442-450](apps/api-server/src/routes/kpa/controllers/kpa-checkout.controller.ts#L442-L450):
```typescript
const [{ sold }] = await txManager.query(`
  SELECT COALESCE(SUM((item->>'quantity')::int), 0)::int AS sold
  FROM checkout_orders co, jsonb_array_elements(co.items) AS item
  WHERE item->>'productId' = $1 AND co."sellerId" = $2
    AND co.status = 'paid' AND co.metadata->>'serviceKey' IN ('kpa-society', 'kpa')
  FOR UPDATE OF co
`, [productId, sellerId]);
```

**검증**:
- `FOR UPDATE` row-level lock 가능 ✅
- `jsonb_array_elements` + `WHERE item->>'productId'` 인덱싱 없음 (sequential scan in array) → 단일 주문 단위 lock 시 OK / 대규모 시 인덱스 보강 검토
- Track C (결제 트랜잭션) 의 reference 로 활용

### 8-3. Neture — 영향 없음

`neture_orders` 별도 스키마 사용. supplier-direct workflow. 본 IR 의 cross-service 정렬에 미포함. 현 시점 영향 없음.

### 8-4. Event Offer (cross-service) — 패턴 일관

KPA Event Offer 서비스가 `checkout_orders` 단일 SSOT 로 cross-service 주문 흐름 처리 중. K-Cosmetics 의 `k-cosmetics-event-offer` 도 동일 SSOT 사용. 이미 cross-service 정렬된 영역.

### 8-5. 재사용 가능 패턴 정리

| 패턴 | 위치 | 재사용 대상 |
|---|---|---|
| `metadata->>'serviceKey'` filter | KPA 전반 | 5 raw-SQL 파일 (Glyco adapter / Cosmetics service / Platform network / Platform physical / Cosmetics action queue) |
| `status = 'paid'` 양성 assertion | KPA event-offer | 모든 매출 인식 query (`status != 'cancelled'` 치환 대신) |
| `jsonb_array_elements(co.items)` GROUP BY | KPA event-offer + KPA checkout | `getTopProducts` × 2 + `validateSalesLimit` (Track C 후) |
| `FOR UPDATE OF co` row lock | KPA checkout | GlycoPharm `validateSalesLimit` + checkout (Track C) |
| `sellerOrganizationId` UUID indexed 조회 | KPA checkout 생성 | GlycoPharm + Cosmetics 의 store-scope KPI |

---

## 9. 후속 작업 권장안

### 9-A. 즉시 가능한 WO (Track A)

**`WO-O4O-STORE-KPI-DASHBOARD-CHECKOUT-ORDERS-ALIGNMENT-V1`** (가칭)

- **대상**: GlycoPharm `glycopharm-store-data.adapter.ts` (6 method) + Cosmetics `cosmetics-store-summary.service.ts` (7 method) + Platform `store-network.service.ts` (6 method) + Platform `physical-store.service.ts` (3 method) — 총 **22 method**.
- **전제**: §3-4, §4-3 의 정책 사전 결정 (store_id → sellerOrganizationId / status 의미 정합 / metadata.serviceKey 신규 주문 주입 보장).
- **safe-fallback 보존**: 본 WO 진행 중에도 controller-layer `isMissingOrderTable` 가드 유지. 단계적 전환 시 ecommerce_orders 가 존재 안 함 → checkout_orders rewrite 후엔 fallback 분기 미진입. fallback 코드 제거는 별도 cleanup WO.
- **PR 분할 권장**:
  - PR-1: helper 함수 (`scopeByServiceKey`, `sellerOrgFromLegacyStoreId`) 추가 + GlycoPharm adapter 6 method
  - PR-2: Cosmetics service 7 method
  - PR-3: Platform network + physical 9 method + functional index migration

### 9-B. schema / 모델 보강이 필요한 WO

**`WO-O4O-CHECKOUT-ORDERS-SERVICEKEY-FUNCTIONAL-INDEX-V1`** (가칭)

- 대상: `CREATE INDEX idx_checkout_orders_servicekey_status_createdat ON checkout_orders ((metadata->>'serviceKey'), status, "createdAt")` 마이그레이션.
- 효과: bulk aggregation (Platform Admin / cross-service) 의 sequential scan → index scan 변환.
- Track A 의 PR-3 와 동시 또는 직전 진행 권장.

**`WO-O4O-ACTION-QUEUE-COSMETICS-ACTIVE-ORDERS-POLICY-V1`** (가칭) — Track B

- 대상: K-Cosmetics action-queue `active-orders` 정의 + cosmetics action-definitions.ts query rewrite.
- 전제: NEEDS_POLICY 결정 ("active" = `paymentStatus='paid' AND no fulfillment confirmed`).

### 9-C. 보류 영역 (Track C 별도)

- GlycoPharm `GlycopharmPaymentEventHandler.validateSalesLimit`
- GlycoPharm `checkout.controller.ts` FOR UPDATE sales_limit
- 결제 / 환불 / 정산 흐름 — 본 IR 명시 제외. KPA `kpa-checkout.controller.ts:442-450` 패턴 mirror 가 reference. 별도 결제 hardening WO 필요.

### 9-D. 문서 / 메모 정정

- ✅ **이미 처리됨**: `memory/MEMORY.md` 의 "Production Missing Tables" 메모 정정 (선행 WO 8ccb79f55 동봉).
- **추가 권장**: `CLAUDE.md §4 E-commerce Core 규칙` 또는 별도 baseline 문서에 "주문 SSOT = `checkout_orders` (canonical). `ecommerce_orders` 신규 생성 금지." 명시.
- Track A 완료 시점에 IR-O4O-ECOMMERCE-ORDERS-TABLE-CROSSSERVICE-IMPACT-V1 / 본 IR 의 status 갱신 ("RESOLVED" / "ARCHIVED").

---

## 10. Current Structure vs O4O Philosophy Conflict Check

### 10-1. 매장 실행 중심 (PHILOSOPHY §3.3)

⚠️ **부분 충돌**. 주문/매출이 매장 실행의 핵심 capability 임에도 두 SSOT (`ecommerce_orders` 미존재 + `checkout_orders` canonical) 가 코드 베이스에 분리 잔존. 매장 경영자가 자기 매장 거래 흐름 본 시점 (safe-fallback "준비 중" 표시) — Track A 진행으로 정렬 가능.

### 10-2. Store 기준 capability (PHILOSOPHY §5)

⚠️ **충돌**. legacy code 가 `store_id` 직접 컬럼 + service-specific subquery 로 매장 격리 — canonical 의 `sellerOrganizationId` SSOT 와 분기. Track A 가 이를 정렬.

### 10-3. 데이터 SSOT 분산 금지

❌ **명백한 충돌**. 동일 도메인 (주문) 의 두 모델 (`ecommerce_orders` / `checkout_orders`) 가 service-by-service 분기. canonical 이 `checkout_orders` 임이 KPA 영역에서 검증되었으나 정렬 미완료. **본 IR 의 핵심 정렬 대상**.

### 10-4. 사용자가 보는 지표 — 실제 vs 준비 중 명확

✅ **선행 WO 로 해소**. 현재 safe-fallback (`featureStatus: 'not_ready'`) 으로 정상 표기 중. Track A 완료 후 `featureStatus: 'ready'` 로 전환 가능.

### 10-5. 공통 capability — UI + API + 데이터 + 운영 흐름

⚠️ **부분 충돌**. UI / API 영역은 safe-fallback WO 로 정렬됨. **데이터 / 운영 흐름** 은 본 IR 의 Track A 대상.

### 10-6. 최소 수정 정렬 방향

| 단기 (Track A) | 중기 (Track B + C) |
|---|---|
| GlycoPharm + Cosmetics + Platform 의 KPI raw-SQL 22 method 정렬 | action queue 의미 결정 + 결제 트랜잭션 (validateSalesLimit / FOR UPDATE) 정렬 |
| 결제 트랜잭션 / payment hook 정렬 미수반 | KPA `kpa-checkout.controller.ts:442-450` 패턴 mirror |
| canonical `checkout_orders` + `sellerOrganizationId` + `metadata->>'serviceKey'` SSOT 기준 | 결제 흐름 hardening — 별도 WO |

### 10-7. 충돌 요약

| 원칙 | 충돌 | 정렬 경로 |
|---|---|---|
| 매장 실행 중심 | ⚠️ 부분 | Track A |
| Store 기준 capability | ⚠️ | Track A |
| **데이터 SSOT 분산 금지** | ❌ **명백** | Track A + B + C |
| 사용자 노출 신호 명확성 | ✅ 해소 | (safe-fallback WO 완료) |
| 공통 capability 정렬 (전 layer) | ⚠️ 부분 | Track A + B + C |

---

## 부록 A. 조사 시점 main HEAD 기준

```
8ccb79f55 feat(store): order metrics safe-fallback for missing ecommerce_orders  ← 직전 선행 WO
6beabab22 (preceding commits)
cafe2aa31 docs: add ecommerce orders cross-service impact audit  ← 직전 선행 IR
52d95f317 Revert ...
b18858252 refactor(api-server): WO-O4O-API-SERVER-AUTH-GLUCOSEVIEW-RESIDUE-CLEANUP-V1
```

## 부록 B. 핵심 파일 인덱스

### Legacy raw-SQL 7 파일 (재인용)
| # | 파일 |
|---|---|
| 1 | [apps/api-server/src/routes/glycopharm/services/glycopharm-store-data.adapter.ts](apps/api-server/src/routes/glycopharm/services/glycopharm-store-data.adapter.ts) |
| 2 | [apps/api-server/src/routes/cosmetics/services/cosmetics-store-summary.service.ts](apps/api-server/src/routes/cosmetics/services/cosmetics-store-summary.service.ts) |
| 3 | [apps/api-server/src/services/glycopharm/GlycopharmPaymentEventHandler.ts](apps/api-server/src/services/glycopharm/GlycopharmPaymentEventHandler.ts) |
| 4 | [apps/api-server/src/routes/platform/store-network.service.ts](apps/api-server/src/routes/platform/store-network.service.ts) |
| 5 | [apps/api-server/src/routes/platform/physical-store.service.ts](apps/api-server/src/routes/platform/physical-store.service.ts) |
| 6 | [apps/api-server/src/routes/cosmetics/action-definitions.ts](apps/api-server/src/routes/cosmetics/action-definitions.ts) |
| 7 | [apps/api-server/src/routes/glycopharm/controllers/checkout.controller.ts](apps/api-server/src/routes/glycopharm/controllers/checkout.controller.ts) |

### Canonical entity / migration / reference
| 항목 | 파일 |
|---|---|
| CheckoutOrder entity | [apps/api-server/src/entities/checkout/CheckoutOrder.entity.ts](apps/api-server/src/entities/checkout/CheckoutOrder.entity.ts) |
| CheckoutPayment entity | [apps/api-server/src/entities/checkout/CheckoutPayment.entity.ts](apps/api-server/src/entities/checkout/CheckoutPayment.entity.ts) |
| OrderLog entity | [apps/api-server/src/entities/checkout/OrderLog.entity.ts](apps/api-server/src/entities/checkout/OrderLog.entity.ts) |
| CreateCheckoutTables migration | [apps/api-server/src/database/migrations/20260414100000-CreateCheckoutTables.ts](apps/api-server/src/database/migrations/20260414100000-CreateCheckoutTables.ts) |
| sellerOrganizationId migration | [apps/api-server/src/database/migrations/20260218000001-AddSellerOrganizationIdToCheckoutOrders.ts](apps/api-server/src/database/migrations/20260218000001-AddSellerOrganizationIdToCheckoutOrders.ts) |
| **KPA event-offer (reference)** | [apps/api-server/src/routes/kpa/services/event-offer.service.ts](apps/api-server/src/routes/kpa/services/event-offer.service.ts) (lines 309-326, 392-399) |
| **KPA checkout (FOR UPDATE reference)** | [apps/api-server/src/routes/kpa/controllers/kpa-checkout.controller.ts](apps/api-server/src/routes/kpa/controllers/kpa-checkout.controller.ts) (lines 442-450) |
| Checkout Service (entity creation) | [apps/api-server/src/services/checkout.service.ts](apps/api-server/src/services/checkout.service.ts) |

---

*IR 종료. 본 IR 은 read-only. 코드 / migration / DB / seed / route / menu / guard / safe-fallback / checkout transaction 변경 없음. 다음 단계는 §9 의 Track A (즉시 가능 WO) 또는 §9-B/§9-C/§9-D 의 분리 작업 중 사용자 정책 판정 후 진행.*
