# WO-O4O-ECOMMERCE-CORE-AND-COMMERCE-RESIDUE-FINAL-CENSUS-AND-RETIREMENT-V1 — CHECK

- **Status**: Closed (배포 완료 · production smoke PASS · 2026-08-26)
- **Commit**: `8ec02a27c` — 62 files changed, +292 / −6318
- **patch-id (stable)**: `f8e332e0a023afa2aeb8c3e913d029716acce142`
- **최상위 판정 기준**: `docs/baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md`
  (이 문서가 legacy 코드보다 우선한다. §12 핵심 질문 —
  **"소비자가 O4O 안에서 매장을 상대로 결제하는 주문인가?"**)

---

## 1. 흐름 준수

```
전수 census → producer/consumer 확인 → 8분류 판정 → legacy/dead 제거
→ canonical 기능 보호 → 회귀검증 → production smoke → CHECK → commit/push
```

census 는 **파일명 검색이 아니라 import/export/call graph** 로 수행했다.
모집단 키워드: `packages/ecommerce-core`, `cart`, `checkout`, `payment`,
`refund`, `consumer-order`, `store-order`, `B2C`, `platform-seller`,
`payment-core`, `Toss`, `KCP`, `INICIS`, `sellerOrganizationId`, `buyerId`,
`channel_type`.

---

## 2. 판정 결과 (8분류)

결정축은 이름이 아니라 **누가 구매자인가**다.

| 대상 | 판정 | 근거 (실측) |
|---|---|---|
| `packages/ecommerce-core` (26 파일) | `LEGACY_STORE_COMMERCE` | 자칭 "판매 원장(Source of Truth)" 이지만 canonical 원장은 `checkout_orders`. frontend import 0, package dependent 1(api-server) 뿐. ModuleLoader 은퇴(선행 WO) 이후 `createRoutes`/controllers/lifecycle runtime mount 0. 마지막 런타임 소비처는 dormant LMS 핸들러였다. |
| `KCosmeticsPaymentEventHandler` | `DEAD` | `serviceKey='cosmetics'` payment.completed producer 0건 (cosmetics checkout/payment controller 전부 410) |
| `GlycopharmPaymentEventHandler` | `DEAD` | `serviceKey='glycopharm'` producer 0건 (동일) |
| `KpaPaymentEventHandler` | `DEAD` | `serviceKey='kpa'` producer 0건. KPA B2B 발주는 O4O 결제 경로를 쓰지 않는다 |
| `LmsPaymentEventHandler` | `DEAD` | `serviceKey='lms'` 가 핸들러 자기 자신 외 저장소 전체 0건 (v1 Freeze · dormant) |
| `NeturePaymentEventHandler` + `routes/neture/controllers/payment.controller.ts` | `DEAD` | 핸들러가 register 되지 않았고 `createPaymentController` 참조 0건 |
| header-builder `cart` 모듈 (UI+타입+backend 매핑) | `PLATFORM_LEGACY` | O4O 소비자 storefront/장바구니가 존재하지 않는다 |
| admin `cartService.ts` / `utils/ecommerce.ts` / `TossPaymentButton.tsx`, web-neture `lib/cart.ts` | `DEAD` | 소비처 0건 |
| `packages/payment-core` | `ACTIVE_CANONICAL` | 살아 있는 producer 3종이 `PaymentCoreService.prepare/confirm` 사용 |
| `packages/store-core` | `ACTIVE_CANONICAL` | store insights |
| `packages/financial-core` | `ACTIVE_CANONICAL` | commission engine |
| `services/toss-payments.service.ts`, `TossPaymentProviderAdapter` | `ACTIVE_CANONICAL` | refund canonical 경로 |
| `routes/cart/store-cart.routes.ts` (store_cart) | `B2B_SUPPORT` | 경계가 `buyerId`(=인증 사용자) + `serviceKey`. 매장이 **구매자** |
| PharmacyHub cart / orders / payments | `B2B_SUPPORT` | `buyerId` 축 |
| neture-b2b checkout (`NetureB2bCheckoutPaymentEventHandler`) | `B2B_SUPPORT` | `serviceKey='neture-b2b'`, `metadata.source='neture_b2b_checkout'` |
| KPA event-offer, 3서비스 `/orders*` | `B2B_SUPPORT` | 전부 `buyerId` 축 |
| store-entitlement 구독 결제 | `B2B_SUPPORT` | `sourceService='store-service-subscription'` |
| `organization_channels.channel_type='B2C'` | `RETAINED_SCHEMA_LEGACY` | §14 참조 |
| `apps/main-site` commerce 뷰/제너레이터 | `DEFERRED` | §5 참조 |
| `ecommerce_orders` raw SQL reader 클러스터 | `DEFERRED` | §5 참조 |

