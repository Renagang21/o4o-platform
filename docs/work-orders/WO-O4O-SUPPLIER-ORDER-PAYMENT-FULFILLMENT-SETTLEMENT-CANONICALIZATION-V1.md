# WO-O4O-SUPPLIER-ORDER-PAYMENT-FULFILLMENT-SETTLEMENT-CANONICALIZATION-V1

> **상태:** READY FOR EXECUTION · HANDOFF ONLY · 구현 WO (등록일 2026-09-23 · 실행 착수는 별도 명시 지시)
> **기준 코드:** Delta 검증 시점 `origin/main` `bfb05c5f2`. **실행은 항상 최신 `origin/main` 에서 시작**하며 과거 커밋으로 reset/rebase 하지 않는다
> **선행 조사:** [`IR-O4O-SUPPLIER-DOMAIN-FULL-ARCHITECTURE-AND-REMAINING-REFACTOR-CENSUS-V1`](../investigations/IR-O4O-SUPPLIER-DOMAIN-FULL-ARCHITECTURE-AND-REMAINING-REFACTOR-CENSUS-V1.md) — **§5 R1 의 "bridge 가 없다" 는 표현은 이 WO 가 정정한다**(§1.2). 별도 IR 을 새로 만들지 않고 이 WO 의 Delta 검증(§1)이 대체한다
> **기준 문서:** [`O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1`](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md)(§5-1 정정 대상) · [`O4O-STORE-COMMERCE-BOUNDARY-V1`](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md) · `CLAUDE.md` §4
> **한 문장:** **매장이 주문하고 결제하면 공급자에게 전달된다. 공급자는 직접 상품을 배송하고 O4O 에는 처리·배송 상태를 기록한다. 배송 완료 후 정산한다. Event Offer 는 단순한 특가 판매일 뿐이다.**

---

# 0. 확정 사업 불변식 — 이 WO 에서 다시 판단하지 않는다

```text
checkout_orders  = 주문 + 결제 canonical SSOT          (신규 *_orders 테이블 금지)
neture_orders    = 결제 완료 주문의 공급자 처리 record  (독립 주문 정본 아님)
neture_shipments = Supplier-managed shipping status record ONLY

모든 실제 전자상거래 주문 = PAYMENT-FIRST
  UNPAID → fulfillment 금지 · 배송 처리 금지 · 정산 금지
  후불 · 외상 · 인보이스 · 배송 후 수금 · collectionStatus 기반 무결제 배송 = 이번 모델에 없음

Event Offer = 특가. 그 이상도 이하도 아니다.
  참여 신청 · 구매 의향 · 예약 · 약정 · 참가자 모집 · 펀딩 · 참여 후 주문전환 = 존재하지 않는다

배송 실행 주체 = Supplier. O4O 는 배송을 수행하지 않는다.
```

**OUT_OF_SCOPE (어떤 경우에도 이 WO 가 여기로 확대되지 않는다):** 택배사 API 연동 · 택배사 자동 전송 · 집하 요청 · 배송기사 호출 · 자동 배차 · 운송장 자동 발급 · 택배사 자동 선택 · 배송/물류 대행 · 3PL · 배송비의 택배사 정산.

---

# 1. Delta 검증 결과 (2026-09-23 · `bfb05c5f2`)

## 1.1 producer / payment / bridge matrix — `UNKNOWN` 0

| Producer | serviceKey / source | checkout 생성 | 초기 payment | 결제 API(paid 전이) | bridge 등록 | fulfillment |
|---|---|---|---|---|---|---|
| **Neture B2B** | `neture` / `metadata.source='neture_b2b_checkout'` | `NetureB2bCartCheckoutService` | `pending` | `NetureB2bCheckoutPaymentEventHandler`(register-routes 824) | ✅ `neture_b2b_checkout` | 동작 |
| **Pharmacy-Hub** | `pharmacy-hub` / `pharmacy_hub_cart` | `PharmacyHubCartCheckoutService` | `pending` | `PharmacyHubPaymentEventHandler`(719) | ✅ `pharmacy_hub_cart` | 동작 + operator recovery |
| **승인축 B2B (kpa-society · k-cosmetics)** | 각 serviceKey / `store_b2b_cart` | `StoreB2BCartCheckoutService` | `pending` | **❌ 없음** — 전용 payment event handler 미등록 | ✅ `store_b2b_cart` | **paid 전이 producer 부재 → 사실상 미동작** |
| **Event Offer (KPA groupbuy · K-Cosmetics)** | `kpa-groupbuy` · `k-cosmetics-event-offer` / **`metadata.source='store_cart_checkout'`** | `EventOfferCartCheckoutService`(269행) | `pending` | **❌ 없음** | **❌ registry 에 없음** | **결제돼도 공급자에게 영원히 보이지 않음** |
| `glycopharm-event-offer` (프로덕션 4건) | — | 매핑 상수(`event-offer-service-mapping.ts`)에 **없는 키** | — | ❌ | ❌ | 착수 시 출처 재확인 대상(§2-A) |

