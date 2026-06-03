# WO-O4O-CHECKOUT-SERVICE-RETAIL-CHANNEL-SUPPORT-V1 (설계 WO)

> **설계 전용 — 코드 수정 없음(docs only).** canonical 주문 원장 `checkout_orders`(Frozen) 유지 전제하에,
> dropshipping/supplier 중심 `checkoutService.createOrder()` 가 K-Cosmetics retail/seller/store/channel
> 주문 모델을 왜곡 없이 수용하도록 하는 설계안을 확정한다.

| 항목 | 값 |
|------|------|
| 작성일 | 2026-06-03 |
| 분류 | 설계 WO (구현은 후속) |
| 선행 | `WO-O4O-COSMETICS-ORDERS-CANONICAL-CHECKOUT-ALIGNMENT-V1`(1차 list/detail PASS), `WO-O4O-ECOMMERCE-ORDERS-TABLE-PROVISION-V1`(⛔ 중단) |
| 계약 SSOT | `docs/baseline/E-COMMERCE-ORDER-CONTRACT.md` (Frozen) |
| 판정 | **DESIGN READY** (권장안 1개 확정, DB migration 불필요) |

---

## 0. 1차 완료 고정 (불변)

- `GET /api/v1/cosmetics/orders` **live 200** 확인 (리비전 `o4o-core-api-01985-pcg`).
- `/store/commerce/orders` 화면 500 배너 소멸, `relation "ecommerce_orders" does not exist` 소멸.
- list/detail 는 `checkout_orders` 기준 정렬 (commit `01062ece0`). `ecommerce_orders` 생성은 계약 위반 → 중단 문서화 완료.
- **본 설계 WO 는 위 1차 상태를 변경하지 않는다.**

## 1. canonical 규칙 (계약 확인)

- canonical 주문 원장 = **`checkout_orders` / `CheckoutOrder`** (계약 §3, §7.1).
- 주문 생성 = **`checkoutService` 계층 경유 필수**. 서비스 모듈의 `checkout_orders` 직접 INSERT 금지(§5, 코드리뷰 차단).
- **`order_type` enum**(계약 §3): `GENERIC`(기본)/`DROPSHIPPING`/`GLYCOPHARM`/`COSMETICS`/`TOURISM`. `checkout_orders.order_type` 컬럼은 마이그레이션(`1736950000000-AddOrderTypeToCheckoutOrders`)으로 존재.
- ⚠️ **drift 관찰**: `CheckoutOrder` 엔티티 파일에는 `orderType` 필드가 **매핑돼 있지 않음**(컬럼은 DB 존재). 서비스 식별이 현재 두 갈래 — `order_type`(COSMETICS) vs `metadata->>'serviceKey'`('cosmetics'). store-summary/list/detail 는 **metadata.serviceKey** 를 사용 중. (설계에서 통일 기준 명시 필요.)

## 2. 모델 차이 표

| 차원 | checkoutService(dropshipping) | K-Cosmetics retail | GlycoPharm | LMS payment |
|------|------------------------------|--------------------|-----------|-------------|
| 생성 경로 | `checkoutService.createOrder` (canonical) | off-contract `EcommerceOrder` 직접(POST `/cosmetics/orders`) | off-contract `EcommerceOrder`(checkout.controller) + canonical order.controller 병존 | `EcommerceOrder` 직접 |
| 당사자 | buyer + **supplierId(필수)** + seller + partner | buyer + **sellerId(=store)**, supplier 미지정 | buyer + seller(약국) | buyer(수강생) |
| 서비스 식별 | order_type/metadata | `metadata.serviceKey='cosmetics'` (+ order_type=COSMETICS 기대) | glycopharm | lms |
| channel | 없음 | **local/travel** (metadata) | 없음/일부 | 없음 |
| shippingFee/discount | **강제 0** (createOrder line 120-121) | **보존 필요** (DTO 입력) | 보존 필요 | N/A |
| items | jsonb `{productId,productName,quantity,unitPrice,subtotal}` | sku/discount/options/productSnapshot 포함 | 유사 | N/A |
| status | CheckoutOrderStatus(created/pending_payment/paid/refunded/cancelled) | EcommerceOrder OrderStatus(+CONFIRMED) | 동 EcommerceOrder | 동 |
| 결제 | `checkoutService.completePayment/refundOrder` | `cosmetics-payment.controller`+`KCosmeticsPaymentEventHandler`(EcommerceOrder) | glyco payment(EcommerceOrder) | LmsPaymentEventHandler(EcommerceOrder) |

