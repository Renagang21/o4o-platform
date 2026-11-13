# WO-O4O-SUPPLIER-LEGACY-MIXED-ORDER-ISOLATION-V1 — 예전 혼합 공급자 주문의 공급자 격리

> **상태**: ACTIVE
> **작성일**: 2026-11-13 · **최종 갱신**: 2026-11-13
> **실행 위치**: BOTH
> **인계**: `claude/supplier-api-stability` · push 전 · 다음 실행자 LOCAL(§5 read-only 조회) → CLOUD(§6 구현)
> **근거**: 2026-11-13 공급자 전반 조사(같은 세션) · 사용자 정비 지시 「예전 혼합 공급자 주문의 처리 방식은 운영 데이터를 읽기 전용으로 확인한 뒤 정한다」

## 1. 배경 — 현재 코드

공급자 주문 처리 화면(`/supplier/orders/manage`)과 API(`/api/v1/neture/supplier/orders*`)는 `neture_orders` · `neture.neture_order_items` 를 읽고 쓴다.

| 위치 | 현재 동작 | 혼합 주문(한 주문에 여러 공급자 품목)일 때 |
|---|---|---|
| `services/supplier-order.service.ts` `validateOwnership` | 주문 품목 중 **하나라도** 내 offer 면 통과 | 다른 공급자도 같은 주문에 접근 |
| `controllers/supplier-order.controller.ts` `GET /orders/:id` | `legacyNetureService.getOrder` 의 **주문 전체** 반환 + `enrichOrderItems` 로 공급자명 · 전화 · 웹사이트 추가 | 다른 공급자 품목 · 연락처 노출 |
| `supplier-order.service.ts` `listOrders` | 주문 단위 `total_amount` · `final_amount` 반환 | 다른 공급자 금액이 합산된 값 노출 |
| `supplier-order.service.ts` `updateStatus` | 주문 전체 status 변경 | 공급자 A 가 B 품목까지 준비중 · 배송중 · 완료로 바꿈 |
| `supplier-order.service.ts` `createShipment` | 내 shipment 생성 후 **주문 전체**를 SHIPPED 로 | 뒤늦은 공급자 B 는 INVALID_STATE 로 배송 등록 불가 |

경로는 모두 `apps/api-server/src/modules/neture/` 기준이다.

- **새로 생기는 주문:** 혼합 주문을 만들던 `POST /neture/orders` 는 은퇴했다. 지금은 410 `NETURE_B2B_LEGACY_SELLER_ORDER_RETIRED` 를 돌려준다(`controllers/seller.controller.ts:347`).
- **현행 주문 경로:** `store_cart_items → checkout_orders` 이고, (수취 주체, 공급자) 그룹별로 주문을 만든다(`modules/neture-pharmacy/services/pharmacy-cart.service.ts`).
- **따라서** 이 문제는 **이미 쌓인 `neture_orders` 에만** 해당한다. 혼합 주문이 실제로 있는지, 아직 처리 중인 것이 있는지에 따라 처리 방식이 달라진다.

정본: [`O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1`](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md) · [`O4O-SUPPLIER-DOMAIN-BOUNDARY-V1`](../baseline/O4O-SUPPLIER-DOMAIN-BOUNDARY-V1.md) (Orders 축: `neture_orders` · `neture_shipments` status write).

## 2. 사용자 확정

- 혼합 주문 처리 방식은 운영 데이터를 read-only 로 확인한 뒤 정한다(2026-11-13).

## 3. 설계 판단 — 조회 결과별 방향