**BRIDGE_SOURCES registry**(`checkout-fulfillment-bridge.service.ts:45`)는 `neture_b2b_checkout` · `pharmacy_hub_cart` · `store_b2b_cart` **3개뿐**이며, 파일 자체가 경고한다:

> "등록하지 않으면 주문은 생성되고 결제까지 되지만 **공급자에게 영원히 보이지 않는다**(`UNSUPPORTED_SOURCE` 로 조용히 skip)."

Event Offer 는 `store_cart_checkout` 을 쓰므로 정확히 이 상태다.

## 1.2 선행 IR §5 R1 정정

IR 은 "bridge 가 없다" 고 썼다. **틀렸다.** `CheckoutFulfillmentBridgeService` 는 존재하고, payment-first(`paymentStatus='paid' & status='paid' & paidAt not null` 만) · idempotent(`metadata.checkoutOrderId` dedup) · `collectionStatus` 미사용을 이미 계약으로 갖고 있다. 실제 Delta 는:

```text
bridge 부재  (✕ 틀림)
→ bridge 는 있으나 (a) 등록 source 가 3/5 (b) paid 전이 producer 가 2/5 뿐
```

IR 의 나머지 관찰(`neture_orders` 0건 · 공급자 처리/정산 코드가 `neture_orders` 전용 · `SupplierUnifiedOrderService` 는 read-only)은 사실이며 유효하다. IR 본문은 기록물이므로 수정하지 않고 이 WO 가 대체한다(§16-4).

## 1.3 Event Offer Delta

| 항목 | 현재 |
|---|---|
| 참여/예약/의향 runtime | **0** — `EventOfferCartCheckoutService` 는 이미 cart → `createOrder` 경로다(참여신청 모델 아님). §0 의 금지 개념은 코드에 없다 |
| 주문 생성 | ✅ `checkout_orders` 로 수렴 · line item `sourceType='event_offer'` 보존 |
| payment-first | 주문은 `pending` 으로 생성 · **결제 API/handler 없음** |
| bridge | **❌ source 미등록** |
| canonical 문서 | **충돌** — `O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1` §5-1(158행): "이 축은 **결제 축이 아니다.** 주문 생성까지가 O4O 의 책임이고, 정산은 공급자–매장 간 기존 거래 관계를 따른다" |

즉 Event Offer 의 남은 잔재는 **참여형 UI 가 아니라 "결제축 아님" 계약과 결제/bridge 미연결**이다.

## 1.4 paid 전이 단일성

`paymentStatus='paid'` 를 쓰는 코드 전수 중 **주문축에 실제로 쓰는 곳은 bridge(168행 — neture_order 투영)와 admin 보정(`adminOrderController.ts:278`) 뿐**이다. 서비스 컨트롤러가 직접 paid 를 만드는 경로는 없다(계약 B1 준수). → **정렬 불필요 · 유지**. 다만 `adminOrderController` 경로는 운영 보정용인지 WO 실행 시 확인해 CHECK 에 기록한다.

## 1.5 `collectionStatus` 잔재 — **정책 충돌 · 처분 대상**

`CheckoutOrder.entity.ts:175`: "`collectionStatus='confirmed'` 이면 fulfillment/settlement readiness 로 인정된다(**`paymentStatus='paid'` 와 OR 관계**). B2B/인보이스/운영자 확인 주문에 사용."

소비처 **14곳 · 8파일**: `neture-settlement.service` · `supplier-order.service` · `store-cart.routes` · `neture-b2b-payment.controller` · `neture-order.entity` · `neture-b2b-cart-checkout.service` · `checkout-fulfillment-bridge.service`(미사용 명시) · entity.

§0 확정 정책(후불·인보이스·무결제 배송 없음)과 **정면 충돌**하는 유일한 런타임 경로다.

