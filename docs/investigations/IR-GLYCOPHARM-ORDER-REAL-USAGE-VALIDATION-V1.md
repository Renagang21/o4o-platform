# IR-GLYCOPHARM-ORDER-REAL-USAGE-VALIDATION-V1

> 목적: 약국 B2C 주문(Glycopharm 흐름)이 허브 트리 구조 + OrderType 정규화 + ecommerce-core와 일관되게 동작하는지 실사용 기준 전면 검증
>
> 기준: PHARMACY-TREE-BASELINE-V1, PHARMACY-HUB-STABLE-V1, WO-ORDER-TYPE-NORMALIZATION-V1
>
> 유형: 읽기 전용 (코드 수정 없음)
>
> 일시: 2026-02-15

---

## 결과 요약

| Case | 항목 | 결과 | 위험도 |
|------|------|------|--------|
| A | Channel Approval Gate | **PASS** | Low |
| B | Product-Channel Mapping | **CONDITIONAL** | Medium |
| C | Sales Limit | **INCOMPLETE** | High |
| D | Order Structure | **PASS** | Low |
| E | Consumer/Seller Consistency | **PARTIAL** | Medium |
| F | Hub Isolation | **PASS** | Low |
| G | Payment Flow | **FAIL** | **Critical** |

### 추가 검증

| 항목 | 결과 | 위험도 |
|------|------|--------|
| seller_id FK 제약 | **FAIL** (FK 없음) | High |
| metadata GIN 인덱스 | **FAIL** (인덱스 없음) | Medium |
| CREATE TABLE 마이그레이션 | **FAIL** (명시 마이그레이션 없음) | High |

---

## Case A — Channel Approval Gate: PASS

**파일**: `apps/api-server/src/routes/glycopharm/controllers/checkout.controller.ts:273-287`

### 구현 확인

```sql
SELECT id FROM organization_channels
WHERE organization_id = $1
  AND channel_type = 'B2C'
  AND status = 'APPROVED'
```

- `status = 'APPROVED'` 필터: 존재
- 미승인 시 HTTP 403 반환: 확인
- `createCoreOrder()` 호출 차단: 확인
- Admin bypass: 없음 (무조건 검증)
- Parameterized query (SQL injection 방어): 확인

### 판정: PASS

채널 승인 게이트는 정상 동작한다. 미승인 채널에서의 주문 생성은 완전히 차단된다.

---

## Case B — Product-Channel Mapping: CONDITIONAL

**파일**: `checkout.controller.ts:329-392`

### 구현 확인

```sql
SELECT opl.id AS product_listing_id,
       opl.external_product_id,
       opc.sales_limit
FROM organization_product_channels opc
JOIN organization_product_listings opl ON opl.id = opc.product_listing_id
WHERE opc.channel_id = $1
  AND opl.organization_id = $2
  AND opl.service_key = 'kpa'
  AND opc.is_active = true
```

### 문제

**Soft check 설계** (line 350):

```typescript
if (channelMappings.length > 0) {
  // 매핑이 존재할 때만 검증 수행
}
```

- 매핑이 존재하면: 미매핑 상품 → HTTP 400 차단 (정상)
- 매핑이 0건이면: 전체 검증 블록 스킵 → `createOrder()` 진행

### 영향

- product-channel 매핑이 없는 약국은 모든 상품을 제한 없이 주문 가능
- sales_limit 검증도 동일 블록 내부이므로 함께 스킵됨

### 판정: CONDITIONAL (설계 의도에 따른 Soft Check)

매핑이 존재할 때는 정상 동작하지만, 매핑 0건 시 bypass 가능.

---

## Case C — Sales Limit: INCOMPLETE

**파일**: `checkout.controller.ts:360-391`

### 구현 확인

```sql
SELECT COALESCE(SUM(oi.quantity), 0)::int AS sold
FROM ecommerce_order_items oi
JOIN ecommerce_orders o ON o.id = oi."orderId"
WHERE oi."productId" = $1
  AND o."sellerId" = $2
  AND o.status NOT IN ('cancelled', 'refunded')
```

- 집계 기준: quantity 합산 (건수가 아닌 수량)
- 상태 필터: cancelled/refunded 제외
- 판매자 범위: `sellerId` 기준 정확

### 문제: Race Condition 취약

