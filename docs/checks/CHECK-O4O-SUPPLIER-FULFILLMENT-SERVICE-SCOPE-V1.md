# CHECK-O4O-SUPPLIER-FULFILLMENT-SERVICE-SCOPE-V1

> WO: `WO-O4O-SUPPLIER-FULFILLMENT-SERVICE-SCOPE-V1`
> 작업일: 2026-08-01 · 브랜치 `main` · 작업 전 HEAD `d4f407f04`
> 선행 조사: [`IR-PHARMACY-HUB-PAYMENT-AND-FULFILLMENT-BRIDGE-V1`](../ir/IR-PHARMACY-HUB-PAYMENT-AND-FULFILLMENT-BRIDGE-V1.md) §4

---

## 1. 선택한 서비스 축과 이유 — **컬럼**

`public.neture_orders.service_key varchar(50) NOT NULL DEFAULT 'neture'` (+ 인덱스 2개)

| 판단 근거 | 내용 |
|---|---|
| 인덱스 | 공급자 목록·카운트·통계 **모든 쿼리의 WHERE 에 들어가는 축**이다. `metadata->>'serviceKey'` jsonb 추출을 매 쿼리 WHERE 에 두는 것보다 컬럼이 낫다 (실측: `Index Scan using idx_neture_orders_service_key_created_at`) |
| 레거시 규칙 | `DEFAULT 'neture'` 가 **"미표기 = neture"** 를 구조로 보장한다. 이후 어떤 경로가 값을 세팅하지 않아도 Neture 의미가 유지된다 |
| 위험 | 적용 시점 `neture_orders` 는 **0행** — backfill 위험 0 (§5 기준선) |

> `checkout_orders` 쪽은 컬럼이 아니라 **기존 규약인 `metadata.serviceKey`** 를 그대로 쓴다.
> 두 축의 판정 규칙은 동일하게 `COALESCE(..., 'neture')` 다.

### 1-1. 필터 SSOT

`apps/api-server/src/modules/neture/constants/fulfillment-service-scope.ts`

```ts
netureOrderServiceScopeSql(alias, param)    // COALESCE(o.service_key, 'neture') = $n
checkoutOrderServiceScopeSql(alias, param)  // COALESCE(co.metadata->>'serviceKey', 'neture') = $n
```

목록·카운트·통계가 **서로 다른 조건을 쓰지 못하도록** 조각을 한 곳에서 만든다.
비교 대상은 항상 바인딩 파라미터다(값 직접 삽입 없음 — 테스트로 고정).

---

## 2. 수정한 생성·조회·통계 경로

### 2-1. 사전 전수 조사

`neture_orders` 를 참조하는 파일 19개를 전수 확인해 다음으로 분류했다.

| 축 | 파일 | 조치 |
|---|------|------|
| **공급자 조회·통계** | `supplier-order.service` · `supplier-unified-order.service` · `supplier.service` | ✅ **필터 적용 (9곳)** |
| 생성 | `checkout-fulfillment-bridge.service` | ✅ `service_key` 기입 |
| 생성 (Neture 자체) | `neture.repository` · `neture.service` | 무변경 — `DEFAULT 'neture'` 로 자동 충족 |
| 단건 by id | `supplier-order.service` readiness · `seller.service` UPDATE | 무변경 — id 지정이라 서비스 필터 불필요 |
| 주석만 | `supplier-copilot.service` · `seller.controller` · `adminDashboardController` | 무변경 (쿼리 없음) |
| 실효 없음 | `operator-dashboard.controller` | 무변경 — `neture.neture_orders` 를 조회하나 **그 테이블은 `public` 스키마**에 있어 항상 실패하고 `.catch` 로 방어 중 (§7) |
| 범위 밖 | `neture-settlement.service`(4) · `partner-commission.service`(2) | **미적용 — §7 후속** |

### 2-2. 적용한 공급자 조회 9곳

| 파일 | 지점 |
|------|------|
| `supplier-order.service.ts` | KPI 집계 · 목록 · 카운트 (serviceKey 를 `$2` 로 고정, `status` 는 `$3` 으로 이동 — 목록·카운트가 **동일 조건**) |
| `supplier-unified-order.service.ts` | `neture_orders` 소스 · `checkout_orders` 소스 |
| `supplier.service.ts` | 의무 가드 2곳(neture/checkout) · 집계 2곳(neture/checkout) |

> **bridge 이전 paid `checkout_order` 도 공급자에게 노출**되므로(통합 조회가 두 소스를 합침)
> 그 소스에도 같은 경계를 적용했다. 이걸 빠뜨리면 결제 완료된 Pharmacy-Hub 주문이
> bridge 되기 전에 Neture 공급자에게 보인다.

### 2-3. 생성 경로

`CheckoutFulfillmentBridgeService` 가 `checkout_order.metadata.serviceKey` 를 승계해
`neture_order.service_key` 에 기입한다(미표기면 `'neture'`). 기존 `checkoutOrderId` 멱등 계약 무변경.

---

## 3. 레거시 주문 호환 방식

```
service_key IS NULL  또는 미표기  →  'neture' 로 해석
```

3중으로 보장한다.