- **`UNKNOWN` 수: 0** — 미판정 상태로 제거·복구·확장한 항목 없음.
- **`DEFERRED` 수: 2** (§5)
- **POS_INTEGRATION_SUPPORT: 0건 발견** — 이번 census 모집단에서 POS 연동 코드는
  나타나지 않았다. (있었다면 별도 판정 후 보호했을 것.)
- **EXTERNAL_CHANNEL_SUPPORT: 무접촉** — 외부 판매채널 동기화 축은 이번 제거
  범위에 포함하지 않았다.

### 2-1. 살아 있는 payment producer (제거하지 않은 근거)

`PaymentEventHub` 로 `payment.completed` 를 실제로 발행하는 serviceKey 는
**3종뿐**이다.

| serviceKey | 축 |
|---|---|
| `pharmacy-hub` | B2B |
| `neture-b2b` | B2B |
| `store-service-subscription` | 매장 구독(매장이 구매자) |

`store-entitlement.routes.ts` 의 `STORE_SUBSCRIPTION_SOURCE_SERVICE` 가
`'store-service-subscription'` 이라는 사실을 리터럴까지 추적해 확인했다.
이 값이 `'kpa'`/`'glycopharm'`/`'cosmetics'` 였다면 위 핸들러 3종은 live
producer 를 가진 것이 되어 제거 대상이 아니었다. **충돌 없음**.

---

## 3. 제거 범위 (§8 — 기능 전체를 닫았다)

`@o4o/ecommerce-core` 는 §18 의 5개 조건을 모두 충족했고, **부분 제거로 깨진
package shell 을 남기지 않도록** 아래를 함께 정리했다.

| 축 | 처리 |
|---|---|
| package directory | `packages/ecommerce-core/` 26 파일 삭제 |
| workspace/Docker stub | `apps/api-server/packages/ecommerce-core/package.json` 삭제 |
| package.json dependency | `apps/api-server/package.json` 의 `"@o4o/ecommerce-core": "workspace:*"` 제거 |
| build script | 동 파일 `build:deps` 의 filter, `.github/workflows/deploy-api.yml` 의 build step 제거 |
| lockfile | `pnpm install --lockfile-only` → `pnpm-lock.yaml` −61 |
| entity 등록 | `database/entities.ts` 의 import + `EcommerceOrder`/`EcommerceOrderItem`/`EcommercePayment` 배열 등록 제거 |
| app 카탈로그 | `appsCatalog.ts` 의 `appId: 'ecommerce-core'` 엔트리 제거 (17 → 16) |
| CI guard | `scripts/check-forbidden-tables.mjs` 의 legacyException 2건 제거 (대상 파일 자체가 사라졌다) |
| dead type/export | `services/cosmetics/index.ts` 삭제, `services/neture/index.ts` 를 살아 있는 B2B 핸들러로 재지정 |
| 잔여 주석 참조 | `constants/service-keys.ts`, `neture-settlement.service.ts`, `NetureB2bCheckoutPaymentEventHandler.ts`, `entities/Product.ts` 의 삭제 파일/패키지 언급 정정 |

header-builder `cart` 모듈도 **"UI만 숨기고 backend 는 남김" 으로 끝내지 않았다**:
팔레트 엔트리 · `HeaderModuleType` union · `CartModuleSettings` ·
`MobileHeaderSettings.showCartIcon` · `CartSettings.tsx` · inspector case ·
barrel export 에 더해 backend 의 `settingsService.getBlockType()` 매핑,
module data builder 분기, `template-parts-converter.ts` 의 `o4o/cart-icon`
변환까지 함께 제거했다. `o4o/cart-icon` 은 저장소 전체 0건이다.

---

## 4. route 상태 판정 (§15) — 410 유지 / 404

