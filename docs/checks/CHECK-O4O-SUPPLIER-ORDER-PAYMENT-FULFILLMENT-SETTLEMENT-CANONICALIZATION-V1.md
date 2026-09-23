# CHECK-O4O-SUPPLIER-ORDER-PAYMENT-FULFILLMENT-SETTLEMENT-CANONICALIZATION-V1

> **WO:** [`WO-O4O-SUPPLIER-ORDER-PAYMENT-FULFILLMENT-SETTLEMENT-CANONICALIZATION-V1`](../work-orders/WO-O4O-SUPPLIER-ORDER-PAYMENT-FULFILLMENT-SETTLEMENT-CANONICALIZATION-V1.md) (접수 `60606e8b5` · 보강 `afb46b079`)
> **실행일:** 2026-09-23 · **착수 `origin/main`:** `afb46b079` → rebase 후 최종 `f951ad841`
> **커밋:** 구현 `f951ad841` · **§F recovery 마감 `11c249c80`** · CHECK(본 문서)
> **판정:** **구현 COMPLETE (§A~§M 전체)** — 결제 개시부터 공급자 처리·복구까지 연결. 남은 OPEN 은 **CANONICAL DOC ALIGNMENT(doc-only)** 하나 · `AUTHENTICATED_SUPPLIER_SMOKE = PENDING`(WO 허용 · blocker 아님)
> **중지 조건:** A~H **전부 미발동**(§9)

---

## 1. 실제 Supplier 주문 producer (Q1·Q2·Q3)

| Producer | metadata.source | serviceKey | 결제 진입 | paid 전이 handler | bridge |
|---|---|---|---|---|---|
| Neture B2B | `neture_b2b_checkout` | `neture` | `/neture/b2b/payments/*` (기존) | `NetureB2bCheckoutPaymentEventHandler` (기존) | ✅ 기존 |
| Pharmacy-Hub | `pharmacy_hub_cart` | `pharmacy-hub` | `/store-owner/payments/*` (기존) | `PharmacyHubPaymentEventHandler` (기존) | ✅ 기존 |
| 승인축 B2B | `store_b2b_cart` | `kpa-society` · `k-cosmetics` | **신규** `/{kpa,cosmetics}/b2b/payments/*` | **신규** `StoreB2bCheckoutPaymentEventHandler` | ✅ 기존 |
| **Event Offer 특가** | `store_cart_checkout` | `kpa-groupbuy` · `k-cosmetics-event-offer` | **신규**(같은 경로) | **신규**(같은 handler) | **신규 등록** |

**Q2 모두 `checkout_orders` 로 수렴한다** — 새 `*_orders` 테이블 0. **Q3 모두 payment-first** — 주문은 `pending` 생성, `paid` 전이는 결제 완료 event 만.

`glycopharm-event-offer`(프로덕션 4건 · 전량 cancelled)는 `event-offer-service-mapping.ts` 매핑에 없는 키다. 이번 범위의 두 서비스(KPA·K-Cos)에 해당하지 않아 결제 경로를 만들지 않았다 — 별도 판단 대상(§11).

## 2. Q4 Event Offer 무결제/참여형 잔재

| 항목 | 결과 |
|---|---|
| 참여/예약/구매의향/펀딩 runtime | **0** — 이미 cart → `createOrder` 경로였다(참여신청 모델 아님). source-contract 테스트로 고정 |
| 실제 잔재 | (a) 결제 진입점 없음 (b) bridge source 미등록 (c) canonical 문서의 "결제축 아님" 계약 — **셋 다 이번에 처리** |
| 전용 결제 UX | **만들지 않았다.** 일반 B2B cart/결제 흐름을 그대로 사용(같은 client · 같은 버튼 · 같은 route) |

## 3. Q5 bridge caller · Q6 paid-but-unbridged

- 기존 caller: `NetureB2bCheckoutPaymentEventHandler` · `PharmacyHubPaymentEventHandler` · `PharmacyHubOperatorFulfillmentController`(recovery).
- **추가 caller**: `StoreB2bCheckoutPaymentEventHandler`(승인축 B2B + Event Offer).
- Q6 **paid 인데 bridge 안 되는 경로**: 이번 변경 전에는 `store_cart_checkout`(registry 미등록) 전량 + 승인축(handler 부재). 이후 남는 것은 **bridge 호출 자체가 실패한 경우**뿐이며 이는 best-effort 설계상 `paid` 는 유지되고 공급자만 미노출된다 → §4 recovery 대상.

## 4. Q7 recovery — **전 producer 일반화 완료** (`11c249c80`)

