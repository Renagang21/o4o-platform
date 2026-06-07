# IR-O4O-ORDER-CANONICAL-TABLE-CONFIRM-V1

> **유형:** Read-only Investigation Report (조사 전용)
> **상태:** 조사 완료 — 코드/UI/route/menu/API/DB write 무수정
> **작성:** 2026-06-07
> **선행:** [IR-O4O-OPERATOR-ORDER-API-CONTRACT-V1](IR-O4O-OPERATOR-ORDER-API-CONTRACT-V1.md) (선행 F)
> **목적:** GP·K-Cos operator 주문 조회 API 구현 전에 실제 주문 원장 canonical table을 확정

---

## 1. 조사 개요

contract IR가 "operator view-only API는 `checkout_orders + metadata.serviceKey` 패턴 재사용"을 권장하면서, `ecommerce_orders` 잔존 참조 정리(F)를 선행 과제로 남겼다. 본 IR은 그 F를 닫는다 — **실제 프로덕션 주문 원장이 무엇인지** 코드·마이그레이션·(가능 시)프로덕션 DB로 확정한다.

**핵심 결론(요약):**
- **canonical 프로덕션 주문 원장 = `checkout_orders` (확정, 코드+마이그레이션 근거).** `ecommerce_orders`는 **CREATE 마이그레이션이 없어 프로덕션에 미존재**(엔티티/코드만 존재). 다수 코드 주석·NO-OP 마이그레이션이 "ecommerce_orders 프로덕션 미존재, 'relation does not exist'"를 명시.
- ⚠️ **예상보다 큰 문제 발견:** GP·K-Cos의 **주문 생성(create) 경로가 `EcommerceOrder`(=ecommerce_orders, 미존재 테이블)** 를 향한다. GP는 create+list+get 전부 ecommerce_orders, K-Cos는 create=ecommerce_orders / list·get=checkout_orders로 **create↔read가 갈린다.** 즉 잔존 참조 cleanup 수준이 아니라 **주 경로의 테이블 라우팅 불일치**다.
- 따라서 operator view API를 `checkout_orders`에 올리는 방향은 맞으나, **GP·K-Cos의 create/list 경로를 checkout_orders로 정렬하는 cleanup이 선행되어야** operator view가 실데이터를 보여줄 수 있다(현재 구조상 GP/K-Cos 주문은 checkout_orders에 적재되지 않거나 생성 자체가 실패).
- **프로덕션 DB read-only 검증은 시도했으나 환경 방화벽으로 차단**(TCP 5432 timeout, `gcloud sql connect` psql leg도 sandbox egress 미도달). → "운영 DB read-only 확인 필요"로 기록(§4). 단 **테이블 존재 여부는 마이그레이션 근거로 확정 가능**하며, 미확인 항목은 "checkout_orders의 glycopharm/cosmetics 실제 row 분포"뿐이다.
- **최종 판정 = C + D**: canonical=checkout_orders 확정이나, create/list 혼재 **cleanup WO 선행 필요(C)** + 운영 DB 실측 확인 권장(D, 환경상 미수행).

---

## 2. 사전 git 상태

| 항목 | 값 |
|------|------|
| branch | `main` |
| HEAD | `8934c62d92` |
| `git status --short` | neture supplier 4파일 modified (**다른 세션 WIP — 미접촉**) |
| origin/main ahead/behind | `0 / 0` |
| 조사 기준 commit | **`8934c62d92`** |

> 본 조사 중 코드/UI/route/DB write/migration 무수정. 다른 세션 WIP(neture supplier) 미접촉. 본 IR 1개 문서만 신규 생성. 프로덕션 DB는 read-only SELECT만 시도(아래 §4, 실제 미도달).

---

## 3. 조사 대상 파일

