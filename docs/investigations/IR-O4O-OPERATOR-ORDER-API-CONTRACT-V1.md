# IR-O4O-OPERATOR-ORDER-API-CONTRACT-V1

> **유형:** Read-only Investigation Report (조사 전용)
> **상태:** 조사 완료 — 코드/UI/route/menu/API/DB 무수정
> **작성:** 2026-06-07
> **선행:** [IR-O4O-OPERATOR-ORDER-SETTLEMENT-SURFACE-AUDIT-V1](IR-O4O-OPERATOR-ORDER-SETTLEMENT-SURFACE-AUDIT-V1.md) · [WO-O4O-OPERATOR-ORDER-MOCK-SURFACE-GUARD-V1 완료]
> **목적:** GlycoPharm·K-Cosmetics operator 주문 조회·상태변경을 실 API로 구현하기 전에, E-commerce Core / serviceKey / storeId / operator 권한 경계를 조사하고 API contract 방향을 확정

---

## 1. 조사 개요

직전 WO로 GP·K-Cos operator 주문 화면의 가짜/죽은 surface는 차단됐다(K-Cos 준비중 전환, GP 조회 전용 전환). 본 IR은 이를 **실 기능(실데이터 연결)** 으로 올리기 위한 backend contract를 확정한다. 핵심은 "operator가 어떤 데이터 출처에서, 어떤 권한 경계로, 무엇을(조회/상태변경) 할 수 있는가"이다.

**핵심 결론(요약):**
- **추천 contract = 후보 A (View-only operator order API) 우선.** operator는 주문 목록/상세 **조회만**, 상태변경은 분리.
- **데이터 출처는 이미 확정적이다 — 프로덕션 canonical 주문 원장 = `checkout_orders`** (`ecommerce_orders`는 프로덕션 미존재 "relation does not exist"). GP·K-Cos 둘 다 **이미 `checkout_orders WHERE metadata->>'serviceKey'=...` LIST 쿼리가 동작**하므로, operator 조회 엔드포인트는 이 검증된 패턴을 **buyer/store scope → operator scope로 바꿔 재사용**하면 된다. 신규 테이블·신규 모델 불필요.
- **상태변경(confirm/ship/cancel/refund)은 별도 WO로 분리**한다. side effect(배송·정산·환불·재고)가 크고, Neture reference상 상태변경은 **operator가 아니라 store_owner/seller/supplier scope**의 책임이다. operator는 운영·모니터링(조회) 경계.
- **Neture는 "역할 분리"의 reference**(view=operator / 상태변경=supplier / 정산=admin)이나, **데이터 출처는 다르다**(Neture는 자체 `neture_orders` 사용, GP·K-Cos는 E-commerce Core `checkout_orders`). 따라서 Neture에서 빌리는 것은 **role-separation 패턴**이지 데이터 구조가 아니다.
- 엔드포인트 형태는 **후보 D(서비스별 `/{service}/operator/orders`) + 공통 core 쿼리 헬퍼**를 권장(후보 C 공통 `/operator/orders?serviceKey=`는 장기 목표).

---

## 2. 사전 git 상태

| 항목 | 값 |
|------|------|
| branch | `main` |
| HEAD | `e835bc38d` |
| `git status --short` | `M packages/shared-space-ui/src/guide/copy/neture.ts` (**다른 세션 WIP — 미접촉**) |
| origin/main ahead/behind | `0 / 0` |
| 조사 기준 commit | **`e835bc38d`** |

> 본 조사 중 어떤 파일도 수정/삭제하지 않았다. 다른 세션의 작업 파일(`neture.ts`)은 건드리지 않았다. 본 IR 문서 1개만 신규 생성.

---

## 3. 조사 대상 backend / frontend 파일

**E-commerce Core:**
- `packages/ecommerce-core/src/entities/EcommerceOrder.entity.ts` (OrderType/OrderStatus/PaymentStatus enum, 필드)
- `packages/ecommerce-core/src/services/EcommerceOrderService.ts` (create/updateStatus/cancel)
- `packages/ecommerce-core/src/services/EcommerceOrderQueryService.ts` (findByOrderType/findBySellerId/findAll, OrderQueryFilters)
- `apps/api-server/src/entities/checkout/CheckoutOrder.entity.ts` (`checkout_orders` — **프로덕션 canonical**)

