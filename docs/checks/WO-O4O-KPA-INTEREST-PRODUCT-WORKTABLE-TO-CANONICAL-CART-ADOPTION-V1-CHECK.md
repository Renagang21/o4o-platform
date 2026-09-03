# WO-O4O-KPA-INTEREST-PRODUCT-WORKTABLE-TO-CANONICAL-CART-ADOPTION-V1 — CHECK

- **일자**: 2026-09-03
- **판정**: **COMPLETED** (BLOCKED 아님 — §5 canonical offer 를 직접 확정했다)
- **성격**: producer UI 채택. 새 주문 시스템 · 새 schema · 새 entity · 새 framework **0**
- **선행 기준**: `docs/baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md` ·
  `docs/baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md`

확인한 거래 축 원칙: `공급자 → 매장 = O4O B2B canonical` / `소비자 → 매장 = O4O commerce 없음`.
이번 작업은 전자에만 붙는다.

---

## 1. 관심상품 작업대 census (§4)

| 항목 | 실체 | 판정 |
|---|---|---|
| route | `/pharmacy/store-order-worktable` (KPA frontend) | CANONICAL_DIRECT |
| page | `services/web-kpa-society/src/pages/pharmacy/StoreOrderWorktablePage.tsx` | CANONICAL_DIRECT |
| API client | `src/api/pharmacyProducts.ts` — `getCatalog` · `getOrderable` | CANONICAL_DIRECT |
| backend route | `GET /api/v1/kpa/pharmacy/products/catalog` · `/orderable` (`routes/kpa/kpa.routes.ts:430` → `routes/o4o-store/controllers/pharmacy-products.controller.ts`) | CANONICAL_DIRECT |
| entity/table | `supplier_product_offers` · `product_masters` · `neture_suppliers` · `organization_product_listings` · `product_approvals` · `offer_service_approvals` | CANONICAL_DIRECT |
| 관심상품 저장 구조 | **별도 테이블 없음.** "관심"= catalog 행의 `isAdded` = `EXISTS(product_approvals)` OR `EXISTS(organization_product_listings)` (`offer_id` 기준) | RESOLVABLE_BY_CANONICAL_RELATION |
| product identifier | catalog 행 `id` = `spo.id` (SSOT 가 `spo.id AS "id"` 반환) | CANONICAL_DIRECT |
| supplier reference | `neture_suppliers.id` (표시명 아님) | CANONICAL_DIRECT |
| offer reference | `supplier_product_offers.id` | CANONICAL_DIRECT |
| 가격 source | 표시 = catalog `priceGold`/`priceGeneral` · **확정 = 서버** `offer_service_prices['kpa-society']` → `price_general` | CANONICAL_DIRECT |
| 이전 주문/cart action | **없었다.** 화면은 발주 요약 모달까지만 있고 담기·주문 경로가 없었다 | DEAD (기능 미연결) |
| 제거한 legacy | catalog↔listing `product_name` 문자열 merge(`priceMap`) — master_id/offer_id 리팩터 이후 dead + §5 금지 heuristic | LEGACY_ONLY → 제거 |

**UNKNOWN = 0 · UNJUDGED = 0.**

## 2. Canonical offer 확정 근거 (§5 — 가장 중요한 중지 조건)

`pharmacy-products.controller.ts` 의 catalog SSOT 가 `spo.id AS "id"` 를 반환한다.
따라서 화면 행의 `id` 는 **그 자체로 `supplier_product_offers.id`** 이며, 별도 해석이 필요 없다.

- 사용한 방법: **offerId 동등 비교 1가지**
- 사용하지 않은 방법: 상품명 문자열 매칭 · SKU heuristic · barcode 추정 · manufacturer 문자열 ·
  supplier 상수 주입 · 첫 번째 검색결과 선택 → **heuristic 매칭 0건**
- `offerId` 가 없는 진열 행은 대응 canonical 식별자가 없으므로 색인에서 **버린다**(이름 보정 금지).

## 3. 승인 게이트 (§7)

`kpa-society` ∈ `APPROVAL_ELIGIBLE_SERVICE_KEYS` → `OfferExposureStrategy = approval`.
`offer_service_approvals.approval_status = 'approved'` 만 노출·주문 대상이다.

- `/catalog` · `/orderable` · confirm 시점 세 곳 모두 기존 게이트 SSOT 를 그대로 쓴다. **게이트 변경 0.**
- `service_keys` opt-in 을 노출 근거로 쓰지 않는다.
- 승인 offer 가 0 건이어도 게이트를 완화하지 않는다 — 화면에는 "주문 불가" 로만 표시된다.

## 4. Cart API (§8)

기존 `/api/v1/store/cart/kpa/*` 를 그대로 쓴다. **KPA 전용 cart API 신설 0.**
`POST .../items` (sourceType='b2b') → `store_cart_items`.

## 5. 매장 조직 (§9)

클라이언트는 `organizationId` 를 **보내지 않는다.** 확정 권위는 서버
`resolveBuyerOrganization` (`StoreB2BCartCheckoutService.organizationPolicy = 'required'`):
조직 없음 → 403 `STORE_ORGANIZATION_NOT_FOUND`, 다중 → 400 `AMBIGUOUS_STORE_ORGANIZATION`.
테스트로 payload 에 `organizationId` 가 없음을 고정했다.

## 6. 가격 (§10)

프런트 가격은 **표시용 snapshot** 이다. 기준가가 없으면 `priceSnapshot = 0` 으로 보내고
서버가 canonical 가격을 재확정한다. 모달 문구도 "확정 금액은 주문 시 서버가 공급가 기준으로
재산정합니다" 로 바꿨다.