- **Entity:** `apps/api-server/src/entities/checkout/CheckoutOrder.entity.ts`(`@Entity('checkout_orders')`) · `packages/ecommerce-core/src/entities/EcommerceOrder.entity.ts`(`@Entity('ecommerce_orders')`)
- **Migration:** `…/migrations/20260414100000-CreateCheckoutTables.ts`(checkout_orders CREATE) · `20260218000001-AddSellerOrganizationIdToCheckoutOrders.ts` · `20261102000000-AlignCheckoutOrdersSchemaContract.ts` · `20260212000002-AddStoreAttributionToEcommerceOrders.ts`(NO-OP) · `20260224500000-AddEcommerceOrdersServiceKeyIndex.ts`(NO-OP) · `1739700000000-NormalizePhoneNumbers.ts`(`UPDATE ecommerce_orders`)
- **GP:** `routes/glycopharm/controllers/checkout.controller.ts`(createCoreOrder/list/get/cleanup), `operator.controller.ts`(recent-orders stub)
- **K-Cos:** `routes/cosmetics/controllers/cosmetics-order.controller.ts`(createCoreOrder/list/get), `action-definitions.ts`(action-queue count)
- **공통:** `database/connection.ts`(엔티티 등록), `services/checkout.service.ts`(CheckoutOrder), `routes/cosmetics/.../order-metrics-fallback.ts`(방어 주석)
- **Frontend(reference):** GP/K-Cos `OrdersPage.tsx`, Neture `OrdersManagementPage.tsx`

---

## 4. 프로덕션 DB read-only 검증 가능 여부

**시도:** `o4o-platform-db`(POSTGRES_15, 34.64.96.252, db `o4o_platform`) 대상으로 read-only SELECT(테이블 존재/count/serviceKey 분포)를 (1) `gcloud sql connect`(IP allowlist 후 psql), (2) 직접 `psql -h 34.64.96.252`(SSL) 두 경로로 시도.

**결과: 미도달(차단).**
- `gcloud sql connect`: "Allowlisting your IP …done. Connecting…"까지 진행 후 psql 단계에서 **무응답(hang)** — sandbox egress가 5432로 도달하지 못함.
- 직접 psql: **`Connection timed out` (TCP 34.64.96.252:5432)** — CLAUDE.md §0 명시(프로덕션 DB 방화벽 직접 TCP 차단)와 일치.

**판정:** WO 규정대로 **"운영 DB read-only 확인 필요"로 기록하고 코드/마이그레이션 근거로 판정**한다. 단 **테이블 존재 여부는 마이그레이션으로 확정 가능**(아래 §5·§6)하므로 핵심 결론에는 영향 없음. 미확인으로 남는 단 하나는 **"checkout_orders 내 glycopharm/cosmetics serviceKey row 실제 분포"**다(operator view가 당장 비어있을지 여부 확인용).

> 후속 실측 방법(권장): `o4o-api-migrations` Cloud Run job 환경 또는 배포된 api-server의 진단(SSR/health) 엔드포인트에서 read-only로 `information_schema.tables` + `checkout_orders` serviceKey count를 노출해 확인. (CLAUDE.md §8 디버그 JSON 페이지 패턴 활용 가능)

---

## 5. checkout_orders 구조

**Entity:** `CheckoutOrder.entity.ts` — `@Entity('checkout_orders')`. 필드: `id`, `orderNumber`(unique), `buyerId`, `sellerId`(varchar100), `supplierId`(nullable), `sellerOrganizationId`, `partnerId`, `subtotal/shippingFee/discount/totalAmount`, `status`(created/pending_payment/paid/refunded/cancelled), `paymentStatus`(pending/paid/failed/refunded), `paymentMethod`, **`shippingAddress`(jsonb — recipientName/phone/zip/address)**, **`items`(jsonb, NOT NULL — productId/productName/quantity/unitPrice/subtotal 배열)**, **`metadata`(jsonb)**, `paidAt/refundedAt/cancelledAt`, `createdAt/updatedAt`. 관계: `payments`(→checkout_payments), `logs`(→checkout_order_logs).

**마이그레이션(프로비저닝 확정):**
- `20260414100000-CreateCheckoutTables.ts` → **CREATE TABLE checkout_orders**(+ checkout_payments, checkout_order_logs). ✅ 프로덕션 존재.
- `20260218000001` → sellerOrganizationId 컬럼 추가. `20261102000000` → `order_type` 컬럼(GENERIC/DROPSHIPPING/GLYCOPHARM/COSMETICS/TOURISM) 추가 + supplierId nullable.

**TypeORM 등록:** `connection.ts`에 CheckoutOrder/CheckoutPayment/OrderLog 등록.

**operator list 필요 필드 충족도:** orderNumber/status/paymentStatus/totalAmount/items(jsonb→itemCount)/metadata(serviceKey/channel/pharmacy)/buyerId/createdAt 모두 존재 → **operator view 응답에 충분**. (items가 jsonb이므로 `jsonb_array_elements`로 수량 집계, 기존 GP sales-limit·K-Cos list가 이 패턴 사용.)