## 1.6 Supplier 직접 배송 현재 구현 — 범위 초과 **없음**

| 확인 | 결과 |
|---|---|
| 외부 택배사 integration(carrier API · dispatch · pickup · 3PL · label 발급) | **0건** (`shipment.service.ts` · `shipment.controller.ts` grep 0) |
| 실제 기능 | `PATCH /supplier/shipments/:id` — `status` 전이 검증 + `tracking_number` 수동 입력뿐 |
| 상태 전이표 | `shipped → in_transit|delivered` · `in_transit → delivered` |
| 주문 쪽 진입 | `POST /supplier/orders/:orderId/shipment`(active) · `GET /supplier/orders/:orderId/shipment`(linked) |

→ `neture_shipments` 는 이미 **"Supplier-managed shipping status record" 범위 안**이다. Drift 0. 이 WO 는 확장하지 않고 **그 의미를 문서·주석으로 고정**만 한다.

## 1.7 Inventory reserve/release

| 시점 | 현재 |
|---|---|
| reserve | `routes/neture/services/neture.service.ts:526` — **legacy neture_order 직접 생성 경로**에서 `trackInventory` 인 offer 에 `reserved_quantity += qty` |
| cart add / checkout confirm / payment / bridge | reserve **없음** |
| release(취소·결제실패) | 코드 경로 **확인 실패 — 착수 시 재확인 필요**(§2-I) |

즉 **payment-first 경로(checkout → bridge)에는 재고 예약이 전혀 없고**, 예약은 legacy 직접 주문 경로에만 있다. 중복 차감 위험은 현재 없으나(경로가 하나뿐) **payment-first 축에 예약 기준점이 없다**는 것이 Delta다.

## 1.8 Settlement

`neture-settlement.service.ts` 는 `neture_orders` 를 조인하고 readiness 로 `metadata.paymentStatus='paid' | paymentReady | collectionStatus`(154행)를 인정한다. bridge 된 주문은 `status=PAID · metadata.paymentReady=true` 로 들어오므로 **bridge 만 정상화되면 settlement 는 자동으로 paid 축에 정렬**된다. 남는 것은 `collectionStatus` OR 분기 제거(§1.5)와 `delivered` 조건 확인이다.

## 1.9 Recovery 현황

| 서비스 | recovery |
|---|---|
| Pharmacy-Hub | ✅ `POST /api/v1/pharmacy-hub/operator/fulfillment/:orderId/recover` (`PharmacyHubOperatorFulfillmentController`) |
| Neture B2B | payment event handler 내 재시도만 |
| 승인축 B2B · Event Offer | **없음** |

## 1.10 DB migration 필요 여부 — **NO**

`checkout_orders` · `neture_orders` · `neture_shipments` · `neture_settlements` + 각 `metadata` jsonb 로 전부 표현 가능하다. 새 테이블·새 컬럼 없이 (a) bridge registry 확장 (b) payment handler 추가 (c) readiness 분기 정리 (d) 재고 예약 지점 확정으로 달성된다. **migration 0 · 새 schema 0.**

---

# 2. 구현 범위 A~M (한 묶음 · 작은 WO 로 나누지 않는다)

## A. 주문 producer / payment matrix 정렬
- §1.1 표의 5 producer 를 착수 시 재확인(특히 **`glycopharm-event-offer` 4건의 출처**). `UNKNOWN` 0 유지.
- 모든 producer 가 `checkout_orders` 로 수렴함을 source-contract 테스트로 고정. 신규 `*_orders` 0.

## B. Event Offer 의미 정리 = 특가
- 참여/예약/의향/모집/펀딩 개념의 runtime **0** 임을 census 로 재확인하고 테스트로 고정(§14 `Event Offer 참여형 runtime = 0`).
- UI 문구가 "참여/신청" 어휘를 쓰면 "구매/주문" 으로 정정(기능 변경 아님).

## C. Event Offer payment-first 연결
- `EventOfferCartCheckoutService` 의 `metadata.source` 를 bridge 가 인식하도록 한다. **두 선택지 중 실행자가 택하고 CHECK 에 근거 기록**:
  - (C-1) `BRIDGE_SOURCES` 에 `store_cart_checkout` 추가 — 최소 변경. 단 이 tag 가 event offer 외 항목에도 쓰이는지 먼저 census.
  - (C-2) Event Offer 전용 tag(`event_offer_cart`)로 바꾸고 registry 등록 — 의미가 명확하나 기존 주문 metadata 와 불일치 발생(기존 10건은 전부 cancelled 이므로 영향 0).
