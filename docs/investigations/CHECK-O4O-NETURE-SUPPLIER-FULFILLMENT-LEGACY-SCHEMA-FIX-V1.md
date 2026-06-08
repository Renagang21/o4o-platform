# CHECK-O4O-NETURE-SUPPLIER-FULFILLMENT-LEGACY-SCHEMA-FIX-V1

> WO-O4O-NETURE-SUPPLIER-FULFILLMENT-LEGACY-SCHEMA-FIX-V1 검증 기록.
> 기존 공급자 fulfillment workspace API 의 production 500(`neture_order_items` schema 미수식) 최소 수정.

- **작업일**: 2026-06-08
- **커밋**: `0840d20ca`
- **배포**: Deploy API Server (Cloud Run) — **success**
- **발견 출처**: `CHECK-O4O-NETURE-SUPPLIER-ORDER-UNIFIED-VIEW-V1 §3`

---

## 1. 원인 / 수정

- `neture_order_items` 는 **`neture` 스키마** 소속(`public.neture_orders` + `neture.neture_order_items`, migration `20260902500000`).
- `supplier-order.service.ts` 의 raw SQL 이 schema 없이 `neture_order_items` 참조 → `public` 해석 → `relation "neture_order_items" does not exist` → 500.
- 수정: 미수식 5곳 → `neture.neture_order_items` (`listOrders` 본문/카운트/subquery, `getOrderKpi`, `validateOwnership`).
- `neture_orders`(public) · `neture_shipments`(public, migration `20260308000000` 에서 public 생성) 는 무변경.

| 파일 | 변경 |
|------|------|
| `modules/neture/services/supplier-order.service.ts` | `neture_order_items` → `neture.neture_order_items` ×5 |

기능/스키마/상태enum/송장/정산/배송비 로직 변경 없음. migration 0. 신규 unified view 무변경.

---

## 2. 검증 (프로덕션 read-only smoke)

| 항목 | 수정 전 | 수정 후 |
|------|:------:|:------:|
| `GET /api/v1/neture/supplier/orders` | 500 INTERNAL_ERROR | **success:true**, meta 정상 |
| `GET /api/v1/neture/supplier/orders/kpi` | 500 INTERNAL_ERROR | **success:true** (KPI 0건 정상) |
| no-auth 요청 | — | `AUTH_REQUIRED` 차단(가드 유지) |
| `GET /orders/unified` (회귀) | success | **success 유지(회귀 없음)** |

- api-server `tsc` PASS. smoke 계정: `sohae21@naver.com`(linked Neture supplier, 주문 0건) — 0건 정상 응답으로 500 해소 실증.
- read-only(조회 전용). 데이터 변경 없음.

---

## 3. 효과
통합 주문 보기의 "처리 가능 주문 → 기존 fulfillment workspace(`/account/supplier/orders/:id`)" 이동 흐름이 안정적으로 닫힘. (legacy API 가 더 이상 500 아님)

## 4. 후속
- `WO-O4O-NETURE-EVENT-OFFER-SUPPLIER-FULFILLMENT-INTEGRATION-V1` 또는 `...FREE-SHIPPING-PROGRESS-UI-V1` 로 복귀.

*운영 오류 수정 기록. 기능 변경 없음.*