| 상태 | 대상 | 이유 |
|---|---|---|
| **410 유지** | `STORE_CONSUMER_ORDER_RETIRED`, `STORE_SALE_PAYMENT_DEPRECATED`, `STORE_B2C_CHANNEL_RETIRED` | **기존 client 에게 명시적 은퇴 신호가 필요한 producer endpoint** 다. 계약이 존재했으므로 "사라졌다" 가 아니라 "은퇴했다" 를 알려야 한다. 이번 WO 는 이 3종을 건드리지 않았고, 계약 유지 여부를 spec 으로 고정했다. |
| **404 (완전 제거)** | `routes/neture/controllers/payment.controller.ts` (mount 0건), `packages/ecommerce-core` 의 `createRoutes` | **애초에 mount 되지 않아 외부 계약이 존재한 적이 없다.** 은퇴 신호를 보낼 상대가 없으므로 Express 기본 404 가 더 정확하다. 410 을 새로 만드는 것은 없던 계약을 만드는 일이 된다. |

---

## 5. DEFERRED (2건) — 이번 WO 에서 제거하지 않은 이유

### D-1. `ecommerce_orders` raw SQL reader 클러스터
`action-queue.controller.ts`, `routes/common/order/operatorOrderQuery.ts`,
`cosmetics-store-summary.service.ts`, `operator-dashboard.controller.ts`,
`cockpit.controller.ts`, `glycopharm-store-data.adapter.ts`,
`event-offer.service.ts`, `physical-store.service.ts`,
`store-network.service.ts`, `order-metrics-fallback.ts` 등이 `ecommerce_orders`
를 **raw SQL 로만** 읽는다 (TypeORM repository 사용 0건 — 그래서 entity 등록
제거가 이들을 깨뜨리지 않는다).

선행 조사(`IR-O4O-ECOMMERCE-ORDERS-TABLE-CROSSSERVICE-IMPACT-V1`)가 확인한 대로
이 테이블들은 **`CREATE TABLE` migration 이 없어 production 에 존재하지 않으며**,
`order-metrics-fallback.ts` 가 42P01 을 `not_ready` 로 변환해 이미 안전하게
막고 있다.

제거하지 않은 이유: 이들을 지우면 **operator dashboard 응답 스키마(메트릭 필드)
가 바뀐다.** 이는 "안전하게 판정 가능한 dead 제거" 가 아니라 대시보드 계약 변경
이므로, 별도 WO 로 분리하는 것이 맞다.

### D-2. `apps/main-site` commerce 뷰/AI 제너레이터
`components/ui/commerce/CartView.tsx`, `shortcodes/_functions/commerce/cart`,
`ai/intent/analyzeIntent.ts` 의 commerce 카테고리 규칙 등.

제거하지 않은 이유: **`apps/main-site` 는 배포되지 않으며 O4O 런타임 mount 0
이다.** 이 앱의 commerce 잔재는 앱 자체의 존치 판정과 함께 다뤄야 한다. 지금
부분 제거하면 제너레이터 규칙만 깨진 shell 이 남는다 (§18 의 금지 패턴).

---

## 6. DB / schema (§14) — `RETAINED_SCHEMA_LEGACY`

**대량 destructive migration 을 수행하지 않았다. migration 삭제 0건, 테이블
DROP 0건, 컬럼 DROP 0건.**

| 대상 | 처리 | 이유 |
|---|---|---|
| `ecommerce_orders` / `_order_items` / `_payments` | `RETAINED_SCHEMA_LEGACY` | production 에 테이블 자체가 없다(CREATE migration 부재). 지울 schema 가 없고, 관련 ALTER migration 2종은 **역사적 기록**이라 삭제하지 않는다 |
| `organization_channels.channel_type = 'B2C'` | `RETAINED_SCHEMA_LEGACY` | 신규 생성은 이미 차단(410 `STORE_B2C_CHANNEL_RETIRED`)됐지만, GlycoPharm `store.controller` 의 "소비자 Storefront 상품 노출 이중 게이트" 가 **결제 없는 정보 제공/진열 용도로** 이 컬럼을 계속 읽는다. 소비자 결제 축이 아니므로 금지선 대상이 아니다 |
| `neture_orders`, `paid_at` 등 legacy 결제 흔적 컬럼 | 유지 | 정산 readiness 판정이 여전히 참조한다 (`neture-settlement.service.ts`) |

