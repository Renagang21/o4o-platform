# WO-O4O-ECOMMERCE-ORDERS-TABLE-PROVISION-V1 (후보 / 미승인 / DB write 승인 필요)

> **WO 후보 — 조사 단계 산출물. 코드/DB 미변경.** DB write(CREATE TABLE) 포함이라 **CLAUDE.md §0 사용자 승인 필수.**
> 근거: `WO-O4O-KCOSMETICS-ORDERS-NO-STORE-RESPONSE-FIX-V1 §9` (read-only 조사).

| 항목 | 값 |
|------|------|
| 작성일 | 2026-06-03 |
| 우선순위 | **P0** (ecommerce-core 주문/결제 경로 전반 불능) |
| 상태 | **⛔ 중단 / 방향 전환 필요 (DO NOT IMPLEMENT) — 착수 직전 조사에서 `ecommerce_orders` 가 off-contract 임이 확정됨. §0 참조** |
| 분류 | DB provisioning (base table 생성 마이그레이션) |
| 영향 | cosmetics · glycopharm · lms 결제 등 ecommerce-core 주문 전반 |

---

## 0. ⛔ 중단 — 이 WO 를 구현하면 안 된다 (2026-06-03, 착수 직전 확정)

착수 직전 추가 조사에서 **`ecommerce_orders` 는 플랫폼 canonical 주문 테이블이 아니다**:

- `docs/baseline/E-COMMERCE-ORDER-CONTRACT.md` (CLAUDE.md §4 SSOT, **Frozen**): **canonical 주문 테이블 = `checkout_orders` (CheckoutOrder)** (§7.1, line 191/242). `ecommerce_orders` 는 계약 문서에 **존재하지 않음** = off-contract.
- `checkout_orders` 는 `20260414100000-CreateCheckoutTables.ts` 로 **정식 생성됨**. `checkoutService.createOrder()`(CLAUDE.md §4 "주문 생성 필수 경로")가 이 테이블을 사용.
- `ecommerce_orders` 관련 ALTER 마이그레이션 2건은 **고의적 NO-OP** 이며 주석에 명시: *"ecommerce_orders table does not exist. The platform uses checkout_orders (CheckoutOrder entity) instead."*
- 즉 `ecommerce_orders` 는 **의도적으로 미프로비전**된 평행 엔티티. 이를 생성하면 **동결된 E-commerce 계약(§4: checkoutService 경유 필수, 독립 주문 테이블 금지)에 반하는 두 번째 주문 원장**을 신설하게 됨.

### 진짜 문제 (재정의)
`cosmetics-order.controller.ts` (및 `glycopharm/checkout.controller.ts`)가 **canonical `checkout_orders`/checkoutService 를 우회**하고 off-contract `EcommerceOrder`(ecommerce_orders)를 직접 사용 → 테이블 부재로 500. 수정 방향은 **테이블 생성이 아니라 컨트롤러를 canonical(checkout_orders/checkoutService)로 정렬**하는 것.

### 권고 (사용자 아키텍처 결정 필요)
- **이 WO(table provision)는 폐기 또는 보류.** `ecommerce_orders`/`ecommerce_order_items`/`ecommerce_payments` 생성하지 말 것.
- 대체 WO 후보: `WO-O4O-COSMETICS-ORDERS-CANONICAL-CHECKOUT-ALIGNMENT-V1` (가칭) — cosmetics 주문 read/list/detail 를 `checkout_orders`(CheckoutOrder) 기준으로 재작성, 생성 경로는 `checkoutService.createOrder()`. glycopharm 의 동일 off-contract 사용도 영향 범위로 조사.
- 단, "ecommerce_orders 를 신규 canonical 로 승격" 이라는 반대 방향 의도(서비스 컨트롤러 주석상 "canonical")가 있었는지 여부는 **아키텍처 오너 결정 사항** — 계약 문서(checkout_orders canonical)와 충돌하므로 사용자 판단 필요.

> 아래 §1~§7 은 "ecommerce_orders 부재" 자체에 대한 조사 기록으로 보존하되, **구현 지침으로 쓰지 말 것.**

---

## 1. 확정된 원인 (테이블 부재 — 기록용)