| 결과 | 판정 | 방향(§6) |
|---|---|---|
| **A.** 혼합 주문 0건 | 노출 · 오작동 실재 없음 | 방어만 — 상세 품목을 내 공급자 품목으로 거르고, 혼합 주문의 상태 변경 · 배송 등록은 409 로 막는다. 우선순위 낮음 |
| **B.** 혼합 주문 있음 · 전부 종료 상태(`delivered` · `cancelled` · `refunded`) | 읽기 노출만 실재 | A 와 같은 구현 + 목록 금액을 내 품목 소계로 바꾼다. 쓰기는 이미 끝난 주문이라 409 로 막아도 운영 영향 없음 |
| **C.** 혼합 주문 중 진행 상태(`paid` · `preparing` · `shipped`) 있음 | 지금 운영 오작동 가능 | **통합 담당에게 먼저 보고.** 공급자별 배송 기록으로 주문 상태를 도출하는 구현이 필요하다. 이미 다른 공급자가 SHIPPED 로 바꿔 배송 등록이 막힌 건이 있으면 개별 처리(운영 DB 쓰기 — 통합 담당 명시 승인)를 별도 단계로 둔다 |
| **D.** offer 와 연결되지 않는 품목(`product_id` 가 offer 아님) 있음 | 소유 판정 · 거르기 기준 보강 필요 | 해당 품목은 어느 공급자에게도 보이지 않게 거른다(현재도 소유 판정에서 빠짐). 건수만 기록 |

## 4. 범위 밖

- 현행 `checkout_orders` 주문 경로 · 결제 · 정산 계산. 공급자별로 분리되어 있다.
- `neture_orders` 데이터 이관 · 삭제 · 상태 일괄 수정(운영 DB 쓰기). 필요하면 통합 담당 명시 승인으로 별도 단계를 둔다.
- 화면 디자인 변경. 응답에서 다른 공급자 데이터가 빠지는 것 외에 화면 계약은 유지한다.

## 5. LOCAL — 운영 DB read-only 조회

`/db-readonly` 절차와 `o4o_readonly` 계정으로 실행한다. **`SELECT` 만** 쓴다. 결과에는 건수 · 상태 · 월만 남기고 주문번호 · 이름 · 연락처 원문은 기록하지 않는다.

```sql
-- Q1. 주문별 공급자 수 → 상태별 혼합/단일 건수 (판정 A · B · C)
WITH per_order AS (
  SELECT oi.order_id, COUNT(DISTINCT spo.supplier_id) AS supplier_cnt
  FROM neture.neture_order_items oi
  JOIN supplier_product_offers spo
    ON oi.product_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   AND spo.id = oi.product_id::uuid
  GROUP BY oi.order_id
)
SELECT o.status::text AS status, (p.supplier_cnt > 1) AS mixed, COUNT(*)::int AS orders
FROM neture_orders o
JOIN per_order p ON p.order_id = o.id
GROUP BY 1, 2
ORDER BY 1, 2;
```

```sql
-- Q2. 혼합 주문의 생성 월 · 서비스 · 테스트 결제 여부 분포 (언제까지 생겼는지)
WITH per_order AS (
  SELECT oi.order_id, COUNT(DISTINCT spo.supplier_id) AS supplier_cnt
  FROM neture.neture_order_items oi
  JOIN supplier_product_offers spo
    ON oi.product_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   AND spo.id = oi.product_id::uuid
  GROUP BY oi.order_id
)
SELECT date_trunc('month', o.created_at)::date AS month,
       o.service_key,
       COALESCE((o.metadata->>'testPayment')::boolean, false) AS test_payment,
       COUNT(*)::int AS mixed_orders
FROM neture_orders o
JOIN per_order p ON p.order_id = o.id AND p.supplier_cnt > 1
GROUP BY 1, 2, 3
ORDER BY 1, 2, 3;
```

```sql
-- Q3. 진행 중인 혼합 주문의 배송 기록 현황 (판정 C 의 막힌 공급자 여부)
WITH per_order AS (
  SELECT oi.order_id, COUNT(DISTINCT spo.supplier_id) AS supplier_cnt
  FROM neture.neture_order_items oi
  JOIN supplier_product_offers spo
    ON oi.product_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   AND spo.id = oi.product_id::uuid
  GROUP BY oi.order_id
)
SELECT o.status::text AS status,
       p.supplier_cnt,
       (SELECT COUNT(DISTINCT s.supplier_id) FROM neture_shipments s WHERE s.order_id = o.id)::int AS shipped_suppliers,
       COUNT(*)::int AS orders
FROM neture_orders o
JOIN per_order p ON p.order_id = o.id AND p.supplier_cnt > 1
WHERE o.status::text IN ('paid', 'preparing', 'shipped')
GROUP BY 1, 2, 3
ORDER BY 1, 2, 3;
```