---

## 6. ecommerce_orders 구조

**Entity:** `EcommerceOrder.entity.ts` — `@Entity('ecommerce_orders')`. 필드: orderType(enum: RETAIL/DROPSHIPPING/B2B/SUBSCRIPTION/GLYCOPHARM(deprecated)/LMS), status(created…refunded), paymentStatus, **`storeId`(1급 컬럼)**, channel, metadata, items(→EcommerceOrderItem 관계). 설계상 SSOT(판매 원장)로 의도됨.

**마이그레이션(프로비저닝): 없음 — 프로덕션 미존재.**
- **CREATE TABLE ecommerce_orders 마이그레이션 부재**(전 마이그레이션 grep 결과 `Create…EcommerceOrders` 없음).
- `20260212000002-AddStoreAttributionToEcommerceOrders.ts` → **NO-OP**("ecommerce_orders table does not exist").
- `20260224500000-AddEcommerceOrdersServiceKeyIndex.ts` → **NO-OP**(동일).
- `1739700000000-NormalizePhoneNumbers.ts` → `UPDATE "ecommerce_orders"` 포함(테이블 부재 시 무효/방어).

**TypeORM 등록:** `connection.ts`에 EcommerceOrder/Item/Payment **등록은 됨**(엔티티 클래스 가용)하나 **synchronize off + CREATE 마이그레이션 부재 → 런타임 테이블 없음** → 쿼리 시 PG 42P01("relation does not exist").

**명시적 미존재 증거:**
- `cosmetics-order.controller.ts:649` 주석: *"(ecommerce_orders — 프로덕션 미존재, 'relation does not exist')를 제거하고 checkout_orders 기준으로 정렬한다."*
- `order-metrics-fallback.ts:8-11` 주석: *"ecommerce_orders / ecommerce_order_items 테이블은 production 에 존재하지 않는다(CREATE TABLE migration 부재). canonical 주문 테이블은 checkout_orders이며, ecommerce_orders 참조 클러스터는 추후 구조 정렬 대상."*

**판정:** `ecommerce_orders`는 **설계 SSOT이나 런타임/프로덕션 미존재**. 이를 향하는 코드는 전부 실패 또는 방어 fallback 경로.

---

## 7. GlycoPharm 주문 생성·조회 흐름

| 경로 | 대상 테이블 | 근거 |
|------|-------------|------|
| **CREATE** (`createCoreOrder`) | **ecommerce_orders** (`getRepository(EcommerceOrder)`) | `checkout.controller.ts:170,192` `orderRepo.save(order)`. metadata.serviceKey='glycopharm', OrderType.RETAIL |
| **LIST** (`GET /checkout/orders`) | **ecommerce_orders** (`getRepository(EcommerceOrder)` QueryBuilder) | `checkout.controller.ts:643-660` — buyerId + (OrderType.GLYCOPHARM OR RETAIL+serviceKey) |
| **GET** (`/checkout/orders/:id`) | **ecommerce_orders** | `checkout.controller.ts:711-724` 동일 패턴 |
| **CLEANUP UPDATE** (`/checkout/cleanup-expired`) | **ecommerce_orders** (raw SQL) | `checkout.controller.ts:789-798` `UPDATE ecommerce_orders …` |
| **sales-limit count** | **checkout_orders** (raw SQL) | `checkout.controller.ts:~502` `FROM checkout_orders co, jsonb_array_elements(co.items)` |
| operator 조회 | (stub, 테이블 무관) | `operator.controller.ts:80-92` 빈 배열 |

**판정:** GP는 **주문 주 경로(create/list/get/cleanup)가 전부 ecommerce_orders(미존재)** 를 향한다 → 프로덕션에서 **생성·조회 모두 42P01 실패** 가능. 유일하게 동작하는 checkout_orders 접근은 sales-limit 카운트뿐. metadata.serviceKey='glycopharm'은 create 시 항상 설정되고 legacy OrderType.GLYCOPHARM도 OR 처리되어 **serviceKey 필터는 안정적**이나, **데이터가 향하는 테이블 자체가 미존재**라 필터 안정성은 부차적 문제.

---

## 8. K-Cosmetics 주문 생성·조회 흐름

