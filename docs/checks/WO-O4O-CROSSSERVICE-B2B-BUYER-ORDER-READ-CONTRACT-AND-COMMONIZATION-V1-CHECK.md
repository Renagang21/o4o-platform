# WO-O4O-CROSSSERVICE-B2B-BUYER-ORDER-READ-CONTRACT-AND-COMMONIZATION-V1 — CHECK

- 대상 서비스: **KPA Society / GlycoPharm / K-Cosmetics** (3-service Core)
- 종결 대상: **DF-1** (매장 주문 조회 경로 불일치) · **DF-4** (buyer 주문 조회 controller 3벌)
- 미실행 확인: **DF-2 / DF-3** — 본 WO §20 에 따라 손대지 않았다
- 범위: **조회(read) 전용**. 생성 · 결제 · 공급자 처리 · 배송 · 취소 경로는 변경하지 않았다 (§19)

> 결론 한 줄: 경로 이름을 맞춘 작업이 아니라, **세 서비스가 동일한 buyer-order read 의미 · ownership · response 계약을 하나의 Core 에서 쓰게 만든** 작업이다.

---

## 1. §5 census — 현 main 재확인 결과

`git pull --ff-only origin main` 기준으로 다시 조사했다. 과거 CHECK 결과를 전제하지 않았다.

| 축 | KPA Society | GlycoPharm | K-Cosmetics |
|---|---|---|---|
| 목록 | `GET /api/v1/kpa/checkout/orders` | `GET /api/v1/glycopharm/checkout/orders` | `GET /api/v1/cosmetics/orders` |
| 상세 | `.../orders/:orderId` | `.../orders/:orderId` | `/orders/:id` (`param('id').isUUID()`) |
| 취소(참고, 본 WO 범위 밖) | `POST .../orders/:orderId/cancel` | 동일 | `POST /orders/:id/cancel` |
| controller | `routes/kpa/controllers/kpa-checkout.controller.ts` | `routes/glycopharm/controllers/checkout.controller.ts` | `routes/cosmetics/controllers/cosmetics-order.controller.ts` |
| guard | `requireAuth` | `requireAuth` (`/cleanup-expired` 만 `glycopharm:operator`) | `requireAuth` |
| serviceKey 결정 | `getBuyerOrderServiceKeys(KPA_SOCIETY)` | `…(GLYCOPHARM)` | `…(K_COSMETICS)` |
| buyer 소유권 | `buyerId = 인증 사용자 id` | 동일 | 동일 |
| query filter | page/limit | page/limit | page/limit + channel/status/guide/tourSession/taxRefund |
| 오류 shape | `{error:{code,message,details}}` | 동일 | 동일 |
| frontend 소비자 | `api/checkout.ts` → `pages/pharmacy/StoreOrdersPage.tsx` | `api/pharmacy.ts` → `pages/store-management/PharmacyOrders.tsx` | `api/storeOrders.ts` → `pages/store/StoreOrdersPage.tsx` |

**`UNKNOWN = 0`, `UNJUDGED = 0`.**

`getBuyerOrderServiceKeys()` 가 실제 SSOT 임을 현 main 에서 재확인했다 (§16). 산출 집합:

- KPA `['kpa-society','kpa','kpa-groupbuy']`
- GlycoPharm `['glycopharm','glycopharm-event-offer']`
- K-Cosmetics `['cosmetics','k-cosmetics-event-offer']` — **`'cosmetics' ≠ 'k-cosmetics'`** (literal 재작성 금지의 실제 이유)

---

## 2. §6 canonical 의미 판정

| 축 | 판정 |
|---|---|
| 행위자 | 매장 buyer 본인 |
| 저장소 | `checkout_orders` |
| 서비스 범위 | `getBuyerOrderServiceKeys()` |
| 소유권 | `checkout_orders."buyerId"` |
| 조회 연산 | list + detail |

금지로 확정: 타 organization 주문 조회 / 타 serviceKey 주문 조회 / service role only 접근 / consumer 주문 축과의 혼합.

---

## 3. §7 응답 필드 비교 — 발견된 실제 불일치

DF-1 의 실체는 경로가 아니라 **금액 타입 불일치**였다.

