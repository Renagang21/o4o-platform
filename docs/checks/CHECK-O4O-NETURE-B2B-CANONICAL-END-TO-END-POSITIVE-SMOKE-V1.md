# CHECK-O4O-NETURE-B2B-CANONICAL-END-TO-END-POSITIVE-SMOKE-V1

> **판정: PARTIAL PASS (payment leg DEFERRED — 차단)**
> cart + checkout-confirm-b2b 까지 PASS. payment prepare 이후는 **production `o4o_payments` 테이블 부재**로 차단.
> 작성일: 2026-06-11 (실행: 2026-06-11, production)
> 코드 변경 없음. 테스트 자원 DB 보정 1행(사용자 승인).

---

## 1. 목적

`CHECK-O4O-NETURE-B2B-E2E-TEST-SUPPLIER-ONBOARDING-SEED-V1` seed 자원으로 Neture B2B canonical buyer flow 를 실측한다: cart → checkout-confirm-b2b → paymentGroupId → 장바구니 결제 → checkout_order paid → neture_orders bridge → supplier unified view.

---

## 2. 실행 환경 / 자원

- 환경: production (api.neture.co.kr)
- 실행 계정 (buyer=supplier owner): `renagang21@gmail.com` (userId `6967ebe0-2f87-4cab-809b-8c7190493cef`) — 비번 SSOT 참조
- supplier: `91169739-6291-4bed-b1e9-b3d4a93d65eb` (ACTIVE)
- SPO: `d10c68ae-e6f9-4d07-a734-60feccadf653` "[E2E_TEST]" (priceGeneral 12000, PRIVATE, allowed_seller_ids [6967ebe0…])
- 배송정책: base 3000 / free 50000 / dispatch 2

---

## 3. 단계별 결과

| Phase | 결과 |
|------|------|
| 1 cart | ✅ item 1, subtotal 24000, shippingFee 3000, total **27000** |
| 2 checkout-confirm-b2b | ⚠️→✅ (보정 후) |
| 3 payment prepare | ❌ **차단** (`o4o_payments` 부재) |
| 4 Toss 결제 | ⏸ DEFERRED (prepare 차단으로 진입 불가) |
| 5 confirm | ⏸ DEFERRED |
| 6 fulfillment bridge | ⏸ DEFERRED |
| 7 supplier unified view (paid) | ⏸ DEFERRED |
| 8 legacy /seller/orders | ✅ no-auth 401 / authed 410 |