| 경로 | 대상 테이블 | 근거 |
|------|-------------|------|
| **CREATE** (`createCoreOrder`) | **ecommerce_orders** (`getRepository(EcommerceOrder)`) | `cosmetics-order.controller.ts:344,368` `orderRepo.save(order)`. metadata.serviceKey='cosmetics' + channel |
| **LIST** (`GET /cosmetics/orders`) | **checkout_orders** (raw SQL) | `cosmetics-order.controller.ts:~699` `FROM checkout_orders co WHERE buyerId=$1 AND metadata->>'serviceKey'='cosmetics'` |
| **GET** (`/cosmetics/orders/:id`) | **checkout_orders** (raw SQL) | `~771` 동일 + buyerId scope |
| **action-queue count** | **checkout_orders** | `action-definitions.ts:34-37` `FROM checkout_orders WHERE serviceKey='cosmetics' AND status='paid'` |

**판정:** K-Cos는 **create=ecommerce_orders(미존재) ↔ list/get=checkout_orders로 정면 분리**. POST로 만든 주문은 미존재 테이블 대상이라 실패하거나, 설령 적재돼도 list(checkout_orders)에서 안 보임. **list/get/action-queue는 이미 checkout_orders + serviceKey 패턴**이라 **읽기 측은 올바른 방향**. operator 조회 시 **buyerId 제한만 제거 + operator guard**로 near-clone 가능(읽기 한정). 단 **create가 checkout_orders로 적재되지 않으면 읽을 데이터가 없음.**

---

## 9. checkout_orders vs ecommerce_orders 비교

| 기준 | checkout_orders | ecommerce_orders |
|------|:---:|:---:|
| 프로덕션 테이블 존재 | ✅ (CREATE migration 20260414100000) | ❌ (CREATE migration 부재, NO-OP 2건 + "미존재" 주석) |
| Entity 정의 | ✅ api-server | ✅ ecommerce-core 패키지 |
| TypeORM 등록 | ✅ | ✅ (등록되나 테이블 없음 → 42P01) |
| 실제 INSERT 경로 | KPA checkout(checkoutService) | **GP·K-Cos createCoreOrder (→실패 위험)** |
| 실제 SELECT 경로 | K-Cos list/get, cosmetics action-queue, GP sales-limit | **GP list/get (→실패 위험)** |
| GP/K-Cos operator view 적용성 | ✅ (서비스 격리 serviceKey 패턴 존재) | ❌ |
| 미래 E-commerce Core 정렬 | 현 canonical, 후속 정렬 대상 | 설계 SSOT(미실현) |
| 위험 | 낮음(존재) | 높음(미존재 향한 주 경로) |

**판정:** **canonical = checkout_orders.** ecommerce_orders는 정리(또는 향후 정식 도입 결정) 대상.

---

## 10. metadata.serviceKey 안정성

- **GP:** create 시 `metadata.serviceKey='glycopharm'` 항상 설정. legacy `OrderType.GLYCOPHARM`도 조회에서 OR 처리 → serviceKey 누락 주문도 OrderType로 포착. **안정적.**
- **K-Cos:** create 시 `metadata.serviceKey='cosmetics'` 항상 설정. legacy OrderType 대응 없음 → **serviceKey 누락 레거시 주문이 있다면 누락 가능**(현재 create가 checkout_orders로 안 가므로 실질 영향 미미, 실측 필요 §4).
- **공통:** raw SQL은 `metadata->>'serviceKey' = $param` **파라미터 바인딩**(기존 코드 준수, Guard Rule 2). operator view에서도 serviceKey는 **URL 경로/권한에서 결정**(Guard Rule 4), 쿼리 파라미터 신뢰 금지.

**판정:** serviceKey는 operator view 필터로 **안정적**. 단 K-Cos legacy 누락 가능성은 실측(§4) 또는 fallback(OrderType/null 포함) 검토.

---

## 11. operator view API 구현 가능성

**판정 = C + D.**

- **C (혼재 — cleanup WO 선행 필요):** canonical은 checkout_orders로 명확하나, **GP·K-Cos의 create/list/get 주 경로가 ecommerce_orders(미존재)** 를 향하는 혼재가 있어, operator view를 checkout_orders에 올려도 **데이터가 없을 수 있다**(create가 checkout_orders로 적재되지 않음). 따라서 **GP·K-Cos 주문 create/list/get 경로를 checkout_orders(CheckoutOrder/checkoutService)로 정렬하는 cleanup이 선행/동반**되어야 operator view가 의미를 갖는다.
- **D (운영 DB 확인 필요):** "checkout_orders에 glycopharm/cosmetics serviceKey row가 실제로 존재하는가"는 환경 방화벽으로 미확인(§4). 이 한 가지가 "cleanup 후 즉시 데이터가 보이는지 / 과거 데이터 마이그레이션도 필요한지"를 좌우.

