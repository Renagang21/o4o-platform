# 공급자→매장 실계정 업무 흐름 검증

> **상태**: ACTIVE
> **작성일**: 2026-10-15 · **최종 갱신**: 2026-10-15
> **작업 근거**: 사용자 지시 — 공급자 실제 상품 등록·수정·승인·매장 주문·배송·재고·정산 확인 /
> 2026-10-15 추가 지시 — "Draft 상태에서 테스트 데이터 완전 정리가 가능한 검증 계획부터 보완하고, 그 전에는 운영 승인·주문·결제를 실행하지 않는다"
> **기준 main**: `09e08d97d` · branch: `wo/supplier-live-round-trip`

## 현재 판정

실계정 상품 등록·수정·원복·조회와 미승인 상품의 매장 미노출까지 확인했다.
전체 거래 검증은 **미완료**다. 운영자 제품 등록 승인 · 주문 · 결제 · 배송 단계는
[테스트 데이터 정리 계획](#테스트-데이터-정리-계획--승인-전-blocked)의 **사용자 결정 A~D 와 계획 승인 전까지 BLOCKED** 다.
상품·주문·권한·DB·정산의 운영 코드는 수정하지 않았다.

## 기준과 검증 경계

- [B2B 주문 계약](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md)
- [소비자 commerce 경계](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md)
- [매장 접근·회원 관계](../baseline/O4O-STORE-ACCESS-AND-MEMBERSHIP-V1.md)
- [약국 매장 설계 §8](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md)
- [운영 데이터 변경 경계](../../AGENTS.md#5-위험-변경--사용자-확인)

`neture-pharmacy` 테스트 주문은 실제 PG를 호출하지 않으며 주문에 `testPayment=true`를 남긴다.
이 주문은 현행 Neture 정산의 `neture` service 필터에 포함되지 않는다.
따라서 이 흐름의 정산 성공 기준은 **테스트 주문을 정산·실제 지급 근거로 사용하지 않는 것**이다.
정산 계산·승인·지급을 억지로 연결하거나 기간 단위 일괄 정산을 실행하지 않는다.
기존 격리 DB 검증(PR #584)은 별도 결과이며 실계정 승인·배송 검증으로 합산하지 않는다.

## 실행한 실제 계정 검증

계정 원본은 로컬 전용 `docs/local/TEST-ACCOUNT.txt`이며 Git ignore를 확인했다.
환경 프록시·CA를 유지하고 HTTPS 인증서 검증을 해제하지 않았다.
자격정보·실제 사용자/사업자 식별정보·운영 응답 원문은 공개 기록에 포함하지 않는다.

| 확인 | 결과 |
|---|---|
| 경영자 약국 membership/context | HTTP 200, active, paymentMode `test` |
| 직원 약국 context | HTTP 200, paymentMode `test`. 개인 약국 membership 없는 상태와 매장 연결 접근을 구분 |
| 공급자 onboarding | HTTP 200 |
| 시작 데이터 | 기존 공급 상품 5개 모두 PENDING·비활성·PRIVATE. 매장 공급 옵션·장바구니·주문, 공급자 주문·정산 0건 |
| 검증용 상품 등록 | 라이브러리의 기존 ACTIVE/COSMETIC Master로 `POST /neture/supplier/products/from-master`, HTTP 201. 새 Offer 1개, PENDING·비활성·비공개·공급처 미지정 |
| 수정·원복 | 새 Offer의 공급가 100 → 101 → 100. PATCH 각각 HTTP 200/success, 매번 GET 결과 일치 |
| Master 보존 | 등록·수정 전후 동일 Master 단건 조회 결과 동일. 가짜 barcode나 새 Master 생성 없음 |
| 서비스 승인 요청 | HTTP 200, submitted 0, skipped `NO_ELIGIBLE_SERVICE_KEYS`, errors 0. 공급처 미지정 상품의 제품 등록 승인과 서비스 승인을 구분 |
| 재고 | 새 Offer 재고 2, 예약 0. 비활성·PENDING 상태를 재확인한 뒤 inventory_version을 보내 재고 추적만 활성화. PATCH HTTP 200, GET 재고 2·추적 true 확인 |
| 승인 전 매장 노출 | 공급자 목록·재고 목록에 새 상품 존재, 매장 공급 옵션에는 없음. 기존 5개 공급 상품은 변경하지 않음 |
| Chromium 상품 목록 | 운영 HTTPS 응답으로 새 상품 표시 확인. 390px·1440px, page error·API 오류·문서 전체 가로 넘침 0 |

재고 준비 스크립트의 최초 실행은 inventory 식별자 필드를 `id`로 읽어 PATCH 전에 종료했다.
실제 계약인 `offer_id`로 고쳐 재실행했다. 실패 실행은 성공으로 세지 않는다.

## 후속 실행 순서 — 아직 미실행 · BLOCKED

> 아래 1~7 은 [테스트 데이터 정리 계획](#테스트-데이터-정리-계획--승인-전-blocked)의 사용자 결정 A~D 가 확정되고
> 계획이 승인되기 전에는 **실행하지 않는다**. 아래 2번의 "기록 보존" 문구는 결정 A 의 한 선택지일 뿐 확정이 아니다.

1. **사용자**: 운영자 제품 승인 화면의 이번 새 Offer만 승인한다.
   공급처 미지정 제품 등록 승인은 is_active=true로 바뀌어 약국 기본 공급 목록에 노출된다.
   PRIVATE 표기를 특정 약국에만 보이는 접근 제어라고 오인하지 않는다(약국 공급은 설계 §4의 별도 판정).
2. **기록 보존 조건 확인**: 수량 1, 상품가 100과 서버 산정 배송비, 테스트 결제만 사용한다.
   실제 택배를 발송하지 않는다. 주문·결제·배송 기록은 종료 후 삭제하지 않고 보존하며 상품은 비활성화한다.
3. **실행 전 재판정**: 같은 구매 매장 context·active membership·paymentMode test, 새 Offer APPROVED/active,
   공급가 100·재고 2·예약 0·추적 true, 기존 장바구니 비어 있음을 다시 확인한다. 다르면 중단한다.
4. 새 상품만 수량 1로 담고, 생성한 cart item ID만 checkout에 전달한다.
   서버가 계산한 상품·배송비 합계와 새 주문/결제 묶음 ID를 확인한다. 다른 장바구니나 주문을 처리하지 않는다.
5. prepare/confirm 응답의 testPayment와 buyer/paymentGroup/금액을 확인한다.
   결제 전 실패는 새 장바구니 제거 또는 새 미결제 주문의 공식 취소 API로 정리한다.
   **결제 후에는 해당 취소 API가 ALREADY_PAID로 거절하므로 삭제·원복을 주장하지 않는다.**
6. 매장 주문과 공급자 fulfillment를 checkout ID로 연결해 확인한다. 준비 → 검증용 송장 → 배송 완료를 확인한다.
   실제 운송사 API나 택배 발송을 사용하지 않는다. 재고 2 → 1, 반복 배송 처리의 이중 차감 방지를 확인한다.
7. 약국 주문의 Neture 정산 제외를 확인하고 새 상품을 비활성화한다.
   기존 상품·재고·타인 주문·기간 일괄 정산은 수정하지 않는다.

재시도는 로컬 비공개 실행 journal의 생성 Offer·cart item·checkout·fulfillment ID를 기준으로 한다.
타임아웃만으로 생성·결제·배송 mutation을 반복하지 않고, 먼저 해당 ID의 현재 상태를 재조회한다.

## 테스트 데이터 정리 계획 — 승인 전 BLOCKED

2026-10-15 사용자 지시에 따라, 승인·주문·결제를 실행하기 전에 각 단계가 남기는 데이터와 정리 방법을 코드 기준으로 확정한다.
이 절은 **계획**이다. 아래 정리 경로 중 어떤 운영 write 도 실행하지 않았다. 이 회차에는 운영 DB 조회도 하지 않았다(코드·문서 조사만).
경로는 `apps/api-server/src/` 기준이며, Neture route 는 `/api/v1/neture` 아래에 mount 된다.

### 실행 게이트

| 단계 | 상태 |
|---|---|
| 0. 이미 실행한 등록·수정·재고 설정(위 표) | 완료 · 산출물 1건(Offer)만 보존 중 |
| 1. 운영자 제품 등록 승인 | **BLOCKED** — 결정 A~D 확정과 이 계획 승인 전 실행 금지 |
| 2~5. 장바구니 · checkout · 결제 준비/확인 | **BLOCKED** |
| 6. 공급자 준비 · 송장 · 배송 완료 | **BLOCKED** |
| 7. 정리 · 잔존 0 검증 | 계획 승인 후 1~6 과 한 묶음으로만 실행 |

### 단계별 write 인벤토리

| 단계 | route → 처리 위치 | 생기는/바뀌는 데이터 | 지원되는 되돌리기 경로 |
|---|---|---|---|
| 등록(실행됨) | `POST /supplier/products/from-master` → `modules/neture/services/supplier-offer-registration.service.ts:149-276` | `supplier_product_offers` 1행(`is_active=false` · `PENDING` · slug=`{barcode}-{supplierId 앞 8자}-{epoch}`). serviceKeys 가 비어 있으면 `offer_service_approvals` 없음(`:272-276`). Master · 이미지 · SPD · listing · 알림 · action log **없음** | 아래 Offer 정리 |
| 가격 수정·원복(실행됨) | `PATCH /supplier/products/:id` → `modules/neture/services/supplier-offer-write.service.ts:28-184` | 같은 Offer 행 UPDATE. 이력 테이블 없음. PUBLIC·APPROVED·active 일 때만 `organization_product_listings` 자동 생성(`:178-184`) — 현재 PENDING 이라 해당 없음 | 값 재PATCH(실행됨: 100 복원) |
| 재고(실행됨) | `PATCH /supplier/inventory/:offerId` → `modules/neture/services/inventory.service.ts:53-113` | Offer 행의 `stock_quantity` · `track_inventory` UPDATE. `inventory_version` 은 저장값이 아닌 계산값. 이력 없음 | 값 재PATCH |
| 서비스 승인 요청(실행됨) | `POST /supplier/products/submit-approval` → `modules/neture/services/offer-lifecycle.service.ts:266-348` | `NO_ELIGIBLE_SERVICE_KEYS` 로 **write 없음**(`:336-340`) | 해당 없음 |
| 1. 운영자 승인 | `POST /operator/products/:id/approve` → `modules/neture/controllers/operator-product-approval.controller.ts:178-197` · `offer-lifecycle.service.ts:28-90` | 공급처 미지정 Offer: Offer 행 `APPROVED` · `is_active=true`(`:82-87`), OSA · listing · `product_approvals` 생성 없음. **`action_logs` 1행** `neture.operator.product_approve`, meta `productId`(controller `:194`). 알림 없음 | "승인 취소" 없음. `POST /operator/products/:id/reject` 는 `REJECTED` · 비활성으로 바꾸고 `action_logs` 1행을 **추가**한다(controller `:209-226`) |
| 1-부작용. 노출 | `modules/neture-pharmacy/services/supply-access.ts:51-71` | 승인 즉시 기본 세미프랜차이즈의 **모든 활성 약국**에 `default` 공급 옵션으로 노출(대상 약국 한정 아님) | 비활성화 시 노출 종료. 노출 중 다른 매장 주문은 막지 못함 |
| 2. 장바구니 | `POST /pharmacy/cart/items` → `modules/neture-pharmacy/services/pharmacy-cart.service.ts:136-177` | `store_cart_items` 1행(`buyer_id` · `organization_id` · `service_key='neture-pharmacy'` · `supplier_product_offer_id`) | `DELETE /pharmacy/cart/items/:id`(`:190-196`) — 실제 행 삭제 |
| 3. checkout | `POST /pharmacy/cart/checkout` → `pharmacy-cart.service.ts:198-378` → `services/checkout.service.ts:159-216` | `checkout_orders` 1행(`status=created` · metadata `serviceKey='neture-pharmacy'` · `paymentGroupId` · `cartItemIds` · `buyerOrganizationName`). **구매 조직 이름·전화·주소가 `shippingAddress` 로 복사**(cart `:226-237`). `checkout_order_logs` 1행(CREATED). 사용한 cart 행 삭제(`:338-342`). 기본 공급 line 은 재고 예약 없음(재고 확인만, `:220`) | 결제 전: `POST /pharmacy/orders/:id/cancel` → `services/checkout/store-order-cancel.service.ts:183-197` — **행은 남고 `cancelled` 로 전이만** |
| 4. 결제 준비 | `POST /pharmacy/payments/prepare` → `modules/neture-pharmacy/services/pharmacy-payment.service.ts:105-141` | `o4o_payments` 1행(`CREATED` · `"orderId"`=paymentGroupId · `"sourceService"='neture-pharmacy'` · `transactionId='npc_…'` · metadata `testPayment`) | 삭제 경로 없음. 주문 취소도 이 행을 닫지 않는다 |
| 5. 결제 확인 | `POST /pharmacy/payments/confirm` → `pharmacy-payment.service.ts:143-221` | `o4o_payments` → `PAID`/`TEST`, `checkout_orders` → `paid` + metadata `paymentId` · `testPayment=true`. 이어서 bridge(`services/neture/checkout-fulfillment-bridge.service.ts:125-225`)가 `neture_orders` 1행(`service_key='neture-pharmacy'` · metadata `checkoutOrderId` · `testPayment`, **`ordererName`/`ordererPhone` 에 조직 이름·전화 복사**)과 `neture.neture_order_items` 1행(`product_id`=Offer id) 생성 | **없음.** 결제 후 취소는 `ALREADY_PAID`(cancel service), 환불 route 없음, 공급자 상태표에 취소 전이 없음(`modules/neture/services/supplier-order.service.ts:15-20`) |
| 6. 준비·송장·배송 | `PATCH /supplier/orders/:id/status`(`supplier-order.service.ts:211-228`) · `POST /supplier/orders/:orderId/shipment`(`:230-265`) · `PATCH /supplier/shipments/:id`(`modules/neture/services/shipment.service.ts:55-74`) | `neture_orders.status` 전이, `neture_shipments` 1행(송장), 배송 완료 시 `supplier_product_offers.stock_quantity` · `reserved_quantity` GREATEST(…-수량, 0) 차감(`routes/neture/services/neture.service.ts:659-671`). 같은 상태 재요청은 무변경(`:632`) | 상태 역전이 없음. 재고는 공급자 재고 PATCH 로 복원 가능 |
| 정산 | `modules/neture/services/settlement-command.service.ts:44-76` | 자동 생성 없음. 수동 정산 계산만 `neture_settlements` · `neture_settlement_orders` 생성. 필터가 `COALESCE(service_key,'neture')='neture'`(`:63`)라 `neture-pharmacy` 주문은 제외 — **testPayment 가 아닌 service_key 로 제외된다** | 정산 계산을 실행하지 않는다 |

PG: `NETURE_PHARMACY_PAYMENT_MODE=test` 는 PG 를 호출하지 않는다(`pharmacy-payment.service.ts:22-35, 185`). `live` 는 503 `PAYMENT_PROVIDER_NOT_SELECTED`, production 미설정은 503 `PAYMENT_NOT_CONFIGURED`이다.
배포 workflow 도 `test` 또는 미설정만 허용한다(`.github/workflows/deploy-api.yml:646-654`). Toss 설정(`config/payment.config.ts`)은 이 흐름이 쓰지 않는다.
따라서 이 흐름에 실금액 결제 경로는 없고, "sandbox" 는 test 모드 자체다. 외부 PG 기록은 생기지 않는다. 다른 서비스의 Toss 결제 경로는 이번 검증에서 쓰지 않는다(제외).

GCS · 미디어 업로드, role assignment, outbox, KPI 이벤트, DB trigger 는 위 경로 어디에서도 쓰지 않는다. 앱 logger 출력(Cloud Logging)은 남으며 정리 대상이 아니다.

### 식별·태깅

- **ID 를 생성 시점에 수집한다.** 로컬 비공개 journal 에 단계별로 기록한다:
  Offer id, cart item id, checkout order id · orderNumber, paymentGroupId, o4o_payments id, neture order id, shipment id, action_logs id(승인 직후 조회).
  공개 문서·커밋에는 ID 원문을 쓰지 않는다.
- **결정적 태그를 붙일 수 있는 곳은 제한적이다.** checkout 은 사용자 입력 metadata 를 받지 않고, 서버가 `testPayment=true` · `paymentMethod='TEST'` · `transactionId='npc_…'` 를 남긴다.
  `testPayment` 는 같은 test 모드의 다른 주문에도 붙으므로 **단독 식별자로 쓰지 않는다** — 항상 journal 의 ID + 경계 조건(아래 SELECT)으로 좁힌다.
- 범위 밖 데이터(기존 공급 상품 5개, 다른 매장 주문, 기존 장바구니)는 식별 대상에서도 정리 대상에서도 제외한다.

### 정리 경로와 순서

지원 API 만으로 가능한 정리(결정 A-1 기준):

1. 결제 전에 중단하면: 새 cart item `DELETE`, 또는 새 미결제 주문 `POST /pharmacy/orders/:id/cancel`. 이후 3번으로.
2. 배송 완료 후: 재고 차감분을 공급자 재고 PATCH 로 복원(검증 전 값 2, 예약 0). 이 PATCH 도 운영 write 이므로 계획 승인 범위에 포함한다.
3. Offer 비활성화: `PATCH /supplier/products/:id` `isActive:false` 로 노출을 먼저 끊는다.
4. Offer 소프트 삭제: 공급자 `DELETE /supplier/products/bulk`(`supplier-offer-write.service.ts:312-371`) 또는 운영자 `POST /operator/product-cleanup/soft-delete/:offerId`(`modules/neture/controllers/operator-product-cleanup.controller.ts:336`). 활성 listing · service_products 가 있으면 거부된다(이번 흐름은 생성하지 않음).
5. Offer 영구 삭제(선택): 운영자 `DELETE /operator/product-cleanup/hard-delete/:offerId`(`:449`, 소프트 삭제된 행만). FK 는 모두 CASCADE 라 DB 는 막지 않지만,
   **주문이 남는 경우 `checkout_orders.items` · `neture_order_items.product_id` 가 없는 Offer 를 가리키게 되므로 하지 않는다** — 주문이 남으면 4번(소프트 삭제)에서 멈춘다.

주문·결제 행까지 지우는 경우(결정 A-2, 별도 승인된 수동 DELETE runbook — 이 계획에 포함하지 않는다)의 논리 순서:
`neture_shipments` → `neture.neture_order_items` → `neture_orders` → `o4o_payments` → `checkout_order_logs` → `checkout_orders` → `store_cart_items` → 재고 복원 → Offer 소프트/영구 삭제.
이 테이블들은 baseline 상 서로 DB FK 가 없고(`checkout_payments` → `checkout_orders` CASCADE 만 존재, 이번 흐름 미사용) 연결이 논리적이므로, 위 순서는 자식→부모 논리 순서다.

### 삭제할 수 없는 것

| 데이터 | 이유 | 처리 |
|---|---|---|
| `action_logs`(승인 1 · 반려 시 +1) | 감사 기록. API 삭제 경로 없음 | 수용 — `productId` 로 식별 가능한 잔존으로 기록 |
| `checkout_order_logs`(CREATED) | 주문 이력. API 삭제 경로 없음 | 결정 A 에 따름 |
| 결제 후 `checkout_orders` · `o4o_payments` · `neture_orders` · `neture_order_items` · `neture_shipments` | 취소·환불·삭제 API 없음 | 결정 A 에 따름 |
| 결제 전 취소된 `checkout_orders`, 닫히지 않은 `o4o_payments`(CREATED) | 취소는 상태 전이만 | 결정 A 에 따름 |
| Cloud Logging 의 앱 로그 | 운영 로그 보존 정책 | 수용 |
| migration 이력 · Core 테이블 | 이번 흐름이 쓰지 않음 | 해당 없음 |

### 사용자 결정 필요

- **A. 잔존 기준.** 지원 API 만으로는 주문·결제·배송 행과 `action_logs` · `checkout_order_logs` 가 남는다(잔존 0 불가). 선택지:
  A-1 `testPayment=true` 표기된 검증 기록으로 보존을 수용(Offer 는 비활성·소프트 삭제),
  A-2 결제 이후 행을 지우는 별도 수동 DELETE runbook 을 따로 승인(운영 DB 삭제 = 중지 조건),
  A-3 승인 이후 단계를 실행하지 않고 현재 Offer 만 정리하고 종료.
- **B. 개인·사업자 정보 복사.** checkout 이 구매 조직의 이름·전화·주소를 `checkout_orders.shippingAddress` 와 `neture_orders.ordererName/ordererPhone` 에 복사한다.
  실제 약국 조직으로 진행할지, 전용 테스트 조직을 준비할지.
- **C. 노출 범위.** 공급처 미지정 승인은 기본 세미프랜차이즈의 모든 활성 약국에 노출된다. 노출 시간을 최소화하는 조건으로 수용할지,
  대상 약국 한정 경로(공급 제안 `supply_proposals` 의 `target_organization_id`)로 바꿀지. 경로 변경은 승인 주체·write 인벤토리가 달라지므로 이 계획을 다시 갱신한다.
- **D. 재고 복원.** 배송 완료가 `stock_quantity` 를 차감한다. 공급자 재고 PATCH 로 원래 값(2)으로 복원하는 것을 정리 범위에 넣을지, 차감 결과를 남길지.

결정 A~D 확정과 이 계획 승인 전에는 운영자 승인 · 주문 · 결제 · 배송 단계를 **실행하지 않는다**.

### 잔존 0 검증 SELECT (read-only)

모두 parameterized 이며 UUID 단독 조회를 하지 않는다(경계 조건 동반). 파라미터 값은 로컬 journal 에서 채운다.
`$1`=Offer id · `$2`=공급자 id · `$3`=구매자 user id · `$4`=구매 조직 id · `$5`=checkout order id 배열 · `$6`=paymentGroupId 배열.

```sql
-- Offer 상태 (기대: is_active=false, deleted_at NOT NULL — 또는 A-2/영구 삭제 시 0행)
SELECT id, approval_status, is_active, deleted_at, stock_quantity, reserved_quantity
  FROM supplier_product_offers WHERE id = $1 AND supplier_id = $2;

-- 노출 잔존 (기대: 0)
SELECT count(*) FROM organization_product_listings opl
  JOIN supplier_product_offers spo ON spo.id = opl.offer_id
 WHERE opl.offer_id = $1 AND spo.supplier_id = $2 AND opl.is_active = true;

-- 장바구니 (기대: 0)
SELECT count(*) FROM store_cart_items
 WHERE supplier_product_offer_id = $1 AND buyer_id = $3 AND organization_id = $4 AND service_key = 'neture-pharmacy';

-- 이 Offer 를 담은 주문 — 내 주문만 있는지 (기대: 결과 id ⊆ $5, A-2 실행 시 0)
SELECT id, status, "paymentStatus" FROM checkout_orders
 WHERE metadata->>'serviceKey' = 'neture-pharmacy' AND "supplierId" = $2::text
   AND items @> jsonb_build_array(jsonb_build_object('productId', $1::text));

-- 결제 기록 (A-1: 기대 = journal 건수, A-2: 0)
SELECT id, status FROM o4o_payments
 WHERE "sourceService" = 'neture-pharmacy' AND "orderId" = ANY($6::text[]) AND metadata->>'buyerId' = $3::text;

-- fulfillment · 송장 (A-1: 기대 = journal 건수, A-2: 0)
SELECT o.id, o.status, s.id AS shipment_id FROM neture_orders o
  LEFT JOIN neture_shipments s ON s.order_id = o.id AND s.supplier_id = $2
 WHERE o.service_key = 'neture-pharmacy' AND o.metadata->>'checkoutOrderId' = ANY($5::text[]);

-- 정산 편입 (기대: 0)
SELECT count(*) FROM neture_settlement_orders nso
  JOIN neture_orders o ON o.id = nso.order_id
 WHERE o.service_key = 'neture-pharmacy' AND o.metadata->>'checkoutOrderId' = ANY($5::text[]);

-- 감사 기록 (기대 = 수용한 건수: 승인 1, 반려 시 +1)
SELECT count(*) FROM action_logs
 WHERE service_key = 'neture' AND action_key LIKE 'neture.operator.product_%' AND meta->>'productId' = $1::text;
```

실제 컬럼명(`o4o_payments."orderId"` 타입, `action_logs` 컬럼)은 실행 전 `information_schema.columns` read-only 조회로 한 번 더 맞춘다.

### 중지 조건

- 승인 직후 노출 확인 단계에서, 이 Offer 를 담은 **다른 매장의 장바구니·주문**이 1건이라도 보이면 즉시 Offer 비활성화 후 중단하고 보고한다(그 주문은 정리 대상이 아니다).
- 결제 준비 응답의 mode 가 `test` 가 아니거나 `testPayment` 가 true 가 아니면 confirm 하지 않는다.
- checkout 응답의 주문이 1건이 아니거나, 금액이 상품 100 + 서버 산정 배송비와 다르거나, 다른 cart item 이 함께 처리되면 결제로 넘어가지 않는다.
- 배송 완료 전 Offer 의 `reserved_quantity` 가 0 이 아니면 배송 완료를 보류한다(배송 완료 차감이 다른 주문 예약을 깎을 수 있음).
- 정리 단계에서 지원 API 가 예상과 다른 오류(`HAS_ACTIVE_LISTINGS` · `HAS_SERVICE_PRODUCTS` 등)를 내면 수동 DB write 로 우회하지 않고 보고한다.
- 잔존 0 SELECT 결과가 결정 A 의 기대값과 다르면 완료로 보고하지 않는다.

## 현재 보존 자원·인계

- 새 검증용 Offer 1개는 **승인 대기·비활성**으로 유지한다. 공급가 100, 재고 2, 재고 추적 true.
- 생성 Offer ID와 Master ID·복구 정보는 로컬 비공개 journal에 보관하고 사용자에게 직접 전달했다.
  계정값·상품 원문을 커밋하지 않는다.
- 운영자 승인은 사용자가 담당한다. 권한 승격·계정 생성·승인 우회는 하지 않았다.
- 실결제·주문 생성·배송 상태 변경·정산 계산/승인/지급·운영 배포는 아직 실행하지 않았다.
- source 변경이 없는 운영 검증 기록이다. frozen install·application build·기존 대규모 테스트 재실행은 필요하지 않아 수행하지 않았다.
- worktree는 승인 이후 같은 흐름을 이어가기 위해 `KEEP`. 작업 전체 완료·integration-ready로 보고하지 않는다.

문서 정합: 새로운 정책 변경 없음. 앞선 “약국 주문을 정산까지 한 흐름으로 검증” 안내를 현행 설계의 정산 제외 기준으로 바로잡았다.