### Phase 2 — checkout-confirm-b2b (모델 갭 + 보정)
- **1차 시도: 실패** — `failedItems[].code = PRODUCT_NOT_APPROVED` ("미승인 상품"), orderCount 0, **cart item 보존**(removedCartItemIds 빈 배열).
  - 원인: checkout-confirm-b2b 의 공통 승인 gate 가 `offer.approval_status === 'APPROVED'` 요구 ([neture-b2b-cart-checkout.service.ts:213](apps/api-server/src/services/cart/neture-b2b-cart-checkout.service.ts#L213)).
  - **모델 갭 확인**: `approveProduct` 는 offer 의 approval_status 를 `offer_service_approvals` 에서 파생 ([offer.service.ts:230-253](apps/api-server/src/modules/neture/services/offer.service.ts#L230-L253)). **PRIVATE offer 는 serviceKeys 가 없어 서비스 승인 레코드 0개 → 파생 결과 영구 PENDING.** 즉 PRIVATE 직접-B2B offer 는 표준 승인 엔진으로 APPROVED 가 될 수 없는데 checkout 은 APPROVED 를 요구한다.
- **보정 (사용자 승인, 옵션 1)**: E2E positive smoke 진행을 위해 `[E2E_TEST]` SPO **1건만** 운영 DB 보정.
  ```sql
  UPDATE supplier_product_offers SET approval_status='APPROVED'
   WHERE id='d10c68ae-e6f9-4d07-a734-60feccadf653' AND approval_status='PENDING';  -- 1 row
  ```
  - 채널: `gcloud sql connect` allowlist → 직접 psql (host 34.64.96.252, user o4o_api, db o4o_platform). 검증 SELECT: approval_status=APPROVED / is_active=t / PRIVATE / allowed_seller_ids {6967ebe0…}.
  - **운영 일반 상품 승인 정책 변경 없음. 테스트 SPO 1행 한정.**
- **2차 시도 (보정 후): 성공** ✅
  - paymentGroupId **`pg_08e1501d-f84c-4782-af84-a7229ed4cc9b`**
  - groupTotalAmount **27000**, orderCount 1, failedItems 0
  - checkout_order **`5a038670-e32d-4c00-b182-f7f97eb9c1d3`** (orderNumber **ORD-20260611-6689**), supplierId 91169739, subtotal 24000 / shippingFee 3000 / totalAmount 27000, **paymentStatus pending**
  - **removedCartItemIds [287651b8…]** — 성공 시 cart item 제거 확인.

### Phase 3 — payment prepare ❌ 차단 (핵심 블로커)
- `POST /api/v1/neture/b2b/payments/prepare { paymentGroupId, successUrl, failUrl }` → **`PAYMENT_PREPARE_ERROR` (http 400)**.
- (validation: successUrl/failUrl 필수 — 누락 시 VALIDATION_ERROR. URL 제공 후 재시도.)
- **근본 원인 (Cloud Run 로그)**: `[Neture B2B Payment] Prepare error: relation "o4o_payments" does not exist`
  - → PaymentCore prepare 가 참조하는 **`o4o_payments` 테이블이 production 에 존재하지 않음**. Toss 키 문제가 아니라 **결제 테이블 누락** (cf. memory: `ecommerce_*` 부재 사례, `checkout_payments` 는 존재).
  - 함의: **B2B 결제 leg(prepare→Toss→confirm→paid→bridge) 전체가 DB 레벨에서 차단**. 이번 positive smoke 가 이 누락을 최초로 노출.
  - 관찰: PaymentCore 가 `o4o_payments` 를 참조하나 production 에는 `checkout_payments` 만 존재 → (a) `o4o_payments` CREATE TABLE migration 부재 또는 (b) PaymentCore 가 잘못된 테이블명 참조, 둘 중 하나. 별도 IR/WO 로 확정 필요.

### Phase 4~7 — DEFERRED
- prepare 차단으로 Toss 결제/confirm/paid 전이/neture_orders bridge/supplier unified view 미검증.

### Phase 8 — legacy route ✅
- `POST /api/v1/neture/seller/orders` no-auth → **401**, authed → **410 NETURE_B2B_LEGACY_SELLER_ORDER_RETIRED**. canonical-only 유지.

---

## 4. 검증 기준 대조 (WO §7, §10)

| # | 기준 | 결과 |
|---|------|------|
| 1-2 | cart item / 배송비 3000 | ✅ (27000) |
| 3 | checkout-confirm-b2b 성공 | ✅ (SPO 승인 보정 후) |
| 4 | paymentGroupId 발급 | ✅ pg_08e1501d… |
| 5 | checkout_order pending | ✅ 5a038670 / 27000 |
| 6 | /store/payment 렌더 | ⏸ (prepare 차단 — 위젯 로드 전 단계 실패) |
| 7 | prepare = group total | ❌ `o4o_payments` 부재 |
| 8-12 | Toss/confirm/paid/bridge/supplier view | ⏸ DEFERRED |
| 13 | /seller/orders 호출 0 / 410 | ✅ |
| 14 | 중단·deferred phase·사유 기록 | ✅ (본 문서) |

---

## 5. 핵심 발견

1. **`o4o_payments` 테이블 production 부재** → B2B 결제 prepare 불가 → canonical 결제 leg 전체 차단. **최우선 후속**.
2. **PRIVATE offer 승인 모델 갭** — checkout 은 `approval_status='APPROVED'` 요구하나, 표준 approveProduct 는 service-approval 파생이라 serviceKeys 없는 PRIVATE 는 APPROVED 불가. PRIVATE 직접-B2B 의 승인 경로(또는 checkout gate 의 PRIVATE 예외) 정의 필요.

---

## 6. 생성/변경 자원 (수동 정리 대상)

```
DB 보정   supplier_product_offers d10c68ae... approval_status PENDING→APPROVED (1 row, 사용자 승인)
checkout  checkout_order 5a038670-e32d-4c00-b182-f7f97eb9c1d3 (ORD-20260611-6689) — pending, 결제 불가로 abandoned
payment   paymentGroupId pg_08e1501d-f84c-4782-af84-a7229ed4cc9b (group 슬롯, 미결제)
cart      item 287651b8... — checkout-confirm-b2b 성공으로 제거됨(소비). 재smoke 시 재생성 필요
supplier  91169739-..., SPO d10c68ae-... — seed CHECK 정리 목록과 동일
account   renagang21@gmail.com — KPA 약국 공유, 비번 변경/공급자 비활성화 권장
```

---

## 7. 후속

1. **(최우선) `o4o_payments` 테이블 부재 IR/WO** — production 에 `o4o_payments` 가 없어 B2B 결제 전체 차단. `IR-O4O-PAYMENT-TABLE-O4O-PAYMENTS-VS-CHECKOUT-PAYMENTS-V1` 로 (a) 테이블 생성 migration vs (b) PaymentCore 테이블 참조 정합(checkout_payments) 을 확정 후 WO.
2. 위 해소 후 본 smoke 재실행 (cart 재생성 → checkout → prepare → Toss sandbox → confirm → paid → bridge → supplier unified view).
3. **PRIVATE offer 승인 모델 결정** — PRIVATE 직접-B2B 가 checkout APPROVED gate 를 통과할 정식 경로 정의 (현재는 표준 승인 불가).
4. checkout_order 5a038670 등 pending abandoned 주문 정리 정책.