## 7. 5개 구간 (§30)

| 구간 | 상태 |
|---|---|
| 관심상품 → canonical offer | ✅ `spo.id` 직접 (heuristic 0) |
| canonical offer → cart | ✅ `POST /store/cart/kpa/items` (sourceType='b2b') |
| cart → checkout confirm | ✅ 기존 service-agnostic `checkout-confirm-b2b` Core (무변경) |
| confirm → checkout_orders | ✅ 기존 Core (무변경) |
| orders → 매장 주문 조회 | ✅ 기존 buyer 주문 조회 Core (무변경, 새 화면 0) |

## 8. 축 혼재 (§14 · §15)

- `event_offer` 는 B2B 축으로 승격하지 않는다. 담기 대상은 `b2b` · `operator` 뿐이다.
- 기존 KPA 이벤트오퍼 흐름(`checkout-confirm`)은 **코드 무변경**이다.
- 조사 결과: `useStoreCart` 는 b2b 항목이 1개라도 있으면 cart 전체를 `checkout-confirm-b2b`
  로 보낸다. 서버는 항목별 fail-closed 하지만 사용자에겐 부분 실패로 보인다.
  → 공통 패키지를 바꾸지 않고 **작업대 담기 직전에 이벤트오퍼 혼재를 차단**했다
  (§15 이 허용한 "안전하게 차단"). 서버 판정 완화 0.

## 9. 소비자 commerce 재유입 (§17)

KPA 소비자 checkout / store seller order / 소비자 결제 / 소비자 cart / platform seller
관련 코드 **추가·복구 0건**. 410·은퇴 계약 파일 무변경.

## 10. 변경 파일

| 파일 | 성격 |
|---|---|
| `services/web-kpa-society/src/utils/worktableCart.ts` | 신규 — 계약 helper (판정 · payload) |
| `services/web-kpa-society/src/utils/__tests__/worktableCart.test.ts` | 신규 — 14 tests (§19–§22) |
| `services/web-kpa-society/vitest.config.mjs` | 신규 — 루트 vitest 사용 (deps 무변경) |
| `services/web-kpa-society/src/pages/pharmacy/StoreOrderWorktablePage.tsx` | 수정 — 주문 가능 표시 · 담기 · 장바구니 이동 |
| `.github/workflows/ci-pipeline.yml` | 수정 — KPA vitest 1 step 추가 |
| `docs/baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md` | §13-8 추가 (§27) |

backend · packages · schema · entity · lockfile **무변경**.

## 11. 검증 (§24)

| 항목 | 결과 |
|---|---|
| api-server typecheck | ✅ exit 0 |
| api-server Jest (`src/services/cart`, `checkout-fulfillment-bridge-sources`) | ✅ 6 suites / 99 tests |
| store-ui-core vitest | ✅ 2 files / 23 tests |
| KPA frontend typecheck | ✅ exit 0 |
| KPA frontend vitest | ✅ 1 file / 14 tests |
| KPA frontend build (vite) | ✅ exit 0 |

Vitest 단독으로 완료 판정하지 않았다 — typecheck · build · api-server Jest 를 함께 통과했다.

## 12. 회귀 (§23)

- KPA 이벤트오퍼 주문: 관련 코드 무변경 + 담기 축 분리 테스트로 고정
- GlycoPharm regular B2B / Neture B2B / PharmacyHub B2B: 공통 confirm Core 무변경, api-server Jest 통과
- K-Cosmetics cart 소비: `store-ui-core` 무변경, 해당 vitest 통과
- 소비자 checkout 은퇴 계약: 무변경
- **공통 패키지 변경 0** → 소비처 전수 확인 불필요 (변경 자체가 없다)

## 13. 프로덕션 smoke (§25 · §26)

read-only 만 수행했다. **실사용 금전 write 0.**

| 대상 | 결과 |
|---|---|
| `GET /api/v1/kpa/pharmacy/products/catalog` | 401 (route 살아있음 · 인증 요구) |
| `GET /api/v1/kpa/pharmacy/products/orderable` | 401 (동일) |
| `POST /api/v1/store/cart/kpa/items` | 401 (동일) |

**`NO_PRODUCTION_DB_CENSUS`** — 안전한 주문 fixture 와 프로덕션 DB census 자격증명을 쓰지
않았다. 따라서 **kpa-society 승인 offer 건수 · 실제 관심상품 연결률을 추측하지 않는다.**
해당 수치는 이 문서에 기록하지 않는다.

## 14. DEFERRED (이번 WO 에서 고치지 않음)

1. **다중 조직 매장 사용자** — `useStoreCart` 가 `checkoutConfirmB2B(serviceKey)` 를 조직 힌트
   없이 호출하므로 confirm 에서 `AMBIGUOUS_STORE_ORGANIZATION` 이 난다. 공통 패키지의
   기존 동작이며 GlycoPharm 도 동일하다. 별도 WO 대상.
2. `useStoreCart` 의 "b2b 1건이면 cart 전체를 b2b confirm 으로" 라우팅 — 공통 패키지 변경이라
   범위 밖. 이번엔 producer 쪽에서 혼재를 막는 것으로 대응했다.

## 15. 요약 카운터

```text
heuristic 매칭        : 0
새 schema/entity      : 0
새 cart/checkout API  : 0
POS 개발              : 0
소비자 commerce 재유입: 0
공통 패키지 변경      : 0
UNKNOWN / UNJUDGED    : 0 / 0
DEFERRED              : 2
```