| 필드 | KPA(이전) | GP(이전) | KCos(이전) | 분류 | 현재 |
|---|---|---|---|---|---|
| `totalAmount` / `subtotal` / `shippingFee` / `discount` | **string** (TypeORM decimal, transformer 없음) | **string** | number | `COMMON_REQUIRED` | Core 가 number 로 정규화 |
| `id` / `orderNumber` / `status` / `paymentStatus` / `createdAt` | 있음 | 있음 | 있음 | `COMMON_REQUIRED` | 유지 |
| `itemCount` | 있음 | 있음 | 있음 | `COMMON_REQUIRED` | Core 가 `jsonb_array_length` 로 산출 |
| `organization{id,name}` | 있음 | — | — | `SERVICE_SPECIFIC` | wrapper 유지 |
| `pharmacy{id,name,code}` | — | 있음 | — | `SERVICE_SPECIFIC` | wrapper 유지 |
| `store{id,name}` · `channel` · `storeName` | — | — | 있음 | `SERVICE_SPECIFIC` | wrapper 유지 |
| `orderType` | `'retail'` | `'RETAIL'` | 없음 | `SERVICE_SPECIFIC` | 유지 (대소문자 차이 포함 — frontend 계약) |

서비스 고유 데이터는 **삭제하지 않았다** (§7).

---

## 4. §8 오류 계약

| 상황 | 이전 | 현재 (Core 소유) |
|---|---|---|
| 미인증 | 401 `UNAUTHORIZED` (wrapper) | 동일 — wrapper 유지 |
| 없는 주문 | 404 | 404 `ORDER_NOT_FOUND` |
| 타 organization(타 buyer) 주문 | 404 | 404 — **없는 주문과 응답이 동일** |
| 타 serviceKey 주문 | 404 | 404 — **없는 주문과 응답이 동일** |
| 잘못된 id 형식 | 서비스마다 달랐음(500 위험) | 404, **쿼리 자체를 발행하지 않음** |
| membership 없음 | 별도 판정 없음 | 별도 판정 없음 — **아래 O2 참조** |

광범위한 API redesign 은 하지 않았다 (§8).

---

## 5. §10 · §11 Core / wrapper 책임

**Core** — `apps/api-server/src/services/checkout/buyer-order-read.service.ts` (신규)

소유 항목:
1. 합성 조건 `co."buyerId" = $1::uuid AND co.metadata->>'serviceKey' = ANY($2::text[])` (분리 불가)
2. 오류 계약 (존재 누설 없는 단일 404)
3. 금액 정규화 (decimal 문자열 → number)
4. paging 정규화 (`page>=1`, `1<=limit<=100`)
5. **모든 SQL 문자열** — 호출자 값은 bind parameter 로만 들어간다
6. 빈 `serviceKeys` / 빈 `buyerId` → 쿼리 미발행 + 빈 결과 (fail-closed)

**wrapper 3개** — 경로 · 서비스 scope · 서비스별 표기 adaptation 만. 새로운 대규모 order framework 를 만들지 않았다 (§10).

기존 `store-order-cancel.service.ts` 의 계약(같은 `buyerId + serviceKeys` 합성 조건, 명시적 type predicate)을 그대로 따랐다. `strictNullChecks:false` 환경이라 `isBuyerOrderReadFailure()` predicate 가 필요하다.

---

## 6. §12 route path 최종 판정 — **`KEEP_COMPATIBLE_ALIASES`**

경로는 **하나도 바꾸지 않았다**.

근거:
- 불일치의 실체가 경로가 아니라 응답 계약이었음이 §3 에서 확인됐다 (금액 타입).
- 경로 변경은 3서비스 frontend API contract 동시 변경 = CLAUDE.md 중지 조건.
- WO §12 기본 선호(“의미 / response 통일 우선, 경로 변경 최소화”)와 일치한다.

`/cosmetics/orders` 의 `/checkout` 접두어 부재는 **의도적으로 남긴 alias** 로 baseline §12-3 에 등재했다.

---

## 7. §13 · §14 frontend 정렬

**추가 commonization 이 필요 없었다.** 세 화면 모두 이미 `@o4o/store-ui-core` 의 공통 자산을 쓰고 있다:

- `BuyerOrderLedgerView` (목록 · 합계 · 빈 상태)
- `BuyerOrderStatusBadge` · `BUYER_CHECKOUT_STATUS_TABS` (상태 표기 · 탭)
- `useBuyerOrderCancel` · `BuyerOrderCancelButton`

세 API client(`checkout.ts` / `pharmacy.ts` / `storeOrders.ts`)는 이미 금액을 `number` 로 **선언**하고 있었다 — 백엔드가 string 을 보내고 있었으므로 선언이 거짓이었다. Core 정규화로 선언이 참이 됐다. 소비 코드가 전부 `Number(...)` 로 감싸고 있어 회귀는 없다.

| 항목 | KPA | GP | KCos |
|---|---|---|---|
| 목록 / 상세 / 상태 / 품목 / 금액 | 정상 | 정상 | 정상 |
| 빈 상태 / 오류 상태 | 정상 | 정상 | 정상 |
| deep link / refresh | 정상 | 정상 | 정상 |