**GlycoPharm:**
- `apps/api-server/src/routes/glycopharm/controllers/operator.controller.ts` (recent-orders stub)
- `.../glycopharm/controllers/checkout.controller.ts` (createCoreOrder, LIST 쿼리)
- `.../glycopharm/controllers/pharmacy.controller.ts` (pharmacy orders stub), `invoice.controller.ts`
- `services/web-glycopharm/src/api/glycopharm.ts` (getOperatorOrders, OperatorOrder/Stats 타입)

**K-Cosmetics:**
- `apps/api-server/src/routes/cosmetics/controllers/cosmetics-order.controller.ts` (`/cosmetics/orders`, `checkout_orders` 쿼리)
- `.../cosmetics/controllers/operator-dashboard.controller.ts` (orderMetricsReady)
- `services/web-k-cosmetics/src/api/storeOrders.ts`, `pages/operator/OrdersPage.tsx`(준비중)

**Neture (reference):**
- `apps/api-server/src/modules/neture/controllers/operator-dashboard.controller.ts` (`/operator/orders`)
- `.../neture/controllers/supplier-order.controller.ts` (`PATCH /supplier/orders/:id/status`)
- `.../neture/controllers/admin-settlement.controller.ts` (admin 정산)
- `services/web-neture/src/pages/operator/OrdersManagementPage.tsx` (view-only)

---

## 4. E-commerce Core 주문 구조

**Canonical 엔티티(설계):** `EcommerceOrder` (`EcommerceOrder.entity.ts`)
- 필드: `orderNumber`, `buyerId/buyerType`, `sellerId/sellerType`, `orderType`(enum), `status`(enum), `paymentStatus`(enum), `subtotal/shippingFee/discount/totalAmount`, `currency`, **`storeId`(1급 컬럼)**, `orderSource`, `channel`, `shippingAddress`(jsonb), **`metadata`(jsonb — serviceKey 등 저장)**.
- `OrderStatus`: created / pending_payment / paid / confirmed / processing / shipped / delivered / completed / cancelled / refunded.
- `PaymentStatus`: pending / paid / failed / refunded / partial_refund.
- 생성: `EcommerceOrderService.create()` (CLAUDE.md §4: `checkoutService.createOrder()` 필수, OrderType 불변, `*_orders`/`*_payments` 신규 테이블 금지).
- 상태변경 서비스: `updateStatus(id, status)`(confirmedAt/completedAt/cancelledAt 자동 + 이벤트 emit), `cancel(id, reason)`. **하드 state machine 강제는 없음**(서비스 레이어 자유 전이 → 호출측 검증 필요).
- 쿼리: `EcommerceOrderQueryService` — `findByOrderType / findBySellerId / findByBuyerId / findAll(OrderQueryFilters)`. **serviceKey/storeId 직접 필터 파라미터 없음**(app 레이어 책임).

> ⚠️ **프로덕션 데이터 모델 정정 (contract-critical):**
> `cosmetics-order.controller.ts:648-650` 주석 — *"canonical 주문 원장은 **checkout_orders(CheckoutOrder)** 다. off-contract EcommerceOrder(**ecommerce_orders — 프로덕션 미존재, 'relation does not exist'**)를 제거하고 checkout_orders 기준으로 정렬한다."*
> 즉 설계상 SSOT는 `EcommerceOrder`지만 **프로덕션 실제 원장은 `checkout_orders`** 다. GP `checkout.controller.ts`도 LIST 쿼리를 `checkout_orders + jsonb_array_elements(co.items)`로 정렬했다(주석 486-502). 단 GP에는 `UPDATE ecommerce_orders`(line 790) 잔존 등 **혼재**가 남아 있어, operator 구현 전 "어느 테이블이 실제 원장인지"를 **반드시 확정(F)**해야 한다 — 현재 증거는 **`checkout_orders` 우세**.

**서비스별 주문 표현:**
- GlycoPharm: `OrderType.RETAIL` + `metadata.serviceKey='glycopharm'` (legacy `OrderType.GLYCOPHARM`은 deprecated/신규 BLOCKED, 조회 시 둘 다 OR 처리).
- K-Cosmetics: `OrderType.RETAIL` + `metadata.serviceKey='cosmetics'` (+ `metadata.channel='local'|'travel'`).

---

## 5. GlycoPharm 주문 API 현황