## 3. `CreateOrderDto` 분석 (현 계약)

```ts
CreateOrderDto { buyerId; sellerId; supplierId /*필수*/; partnerId?; sellerOrganizationId?;
                 items: {productId,productName,quantity,unitPrice,subtotal}[]; shippingAddress?; metadata? }
```
- `supplierId` **필수** — retail 에 부적합(공급자 없는 매장 직접 판매 가능). 
- `createOrder()` 내부: subtotal=Σitems, **shippingFee=0, discount=0 강제**, orderNumber `ORD-`, OrderLog 생성, market-trial hook, status=CREATED/paymentStatus=PENDING. **order_type 미설정**(→ DB 기본 GENERIC). channel 미처리.

## 4. 설계 질문에 대한 답

1. **확장 vs 별도 메서드** → 권장: `checkoutService.createOrder` 를 **단일 진입 + 옵션 확장**. dropshipping 분기 보존 위해 retail 은 thin wrapper `createRetailOrder()` 가 내부적으로 createOrder(확장 시그니처) 호출.
2. **supplierId 필수?** → **retail 에서는 optional**. `orderType` 가 RETAIL/COSMETICS 류일 때 supplier 없이 허용(attribution 은 sellerOrganizationId/storeId).
3. **sellerId/storeId/supplierId 의미 분리** → seller=판매 주체(매장 org), store=물리 매장(cosmetics_stores.id, metadata.storeId), supplier=공급자(dropshipping 한정). retail: supplier=null.
4. **K-Cos sellerId 정체** → 판매 조직(store org). `sellerOrganizationId` 로 canonical 매핑(store-summary 가 이미 sellerOrganizationId 로 집계).
5. **channel 저장 위치** → **`metadata.channel`** (store-summary/list/detail 가 이미 `metadata->>'channel'` 사용 → 컬럼 신설 불필요, drift 없음).
6. **shippingFee/discount** → **1급 필드 보존**. createOrder 의 강제 0 을 입력값 passthrough 로 수정(default 0 유지). (checkout_orders 에 이미 shippingFee/discount 컬럼 존재.)
7. **payment 상태 매핑** → §5 표.
8. **EcommerceOrder.CONFIRMED 치환** → CheckoutOrderStatus 에 CONFIRMED 없음 → **`paid`** 로 치환(결제완료=확정). 별도 "확정" 단계 필요 시 metadata 플래그.
9. **컬럼 규약 충돌** → 없음. store-summary/list/detail 가 쓰는 `co."totalAmount"`, `co.metadata->>'channel'`, `co.items`, `co."sellerOrganizationId"` 규약 그대로 사용.
10. **glyco/lms 수용** → 동일 확장(orderType 분기 + supplier optional + shippingFee/discount passthrough)으로 수용 가능. 단 각 서비스 정렬은 별도 구현 WO.

## 5. 결제 상태 매핑표 (canonical CheckoutOrder 기준)

| 사건 | CheckoutOrderStatus | CheckoutPaymentStatus | 비고 |
|------|---------------------|------------------------|------|
| 생성 | created | pending | createOrder |
| 결제대기 | pending_payment | pending | optional 단계 |
| 결제완료 | paid | paid | completePayment (paidAt) |
| 결제실패 | (created 유지) | failed | payment.status=FAILED |
| 취소 | cancelled | (유지) | |
| 환불 | refunded | refunded | refundOrder |
| ~~CONFIRMED~~(legacy) | **paid** 로 치환 | — | CheckoutOrderStatus 에 없음 |