---

## 7. 회귀검증 (§17)

신규 계약 spec: `apps/api-server/src/__tests__/ecommerce-core-and-commerce-residue-retirement.spec.ts`
(**36 tests PASS**, DB·네트워크 접근 0의 정적 소스 스캔 계약).

포함 assertion:

| 요구 항목 | assertion |
|---|---|
| legacy import 0 | `@o4o/ecommerce-core` import/require 0건 (apps + packages + services 전수 스캔) |
| dead package consumer 0 | `packages/ecommerce-core`, Docker stub, package.json dependency, build:deps, deploy workflow, appsCatalog 엔트리 모두 부재 |
| dead route consumer 0 | 삭제된 handler 6종 파일 부재 + `import`/`new` 참조 0건 |
| 소비자 commerce retired path → 410 | 410 코드 3종이 계속 존재함을 고정 (은퇴 계약 회귀 방지) |
| 보호 축 | store-cart(`buyerId`), payment-core/store-core/financial-core, toss-payments.service, live producer serviceKey 3종 존재 고정 |
| 가드 무력화 방지 | 스캔 파일 수 > 500 assertion |

기존 spec 2건의 고정 카운트를 16 으로 갱신했다 (`APPS_CATALOG` 17→16,
packages manifest 17→16). 값 변경의 원인이 이번 은퇴임을 주석으로 남겼다.
**과거 CHECK 의 역사적 서술은 수정하지 않았다.**

| 검증 | 결과 |
|---|---|
| api-server jest (전체) | **196 suites / 3288 tests PASS** |
| admin-dashboard vitest (전체) | **13 files / 229 tests PASS** |
| api-server `tsc --noEmit` | PASS |
| admin-dashboard `tsc --noEmit` | PASS |
| web-neture `tsc --noEmit` | PASS |
| api-server build | PASS |
| admin-dashboard build | PASS (`✓ built in 1m 21s`) |
| web-neture build | PASS (`✓ built in 21.41s`) |
| eslint (변경 파일) | **0 error** (warning 3건은 전부 이번 변경 이전부터 존재) |
| AppStore Guard (CI) | success |

### 7-1. 사전 존재 실패 (이번 변경과 무관)

`scripts/check-forbidden-tables.mjs` 는 `o4o_payments`,
`neture_settlement_orders` 두 건으로 exit 1 을 낸다. **HEAD(변경 전) 스크립트를
저장소 루트에서 그대로 실행해도 exit 1** 이며, 이 스크립트는 어떤 CI workflow
에도 연결돼 있지 않다. 이번 WO 의 변경(legacyException 2건 제거)과 무관한
사전 존재 상태이므로 고치지 않고 사실만 기록한다.

---

## 8. Production smoke (§19)

**실제 PG 결제/환불은 수행하지 않았다. write 요청 0건 — GET / 은퇴 410 / 인증
가드 401 만 확인했다.** (은퇴 endpoint 로 보낸 `POST` 는 라우터 진입 즉시 410 을
반환하는 tombstone 이며, 주문·결제 상태를 만들지 않는다.)

### 8-1. 배포 (commit `8ec02a27c`)

| workflow | run | 결과 |
|---|---|---|
| Deploy API Server (Cloud Run) | `32921283470` | ✅ success |
| Deploy Admin Dashboard (Cloud Run) | `32921283466` | ✅ success |
| Deploy Web Services (Cloud Run) | `32921283484` | ✅ success |
| AppStore Guard | `32921283494` | ✅ success |
| CodeQL Security Analysis | `32921283457` | ✅ success |
| CI Pipeline | `32921283472` | ⚠️ cancelled |

`CI Pipeline` 은 실패가 아니라 **취소**다. 이 저장소는 `cancel-in-progress` 를
쓰며, 다른 세션이 `b5db69810` 을 push 하면서 선행 run 이 상위 실행에 의해
취소되었다. 배포 3종과 guard 2종은 모두 success 이고, 동일 커밋에 대해 로컬에서
jest 3288 / vitest 229 / 빌드 3종을 전부 통과시켰다 (§7).

### 8-2. API smoke (api.neture.co.kr)