- 어느 쪽이든 **기존 tag 3개는 건드리지 않는다**(무회귀).

## D. payment completed → paid 전이 통일
- §1.4 결과 유지(서비스 컨트롤러 직접 paid 0). **추가 작업은 승인축/Event Offer 용 payment event handler 연결**(§E 와 한 몸).
- Payment Core 재사용 — **금지: Event Offer 전용 결제 엔진 · 서비스별 새 payment table · 서비스별 새 결제 상태머신.** 서비스별 thin adapter 만 허용.

## E. paid → FulfillmentBridge 전 producer 연결
- 승인축 B2B(`store_b2b_cart`)와 Event Offer 가 결제 완료 시 bridge 를 타도록 handler 를 연결한다. 기존 두 handler(`NetureB2bCheckoutPaymentEventHandler` · `PharmacyHubPaymentEventHandler`)의 구조를 복제하지 말고 **공통화 가능한지 먼저 검토**(공통 handler + serviceKey 라우팅이 최소안이면 그것으로).
- 불변식: `paid checkout_order → eventually exactly one neture_order`. 기존 `metadata.checkoutOrderId` dedup 계약 재사용.

## F. bridge retry / recovery / reconciliation
- 현재 Pharmacy-Hub 에만 있는 operator recovery 를 **전 producer 로 일반화**한다. 우선순위: ① idempotent retry ② operator recovery ③ 낮은 빈도 reconciliation.
- **새 queue/framework 는 기본안이 아니다.** 기존 architecture 안에서 가장 단순한 방식.
- 영구 금지 상태: `paymentStatus='paid'` AND 대응 `neture_order` 없음 — 이를 탐지하는 reconciliation 조회를 제공한다(운영자용 read + 기존 recover 호출).

## G. Supplier fulfillment 상태 정렬
- `neture_orders.status` 는 **공급자 처리 lifecycle** 전용. 실제 enum 을 기준으로 정리하고 **새 상태명을 만들지 않는다**.
- Supplier 가 **하지 못해야 하는 것**: 가격 변경 · 결제 완료 처리 · 구매자 변경 · 주문 원본 변경 → `checkout_orders` 소유. 테스트로 고정.
- `checkout_orders.status`/`paymentStatus` 와 `neture_orders.status` 의 책임 분리를 주석·문서로 명시. **기존 schema 를 무리하게 합치지 않는다.**

## H. Supplier 직접 배송 상태 기록 정렬
- §1.6 대로 현재 구현이 이미 올바르다. 할 일은 **의미 고정**: `neture_shipments` = Supplier-managed shipping status record. `SHIPPED` = "공급자가 직접 배송을 실행했고 O4O 에 발송 상태를 기록함".
- `carrier` · `trackingNumber` 는 **공급자 수동 입력 참고정보**로 보존. 택배사 validation · 송장 조회 · 배송 추적 API **붙이지 않는다**.
- **source-contract 테스트로 `external carrier API call = 0` 고정**(shipment service/controller 에 http client · carrier 도메인 문자열 0).

## I. inventory reserve / release 정렬
- §1.7 Delta: payment-first 축에 예약 지점이 없다. **reserve 기준점을 하나로 확정**한다(권장: 결제 완료/bridge 시점 1회 — checkout confirm 과 bridge 양쪽 reserve 금지).
- release 경로(취소 · 결제 실패)를 착수 시 census 하고, 없으면 이 WO 범위에서 추가한다(불일치가 생기는 부분은 §28 상 범위 내).
- 불변식: **중복 차감 0** · 취소/결제실패 시 예약 해제.

## J. settlement eligibility / owner 정렬
```text
PAYMENT=PAID AND FULFILLMENT=DELIVERED AND NOT CANCELLED AND NOT REFUNDED AND NOT ALREADY_SETTLED
```
- `collectionStatus` OR 분기를 readiness 에서 제거(§K 와 함께).
- Settlement 가 참조하는 주문 ID 정본을 1개로 확정(bridge 된 `neture_order` → `metadata.checkoutOrderId` 로 canonical 주문 추적 가능해야 한다 — §27 추적성).