초기 구현(`f951ad841`)에서는 "실결제 발생 후 판단" 으로 보류했다. **정정한다** — `paid · neture_order 없음` 은
첫 실결제 **전에** 닫아야 하는 안전장치이므로 같은 WO 안에서 마감했다.

### 4.1 구조

| 요소 | 내용 |
|---|---|
| 서비스 | `services/neture/checkout-fulfillment-recovery.service.ts` — `listStuckOrders()` · `recoverOrder()` · `recoverMany()` |
| 대상 producer SSOT | **`BRIDGE_SOURCES` export**(값·동작 불변) — Neture B2B · Pharmacy-Hub · 승인축 B2B · Event Offer 특가 |
| 탐지 조건 | `paymentStatus='paid' AND status='paid' AND paidAt IS NOT NULL AND NOT EXISTS(neture_orders.metadata->>'checkoutOrderId')` |
| 복구 방식 | **기존 `CheckoutFulfillmentBridgeService` 재호출만** — payment-first guard · idempotency · source 판정이 전부 bridge 안에 이미 있다 |
| 운영 진입점 | `GET /api/v1/admin/fulfillment/stuck` · `POST /:orderId/recover` · `POST /recover-batch` (`requireAdmin` = platform:super_admin · 감사 로그 warn) |
| 기존 Pharmacy-Hub recovery | **미접촉**(회귀 기준). 이번 서비스는 그것을 전 producer 로 일반화한 것 |

### 4.2 안전 계약 (요구 1~6 대응)

| # | 요구 | 구현 |
|---|---|---|
| 1 | 공통 paid-but-unbridged 조회 | `listStuckOrders()` · registry ∩ scope |
| 2 | 기존 bridge 재호출 | `bridgeCheckoutOrderToNetureFulfillment({ checkoutOrderId })` 그대로 |
| 3 | 운영 복구 진입점 | admin 3 route (단건 · 목록 · batch ≤50건) |
| 4 | 이미 bridged 면 no-op | `ALREADY_BRIDGED` → `{ ok:true, alreadyBridged:true }` · 기존 `netureOrderId` 반환 |
| 5 | 타 supplier/order 오조작 금지 | registry 밖 source → `UNSUPPORTED_SOURCE`(400) · scope 밖 source/serviceKey → `OUT_OF_SCOPE`(403) |
| 6 | 새 queue/framework/DB schema | **0** — 서비스 1 + route 1 · DDL 0 |

**결제 상태를 절대 바꾸지 않는다** — `paid` 가 아니면 `ORDER_NOT_PAID`(409) 로 거부하고 bridge 를 호출하지 않는다. 재고도 건드리지 않는다.

### 4.3 테스트 (19건 · 요구 항목 전수)

```text
paid + no fulfillment → recovery → neture_order 1                 ✓
동일 recovery 재실행 → 여전히 1 (ALREADY_BRIDGED no-op)            ✓
unpaid(created/pending · cancelled · status만 paid) → 거부 · bridge 미호출  ✓
unsupported source → 거부                                          ✓
scope 밖 source / serviceKey → 거부                                ✓
활성 producer source 전부 복구 가능(registry 순회)                  ✓
recoverMany 부분 성공                                              ✓
```

## 5. Q8·Q9 Supplier 직접 배송

- UI/API: `POST /supplier/orders/:orderId/shipment`(생성) · `PATCH /supplier/shipments/:id`(상태·송장) · `GET /supplier/orders/:orderId/shipment`.
- **Q9 `neture_shipments` 는 단순 상태 기록 범위를 넘지 않는다.** 외부 택배사 integration **0** — source-contract 테스트가 `carrierApi` · `dispatch` · `pickup` · `3pl` · `logistics` · `createWaybill` · `issueLabel` · `trackingApi` · `sweettracker` · `delivery-tracker` 및 HTTP client(`axios`/`fetch(`/`node-fetch`/`got(`) 참조 0 을 고정한다.
- `carrier` · `trackingNumber` 는 **공급자 수동 입력 참고정보**로 보존. 택배사 validation·조회 API 미연결.

## 6. Q10 inventory reserve/release — 기존 원자 경계 **보존**

| 시점 | 동작 | 이번 변경 |
|---|---|---|
| cart add | 재고 변경 **0** | 불변 |
| **checkout-confirm** | `reserveEventOfferListing()` — `organization_product_listings` `SELECT … FOR UPDATE` + `total_quantity` 원자 차감 (`SOLD_OUT`/`INSUFFICIENT_QUANTITY`/`per_order_limit`) | **불변 — oversell 방지 장치 보존** |
| payment success | **추가 차감 0** | handler 에 `reserved_quantity`/`total_quantity`/`FOR UPDATE` 참조 0 을 테스트로 고정 |
| bridge | **추가 차감 0** | 동일 |
| 주문 취소 | `store-order-cancel.service.ts:213` → `incrementListingQuantity()` **복원 존재** | 불변 |
| 결제 실패 | `paymentStatus=FAILED` 만. 재고 복원 **안 함** | **의도** — 주문은 살아 있고 재결제 가능하므로 복원하면 재결제 시 재고가 사라진다. 복원은 **취소** 경로가 담당 |

