# CHECK-PHARMACY-HUB-PAYMENT-AND-SUPPLIER-FULFILLMENT-V1

> WO: `WO-PHARMACY-HUB-PAYMENT-AND-SUPPLIER-FULFILLMENT-V1` (Phase 2)
> 작업일: 2026-08-01 · 브랜치 `main` · 작업 전 HEAD `74daa3488`
> **결과: 결제 → 공급자 전달 → 상태 전이 → 취소·복구 전 구간 구현 완료. 중지 조건 6개 전부 미해당.**

---

## 1. 착수 전 중지 조건 판정 (조사 결과)

WO 는 "다음이면 구현을 확대하지 말고 보고한다"로 6개를 지정했다. 착수 전에 전부 확인했다.

| # | 중지 조건 | 판정 | 근거 |
|:-:|---|:---:|---|
| ① | 기존 Payment Core 로 공급자별 주문 묶음 결제 불가 | ❌ 미해당 | `PaymentCoreService.prepare/confirm` 이 **PG orderId 슬롯에 paymentGroupId** 를 넣는 그룹 결제를 이미 지원. Neture B2B 가 같은 방식으로 운영 중 |
| ② | 배송비 snapshot 저장에 신규 주문 구조 필요 | ❌ 미해당 | `checkoutService.createOrder({ shippingPolicy, shippingFeeSnapshot })` 가 이미 존재. **신규 컬럼·테이블 0** |
| ③ | 서비스 필터 적용 시 Neture 주문 수치가 달라짐 | ❌ 미해당 | §6 — 프로덕션 실측 전후 불변 |
| ④ | PG 전체 취소를 안전하게 호출할 수 없음 | ❌ 미해당 | `PaymentCoreService.refund(paymentId, reason)` → `provider.refund(paymentKey)`. 그룹 결제가 **PG 1건**이라 전체 환불이 자연스럽게 성립 |
| ⑤ | 공급자 상태 전이가 기존 Neture 계약과 충돌 | ❌ 미해당 | `paid → preparing → shipped` 를 그대로 채택 (`SUPPLIER_STATUS_TRANSITIONS` 와 동일) |
| ⑥ | 병행 세션 파일 수정 필요 | ❌ 미해당 | 수정 파일 전부 Pharmacy-Hub / bridge 계열. 미추적 타 세션 파일 **미접촉** |

## 2. 구현 범위

### 2-1. 신규 파일 4

| 파일 | 역할 |
|---|---|
| `controllers/pharmacy-hub/PharmacyHubPaymentController.ts` | 결제 prepare/confirm + 취소 2종 |
| `controllers/pharmacy-hub/PharmacyHubSupplierOrderController.ts` | 공급자 주문 목록·상세·접수·발송 |
| `controllers/pharmacy-hub/PharmacyHubOperatorFulfillmentController.ts` | 운영자 미전달 조회·복구 |
| `services/pharmacy-hub/PharmacyHubPaymentEventHandler.ts` | `payment.completed` → paid 전이 → bridge |
| `services/pharmacy-hub/pharmacy-hub-payment.constants.ts` | source·serviceKey 문자열 SSOT |

### 2-2. 수정 파일 5

| 파일 | 변경 |
|---|---|
| `services/cart/pharmacy-hub-cart-checkout.service.ts` | 배송비 snapshot · paymentGroupId · **productId 축 정정(§4)** |
| `services/neture/checkout-fulfillment-bridge.service.ts` | source registry 화 (Neture 동작 불변) · paymentGroupId 기록 |
| `controllers/pharmacy-hub/PharmacyHubOrderController.ts` | 안내 문구를 결제 상태 기반으로 분리 |
| `routes/pharmacy-hub/pharmacy-hub.routes.ts` | 신규 10개 라우트 |
| `bootstrap/register-routes.ts` | 결제 이벤트 핸들러 등록 |

**신규 테이블 0 · 신규 컬럼 0 · migration 0 · DB write 0.**

## 3. 결제 구조

```
POST /store-owner/orders            → 공급자별 checkout_orders N건 (paymentGroupId 공유, paymentStatus=pending)
POST /store-owner/payments/prepare  → PaymentCore.prepare(orderId=paymentGroupId, amount=Σ totalAmount)
POST /store-owner/payments/confirm  → PaymentCore.confirm → payment.completed(serviceKey='pharmacy-hub')
                                     → PharmacyHubPaymentEventHandler
                                        → 그룹 주문 전부 paid 전이
                                        → CheckoutFulfillmentBridgeService → neture_orders (공급자 노출)
```

**공급자가 여럿이어도 구매자는 1회 결제**하고, 주문 원장은 공급자별로 분리 유지된다.

### 3-1. 결제 상태를 조작하지 않는다는 계약