```sql
-- Q4. offer 와 연결되지 않는 품목 (판정 D)
SELECT COUNT(*)::int AS unmatched_items,
       COUNT(DISTINCT oi.order_id)::int AS orders_with_unmatched
FROM neture.neture_order_items oi
LEFT JOIN supplier_product_offers spo
  ON oi.product_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 AND spo.id = oi.product_id::uuid
WHERE spo.id IS NULL;
```

**판정 기준**

- Q1 에 `mixed = true` 행이 없으면 **A** 다.
- 혼합 행이 `delivered` · `cancelled` · `refunded` 뿐이면 **B** 다.
- `paid` · `preparing` · `shipped` 중 하나라도 있으면 **C** 다.
- Q3 에서 `shipped_suppliers < supplier_cnt` 인 `shipped` 주문은 「배송 등록이 막힌 공급자」 후보다.
- Q4 가 0 보다 크면 **D** 를 함께 적용한다.
- Q2 의 마지막 월은 혼합 주문이 언제까지 생겼는지 보여 준다(410 은퇴 이후 건이 있으면 별도 보고).

**기록 위치**: 이 문서 §7 에 결과 표(건수만)와 판정을 적고, 같은 branch 에 commit · push 한다.

## 6. CLOUD — 판정 후 구현

판정이 A 이든 B 이든 아래 공통 구현을 한다. C 는 통합 담당 보고 후 범위를 다시 정한다.

1. `GET /supplier/orders/:id`
   - 품목을 `spo.supplier_id = 요청 공급자` 로 거른다.
   - `enrichOrderItems` 는 거른 품목에만 적용한다.
   - 주문 금액 대신 내 품목 소계를 함께 내려 준다. 화면 계약은 필드 추가만 한다.
2. `GET /supplier/orders`
   - `total_amount` · `final_amount` 를 내 품목 소계로 바꾸거나 소계 필드를 추가한다. 둘 중 무엇을 고를지는 화면 사용처를 확인해 정한다.
3. `PATCH /supplier/orders/:id/status` · 배송 등록
   - 혼합 주문이면 409 `MIXED_SUPPLIER_ORDER_READ_ONLY` 로 막는다(A · B).
   - C 이면 공급자별 배송 기록으로 주문 상태를 도출하는 방식을 따로 설계한다.
4. 테스트
   - 두 공급자가 섞인 주문 fixture 로 다음을 확인한다: 상세 · 목록에서 다른 공급자 품목 · 연락처 · 금액이 0 노출, 혼합 주문 상태 변경 409, 단일 공급자 주문의 기존 동작 유지.

## 7. 결과 기록 (LOCAL 작성)

| 조회 | 결과(건수만) |
|---|---|
| Q1 | 미실행 |
| Q2 | 미실행 |
| Q3 | 미실행 |
| Q4 | 미실행 |

판정: 미정

## TODO

- [ ] [LOCAL] §5 Q1~Q4 를 `o4o_readonly` 로 실행하고 §7 에 건수만 기록 · 판정(A/B/C/D)
- [ ] [LOCAL] 판정 C 이면 통합 담당에게 보고하고 CLOUD 범위를 다시 정한다
- [ ] [CLOUD] §6 1~3 구현(판정 A · B 기준)
- [ ] [CLOUD] §6 4 혼합 주문 fixture 테스트 · `/verify`
- [ ] [CLOUD] 배포 후 공급자 Demo 로 주문 처리 화면 회귀 확인(단일 공급자 주문 동작 유지)

## 검증 계획

- LOCAL: 조회 4건 실행 결과와 판정을 §7 에 기록한다. 운영 DB 쓰기는 0건이다.
- CLOUD: 혼합 주문 fixture 단위 · HTTP 테스트, `apps/api-server` 타입 검사, 공급자 주문 관련 jest.

## 문서 정합

해당 없음. 정본의 Orders 축(`neture_orders` · `neture_shipments` status write)은 바꾸지 않고, 공급자 격리를 그 안에서 보강한다.