두 재고 축은 분리 유지: `supplier_product_offers.reserved_quantity`(legacy 직접 주문 경로) ↔ `organization_product_listings.total_quantity`(Event Offer 한정수량). **합치거나 이중 차감하지 않았다.**

## 7. Q11·Q12 settlement · collectionStatus

- settlement 대상: bridge 된 `neture_orders`(= 위 4 producer 전부). readiness 는 `metadata.paymentStatus='paid' | paymentReady` + `status='paid'|paid_at`.
- **Q12 `collectionStatus` 처분**: `supplier-order.service.getFulfillmentReadiness()` 의 OR 분기 제거 · `neture-settlement.service` eligibility SQL 의 `OR o.metadata->>'collectionStatus' = 'confirmed'` 제거. **runtime 의미 0.** metadata 필드·과거 데이터는 **물리 삭제하지 않았다**(DB write 0). `CheckoutOrder.entity` · `neture-order.entity` 주석에 **SUPERSEDED** 표기.

## 8. Q13·Q14·Q15

- **Q13 `SupplierUnifiedOrderService`**: **유지**. 이유 — 실데이터 `paid` 0건이라 bridge 안정성이 아직 실증되지 않았고, 프런트 소비처(`/supplier/orders/unified`) 확인·전환이 별도 작업이다. WO §2-L 이 허용한 "deprecated 표기 후 다음 단계 제거" 쪽을 택했으나 **표기도 이번엔 넣지 않았다**(오해 유발). §11 후속.
- **Q14 DB/migration**: **불필요 · 0.** 기존 `checkout_orders`/`neture_orders`/`neture_shipments`/`neture_settlements` + `metadata` 로 전부 표현.
- **Q15 canonical 문서**: **이번 커밋에 미포함.** [`O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1`](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md) §5-1(158행) "이 축은 결제 축이 아니다" 와 118행 "결제 축 live producer 3개 한정" 이 현 정책과 충돌한다. 이 문서는 **기준 문서**이므로 §16-4(인라인 금지) 에 따라 **별도 문서 WO 로 제안**한다(§11).

## 9. 중지 조건 A~H

| # | 발동 | 근거 |
|---|---|---|
| A PaymentCore 로 연결 불가 | 아니오 | `PaymentCoreService.prepare/confirm` + `TossPaymentProviderAdapter` 그대로 재사용 |
| B DB migration 필요 | 아니오 | DDL 0 |
| C 410 consumer-commerce 경계 침범 | 아니오 | `/kpa/payments` · `/cosmetics/payments` 410 **그대로** · 신규는 `/b2b/payments` namespace. 테스트로 고정 |
| D Event Offer 원자 재고 보존 불가 | 아니오 | checkout-confirm 로직 미접촉 · handler 재고 참조 0 |
| E 타 세션 동일 파일 충돌 | 아니오 | rebase 1회(문서 커밋) · 충돌 0 |
| F/G/H (WO §8) | 아니오 | 새 PG 0 · lockfile 0 · dirty 접촉 0 |

## 10. 테스트 · 배포 · smoke