1. **스키마**: `NOT NULL DEFAULT 'neture'` — 값 없이 INSERT 해도 `neture`
2. **migration**: 혹시 NULL 이 있으면 `UPDATE ... SET service_key='neture'` (방어)
3. **쿼리**: `COALESCE(service_key, 'neture')` — 어떤 경로로 NULL 이 되어도 Neture 로 조회됨

---

## 4. Neture 회귀 결과

### 4-1. 필터 의미 증명 (read-only CTE 시뮬레이션 — DB write 0)

| 조회 | 보이는 행 |
|---|---|
| `neture` 로 조회 | `legacy-no-key`(미표기), `neture-explicit` — **pharmacy-hub 제외** ✅ |
| `pharmacy-hub` 로 조회 | `ph-hub` 만 ✅ |
| checkout 축 `neture` | `co-legacy`, `co-neture` ✅ |
| checkout 축 `pharmacy-hub` | `co-phhub` 만 ✅ |

### 4-2. 인덱스 사용

```
Limit
  ->  Index Scan using idx_neture_orders_service_key_created_at on neture_orders
        Index Cond: ((service_key)::text = 'pharmacy-hub'::text)
```

### 4-3. API 회귀 (프로덕션, Neture 공급자 계정)

| 경로 | 결과 |
|---|---|
| `GET /neture/supplier/orders/kpi` | ✅ 200 · 0 |
| `GET /neture/supplier/orders` | ✅ 200 · 0건 |
| `GET /neture/supplier/orders/unified` | ✅ 200 · 0건 |
| `GET /neture/supplier/orders/summary` | ✅ 200 · 기존 형태 유지 |
| `GET /neture/supplier/products` · `GET /pharmacy-hub/supplier/products` | ✅ 200 (이전 WO 산출물 무회귀) |

### 4-4. 단위 테스트 10건 (전부 통과)

컬럼 축 사용(jsonb 아님) · 미표기 `neture` 해석 · alias/파라미터 반영 ·
**값 직접 삽입 없이 바인딩만 사용** · 두 축 계약 일관성 · 파라미터 1개 의존.

`tsc --noEmit -p tsconfig.build.json` ✅ 0 errors.

> **회귀 검증의 한계**: `neture_orders` 가 0행이라 "기존 주문 수·조회 결과 불변" 은
> **0 = 0 으로만** 확인된다. 실데이터 회귀는 불가능했다. 대신 §4-1 시뮬레이션으로
> 필터 의미를, §4-3 으로 쿼리 실행 가능성을 각각 증명했다.

---

## 5. migration · 데이터 변경

| 항목 | 값 |
|---|---|
| migration | `20270224000000-AddServiceKeyToNetureOrders` — 컬럼 1 + 인덱스 2 (전부 `IF NOT EXISTS`, 멱등) |
| 신규 테이블 | **0** |
| 데이터 변경 | **0** — 적용 전후 `neture_orders` 0행 · `neture_order_items` 0행 · `neture_settlements` 0행 |

적용 후 스키마 실측: `service_key | character varying | 'neture'::character varying | NOT NULL` ✅

---

## 6. 검증 항목 대조 (WO §검증)

| 항목 | 결과 |
|---|---|
| migration 전 기존 주문 분포 확인 | ✅ 0행 (기준선 기록) |
| migration 후 기존 주문 전부 Neture 로 해석 | ✅ `DEFAULT 'neture'` + `COALESCE` 3중 보장 |
| Neture 목록·상세·통계 수치 불변 | ✅ 전부 200 · 0건 (0행이라 0=0) |
| Pharmacy-Hub 표식 주문은 Neture 조회에서 제외 | ✅ §4-1 시뮬레이션 |
| **서비스 필터 없는 공급자 조회 경로 0건** | ✅ 공급자 3파일 9지점 전수 적용 확인 |
| bridge 멱등성 유지 | ✅ `checkoutOrderId` 조회 로직 무변경 |
| 관련 테스트 · 프로덕션 read-only 검증 | ✅ 10건 + read-only SQL |

---

## 7. 남은 Phase 2 블로커 · 후속

| # | 항목 | 성격 |
|---|------|------|
| 1 | **정산·커미션 경로 미적용** — `neture-settlement.service`(4) · `partner-commission.service`(2) 가 `neture_orders` 를 서비스 구분 없이 집계한다. 현재 0행이라 영향은 없지만, **Phase 2 로 Pharmacy-Hub 주문이 들어오면 Neture 정산에 합산된다.** 정산 정책 판단이 필요해 이번 범위에서 제외했다 | **Phase 2 전 필수** |
| 2 | `operator-dashboard.controller` 가 존재하지 않는 `neture.neture_orders` 를 조회한다(항상 실패 → `.catch`). 별도 정비 대상 | 무해하나 정리 필요 |
| 3 | 결제·환불 정책 · 배송비 정책 미확정 | Phase 2 착수 전 결정 |
| 4 | 미bridge paid 주문 재시도 경로 없음 (IR §6-3) | Phase 2 범위 |

**다음 WO**: `WO-PHARMACY-HUB-PAYMENT-AND-SUPPLIER-FULFILLMENT-V1` — 단, 위 1번(정산 축 서비스 경계)과
3번(결제·환불·배송비 정책)을 먼저 닫아야 한다.