| 항목 | 상태 | 근거 |
|------|------|------|
| operator 주문 조회 | **stub(빈)** | `operator.controller.ts:76-99` recent-orders → `orders:[]` + "migration in progress" |
| pharmacy 주문 조회 | **stub(빈)** | `pharmacy.controller.ts:157-192` `_notice` 동일 |
| 주문 상태변경 API | **부재** | confirm/ship/cancel/refund 엔드포인트 없음(전 scope) |
| invoice/billing | 주문과 **미연결** | `billing-invoice.entity.ts` — orderId 없음. consultation/request count 기반 |
| 실 주문 데이터 존재? | **YES** | `checkout.controller.ts:522` createCoreOrder로 실 주문 생성(serviceKey='glycopharm'), LIST 쿼리(648-655)는 legacy GLYCOPHARM OR RETAIL+serviceKey 둘 다 조회 |
| 프론트 client | `getOperatorOrders` → `/glycopharm/operator/recent-orders` | `glycopharm.ts:511-531`, 타입 `OperatorOrder`(pharmacyName/region/items/totalAmount/status/paymentStatus) |

**판정:** GP는 **실 주문이 원장에 존재**하나 operator/pharmacy **읽기 엔드포인트만 stub**이다. 즉 operator 조회는 "원장(checkout_orders) WHERE serviceKey='glycopharm' (+legacy OrderType) 를 operator scope로 조회"만 구현하면 즉시 실데이터 연결 가능. 상태변경 API는 전무.

---

## 6. K-Cosmetics 주문 API 현황

| 항목 | 상태 | 근거 |
|------|------|------|
| store/buyer 주문 조회 | **존재** | `cosmetics-order.controller.ts` `GET /cosmetics/orders` — **`requireAuth`만, scope 없음**, `checkout_orders WHERE buyerId=$1 AND metadata->>'serviceKey'='cosmetics'`(653-682) → **본인 주문만** |
| operator 주문 조회 | **부재** | `/cosmetics/operator/orders` 없음. operator-dashboard는 KPI만 + `orderMetricsReady` 플래그 |
| 주문 상태변경 API | **부재** | PATCH/PUT/DELETE 주문 엔드포인트 없음 |
| store_owner scope | role 존재(`cosmetics:store_owner`)하나 **주문 접근은 storeId로 키잉되지 않음** | 주문은 buyerId scope만 — 설계 갭 |
| 프론트 | operator OrdersPage=준비중(client import 없음), store `storeOrders.ts`→`/cosmetics/orders` | guard WO 반영 |

**판정:** K-Cos는 **buyerId scope LIST 쿼리가 이미 `checkout_orders + serviceKey` 패턴으로 동작**한다. operator 엔드포인트는 이 쿼리에서 **buyerId 제한을 제거하고 operator scope guard + serviceKey 필터**로 바꾼 **near-clone**이면 된다. ⚠️ 기존 `/cosmetics/orders`를 그대로 operator가 재사용하면 **operator 본인 구매분만** 보이므로 **재사용 불가**(신규 operator 엔드포인트 필요).

---

## 7. Neture operator orders reference

| 관심사 | scope | guard | 엔드포인트 | 변경 |
|--------|-------|-------|-----------|:---:|
| **주문 조회** | operator | `requireNetureScope('neture:operator')` | `GET /operator/orders` (operator-dashboard.controller.ts:328) | ❌ view-only |
| **상태변경** | supplier | `requireActiveSupplier` + 소유권·state machine 검증 | `PATCH /supplier/orders/:id/status` (supplier-order.controller.ts:104-149) | ✅ |
| **정산** | admin | `requireNetureScope('neture:admin')` | `POST/PATCH /admin/settlements/*` | ✅ |

- 데이터 출처: **`neture.neture_orders`(자체 테이블)** — E-commerce Core 아님. 전용 마이그레이션(`20260902500000-CreateNetureOrders.ts`) 존재, `.catch(()=>[])` 방어.
- 프론트 `OrdersManagementPage.tsx`: 실 `api.get('/neture/operator/orders')`, **행/벌크 action 없음** 순수 표시.

**판정:** Neture는 **역할 분리(view=operator / 상태변경=supplier / 정산=admin)의 모범 reference**다. GP·K-Cos는 이 **역할 분리 패턴**을 차용하되, **데이터 출처는 E-commerce Core `checkout_orders`**(Neture의 neture_orders 모델을 복제하지 않는다 — 신규 테이블 금지 §4와도 정합).

---

## 8. 주문 조회 scope 후보

