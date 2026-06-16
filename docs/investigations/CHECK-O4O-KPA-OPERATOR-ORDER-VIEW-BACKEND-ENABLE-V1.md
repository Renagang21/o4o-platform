# CHECK-O4O-KPA-OPERATOR-ORDER-VIEW-BACKEND-ENABLE-V1

> **작업명:** WO-O4O-KPA-OPERATOR-ORDER-VIEW-BACKEND-ENABLE-V1
> **유형:** backend view-only 주문 조회 route 추가 (KPA operator). DB/migration/mutation 무변경.
> **판정: PASS** — KPA `GET /kpa/operator/orders` 추가, 공통 헬퍼 재사용, api-server typecheck 통과. frontend 미포함(다음 WO).
> 선행: `WO-O4O-KPA-OPERATOR-PRODUCT-ORDER-VIEW-INTRODUCE-V1`(상품 현황), `WO-O4O-OPERATOR-ORDER-VIEW-API-V1`(공통 헬퍼)
> 작성일: 2026-06-16

---

## 1. 조사한 GP/KCos orders backend 구조

- 공통 헬퍼 `apps/api-server/src/routes/common/order/operatorOrderQuery.ts` — `queryOperatorOrders(dataSource, serviceKey, params)`:
  - canonical 원장 **`checkout_orders`** 조회, `co.metadata->>'serviceKey'` 로 서비스 격리(서버 고정, client 신뢰 금지).
  - view-only: 상태변경/배송/취소/환불/송장/정산 없음. PII 미노출(buyerLabel=null, items 상세 미반환).
  - raw SQL parameter binding($1..)만, 빈 결과/테이블 부재에도 안전.
  - 반환: `{ orders[], stats{total,paid,pending,cancelled,totalAmount}, pagination{page,limit,total,totalPages} }`.
- 소비처: GP `glycopharm/controllers/operator.controller.ts:83` (`queryOperatorOrders(ds, 'glycopharm', ...)`, `router.get('/orders')`, mount `/operator`), KCos `cosmetics/controllers/operator-dashboard.controller.ts:170` (`'cosmetics'`).

## 2. KPA에 추가한 route/controller/service 내용

- **route 추가:** `apps/api-server/src/routes/kpa/controllers/operator-summary.controller.ts` 에 `GET /orders` 추가.
  - 해당 controller 는 `kpa.routes.ts:231` 에서 `router.use('/operator', ...)` 로 마운트 → 최종 경로 **`/api/v1/kpa/operator/orders`**.
  - controller router-level 가드 `authenticate` + `requireKpaScope('kpa:operator')` 가 `/orders` 에도 적용됨.
  - 핸들러는 GP 와 동형: `queryOperatorOrders(dataSource, ['kpa-society', 'kpa'], { page, limit, status, paymentStatus, search, dateFrom, dateTo })` → `res.json({ success: true, data: result })`.
- **공통 헬퍼 additive 확장:** `operatorOrderQuery.ts` `serviceKey: string` → **`string | string[]`**.
  - `const serviceKeys = Array.isArray(serviceKey) ? serviceKey : [serviceKey];`
  - WHERE `co.metadata->>'serviceKey' = ANY($1::text[])` (단일 string 도 1-요소 배열로 동일 동작 → **GP/KCos 무영향**).
  - 사유: **KPA checkout_orders 는 serviceKey 가 `'kpa-society'` 와 `'kpa'` 로 공존**(canonical KPA checkout 도 `IN ('kpa-society','kpa')` 로 매칭 — `kpa-checkout.controller.ts:449,591,652`). 단일 serviceKey 로는 일부 주문 누락 위험 → 배열 매칭으로 KPA 전체 포착.

## 3. endpoint

- `GET /api/v1/kpa/operator/orders`
- query: `page, limit, status, paymentStatus, search, dateFrom, dateTo` (GP/KCos 와 동일).

## 4. auth scope

- `authenticate` + `requireKpaScope('kpa:operator')` (controller router-level). 일반 store/pharmacy user 접근 불가(scope 미충족 → 403, 미인증 → 401).

## 5. response shape