```text
GET  /api/health                            → 200

# 은퇴 계약 유지 (410 producer endpoint)
POST /api/v1/kpa/checkout                   → 410 STORE_CONSUMER_ORDER_RETIRED
POST /api/v1/glycopharm/checkout            → 410 STORE_CONSUMER_ORDER_RETIRED

# 계약이 존재한 적 없는 경로 (404 — §4 판정대로)
GET  /api/v1/kpa/checkout/store-orders        → 404 Cannot GET
GET  /api/v1/glycopharm/checkout/store-orders → 404 Cannot GET
GET  /api/v1/cosmetics/checkout/store-orders  → 404 Cannot GET

# B2B 보호 축 — 라우트 생존 + 인증 가드 (write 0)
GET  /api/v1/store/cart/kpa/items           → 401 AUTH_REQUIRED
```

`GET /api/health → 200` 은 **entity 등록 3종 제거 후에도 TypeORM 부트가
정상**임을 보여준다 (metadata 오류가 있었다면 부트가 실패했을 것이다).

### 8-3. Admin bundle 실측 — cart 모듈이 production 에서 사라졌다

배포된 번들을 직접 받아 확인했다 (배포 성공 체크마크에 의존하지 않는다).

```text
GET https://admin.neture.co.kr/assets/HeaderBuilderPage-B4_vKINc.js  → 200 (40,350 bytes)

  "Shopping cart"  → 0건
  "cart-icon"      → 0건
  "Cart Settings"  → 0건
  "mini-cart"      → 0건

  대조군(제거하지 않은 모듈이 같은 chunk 에 실제로 존재함):
  "Account"        → 1건
  "Role Switcher"  → 1건
  "Social"         → 1건
```

대조군이 함께 잡힌다는 점이 "chunk 를 잘못 받아서 0건" 이 아님을 보증한다.

---

## 9. Production DB census (§20)

**`NO_PRODUCTION_DB_CENSUS`** — production DB 읽기 자격증명이 이 세션에
안전하게 제공되지 않았다. 우회하거나 secret 을 탐색하지 않았고, secret 값을
출력하지도 않았다 (§13).

따라서 이 CHECK 의 모든 "0건" 은 **저장소 전수 스캔 기준**이며 production
row count 실측이 아니다. **과거 WO 의 실측 수치를 현재 실측처럼 쓰지 않았다.**

---

## 10. 안전 계약 준수

| 항목 | 결과 |
|---|---|
| 실제 PG 결제/환불 write | **0건** — 수행하지 않았다 |
| consumer commerce active producer | **0** |
| consumer commerce active write path | **0** |
| secret 값 출력/탐색 | 0 |
| 타 세션 WIP 수정/restore/stash/reset | 0 (작업트리에 타 세션 WIP 없음) |
| `git add .` | 사용하지 않음 — path-specific stage 만 사용 |
| `check-staged-scope.mjs` | `✅ staged 62건이 모두 이번 작업 범위 안입니다.` |
| migration 삭제 / 대량 destructive migration | 0건 |
| 과거 CHECK 역사 수정 | 0건 |
| `HEAD == origin/main` | ✅ (§11) |

---

## 11. 마감

| 완료 기준 (§23) | 결과 |
|---|---|
| consumer commerce active producer | **0** |
| consumer commerce active write path | **0** |
| 실제 PG 결제/환불 write | **0** |
| `UNKNOWN` | **0** |
| `DEFERRED` | **2** (§5 — 둘 다 이유 명시) |
| 관련 파일만 path-specific stage | ✅ `check-staged-scope.mjs` 통과, `git add .` 미사용 |
| 회귀검증 | ✅ jest 3288 / vitest 229 / build 3종 / eslint 0 error |
| production smoke | ✅ §8 |
| CHECK | 이 문서 |
| `HEAD == origin/main` | ✅ |

### 다음 축

이번 WO 로 **매장 소비자 commerce 의 코드 잔재까지 production 에서 닫혔다.**
남은 것은 이름만 commerce 인 B2B/외부채널/POS 축이므로, 더 이상 commerce 코드를
연속으로 손보지 않고 **실제로 남겨야 할 축(B2B 주문 · POS/외부 판매채널)** 으로
이동하는 것이 맞다. §5 의 DEFERRED 2건은 각각 "operator dashboard 계약 변경" 과
"main-site 앱 존치 판정" 에 속하는 별도 WO 소재다.