프로덕션 DB(`o4o_platform`, 앱 연결 user `o4o_api`)에 **ecommerce-core 기반 테이블이 생성된 적 없음**:
- `ecommerce_orders` / `ecommerce_order_items` / `ecommerce_payments` — **base `CREATE TABLE` 마이그레이션 0건** (전체 마이그레이션 디렉터리 grep 확인).
- 프로덕션 `synchronize: false` ([connection.ts:593](../../apps/api-server/src/database/connection.ts#L593), [migration-config.ts:74](../../apps/api-server/src/database/migration-config.ts#L74)).
- ecommerce-core `install()` lifecycle ([packages/ecommerce-core/src/lifecycle/install.ts](../../packages/ecommerce-core/src/lifecycle/install.ts)) 는 **인덱스만** 생성하며 테이블은 "TypeORM synchronize 가 처리"한다고 가정(주석). 그리고 이 `install()` 은 **api-server 어디서도 호출되지 않음**(호출처 grep 0건).
- 기존 ALTER 마이그레이션 3건(`NormalizePhoneNumbers`, `AddStoreAttributionToEcommerceOrders`, `AddEcommerceOrdersServiceKeyIndex`)은 "테이블 없으면 skip" 가드 보유 → **실패 없이 no-op** 하여 부재가 드러나지 않았음.

⇒ 테이블은 과거 **dev 의 `synchronize:true` 로만 존재**했고, 프로덕션에는 한 번도 생성되지 않았다. 동일 drift 를 KPA 가 이미 겪고 [`CreateKpaFoundationTables`](../../apps/api-server/src/database/migrations/20260206190000-CreateKpaFoundationTables.ts) / `CreateAuthTokenTables` 로 해결한 선례가 있다.

### 직접 증거
- 프로덕션 앱 연결 로그: `error: relation "ecommerce_orders" does not exist` (리비전 `o4o-core-api-01983-l9d`, cache-buster 직접 호출로 재현).
- 코드 전체에 `ecommerce_orders` 를 schema-qualified 로 참조하는 곳 없음 → search_path 오인 가능성 배제(public 부재 = 사실상 전 schema 부재).

## 2. 영향 범위

`EcommerceOrder` 엔티티 사용처(= 본 테이블 부재로 런타임 실패하는 경로):
- **cosmetics**: `cosmetics-order.controller.ts`(주문 생성/목록/단건), `cosmetics-payment.controller.ts`, `KCosmeticsPaymentEventHandler.ts`
- **glycopharm**: `checkout.controller.ts`, `glycopharm-payment.controller.ts`, `GlycopharmPaymentEventHandler.ts`
- **lms**: `LmsPaymentEventHandler.ts`
- 공통: `connection.ts`(엔티티 등록)

> 즉 **K-Cosmetics 단독 문제 아님** — ecommerce-core 주문·결제 전반. 단, 현재까지 실제 주문 데이터가 없어(서비스 전 단계) 표면화가 적었음.

## 3. 권장 해결 방식

KPA `CreateKpaFoundationTables` 선례와 동일하게 **엔티티 스키마 기준 base `CREATE TABLE IF NOT EXISTS` 마이그레이션** 작성:
- 대상: `ecommerce_orders`, `ecommerce_order_items`, `ecommerce_payments` (manifest 선언 3종) + FK/인덱스.
- 컬럼은 [EcommerceOrder.entity.ts](../../packages/ecommerce-core/src/entities/EcommerceOrder.entity.ts) / `EcommerceOrderItem.entity.ts` / `EcommercePayment.entity.ts` 정의를 SSOT 로 그대로 반영(이미 ALTER 로 추가된 컬럼 store attribution·serviceKey index 와 충돌하지 않도록 IF NOT EXISTS / 멱등 작성).
- 실행: main 배포 → CI/CD `o4o-api-migrations` job 자동 실행(프로덕션 마이그레이션 표준). 직접 DDL 지양.

> 대안(비권장): ecommerce-core `install()` 을 부팅 시 호출 — 그러나 prod 표준은 마이그레이션이므로 마이그레이션이 정합.

## 4. DB write 필요 여부

- **필요(YES)** — `CREATE TABLE` 3종(+FK/인덱스). 단 **마이그레이션 코드로 작성 후 CI/CD 자동 실행**이 원칙이므로, 운영자가 수동 DDL 을 칠 필요는 없음. 마이그레이션 PR/배포 승인만 필요.
- 데이터 INSERT/백필 불필요(빈 테이블 생성만). pre-service 단계라 기존 주문 데이터 없음.

## 5. 검증 계획 (착수 후)
- 마이그레이션 배포 후 `migration:show` 로 적용 확인.
- `/store/commerce/orders` (cosmetics) → 200 + empty list (주문 없음). glycopharm checkout 주문 목록도 동일 정상화.
- 주문 생성 1건 E2E(선택, pre-service 데이터 정책 내) 후 목록 노출 확인.

## 6. 범위 / 금지
- 범위: ecommerce-core base 테이블 3종 생성 마이그레이션.
- 금지: 엔티티 스키마 변경, 비-ecommerce 테이블, 데이터 백필, KPA/Neture 무관 변경.
- ⚠️ **착수 전 사용자 DB write 승인 필수** (CLAUDE.md §0).

## 7. 선행 의존
- 본 WO 완료 시 `WO-O4O-KCOSMETICS-ORDERS-NO-STORE-RESPONSE-FIX-V1` 의 잔존 블로커(§9)도 함께 해소됨(alias fix 는 이미 배포 완료).