`paid` 전이의 주체는 **결제 완료 이벤트 핸들러 하나뿐**이다. 주문 생성·조회·공급자 전이·운영자 복구
어느 경로도 `paymentStatus` 를 쓰지 않는다. 운영자 복구는 paid 가 **아닌** 주문을 명시적으로 거부한다
(`ORDER_NOT_PAID` 409).

### 3-2. 결제 금액의 권위

`prepare` 는 클라이언트가 보낸 금액을 받지 않는다. 주문 원장의 `totalAmount` 합계만 사용한다
(배송비 snapshot 포함). 그룹 중 하나라도 결제 가능 상태가 아니면 세션을 만들지 않는다.

## 4. ⚠️ Phase 1 의 실제 결함 발견·수정 — `productId` 축 불일치

공급자 workspace 는 주문을 이렇게 스코프한다 (Neture 와 **동일 축**):

```sql
JOIN supplier_product_offers spo ON spo.id = neture_order_items.product_id::uuid
```

즉 `product_id` 는 **SupplierProductOffer id** 여야 한다. 그런데 Phase 1 은 `master_id` 를 넣고 있었다.

| | Phase 1 | Neture B2B | Phase 2 (수정 후) |
|---|---|---|---|
| `productId` | `offer.master_id` ❌ | `offer.id` ✅ | `offer.id` ✅ |

**프로덕션 실측으로 확인**했다 — 기존 Pharmacy-Hub 주문의 `items[0].productId` 는
`supplier_product_offers` 에 0건 / `product_masters` 에 1건으로 매칭됐다.

방치했다면 **결제까지 성공하고도 공급자에게 영원히 보이지 않는** 조용한 단절이 됐을 것이다.
`masterId` 는 라인 metadata 에 그대로 보존한다.

## 5. Neture 무회귀 보장 방식

bridge 의 source 게이트를 등식 비교에서 **registry 조회**로 바꿨다.

```diff
- if (md.source !== NETURE_B2B_ORDER_SOURCE) return { skippedReason: 'UNSUPPORTED_SOURCE' };
+ const descriptor = BRIDGE_SOURCES[md.source];
+ if (!descriptor) return { skippedReason: 'UNSUPPORTED_SOURCE' };
```

Neture 항목의 값(`sourceService: 'neture-b2b'`)은 **이전과 글자 그대로 동일**하다.
단위 테스트가 이 동일성을 고정한다 (§7 ①).

이벤트 구독도 분리되어 있다:

| 서비스 | payment serviceKey | 주문 source | 조회 service_key |
|---|---|---|---|
| Neture (legacy) | `neture` | — | `neture` |
| Neture B2B | `neture-b2b` | `neture_b2b_checkout` | `neture` |
| **Pharmacy-Hub** | **`pharmacy-hub`** | **`pharmacy_hub_cart`** | **`pharmacy-hub`** |

핸들러는 serviceKey 구독에 더해 원장의 `serviceKey`+`source` 를 **한 번 더** 확인한다(오발 방지).

## 6. 프로덕션 read-only 검증

작성한 신규 쿼리를 **실제 프로덕션에서 실행**했다 (Cloud SQL Auth Proxy · read-only).

| 검증 | 결과 |
|---|---|
| `neture_suppliers.base_shipping_fee` / `free_shipping_threshold` 실재 | ✅ 둘 다 integer |
| 결제 그룹 로딩 쿼리 | ✅ 실행 성공 |
| 공급자 주문 목록 쿼리 (pharmacy-hub 스코프) | ✅ 실행 성공 |
| 공급자 상태 전이 WHERE 절 | ✅ 실행 성공 |
| 운영자 stuck 조회 | ✅ 실행 성공 · 0건 |
| 취소 경로 접수 판정 | ✅ 실행 성공 |
| 취소 `CASE` 타입 추론 | ✅ `checkout_orders_paymentstatus_enum` — **캐스트 불필요 확인** |

### 6-1. Neture 수치 불변 (중지 조건 ③)

```
neture_orders(service=neture)        0   ← 변화 없음
neture_orders(service=pharmacy-hub)  0
checkout_orders(pharmacy-hub)        1   ← Phase 1 잔존 주문
neture.neture_order_items            0
```

Neture 대상 데이터가 0건이라 **수치가 달라질 여지 자체가 없다**. 필터는 직전 WO 의
`netureOrderServiceScopeSql` SSOT 를 그대로 재사용했고 새로 정의하지 않았다.

### 6-2. write 를 실행하지 않았다

검증 초안에 있던 `UPDATE ... WHERE id = <0으로 채운 uuid>` (0건 매칭)를
**실행 전에** `SELECT pg_typeof(CASE ...)` 로 교체했다. 0건 매칭이라도 승인 없는 write 는 돌리지 않는다.