| scope | 의미 | 평가 |
|-------|------|------|
| serviceKey 전체 | 해당 서비스 모든 주문(전 매장) | ✅ **operator 조회의 자연 경계**. operator=서비스 운영자이므로 서비스 전체 모니터링 타당. `metadata->>'serviceKey'` 필터(기존 패턴) |
| storeId 필터 | 특정 매장 주문만 | store_owner 경계(operator 아님). operator는 옵션 필터로만 |
| organizationId 필터 | 조직 단위 | Commerce 도메인은 Boundary상 storeId 1차 경계 — organizationId는 주문에 부차 |
| buyerId | 본인 주문 | store/마이페이지 경계 — operator 부적합(현 /cosmetics/orders 함정) |

**권장:** operator 조회 = **serviceKey 1차 경계**(전 매장) + storeId/status/검색은 옵션 필터. Boundary Policy(Commerce=storeId)와의 충돌은 "operator는 서비스 운영자 → serviceKey 단위 모니터링 권한"으로 정리하고, **serviceKey는 URL 경로에서만 추출**(Guard Rule 4), **raw SQL은 파라미터 바인딩**(Guard Rule 2, 기존 쿼리 준수) 유지.

---

## 9. 주문 상태변경 action 후보

| action | side effect | 권한자(권장) |
|--------|-------------|--------------|
| confirm(주문확인) | 재고 확정·정산 기준 | store_owner/seller (Neture=supplier) |
| ship(배송시작)+tracking | 배송·고객통지 | store_owner/seller |
| cancel(취소) | 환불·재고복원 | store_owner/seller (+ admin 예외) |
| refund(환불) | 결제·정산 역산 | admin/finance (CLAUDE.md: admin=금융) |
| invoice issue | 정산/세금 | admin/finance |

**권장:** **operator는 상태변경 권한 없음(조회·모니터링만)**. 상태변경은 **별도 WO**로 분리하고, Neture reference대로 **store_owner/seller scope**에 부여(refund/invoice는 admin). `EcommerceOrderService.updateStatus`에 하드 state machine이 없으므로 **호출측 전이 검증 + audit 필수**.

---

## 10. 권한 / 보안 경계

- **operator 조회:** `require{Service}Scope('{service}:operator')`, serviceKey 경로 추출, 전 매장 조회. **PII 노출**(buyer 이름/이메일/배송지) → 목록은 마스킹/요약, 상세는 권한·audit 고려.
- **admin vs operator:** admin=구조·정책·**금융(환불/정산/인보이스)**, operator=운영·콘텐츠·**모니터링(주문 조회)** — CLAUDE.md §11 정합. 상태변경 중 금융성(refund/invoice)은 admin.
- **store_owner/seller vs operator:** store_owner=자기 매장 주문 조회+상태처리(배송 등), operator=서비스 전체 조회(상태 미변경). write-path 충돌 방지(operator가 store write-path 침범 금지).
- **bulk 상태변경:** 1차 범위 제외(조회 전용). 상태변경 WO에서 단건 우선, bulk는 후속(BulkResultModal 정렬과 함께).

---

## 11. API contract 후보 비교

| 후보 | 형태 | 장점 | 단점 | 평가 |
|------|------|------|------|:---:|
| **A View-only 우선** | `GET /{service}/operator/orders` | 가장 낮은 위험, side effect 0, 기존 LIST 쿼리 재사용, 프론트 타입 정합 | 상태변경 별도 | **✅ 1차 채택** |
| B operator status action 포함 | A + `PATCH .../orders/:id/status` | 한 번에 기능 | side effect·권한·state machine 설계 부담, operator에 변경권 부여(역할 경계 모호) | 보류(분리) |
| C E-commerce Core 공통 | `/operator/orders?serviceKey=` | 장기 공통화 최선 | cross-service operator guard·serviceKey 스푸핑 방지 설계 필요 | **장기 목표** |
| D 서비스별 유지 | `/glycopharm/operator/orders`·`/cosmetics/operator/orders` | 기존 route/guard/client 정합, 즉시 | 쿼리 로직 중복 가능 | **✅ 1차(+core 헬퍼)** |

---

## 12. 추천 contract

**1차 채택 = 후보 A × 후보 D(+공통 core 쿼리 헬퍼):**