| 항목 | 상태 |
|------|------|
| SELECT FOR UPDATE | 없음 |
| Transaction isolation | 없음 |
| Optimistic locking | 없음 |
| DB CHECK constraint | 없음 |

**동시 요청 시나리오**:
```
sales_limit = 100, currentSold = 95
Request A: reads 95 → 95+8=103 → PASS (103 > 100 아니라고 판단 시점)
Request B: reads 95 → 95+8=103 → PASS (동시)
결과: 총 판매 = 111 (한도 초과)
```

### 판정: INCOMPLETE

로직은 정확하나 동시성 보호 없음. 고트래픽 환경에서 한도 초과 가능.

---

## Case D — Order Structure: PASS

**파일**: `checkout.controller.ts:437-451`

### 생성되는 EcommerceOrder 구조

| 필드 | 기대값 | 실제값 | 일치 |
|------|--------|--------|------|
| sellerId | pharmacy.organization_id | `pharmacy.id` | O |
| sellerType | ORGANIZATION | `SellerType.ORGANIZATION` | O |
| orderType | RETAIL | `OrderType.RETAIL` | O |
| metadata.serviceKey | 'glycopharm' | `'glycopharm'` | O |
| metadata.channelType | 'B2C' | `'B2C'` | O |
| metadata.channelId | UUID | `b2cChannelId` | O |
| metadata.pharmacyId | UUID | `pharmacy.id` | O |

### 추가 확인

- OrderType.GLYCOPHARM: **생성에 사용되지 않음** (deprecated)
- GET 쿼리에서만 backward compatibility로 GLYCOPHARM OR (RETAIL+serviceKey) 패턴 사용
- orderNumber: `ORD-YYYYMMDD-XXXX` 형식 (lines 93-98)
- Item metadata: category, manufacturer, originalPrice 스냅샷 포함 (lines 421-425)

### 판정: PASS

OrderType 정규화가 정확하게 적용되어 있다.

---

## Case E — Consumer/Seller Query Consistency: PARTIAL

### Consumer 주문 조회: PASS

**엔드포인트**: `GET /api/v1/glycopharm/checkout/orders` (line 524-586)

```typescript
qb.where('order.buyerId = :buyerId', { buyerId })
  .andWhere(
    new Brackets((qb) => {
      qb.where('order.orderType = :glycopharm', { glycopharm: OrderType.GLYCOPHARM })
        .orWhere(
          "order.orderType = :retail AND order.metadata->>'serviceKey' = :serviceKey",
          { retail: OrderType.RETAIL, serviceKey: 'glycopharm' }
        );
    })
  )
```

- Backward compatibility: 레거시(GLYCOPHARM) + 신규(RETAIL+serviceKey) 모두 조회
- 올바른 필터링 확인

### Seller/약국 주문 조회: FAIL

**엔드포인트**: `GET /api/v1/glycopharm/pharmacy/orders`

```typescript
// Phase 4-A: Legacy Order System removed
// Return empty data until E-commerce Core integration
res.json({
  success: true,
  data: { items: [], total: 0, ... },
  _notice: 'Order system migration in progress.',
});
```

- **구현되지 않음**: 빈 배열 반환
- sellerId 기반 주문 조회 로직 없음
- operator 대시보드 recent-orders도 동일하게 빈 배열

### 판정: PARTIAL

소비자 조회는 정상이지만, 약국(판매자) 조회는 미구현 상태.

---

## Case F — Hub Isolation: PASS

### Hub → Order 의존성

| 검사 항목 | 결과 |
|-----------|------|
| EcommerceOrder import | 0건 |
| checkoutService import | 0건 |
| ecommerce_orders 참조 | 0건 |
| 주문 데이터 의존 | 없음 |

### Order → Hub 의존성

| 검사 항목 | 결과 |
|-----------|------|
| store-hub import | 0건 |
| organization_channels INSERT/UPDATE | 0건 |
| organization_channels SELECT | 1건 (승인 확인용, 읽기 전용) |

### 라우트 분리

- Hub: `kpa.routes.ts` → `/store-hub`
- Checkout: `glycopharm.routes.ts` → `/checkout`
- 상호 참조 없음

### 판정: PASS

Hub와 Order 레이어는 완전히 분리되어 있다.

---

## Case G — Payment Flow: FAIL (CRITICAL)