| 항목 | 결과 |
|---|---|
| 소스 계약 `store-b2b-payment-first-canonicalization.spec.ts` | **36/36 PASS** (bridge source · PaymentCore 재사용 · 410 유지 · collectionStatus 0 · 택배사 0 · 재고 경계 · Neture 무회귀) |
| 런타임 `b2b-payment-controller.test.ts` | **14/14 PASS** (401 · source/serviceKey 경계 · paid 이중결제 차단 · 소유권 · group payable) |
| 영향 subset (api-server payment/neture/routes/modules + security) | **64 suites · 954 PASS** |
| recovery `checkout-fulfillment-recovery.service.test.ts` | **19/19 PASS** (§4.3) |
| recovery 영향 subset (neture/payment/bootstrap/pharmacy-hub) | **6 suites · 169 PASS** — Pharmacy-Hub 기존 recovery 회귀 0 |
| recovery CI/Deploy | 커밋 `11c249c80` — **CI Pipeline success**(35873433548) · **Deploy API Server success**(35873433517) · CodeQL success(35873433571) |
| `store-ui-core` vitest | store-cart 4 failed — **내 변경 전후 동일**(stash 대조 실증). 기존 실패 · 미접촉 |
| tsc | api-server / store-ui-core / web-kpa-society / web-k-cosmetics — **내 변경 오류 0** (기존 무관 실패 2건: `operator-invitation.service`(타 세션) · `storeWorkspace.test`(타 세션)) |
| lint ratchet | **PASS** — 46 → **44** 로 감소(개선) |
| CI / Deploy | 커밋 `f951ad841` — **CI Pipeline success**(35869445367) · **Deploy API Server success**(35869445521) · Deploy Web Services success(35869445585) · Deploy Admin Dashboard success(35869445586) · CodeQL success(35869445400) |
| **E2E 결제 smoke** | **`AUTHENTICATED_SUPPLIER_SMOKE = PENDING`** — ① `neture_suppliers.user_id` 3/3 NULL(공급자 진입 불가 · WO §6 범위 밖) ② 매장 계정 428 약관 gate ③ 실결제는 PG 승인이 필요해 운영 데이터 mutation 발생. WO §6 이 "이 사유만으로 완료를 막지 않는다" 로 허용 |

**프로덕션 read-only before (착수 시점 · write 0):** `checkout_orders` 23(created 3 / cancelled 20 · **paid 0**) · `neture_orders` 0 · `neture_shipments` 0 · `neture_settlements` 0 · Event Offer 계열 주문 10(kpa-groupbuy 6 · k-cosmetics-event-offer 4). 배포 후에도 **자동 변화는 없다**(신규 결제가 발생해야 움직인다).

## 11. 후속 — OPEN 1건 (doc-only)

| 항목 | 판정 |
|---|---|
| **CANONICAL DOC ALIGNMENT** | **OPEN** — [`O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1`](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md) §5-1(158행) "이 축은 결제 축이 아니다" · 118행 "결제 축 live producer 3개 한정" 이 현 정책과 충돌. 기준 문서이므로 §16-4(인라인 금지) → **문서 WO 1건**. 정정 내용: `Event Offer = 특가 판매 = 일반 Supplier→Store B2B commerce = checkout_orders = payment-first = paid 후 fulfillment` |
| `SupplierUnifiedOrderService` 은퇴 | **보류** — 실제 paid 주문이 생기고 bridge 운용이 안정된 뒤 판단. WO §2-L 이 허용한 선택 |
| `glycopharm-event-offer` 4건 | **historical/retired-service 데이터로 분류.** GlycoPharm 은 이미 은퇴한 서비스이므로 현행 payment/bridge 지원을 추가하지 않는다. 필요 시 향후 DB 정비에서 처리 |
| `neture_suppliers.user_id` 복구 | Identity 축 작업(사용자 승인 필요) — 이 WO 범위 밖 |

**트랙 상태**

```text
PAYMENT-FIRST IMPLEMENTATION   = PASS      EVENT_OFFER = SPECIAL PRICE  = PASS
KPA/KCOS B2B PAYMENT           = PASS      FULFILLMENT BRIDGE           = PASS
INVENTORY ATOMICITY            = PASS      SUPPLIER SHIPPING BOUNDARY   = PASS
COLLECTION_STATUS READINESS    = RETIRED   DB MIGRATION                 = 0
BRIDGE RECOVERY ALL PRODUCERS  = PASS      ← 이번 마감 (11c249c80)
CANONICAL DOC ALIGNMENT        = OPEN (doc-only · 문서 WO 1건)
AUTHENTICATED_SUPPLIER_SMOKE   = PENDING (WO 허용 · blocker 아님)
```

## 12. 문서 정합 · Git

`발견 1건 / SUPERSEDED 표기 2건 / 링크 수정 0건 / 별도 WO 제안 1건`(초기 5건 → 정리: 문서 정정 1건만 필요 · 나머지는 보류/분류/범위 밖 — §11)

- 발견: B2B 계약 문서 §5-1 "Event Offer 는 결제축 아님" ↔ 확정 정책 충돌 → 별도 문서 WO(§11-1).
- SUPERSEDED 표기 2건: `CheckoutOrder.entity.ts` · `neture-order.entity.ts` 의 collectionStatus readiness 주석(코드 주석이므로 §16-4 의 기준 문서 인라인 금지 대상 아님).
- 구현 `f951ad841` · **§F recovery `11c249c80`** · CHECK 갱신 후속. rebase 2회(타 세션 문서 커밋 위로) · reset/force 0 · path-specific stage.
- 타 세션 dirty/untracked 접촉 0 · path-specific stage · `git commit -- <paths>`.