1. **신규 엔드포인트(조회 전용):**
   - `GET /glycopharm/operator/orders` — operator scope, `checkout_orders WHERE metadata->>'serviceKey'='glycopharm' (OR legacy OrderType.GLYCOPHARM)`, status/search/page 필터, 기존 `OperatorOrder`/`OperatorOrderStats` 응답 shape 유지.
   - `GET /cosmetics/operator/orders` — operator scope, `checkout_orders WHERE metadata->>'serviceKey'='cosmetics'`(기존 buyerId scope LIST에서 buyerId 제거 + operator guard), 동일 응답 패턴.
   - 두 엔드포인트는 **E-commerce Core(또는 api-server 공통) 쿼리 헬퍼**(serviceKey + 필터 + 페이지네이션)를 공유해 중복 제거. GP의 legacy stub(`recent-orders`)은 신규 `orders`로 대체 또는 alias.
2. **상태변경은 분리(별도 WO):** operator 미부여. store_owner/seller scope(refund/invoice는 admin), 단건 우선, audit + 전이 검증.
3. **데이터 출처 확정 선행(F):** 구현 착수 전 "`checkout_orders` = 프로덕션 canonical" 확정 및 GP 잔존 `ecommerce_orders` 참조(UPDATE 등) 정리 범위 확인.

**Neture에서 차용:** 역할 분리(view=operator)만. 데이터는 neture_orders 아닌 checkout_orders.

---

## 13. 프론트 적용 순서

1. **1차 — view-only 실데이터 연결:** GP `OrdersPage`(현 조회 전용)·K-Cos `OrdersPage`(현 준비중)를 신규 `/{service}/operator/orders`에 연결. 행/벌크 action 없이 목록·상세·통계만(Neture `OrdersManagementPage`와 동형).
2. **2차 — 상태변경 action:** 상태변경 WO 완료 후 store_owner scope 화면에 단건 action 추가(operator 화면은 조회 유지 또는 권한 분기).
3. **3차 — ActionBar/BulkResultModal 정렬:** 상태변경이 bulk로 확장될 때 RECHECK IR의 공통 흐름과 정렬.
4. **4차 — 정산/인보이스:** K-Cos 정산 데이터 모델 IR(`IR-O4O-SETTLEMENT-INVOICE-DATA-MODEL-DESIGN-V1`) 이후.

---

## 14. backend 구현 WO 후보

- **WO 후보 1 (선행, F 해소):** `IR/WO-O4O-ORDER-CANONICAL-TABLE-CONFIRM-V1` — 프로덕션 주문 원장(`checkout_orders` vs `ecommerce_orders`) 확정, GP 잔존 `ecommerce_orders` 참조 정리 범위 결정. (read 검증은 `gcloud sql`로 테이블 실재 확인 가능)
- **WO 후보 2 (1차):** `WO-O4O-OPERATOR-ORDER-VIEW-API-V1` — `GET /{glycopharm,cosmetics}/operator/orders` 조회 전용 구현(공통 core 쿼리 헬퍼, serviceKey 필터, operator guard, 페이지네이션/검색/상태). 상태변경 미포함.
- **WO 후보 3 (후속, 분리):** `WO-O4O-STORE-ORDER-STATUS-ACTION-V1` — store_owner/seller scope 상태변경(confirm/ship/cancel) + 전이 검증 + audit. refund/invoice는 admin scope 별도.

---

## 15. frontend 연결 WO 후보

- **WO 후보 4 (1차, WO2 직후):** `WO-O4O-OPERATOR-ORDER-VIEW-FRONTEND-WIRE-V1` — GP·K-Cos operator OrdersPage를 신규 view API에 연결(준비중/조회전용 → 실데이터 목록). 행/벌크 action 미추가.
- **WO 후보 5 (후속):** 상태변경 store_owner 화면 연결(WO3 이후), 이어서 ActionBar/BulkResultModal 정렬.

---

## 16. 위험 요소

1. **canonical 테이블 혼재(최우선 F):** `checkout_orders`(프로덕션) vs `ecommerce_orders`(설계 SSOT, 프로덕션 "relation does not exist") + GP 잔존 `UPDATE ecommerce_orders`. 잘못된 테이블 조회 시 빈 결과/에러. → 구현 전 확정 필수.
2. **PII 노출:** operator가 전 매장 buyer 개인정보·배송지 조회 → 목록 마스킹/요약 + audit.
3. **serviceKey 스푸핑:** 경로에서만 추출, 쿼리 파라미터 바인딩(Guard Rule 2·4).
4. **Boundary 충돌:** Commerce 1차 경계=storeId인데 operator는 serviceKey 전체 조회 → "operator=서비스 운영자" 예외를 명문화(cross-store 조회는 operator 권한 한정).
5. **상태변경 side effect:** state machine 미강제 → 잘못 전이 시 배송/정산/환불 오류. operator에 변경권 부여 금지, store_owner/admin scope + 검증.
6. **K-Cos 기존 `/cosmetics/orders` 오재사용:** buyerId scope라 operator가 쓰면 본인 구매분만 노출 → 신규 엔드포인트 필수.
7. **GP invoice/billing 비-주문 기반:** 주문-인보이스 연결은 별도 설계(현재 consultation/request count 기반).