> 즉 contract IR의 "view API 가능, 일부 cleanup"보다 **cleanup 비중이 크다.** 다만 읽기 패턴(checkout_orders + serviceKey)은 K-Cos·action-queue·GP sales-limit에서 **이미 검증**되어 있어, operator view 쿼리 자체의 기술 리스크는 낮다.

---

## 12. 잔존 legacy 참조 (정리 대상)

| # | 위치 | 참조 | 성격 |
|---|------|------|------|
| 1 | GP `checkout.controller.ts:170/192` create | EcommerceOrder.save | **주 경로 — 재정렬 필요** |
| 2 | GP `checkout.controller.ts:643-660` list | EcommerceOrder QB | **주 경로 — 재정렬 필요** |
| 3 | GP `checkout.controller.ts:711-724` get | EcommerceOrder QB | **주 경로 — 재정렬 필요** |
| 4 | GP `checkout.controller.ts:789-798` cleanup | `UPDATE ecommerce_orders` | dead/실패 — 정리 |
| 5 | K-Cos `cosmetics-order.controller.ts:344/368` create | EcommerceOrder.save | **주 경로 — 재정렬 필요** |
| 6 | `GlycopharmPaymentEventHandler.ts`, `KCosmeticsPaymentEventHandler.ts`, `LmsPaymentEventHandler.ts` | getRepository(EcommerceOrder) | dead(42P01) — 정리 |
| 7 | 마이그레이션 `20260212000002`, `20260224500000` | ecommerce_orders ALTER | NO-OP(이미 무해) |
| 8 | `1739700000000-NormalizePhoneNumbers.ts` | `UPDATE ecommerce_orders` | 무효/방어 |
| 9 | `packages/ecommerce-core` EcommerceOrder 엔티티군 | — | 설계 SSOT — 폐기 vs 정식도입 결정 필요(별도) |

---

## 13. 최종 판정

1. **canonical 프로덕션 주문 원장 = `checkout_orders` (확정).** 근거: 유일한 CREATE 마이그레이션 보유, ecommerce_orders는 CREATE 부재 + NO-OP 2건 + 명시적 "프로덕션 미존재" 주석.
2. **operator view API는 checkout_orders 기준으로 구현.** 쿼리 패턴(`checkout_orders WHERE metadata->>'serviceKey'=...`)은 기존 검증됨.
3. **그러나 GP·K-Cos의 create/list/get 주 경로가 ecommerce_orders(미존재)를 향하는 혼재가 있어, cleanup(create/list/get → checkout_orders 정렬)이 선행/동반 필요(C).**
4. **프로덕션 DB 실측 미수행(환경 방화벽) — "확인 필요"(D).** 미확인 항목은 checkout_orders 내 glycopharm/cosmetics row 분포 1건뿐. 테이블 존재 여부는 마이그레이션으로 확정.
5. 신규 주문 테이블 생성은 **불필요·금지**(§4 E-commerce Core 규칙) — checkout_orders 재사용.

---

## 14. 후속 WO 후보

- **WO 후보 1 (선행, 최우선):** `WO-O4O-SERVICE-ORDER-CHECKOUT-TABLE-ALIGN-V1` — GP·K-Cos 주문 create/list/get을 `EcommerceOrder(ecommerce_orders)` → `checkout_orders`(CheckoutOrder / checkoutService.createOrder) 로 정렬. dead EcommerceOrder 핸들러(payment handler 3종)·cleanup UPDATE 정리. **이것이 operator view의 실데이터 전제.**
- **WO 후보 2 (실측, 병행 가능):** 운영 DB read-only 확인 — `o4o-api-migrations` job 또는 진단 엔드포인트로 `information_schema.tables`(checkout_orders/ecommerce_orders) + checkout_orders serviceKey count 확인(§4). 결과에 따라 과거 데이터 마이그레이션 필요 여부 판단.
- **WO 후보 3 (contract IR의 WO2):** `WO-O4O-OPERATOR-ORDER-VIEW-API-V1` — `GET /{glycopharm,cosmetics}/operator/orders` 조회 전용(checkout_orders + serviceKey, operator guard). **WO1 이후 또는 동반.**
- **WO 후보 4:** `WO-O4O-OPERATOR-ORDER-VIEW-FRONTEND-WIRE-V1` — operator OrdersPage 실연결.
- **결정 필요(별도):** `packages/ecommerce-core` EcommerceOrder 설계 SSOT를 폐기할지/정식 도입(ecommerce_orders 마이그레이션 신설)할지 — 플랫폼 차원 결정. 본 IR 범위 밖이나 명시 기록.