브랜딩 차이는 그대로 뒀다. **frontend 를 하나의 거대 component 로 합치지 않았다** (§13).

---

## 8. §15 · §16 · §17 보안 계약 검사

| 검사 | 결과 |
|---|---|
| **타 매장 주문 leak** (order id 만 알면 조회 가능?) | **차단** — `buyerId` 조건이 Core SQL 에 하드코딩돼 있고 wrapper 가 우회할 수 없다. 전용 spec 이 “모든 발행 쿼리에 합성 조건이 있다”를 강제 |
| **serviceKey leak** | **차단** — `ANY($n::text[])` 조건이 동일하게 강제된다. serviceKey 는 URL 경로가 아니라 controller 상수(SSOT 산출값)에서만 온다 |
| **SQL injection leak** | **차단** — 필터 값이 SQL 문자열에 들어가지 않음을 spec 이 검증(주입 문자열이 `params` 에만 존재). `buyerId` / serviceKey 문자열이 SQL literal 로 나타나지 않음도 검증 |
| `buyerId` 출처 | 인증 주체만. `req.body` / `req.query` 에서 읽지 않음을 spec 이 3 wrapper 모두에 강제 |

### O2 — 미해결 판정 (defect 후보, 본 WO 범위 밖)

§17 이 요구하는 `authenticated + active service membership + buyer organization ownership + service role/capability` 중, 현재 세 서비스 모두 **`requireAuth` + `buyerId` 소유권**까지만 있고 **membership / role 게이트가 없다**.

수정하지 않은 이유:
- `packages/security-core/src/service-configs.ts` 는 **F1 Frozen** 이며 KPA/GP/KCos 에 `admin` / `operator` 만 노출한다 — `store_owner` 상당 역할이 없다.
- membership-only guard 가 `common/middleware/` 에 존재하지 않는다. 새로 만드는 것은 role/API contract 변경 = CLAUDE.md 중지 조건이며 §19(read-only)를 벗어난다.
- 이미 공통화된 취소 경로(`cancelStoreOrderBeforePayment`)가 **동일한 계약**을 쓴다. read Core 가 다른 계약을 쓰면 두 경로가 갈라진다.

→ **`buyerId` 소유권 자체는 leak 을 막는다**(다른 매장 주문은 보이지 않는다). 부족한 것은 “탈퇴/정지된 membership 이 자기 과거 주문을 계속 볼 수 있다”는 축이다. 별도 WO 로 등재 권고.

---

## 9. §18 · §19 · §20 · §21 비범위 확인

| 항목 | 확인 |
|---|---|
| consumer order / checkout / payment 신설 | **없음** — spec C 가 consumer commerce 식별자 재유입을 차단 |
| store seller order / refund / platform seller checkout | **없음** |
| write 경로 변경 (cart / checkout-confirm / create / payment / supplier / shipping / cancel) | **없음** — Core SQL 에 write verb 가 없음을 spec 이 검증. GP `/cleanup-expired` 의 operator-guarded `UPDATE` 도 그대로 |
| **DF-2** (GlycoPharm `/store/b2b-order` → canonical cart) | **미실행** |
| **DF-3** (KPA 관심상품 작업대 → canonical cart) | **미실행** |
| §21 dead duplicate 제거 | 3 wrapper 에서 손으로 쓴 `checkout_orders` 조회 블록(K-Cosmetics 약 50줄 포함)과 그에 딸린 `CheckoutOrder` entity import 를 제거했다. 잔여 `createQueryBuilder('co')` / 자작 `SELECT … FROM checkout_orders` 없음 — spec 이 강제 |

---

## 10. §22 · §23 테스트

신규 `apps/api-server/src/__tests__/b2b-buyer-order-read-core-contract.spec.ts`

**A. Core 동작** (쿼리를 기록하는 fake DataSource)
- 발행되는 모든 쿼리에 `buyerId` + serviceKey 합성 조건이 있다
- `buyerId` / serviceKey 값이 SQL literal 로 나타나지 않는다
- 빈 serviceKeys → 쿼리 0건
- decimal 정규화 (`'13000.00'` → `13000`)
- paging 정규화 표 (`page>=1`, `limit` clamp 1..100)
- 상세: 자기 주문 / **타 buyer → 404** / **타 serviceKey → 404** / **없는 주문 → 404**, 세 응답이 `toEqual` 로 동일
- 잘못된 id → 404 + 쿼리 0건
- 주입 문자열 필터 값이 `params` 에만 존재
- 필터 없을 때 정확히 2개 param 만 bind
- 발행 SQL 에 write verb 없음