## K. `collectionStatus` legacy 처분
- 14 소비처를 **비사용 정렬**(readiness 판정에서 제외)한다. metadata 필드 자체의 물리 삭제는 하지 않는다(DB write 0).
- `order-collection-status.ts` 헬퍼와 entity 주석을 SUPERSEDED 로 표기하고, 남은 호출부가 readiness 에 영향을 주지 않음을 테스트로 고정.

## L. Supplier order read model 정리 — `SupplierUnifiedOrderService`
- **판정: transitional compatibility.** bridge 가 전 producer 로 확장되면 paid 주문은 전부 `neture_orders` 에 투영되므로 두 원장 병합 조회의 존재 이유가 사라진다.
- 기본 정책: `payment pending` 주문은 **공급자 업무화면에 fulfillment 주문으로 노출하지 않는다.**
- 이 WO 에서 즉시 삭제할지, `deprecated` 표기 후 다음 단계에서 제거할지는 실행자가 택하고 CHECK 에 근거 기록. **삭제를 택할 경우 `/supplier/orders/unified` route 소비처를 먼저 census.**

## M. canonical 문서 정렬 · 회귀 테스트 · 배포 · smoke
- **[`O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1`](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md) §5-1 정정** — "이 축은 결제 축이 아니다"(158행)를 현 정책(Event Offer = 특가 · payment-first)으로 SUPERSEDE. 118행 "결제 축 live producer 3개 한정" 도 함께 갱신.
- `CheckoutOrder.entity.ts` collectionStatus 주석 · `neture-order.entity.ts` 188행 주석 SUPERSEDED 표기.
- Frozen baseline 본문 수정이 필요하면 §16-4 에 따라 **인라인 금지 → 별도 문서 WO 제안**으로 보고.

---

# 3. Settlement owner matrix (목표 상태 · 구현 후 CHECK 에 실측 기록)

| Order Source | Payment Owner | Fulfillment Owner | Shipping Executor | Settlement Owner |
|---|---|---|---|---|
| Neture B2B | Payment Core(payment.completed) | Supplier | **Supplier** | O4O(정산 원장) |
| Pharmacy-Hub | Payment Core | Supplier | **Supplier** | O4O |
| KPA Event Offer(`kpa-groupbuy`) | Payment Core | Supplier | **Supplier** | O4O |
| K-Cosmetics Event Offer | Payment Core | Supplier | **Supplier** | O4O |
| 승인축 B2B(kpa-society · k-cosmetics) | Payment Core | Supplier | **Supplier** | O4O |

`Shipping Executor` 에 O4O 또는 Service Operator 가 나오면 **정책 위반**이다.

---

# 4. 취소 / 환불 — 기존 계약만 표로 정리

대규모 refund 시스템을 만들지 않는다. 착수 시 다음 5 상태의 **현재 존재하는 계약만** census 하여 CHECK 에 표로 기록하고, 주문/재고/정산 불일치가 생기는 지점만 이 WO 범위에서 고친다.

```text
결제 전 취소 · 결제 후 Supplier 처리 전 취소/환불 · Supplier 처리 시작 후 취소 · 발송 후 취소 · 배송 완료 후
```

---

# 5. 테스트 계획 (필수)

```text
[payment-first 불변식]
UNPAID checkout → bridge 0 · Supplier fulfillment 0 · shipping status write 0 · settlement 0
PAID  checkout → bridge 1회 · neture_order exactly 1
같은 payment event 재수신 → neture_order 중복 0 (metadata.checkoutOrderId dedup)
bridge 실패 → recovery 가능 (전 producer)

[Event Offer]
KPA 특가 → cart → checkout → payment → paid → bridge → Supplier 처리
K-Cosmetics 특가 → 동일
Event Offer 참여/예약/구매의향 runtime = 0   (source-contract)

[기존 축 무회귀]
Neture B2B → payment-first 회귀 0
Pharmacy-Hub → paymentGroup / paid / bridge 회귀 0

[배송]
Supplier → preparing → shipped(수동 tracking 입력 선택) → delivered
external carrier API call = 0                (source-contract)

[Settlement]
unpaid + delivered → 0 · paid + not delivered → 0 · paid + delivered → candidate · cancelled/refunded → 0

[Inventory]
reservation duplicate = 0 · cancel/payment failure → reservation release
```

로컬 팁: api-server 전체 jest 는 `NODE_OPTIONS=--max-old-space-size=6144 npx jest --maxWorkers=1`. CI 게이트는 `node scripts/lint-ratchet.mjs`.

---

# 6. 배포 · smoke