## 7. 테스트

신규 `services/neture/__tests__/checkout-fulfillment-bridge-sources.test.ts` — **5/5 통과**

| # | 검증 |
|:-:|---|
| ① | **Neture 무회귀** — `neture_b2b_checkout` 의 sourceService·originalSource·serviceKey 가 이전과 동일 |
| ② | Pharmacy-Hub 가 같은 bridge 를 타고 `service_key='pharmacy-hub'` 승계 · paymentGroupId 보존 |
| ②-b | 라인 `productId` 가 SPO id 로 전달 (§4 회귀 고정) |
| ③ | 미등록 source 거부 (`UNSUPPORTED_SOURCE`) |
| ④ | 미결제 주문 bridge 금지 (`PAYMENT_NOT_READY`) |

| 기타 | 결과 |
|---|---|
| `tsc --noEmit -p tsconfig.build.json` | ✅ **0 errors** |
| `fulfillment-service-scope` (서비스 경계 SSOT) | ✅ 10/10 |

## 8. 취소·환불 V1 계약

| 시점 | 가능 여부 | 엔드포인트 | 동작 |
|---|---|---|---|
| 결제 전 | ✅ 단건 취소 | `POST /store-owner/orders/:orderId/cancel` | `status=cancelled`. 결제된 주문이면 409 `ALREADY_PAID` |
| 결제 후 · 접수 전 | ✅ **그룹 전체만** | `POST /store-owner/payments/:paymentGroupId/cancel` | PG 전체 환불 → checkout_orders `cancelled`/`refunded` + bridge 된 neture_orders `cancelled` |
| 접수 후 | ❌ 구매자 불가 | 위와 동일 (거부) | 409 `SUPPLIER_ALREADY_ACCEPTED` + `requiresOperator: true` |

**부분 환불·부분 취소는 V1 범위 밖**이다 — PG 결제가 그룹 단위 1건이므로 부분 환불은
결제 구조 자체를 바꿔야 한다. 접수 판정은 추정하지 않고 `neture_orders.status` 원장으로 한다.

환불 실패 시 원장을 바꾸지 않는다(PG 먼저 → 성공 시에만 원장 트랜잭션).

## 9. 운영자 복구 경로

결제 완료 후 bridge 는 **best-effort** 다 — 실패해도 결제는 유효하고 주문은 paid 로 남는다.
이때 "결제했는데 공급자에게 안 보이는" 상태가 생기며, 이를 되살리는 유일한 공식 수단이다.

| 엔드포인트 | 성질 |
|---|---|
| `GET /operator/fulfillment/stuck` | paid 인데 대응 `neture_orders` 없는 주문 |
| `POST /operator/fulfillment/:orderId/recover` | **멱등** — 이미 전달됐으면 기존 id 반환 + `alreadyBridged: true` |

안전 계약: 운영자 scope 전용 · 결제 상태 불변 · 금액/품목 불변 · 모든 시도 감사 로그
(`operatorId` · `orderId` · `bridged` · `skippedReason`).

## 10. 남은 것 (범위 밖 · 후속)

| 항목 | 상태 |
|---|---|
| **Phase 1 잔존 주문 1건** | `3b5eedb4…` 는 `productId=master_id` · `paymentGroupId` 없음 → **결제 불가 형상**. 미결제 테스트 주문이므로 재생성이 정답. DB 수정은 승인 사항이라 **건드리지 않았다** |
| 프론트 결제 화면 | 이번 WO 는 API 계약까지. Toss 위젯 연결은 후속 |
| 정산 연결 | Pharmacy-Hub 주문의 정산 축은 미정 (Neture 정산은 `service_key='neture'` 로 스코프되어 **섞이지 않음**) |
| 부분 취소·부분 환불 | V1 범위 밖 (§8) |
| 파트너 커미션 타입 불일치 | 직전 WO 에서 보고한 `WO-O4O-PARTNER-COMMISSION-PRODUCT-ID-TYPE-ALIGNMENT-V1` 미착수 |

## 11. 중지 조건 최종 판정

| 조건 | 판정 |
|---|---|
| 그룹 결제 불가 | ❌ 미해당 — 기존 Payment Core 로 충족 |
| 배송비에 신규 주문 구조 필요 | ❌ 미해당 — 신규 컬럼 0 |
| Neture 주문 수치 변화 | ❌ 미해당 — 전후 0 불변 (§6-1) |
| PG 전체 취소 불가 | ❌ 미해당 — `refund()` 로 성립 |
| 공급자 전이가 Neture 계약과 충돌 | ❌ 미해당 — 동일 전이표 채택 |
| 병행 세션 파일 수정 필요 | ❌ 미해당 — 미접촉 |