## 6. canonical 확장안

- **Option A — `createOrder()` 시그니처 확장**: `orderType?`, `supplierId?`(retail optional), `shippingFee?`, `discount?`, `channel`(metadata) 추가. 한 메서드에 dropshipping/retail 분기.
- **Option B — `createRetailOrder()` 추가**: retail 전용 메서드 신설, 내부는 공통 persistence 재사용. dropshipping createOrder 불변.
- **Option C — service adapter + 공통 persistence**: 서비스별 adapter 가 DTO 정규화 후 공통 `persistCheckoutOrder()` 호출. (store-summary 의 adapter 패턴과 결.)

### 권장: **B + C 하이브리드**
- 공통 내부 persistence(`persistCheckoutOrder`)로 dropshipping/retail 공유(번호·OrderLog·status 일원화).
- 진입은 의미별 분리: `createOrder()`(dropshipping, 기존 계약 불변) / `createRetailOrder()`(retail: supplier optional, shippingFee/discount passthrough, orderType=COSMETICS/GLYCOPHARM/…, metadata.serviceKey+channel 보존).
- 이유: dropshipping 계약을 건드리지 않아 회귀 위험 최소 + retail 의미를 1급으로 표현(임시 매핑 금지 원칙 충족) + glyco/lms 재사용 용이.

## 7. DB migration 필요 여부

- **불필요.** checkout_orders 는 필요한 컬럼(shippingFee/discount/metadata/sellerOrganizationId/items)을 이미 보유. channel/serviceKey/storeId 는 metadata 사용. order_type 컬럼 존재.
- (선택, 별도) `CheckoutOrder` 엔티티에 `orderType` 필드 매핑 추가(현 drift 해소)는 코드 변경이며 본 설계 범위 외 — 구현 WO 에서 판단.

## 8. API response shape 영향

- **없음(프론트 무변경 목표).** create 응답은 기존 cosmetics POST 응답 형태(orderId, orderNumber, status, totalAmount, items…)와 호환되게 매핑. list/detail 은 이미 1차에서 checkout_orders 기준 정렬 완료(shape 불변).

## 9. 후속 구현 WO 목록

1. `WO-O4O-COSMETICS-CHECKOUT-CREATE-PAYMENT-CANONICAL-ALIGNMENT-V1` — 본 설계 기반 cosmetics create(`createRetailOrder` 경유) + payment(controller/handler → CheckoutOrder/completePayment) 정렬.
2. `WO-O4O-GLYCOPHARM-ORDERS-CANONICAL-CHECKOUT-ALIGNMENT-V1` — glyco checkout/payment off-contract 정렬(실사용 경로 — 회귀 검증 강화).
3. `WO-O4O-LMS-PAYMENT-CANONICAL-CHECKOUT-ALIGNMENT-V1` — LmsPaymentEventHandler 정렬.
4. (선택) `WO-O4O-CHECKOUT-ORDER-STATUS-MAPPING-STANDARD-V1` — status/serviceKey/order_type 식별 기준 통일 + 엔티티 orderType 매핑 drift 해소.

## 10. 하지 않은 것 / 금지 준수
- DB table 생성·migration·코드 추측성 재작성·`supplierId=sellerId` 임시매핑·계약 변경·glyco/lms 동시수정·실결제 테스트: **전부 안 함**.
- 본 WO 산출물 = 문서 1건. 1차 PASS 상태 불변.

## 11. 남은 결정 사항 (사용자/오너)
- 권장안(B+C) 채택 여부.
- 서비스 식별 단일 기준: `order_type`(COSMETICS) vs `metadata.serviceKey`('cosmetics') — 구현 WO 착수 전 1개로 확정 권장(현 코드는 metadata.serviceKey 우세).
- `CheckoutOrder` 엔티티 orderType 매핑 drift 를 구현 WO 에 포함할지.