### 현재 상태

| 컴포넌트 | Cosmetics/Neture | Glycopharm |
|----------|-----------------|------------|
| 주문 생성 | O | **O** |
| 결제 확인 엔드포인트 | O (`/payments/confirm`) | **X (없음)** |
| Toss confirm 호출 | O | **X** |
| PaymentEventHandler | O | **X (없음)** |
| payment.completed 이벤트 | O | **X** |
| OrderStatus → PAID 전이 | O | **X** |
| 실패 롤백 | O | **X** |
| 중복 결제 방지 | O | **X** |

### 흐름 비교

**Cosmetics (정상)**:
```
POST /checkout → Order(CREATED)
POST /payments/confirm → Toss confirm → paymentEventHub.emitCompleted
→ KCosmeticsPaymentEventHandler → order.status = PAID
```

**Glycopharm (현재)**:
```
POST /checkout → Order(CREATED)
→ 이후 결제 확인 엔드포인트 없음
→ Order 영원히 CREATED/PENDING 상태
```

### 누락 목록

1. **`/api/v1/glycopharm/payments/confirm` 엔드포인트** — Toss confirm API 호출 + 이벤트 발행
2. **`GlycopharmPaymentEventHandler`** — payment.completed/failed 이벤트 구독 + 상태 전이
3. **`glycopharm.routes.ts` 등록** — 결제 라우트 등록
4. **`main.ts` 초기화** — 핸들러 초기화

### 판정: FAIL (CRITICAL)

결제 파이프라인이 완전히 누락되어 있다. 주문은 생성되지만 결제 완료 처리가 불가능하다.

---

## 무결성 / 성능 검증

### seller_id FK 제약: FAIL

`ecommerce_orders.seller_id`에 FK 제약이 없다.
- Organization 삭제 시 orphan 주문 발생 가능
- DB 레벨 참조 무결성 없음

### metadata GIN 인덱스: FAIL

`metadata` JSONB 컬럼에 GIN 인덱스가 없다.
- `metadata->>'serviceKey' = 'glycopharm'` 쿼리는 sequential scan
- 주문 수 증가 시 성능 저하 예상

### ecommerce_orders 테이블 생성 마이그레이션: FAIL

명시적 CREATE TABLE 마이그레이션이 없다.
- TypeORM synchronize에 의존 (프로덕션 불안전)

### 기존 인덱스 (정상)

| 컬럼 | 인덱스 | 상태 |
|------|--------|------|
| orderNumber | Unique Index | O |
| buyerId | Simple Index | O |
| sellerId | Simple Index | O |
| orderType | Simple Index | O |
| status | Simple Index | O |
| storeId | Simple Index | O |

---

## 구조적 위험

1. **결제 파이프라인 부재** (Critical) — 주문 생성만 가능, 결제 완료 불가
2. **Race condition** (High) — sales_limit 동시 요청 시 한도 초과 가능
3. **seller_id FK 없음** (High) — orphan 주문 가능
4. **약국 주문 조회 미구현** (Medium) — 약국 대시보드에서 주문 확인 불가
5. **metadata 인덱스 없음** (Medium) — serviceKey 필터링 성능 저하

## 데이터 왜곡 가능성

- 결제 없이 주문만 쌓이면 KPI 왜곡 (주문 수 ≠ 실 매출)
- sales_limit race condition으로 한도 초과 주문 발생 가능
- metadata 인덱스 없으면 대량 주문 시 타임아웃 발생 가능

## 권장 조치

### P0 (차단 해제 필수)
1. **Glycopharm 결제 확인 엔드포인트 구현** — Cosmetics 패턴 복제
2. **GlycopharmPaymentEventHandler 구현** — 상태 전이 + 중복 방지

### P1 (안정성)
3. **약국(판매자) 주문 조회 엔드포인트 구현** — sellerId 기반 조회
4. **ecommerce_orders CREATE TABLE 마이그레이션** — 명시적 테이블 생성

### P2 (무결성)
5. **seller_id FK 제약 추가** — ON DELETE RESTRICT
6. **sales_limit 트랜잭션 격리** — SELECT FOR UPDATE 또는 직렬화
7. **metadata GIN 인덱스 추가**

---

*Generated: 2026-02-15*
*Status: Investigation Complete*