---

## 17. Current Structure vs O4O Philosophy Conflict Check

| 점검 항목 | 결과 |
|-----------|------|
| 주문 canonical source가 명확한가 | **부분 — F.** 프로덕션 `checkout_orders` 우세하나 `ecommerce_orders` 설계 SSOT와 혼재. 구현 전 확정 필요. 단 LIST 쿼리는 이미 checkout_orders로 정렬됨. |
| operator 조회 scope가 철학과 맞는가 | **YES.** operator=서비스 운영·모니터링(§11) → serviceKey 전체 조회가 자연 경계. storeId 1차 경계는 store_owner용. |
| 상태변경 권한 경계가 안전한가 | **YES(권장안).** operator=조회, 상태변경=store_owner/seller, 금융(refund/invoice)=admin. Neture reference와 CLAUDE.md(admin=금융) 정합. |
| E-commerce Core 계약 준수하는가 | **YES.** 신규 `*_orders` 테이블 금지(§4) → checkout_orders 재사용, 생성은 `createOrder` 경로 유지. Neture식 자체 테이블 복제 회피. |
| view-only 우선이 안전한가 | **YES.** side effect 0, 기존 검증된 쿼리 재사용, 프론트 타입 정합. 상태변경의 큰 side effect를 분리해 단계적 도입. |
| store_owner/operator/supplier 경계를 섞지 않았는가 | **YES.** operator=조회 전용으로 store write-path 비침범. Neture supplier 상태변경과 operator 조회 분리 패턴 차용. |
| 공통화가 유지보수성을 높이는가 | **YES.** 서비스별 엔드포인트(D)라도 core 공통 쿼리 헬퍼로 중복 제거, 장기 후보 C(공통 API)로 수렴 가능. |

**결론:** operator 주문은 **view-only(후보 A)부터 실데이터 연결**하는 것이 거의 확실히 옳다. 데이터 출처는 신규 모델이 아니라 **이미 동작하는 `checkout_orders + serviceKey` 패턴을 operator scope로 재사용**하면 되고, 상태변경은 side effect가 크므로 **store_owner/admin scope의 별도 WO로 분리**한다. 단 1순위 선행 과제는 **프로덕션 주문 원장(`checkout_orders`) 확정(F)** 이다.

---

## 최종 보고 요약

- **수정 파일:** 없음 (read-only). 본 IR 1개 문서만 생성. 다른 세션 WIP(`neture.ts`) 미접촉.
- **생성 IR 경로:** `docs/investigations/IR-O4O-OPERATOR-ORDER-API-CONTRACT-V1.md`
- **조사 기준 commit:** `e835bc38d`
- **GP/K-Cos operator 주문 API 현황:** 둘 다 operator 조회 API·상태변경 API **부재**(GP는 stub, K-Cos는 buyerId-scope store API만). 단 **실 주문은 `checkout_orders`에 serviceKey로 존재**.
- **Neture reference 적용:** **역할 분리 패턴만 차용**(view=operator/상태변경=supplier/정산=admin). 데이터 출처는 checkout_orders(neture_orders 복제 안 함).
- **추천 contract:** **후보 A(view-only) × 후보 D(서비스별)+공통 core 헬퍼.** `GET /{service}/operator/orders` operator scope, `checkout_orders WHERE serviceKey=...`.
- **view-only 우선 여부:** **예** — 1차는 조회만 실연결.
- **상태변경 분리 여부:** **예** — store_owner/seller(금융=admin) scope 별도 WO.
- **backend 선행 WO:** (1) 주문 canonical 테이블 확정(F) → (2) operator view API → (3) store 상태변경 API.
- **frontend 연결 WO:** operator OrdersPage view API 연결 → 이후 상태변경/Bulk 정렬.
- **git status:** clean(내 변경 0, 다른 세션 `neture.ts`만 modified — 미접촉).