- backend 중심이나 UI 문구 변경(§B)이 있으면 같은 완료 흐름에서 배포.
- **비파괴 smoke 우선.** 운영 데이터 mutation 을 smoke 목적으로 새로 만들지 않는다.
- **`AUTHENTICATED_SUPPLIER_SMOKE = PENDING`** — 현재 `neture_suppliers.user_id` 3/3 NULL 이라 공급자 인증 경로 진입 불가. **이 데이터 복구는 이 WO 범위 밖**(Identity/Relationship data repair · 사용자 별도 승인 · production UPDATE 금지). 이 사유만으로 완료를 막지 않는다.
- read-only before/after: `checkout_orders`(status·paymentStatus·serviceKey 분포) · `neture_orders` · `neture_shipments` · `neture_settlements` · `supplier_product_offers.reserved_quantity` 합계.

---

# 7. 하지 않는 것

```text
택배사/물류사 API · 자동 송장 · 집하 · 배송대행 · 3PL
새 payment engine · 새 settlement engine · 새 *_orders 테이블
checkout_orders 폐기 · neture_orders 를 Order SSOT 로 승격
후불 · 외상 · invoice · 미결제 배송
Event Offer 참여신청/구매의향/예약/펀딩
Market Trial 과 Event Offer 통합            (Market Trial · Seller Recruitment 은 별도 프로그램 · 이 WO 범위 밖)
소비자→매장 commerce 복구                   (Supplier→Store B2B = O4O 공식 주문축 경계 불변)
neture_suppliers.user_id 데이터 복구         (§6)
DB migration · 새 schema
```

---

# 8. 중지 조건

| # | 조건 |
|---|---|
| A | Event Offer 의 `store_cart_checkout` tag 가 event offer 외 항목에도 쓰여 registry 추가가 다른 축에 영향 |
| B | 승인축/Event Offer 결제 완료 event 를 발행하는 **producer 자체가 없어** handler 연결만으로 paid 전이가 성립하지 않음 (= 결제 UI/PG 연동이 선행 필요) |
| C | `collectionStatus` 제거가 현재 운영 중인 주문의 fulfillment/settlement 를 실제로 막음(실데이터 확인) |
| D | 재고 예약 기준점 변경이 기존 legacy 주문 경로와 이중 차감을 만듦 |
| E | `SupplierUnifiedOrderService` 삭제가 프런트 소비처를 깨뜨림 |
| F | DB migration · 새 테이블이 반드시 필요 (§1.10 판정과 다름) |
| G | package/lockfile 구조 변경 필요 |
| H | 타 세션과 동일 파일 충돌 |

---

# 9. WO 완료 기준 — CHECK 가 답할 15문항

1. 실제 Supplier 주문 producer 는 몇 종류인가 · 2. 모두 `checkout_orders` 로 수렴하는가 · 3. 모두 payment-first 인가 · 4. Event Offer 의 무결제/참여형 잔재는 정확히 무엇이었나 · 5. 기존 bridge caller 는 어디인가 · 6. paid 인데 bridge 되지 않을 수 있는 경로는 · 7. recovery 를 어떻게 통일했나 · 8. Supplier 직접 배송 UI/API 는 무엇인가 · 9. `neture_shipments` 가 단순 기록 범위를 넘는가 · 10. inventory reserve/release 는 어디서 이뤄지는가 · 11. settlement 대상 서비스는 · 12. `collectionStatus` 를 어떻게 처분했나 · 13. `SupplierUnifiedOrderService` 를 유지했나 · 14. DB/migration 이 필요했나 · 15. canonical 문서를 어떻게 정정했나

추가 필수: §3 owner matrix 실측 · §4 취소/환불 계약표 · 중지 조건 A~H 발동 여부 · 문서 정합 · commit hash · `HEAD == origin/main`.

---

# 10. 목표 완료 상태

```text
Supplier 상품 → Store 주문 → checkout_orders[주문+결제 SSOT] → 결제 완료
  → Fulfillment Bridge → neture_orders[Supplier 처리 record]
  → Supplier 배송 준비 → Supplier 가 직접 배송 → O4O 에 배송상태 기록 → DELIVERED → Settlement
```

> **O4O 는 주문과 결제 및 공급자 업무상태를 관리하지만 배송을 수행하지 않는다. 실제 배송은 공급자가 직접 수행하며, O4O 는 그 상태와 필요한 참조정보만 기록한다.**