**B. wrapper 계약** (3 wrapper `it.each`)
- Core 를 import 하고 `listBuyerOrders` / `getBuyerOrderDetail` 을 호출한다
- `getBuyerOrderServiceKeys` 를 쓴다 (literal 재작성 없음)
- 자작 조회 SQL / `createQueryBuilder('co')` 없음
- `buyerId` 를 `req.body` / `req.query` 에서 읽지 않는다
- 셋 다 `isBuyerOrderReadFailure(result)` + `result.httpStatus/code/message` 로 동일하게 처리한다

**C. 회귀 가드 (§23)**
- consumer commerce 식별자 재유입 금지
- Core input 에 raw SQL 주입 통로(`whereSql` / `rawWhere` / `sqlFragment` / `extraSql`) 금지
- write SQL 금지

기존 `b2b-supplier-to-store-order-canonical-contract.spec.ts` 의 “buyer 조회 키는 단일 정의에서만 온다” 가드도 통과한다 (spec 내부에서도 literal 대신 SSOT 를 import).

---

## 11. §24 typecheck / build / test

| 검증 | 결과 |
|---|---|
| api-server `npx tsc --noEmit` | **0 errors** |
| api-server 전체 `npx jest` | **211 suites / 3543 passed / 10 skipped, exit 0** |
| KPA `tsc --noEmit` / `vite build` | **exit 0 / exit 0** |
| GlycoPharm `tsc -b` / `vite build` | **exit 0 / exit 0** |
| K-Cosmetics `tsc --noEmit` / `vite build` | **exit 0 / exit 0** |

### 타 세션 / 타 commit 실패 구분

작업 초기 GlycoPharm `tsc -b` 가 `src/pages/store-management/b2b-order/B2BOrderPage.tsx(467,17): error TS1109` 로 실패했다. **본 WO 가 건드리지 않은 파일**이며, 원인은 닫히지 않은 JSX 주석이었다. origin/main 의 `9c2e8970c fix(glycopharm): 닫히지 않은 JSX 주석으로 web-glycopharm 빌드/타입체크가 깨져 있던 것 복구` 가 이미 고쳤다. 해당 파일을 **수정하지 않았고**, origin/main 으로 rebase 한 뒤 재검증하여 exit 0 을 확인했다.

신선한 worktree 특성상 초기 `tsc --noEmit` 에서 workspace package 미빌드로 인한 `TS2307` 이 221건 나왔다. `build:packages` + 개별 core 패키지 빌드 후 **0 건**. 본 WO 가 만진 파일에서 나온 오류는 처음부터 **0 건**이었다.

---

## 12. §25 production smoke (read-only)

`https://api.neture.co.kr` — **실사용 order write 는 수행하지 않았다.**

| 요청 | 결과 |
|---|---|
| `GET /api/v1/kpa/checkout/orders` (미인증) | `401 AUTH_REQUIRED` |
| `GET /api/v1/glycopharm/checkout/orders` (미인증) | `401 AUTH_REQUIRED` |
| `GET /api/v1/cosmetics/orders` (미인증) | `401 AUTH_REQUIRED` |
| `GET /api/v1/kpa/checkout/orders/<nil-uuid>` (미인증) | `401 AUTH_REQUIRED` |

세 서비스 조회 축이 모두 fail-closed 다.

---

## 13. §26 production DB census

자격증명이 안전하게 제공되지 않았다. secret 우회 · 탐색은 하지 않았다.

**`NO_PRODUCTION_DB_CENSUS`**

과거 실측 수치를 현재 실측처럼 쓰지 않았다.

---

## 14. §27 baseline 갱신

`docs/baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md`
- §10 표에 **DF-1 종결 / DF-4 종결** 행 추가 (기존 행은 역사 기록으로 보존)
- **§12 “매장 buyer 주문 조회 canonical 계약”** 신설 — 의미 / 단일 Core / 경로(변경하지 않음) / 금지 4항

---

## 15. 최종 상태

| 항목 | 값 |
|---|---|
| `UNKNOWN` | **0** |
| `UNJUDGED` | **0** |
| `DEFERRED` | **O2** — buyer order read 의 membership/role 게이트 부재 (§17). F1 Frozen `service-configs.ts` 에 store buyer 역할이 없어 별도 WO 필요. leak 은 `buyerId` 소유권으로 이미 차단됨 |
| `DF-1` | **종결** |
| `DF-4` | **종결** |
| `DF-2` / `DF-3` | **미실행 (본 WO §20)** |