```jsonc
{ "success": true, "data": {
  "orders": [{ id, orderNumber, status, paymentStatus, totalAmount, itemCount, channel, storeName, buyerLabel:null, createdAt }],
  "stats": { total, paid, pending, cancelled, totalAmount },
  "pagination": { page, limit, total, totalPages }
}}
```
→ GP/KCos `/operator/orders` 와 **동일 shape**. 공통 frontend `OperatorOrderStatusPage` wrapper(`{orders, stats, total}`) 가 `data.orders / data.stats / data.pagination.total` 로 매핑 가능.

## 6. view-only 보장

- 공통 헬퍼는 SELECT 전용. mutation endpoint(상태변경/배송/취소/환불/송장/정산/bulk) **추가 0**.
- 새 route 는 `GET /orders` 단일. POST/PUT/PATCH/DELETE 없음.

## 7. mutation 미추가 확인

- 추가된 것: `GET /orders` 1개 + 헬퍼 serviceKey 배열 지원(SELECT only). **어떤 쓰기 경로도 추가하지 않음.**

## 8. DB / migration 무변경 확인

- 엔티티/스키마/migration **변경 0**. 기존 `checkout_orders` 만 read. 신규 테이블/컬럼 없음.

## 9. TypeScript 결과

- `apps/api-server` `tsc --noEmit`: **error 0** (전체). 공통 헬퍼 변경 후에도 GP/KCos 소비처 포함 0 → backward-compatible 확인.

## 10. API smoke 결과 / 보류 사유

- 로컬은 **프로덕션 DB 방화벽 + Cloud Run 의존**으로 직접 호출 불가. main push → CI 배포 후 라이브 검증 권장:
  - 미인증 `GET /api/v1/kpa/operator/orders` → 401
  - 비-operator → 403
  - `kpa:operator` 토큰 → 200 + 위 shape, `?status=&paymentStatus=&search=&page=&limit=` 동작, 빈 결과도 200.
- 정적 검증(typecheck + 코드 경로 정합)으로 1차 확보. 요청 시 배포 후 curl/Playwright 로 smoke.

## 11. GP/KCos/KPA store 주문 화면 회귀 없음 확인

- GP/KCos `/operator/orders`: 헬퍼 string 인자 경로 불변(ANY(1-요소)) → 동작/shape 동일. api-server 전체 typecheck 0 으로 컴파일 회귀 없음.
- KPA store/pharmacy 주문 화면(`/store/commerce/orders`, StoreOrdersPage): 별도 경로·미접촉.
- checkout/order **mutation 경로 무변경**.

## 12. 후속 frontend WO 가능 여부

- ✅ **WO-O4O-KPA-OPERATOR-ORDER-VIEW-FRONTEND-WIRING-V1**: KPA `OrdersPage` thin wrapper(`OperatorOrderStatusPage` + `coreApiClient.get('/kpa/operator/orders')` 또는 kpa apiClient) + `/operator/orders` route + `주문 현황` 메뉴 추가 → KPA parity(상품 현황 + 주문 현황) 완성.
  - 주의: KPA `coreApiClient` base=`/api/v1`(kpa-prefix 없음) → orders 는 `/kpa/operator/orders` 이므로 **`apiClient`**(base `/api/v1/kpa`) 사용 권장(`apiClient.get('/operator/orders', params)`).

---

## 보고 요약

| 항목 | 결과 |
|---|---|
| 사전 git 상태 | 동시 세션 WIP(`glycopharm/store.controller.ts`) 존재 — 미접촉 |
| endpoint | `GET /api/v1/kpa/operator/orders` |
| auth | `authenticate` + `requireKpaScope('kpa:operator')` |
| response shape | GP/KCos 동일(`{success, data:{orders,stats,pagination}}`) |
| serviceKey scope | `IN ('kpa-society','kpa')` (ANY 배열) — KPA 격리 |
| view-only / mutation | 유지 / 추가 0 |
| DB / migration | 무변경 |
| TypeScript | api-server error 0 |
| GP/KCos 회귀 | 없음(additive, typecheck 0) |

*Date: 2026-06-16 · KPA operator orders backend enable · GET /kpa/operator/orders (view-only, kpa:operator) · 공통 operatorOrderQuery 헬퍼 serviceKey 배열 지원 additive(GP/KCos 불변) · serviceKey IN (kpa-society,kpa) · DB/mutation 무변경 · typecheck PASS · 후속: frontend wiring WO.*