---

## 15. Current Structure vs O4O Philosophy Conflict Check

| 점검 항목 | 결과 |
|-----------|------|
| 신규 주문 테이블을 만들지 않고 기존 canonical 원장을 재사용하는가 | **YES.** checkout_orders 재사용 확정, 신규 테이블 불필요(§4 금지 정합). ecommerce_orders 신설은 별도 결정사항. |
| operator 조회가 서비스 운영/모니터링 역할에 맞는가 | **YES.** operator view는 serviceKey 단위 조회(§11 contract IR). |
| store_owner/seller write-path와 operator read-path를 섞지 않는가 | **YES(권장안).** operator=checkout_orders read 전용. 단 **현 코드의 create/read 테이블 혼재는 철학 이전의 정합성 버그** — cleanup으로 해소. |
| 상태변경 side effect를 이번 단계에 섞지 않는가 | **YES.** 본 IR·view API는 조회 전용. 상태변경은 별도 WO. |
| serviceKey 필터가 query parameter 신뢰가 아니라 서버 경로/권한에서 결정되는가 | **권장 준수.** URL 경로 추출 + 파라미터 바인딩(Guard 2·4). |
| PII를 불필요하게 조회/노출하지 않는가 | **YES.** 본 조사 DB 쿼리는 schema/count/serviceKey 분포만 설계(실제 미도달). operator view는 목록 마스킹/요약 권장(contract IR §10). |

**결론:** **canonical = `checkout_orders` 확정.** operator view API는 checkout_orders 기준으로 가는 것이 맞으나, contract IR가 예상한 "소규모 잔존 cleanup"보다 큰 **create/list 테이블 라우팅 불일치(GP·K-Cos 주 경로가 미존재 ecommerce_orders 지향)** 가 확인되어, **service order create/list → checkout_orders 정렬(WO1)이 operator view(WO3)의 실데이터 전제**다. 프로덕션 DB 실측은 환경 방화벽으로 미수행("확인 필요") — 단 테이블 존재는 마이그레이션으로 확정, 미확인은 row 분포 1건.

---

## 최종 보고 요약

- **수정 파일:** 없음 (read-only). 본 IR 1개 문서만 생성. 다른 세션 WIP 미접촉. DB write/migration 없음.
- **생성 IR 경로:** `docs/investigations/IR-O4O-ORDER-CANONICAL-TABLE-CONFIRM-V1.md`
- **조사 기준 commit:** `8934c62d92`
- **프로덕션 DB read-only 검증 수행 여부:** **시도했으나 미도달(방화벽/egress 차단)** → "운영 DB read-only 확인 필요"로 기록(§4). 테이블 존재는 마이그레이션 근거로 확정.
- **checkout_orders 존재:** **YES** (CREATE migration `20260414100000`).
- **ecommerce_orders 존재:** **NO** (CREATE migration 부재 + NO-OP 2건 + 명시 주석).
- **GP 주문 흐름 판정:** create/list/get/cleanup **전부 ecommerce_orders(미존재)** 지향 — 정렬 필요. sales-limit count만 checkout_orders.
- **K-Cos 주문 흐름 판정:** create=ecommerce_orders(미존재) ↔ list/get/action-queue=checkout_orders — **create↔read 분리, 정렬 필요.**
- **metadata.serviceKey 안정성:** create 시 항상 설정·필터 안정(K-Cos legacy 누락 가능성은 실측 권장). 파라미터 바인딩 준수.
- **canonical table 최종 판정:** **`checkout_orders` (확정).**
- **operator view API 구현 가능 여부:** 가능하되 **C(cleanup 선행) + D(DB 실측 권장).**
- **cleanup 선행 필요:** **YES** — WO1(service order create/list → checkout_orders 정렬)이 operator view 전제.
- **후속 WO 후보:** §14 (1 정렬 cleanup → 2 DB 실측 → 3 operator view API → 4 frontend wire).
- **git status:** clean(내 변경 0, 다른 세션 neture supplier 4파일만 modified — 미접촉).
