# CHECK-O4O-NETURE-SUPPLIER-ORDER-UNIFIED-VIEW-V1

> WO-O4O-NETURE-SUPPLIER-ORDER-UNIFIED-VIEW-V1 검증 기록.
> 공급자 화면에서 neture_orders + checkout_orders 를 supplierId 기준으로 함께 조회하는 **읽기 통합 view**.

- **작업일**: 2026-06-08
- **커밋**: `293a63399`(구현) + `1529b4b7a`(스키마 정합 fix)
- **배포**: Deploy API Server / Deploy Web Services — 둘 다 **success**
- **선행**: IR-O4O-NETURE-ORDER-TABLE-BOUNDARY-DESIGN-V1(near-term C), SHIPPING-CALCULATION-V2

---

## 1. 변경 요약

| 파일 | 변경 |
|------|------|
| `modules/neture/services/supplier-unified-order.service.ts` (신규) | `SupplierUnifiedOrderService.listUnifiedOrders()` — 두 원장 조회·정규화·in-memory 병합(createdAt DESC)·페이지네이션. per-source CAP 300. 양 원장 try/catch degrade |
| `modules/neture/controllers/supplier-order.controller.ts` | `GET /orders/unified` 추가 (`requireLinkedSupplier`). **/orders/:id 보다 먼저 등록**(라우트 충돌 방지) |
| `services/web-neture/src/lib/api/supplier.ts` | `getUnifiedOrders()` + `UnifiedSupplierOrder`/`UnifiedOrdersResponse` 타입 |
| `services/web-neture/src/pages/supplier/SupplierOrdersPage.tsx` | `/supplier/orders` 허브에 "통합 주문 보기" 섹션(source 배지·상태·읽기전용·fulfillment 링크·source 필터) |

주문 테이블/스키마/정산/송장/상태전이/환불 **무변경**. migration 0.

---

## 2. 경계·정책

- **neture_orders**: `canFulfill=true`, `fulfillmentUrl=/account/supplier/orders/:id` (기존 workspace 재사용).
- **checkout_orders**(이벤트오퍼/서비스): `canFulfill=false`, `readOnlyReason` 안내. 상태변경/송장/정산 미구현(후속).
- **공급자 스코프**: neture=`neture.neture_order_items→supplier_product_offers.supplier_id` EXISTS, checkout=`"supplierId"` 컬럼. 타 공급자 주문 미노출.
- **source 식별**: checkout `metadata->>'productListingId'` 존재 → `event_offer`, 아니면 `service_checkout`.
- **degrade**: 한 원장 조회 실패 시 다른 원장만 반환(500 방지). per-source CAP 300 도달 시 log 경고(silent truncation 금지).

---

## 3. ⚠️ 조사 중 발견한 선행 버그 (별도 fix 필요)

**기존 공급자 fulfillment workspace API 가 프로덕션에서 깨져 있음.**

- `neture_order_items` 는 **`neture` 스키마** 소속(`public.neture_orders` + `neture.neture_order_items`, migration `20260902500000`).
- 기존 `supplier-order.service.ts` 의 `listOrders` / `getOrderKpi` / `validateOwnership` 는 raw SQL 에서 **스키마 없이 `neture_order_items`** 를 참조 → `public` 으로 해석 → `relation "neture_order_items" does not exist`.
- 실측: `GET /api/v1/neture/supplier/orders`, `/orders/kpi` 모두 **500(INTERNAL_ERROR)**. 즉 `/account/supplier/orders` 처리 워크스페이스가 현재 빈/오류 상태일 가능성.
- 본 WO 의 신규 통합 view 는 `neture.neture_order_items` 로 정규화하여 정상.
- **권고: 후속 최소 fix WO** — `supplier-order.service.ts` 3개 쿼리의 `neture_order_items` → `neture.neture_order_items`. (본 WO 범위 밖이라 미수정)

---

## 4. 검증 (프로덕션 read-only smoke)

| 항목 | 결과 |
|------|------|
| api-server `tsc` | PASS |
| web-neture `tsc` | PASS |
| API deploy / Web deploy | success / success |
| `GET /orders/unified?source=all` (linked supplier) | `success:true`, meta 정상 |
| `source=neture` / `source=checkout` 필터 | 각각 `success:true` |
| 권한 없는 요청(no token) | `AUTH_REQUIRED` 차단 |
| 스키마 정합 fix 전 | 500(`neture_order_items does not exist`) → fix 후 정상 (회귀 검증됨) |

- smoke 계정: `sohae21@naver.com`(쓰리라이프존), `renagang21@gmail.com`(테스트공급자) — 둘 다 linked Neture supplier. 현재 두 계정 모두 **주문 0건**이라 행 렌더는 라이브 데이터로 시각 확인하지 못함(쿼리 실행·응답 스키마·필터·권한·degrade 는 검증). 주문 보유 공급자 확보 시 행 매핑(배지/itemsPreview/canFulfill) 추가 확인 권장.
- read-only: 데이터 변경 없음(조회 전용 endpoint).

---

## 5. 이번에 하지 않은 것
주문 테이블 병합/동기화, checkout 상태변경·송장·배송완료·정산, 배송비 재계산, schema/enum 변경, 유통참여형 펀딩 연결, checkout 상세 전용 화면 — 전부 범위 외.

## 6. 후속
- **(권고·신규)** WO: `supplier-order.service.ts` neture 스키마 정합 fix (legacy fulfillment 복구).
- `WO-O4O-NETURE-EVENT-OFFER-SUPPLIER-FULFILLMENT-INTEGRATION-V1` (checkout 주문 fulfillment 편입).
- `WO-O4O-NETURE-SUPPLIER-FREE-SHIPPING-PROGRESS-UI-V1`.

*읽기 통합 view 구현·검증 기록. 주문 원장 병합/상태 동기화 없음.*
