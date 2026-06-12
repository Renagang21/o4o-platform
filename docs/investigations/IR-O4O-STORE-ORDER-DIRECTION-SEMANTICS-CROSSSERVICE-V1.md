# IR-O4O-STORE-ORDER-DIRECTION-SEMANTICS-CROSSSERVICE-V1

> **유형**: Investigation (read-only) — "내 매장 주문 내역"의 buyer/seller 방향 의미 cross-service 확정.
> **성격**: 코드/DB/migration/UI **무변경**. 조사 문서만 (file:line 근거).
> **결론(요약)**: **canonical = buyer(구매/발주 내역).** cart `checkout-confirm` 이 `buyerId=매장 사용자` 로 주문을 생성하므로 "내 매장 주문 내역" = 매장의 구매 주문이다. KPA 페이지만 **seller("판매자 관점")** 로 구현되어 있고(별개 개념), KCos 는 buyer(정합), GP 는 seller-UI/buyer-endpoint 불일치(+stub). → **정책 1(buyer 기준) + seller 는 별도 "받은 주문/판매" 화면으로 분리** 권고.
> **선행**: `IR-O4O-STORE-ORDER-LEDGER-CROSSSERVICE-AUDIT-V1` · `CHECK-O4O-GLYCOPHARM-ORDERS-PAGE-CHECKOUT-LEDGER-REPOINT-V1`(HALT).
> **작성일**: 2026-06-12

---

## 1. 목적
원장(`checkout_orders`)은 통일됐으나 "내 매장 주문 내역" 화면의 **방향(buyer 구매 vs seller 판매/이행)** 이 서비스별로 어긋난 상태를 확정하고 canonical 의미를 제안한다.

## 2. 배경
선행 ledger IR = checkout_orders 통일. 후속 GP repoint CHECK = HALT(GP UI=seller, 후보 endpoint=buyer 방향 불일치 발견). 본 IR 이 방향 의미를 결정.

## 3. 용어 기준
- **구매 내역/발주 내역(buyer)**: 매장이 공급자에게 주문한 내역. 필터 = `buyerId`. 기능 = 확인/결제·배송 상태/취소. **이행 버튼 없음.**
- **받은 주문/판매 이행(seller)**: 매장/공급자가 받은 주문을 처리. 필터 = `sellerOrganizationId`/`supplierId`. 기능 = 접수/배송/송장/완료.

## 4. 조사 범위
KPA/GP/KCos 주문 페이지(UI) + endpoint(필터) + cart checkout 생성 방향. Neture 제외. (read-only, file:line.)

---

## 5. Phase 1 — 주문 화면 의미 분류

| 서비스 | route/page | 화면 자기규정 | 액션 | 방향 |
|--------|-----------|---------------|------|------|
| KPA | `StoreOrdersPage`(`pages/pharmacy/`) | line 5 **"매장 주문 목록 (판매자 관점)"**, subtitle "B2B 구매 및 B2C 판매 주문 관리" | 상태 변경(PATCH status) | **SELLER**(혼재 주장) |
| KCos | `StoreOrdersPage`(`pages/store/`) | subtitle "매장에 접수된 주문 내역 확인"(접수=created/발주), status `created:'접수'` | 조회 위주 | **BUYER** |
| GP | `PharmacyOrders`(`pages/store-management/`) | B2C 셀러 풀필먼트 | `receiveOrder`/`updateStatus`(shipped/delivered) + customer/shipping/tracking | **SELLER**(legacy, stub) |

> KPA 페이지는 명시적으로 "판매자 관점"이나 subtitle 은 "구매+판매" 혼재. GP 는 seller 풀필먼트. KCos 만 buyer(발주/접수=created) 성격.

## 6. Phase 2 — endpoint 방향 분류

| 서비스 | endpoint | 필터 | 방향 | 페이지 사용 |
|--------|----------|------|------|:---:|
| KPA | `/checkout/store-orders`(`kpa-checkout.controller.ts:1042`) | `sellerOrganizationId`+`requireStoreOwner` | **SELLER** | ✅(StoreOrdersPage) |
| KPA | `/checkout/orders`(`kpa-checkout.controller.ts:567,589`) | `buyerId` | **BUYER** | ❌(존재하나 미사용) |
| KCos | `/cosmetics/orders`(`cosmetics-order.controller.ts:637`) | `buyerId` | **BUYER** | ✅(StoreOrdersPage) |
| GP | `/glycopharm/checkout/orders`(`checkout.controller.ts:633`) | `buyerId` | **BUYER** | ❌(미사용) |
| GP | `/glycopharm/pharmacy/orders`(`pharmacy.controller.ts:164`) | — | **STUB(빈 배열)** | ✅(PharmacyOrders·StoreBillingPage) |

> **KPA·GP 모두 buyer endpoint 가 존재**(KPA `/checkout/orders`, GP `/checkout/orders`)하나 페이지는 사용하지 않음. KPA 페이지는 seller endpoint 선택, GP 페이지는 stub. KCos 만 buyer endpoint 를 페이지에 사용. **GP 에는 KPA 식 seller `/store-orders` endpoint 부재.**

## 7. Phase 3 — cart/checkout 생성 방향 (결정적)

`store-cart.routes.ts:7,75,91` — cart 경계 = **`buyerId`(=JWT 인증 사용자, 매장 사용자) + serviceKey**. `/cart/:serviceKey/checkout-confirm` 가 `buyerId` 로 `checkout_orders` 생성.

| 생성 흐름 | buyerId | 의미 |
|-----------|---------|------|
| cart → checkout-confirm | **매장 사용자** | 매장이 **구매자**로 주문 생성 |
| event offer 주문(`checkoutService.createOrder`) | 매장 사용자 | 동일 |

> **매장이 매장 허브에서 담아 주문한 것(O4O 주문 가능 상품·이벤트 오퍼)은 전부 `buyerId=매장 사용자` 로 적재된다.** → "내 매장 주문 내역"(= 내가 주문한 것)을 보려면 **buyer 방향(`buyerId` 필터)** 이어야 한다. seller 방향(`sellerOrganizationId`)은 이 주문들을 **보여주지 않는다**(매장이 seller 가 아니므로).

## 8. Phase 4 — KPA seller endpoint 의도

| 항목 | 결과 |
|------|------|
| `/checkout/store-orders` 필터 | `sellerOrganizationId` = 매장 org → 매장이 **판매자**인 주문(받은 주문) |
| 페이지 자기규정 | "판매자 관점"(line 5) — **의도적 seller 화면** |
| KPA buyer 화면 존재? | endpoint(`/checkout/orders`)는 있으나 **페이지에서 미사용** |
| 판정 | KPA seller endpoint 는 **명명/배선 오류가 아니라 의도된 "판매/받은 주문" 개념**. 단 이는 cart 구매(buyer)와 **다른 축**이며, `/store/commerce/orders` 에 seller 화면을 둔 것이 **방향 혼선의 원인**. KPA 는 buyer 구매내역 화면이 사실상 비어 있음(페이지가 seller 만 노출) |

## 9. Phase 5 — KCos buyer endpoint 의도

| 항목 | 결과 |
|------|------|
| `/cosmetics/orders` 필터 | `buyerId`(매장 사용자) → **구매 주문** |
| UI | "매장에 접수된 주문 내역"(접수=created/발주), 이행 버튼 없음 — 구매내역 성격 |
| 판정 | **buyer 방향이 cart 생성 흐름과 정합. canonical 후보로 적합.** (단 "접수" 라벨은 created 의미로, 상태 라벨 정렬 필요 — 별도 WO) |

## 10. Phase 6 — GlycoPharm 불일치 해소 방향

| 안 | 내용 | 적합성 |
|----|------|:---:|
| A seller 기준 | GP 에 seller `/store-orders` 추가 + PharmacyOrders 재사용 | ✗ cart 구매(buyer)와 불일치. "내 매장 주문 내역"이 받은 주문으로 고정됨 |
| **B buyer 기준** | GP PharmacyOrders 의 seller 풀필먼트 UI → buyer 구매내역 UI 로 교체 + `/glycopharm/checkout/orders`(buyer) repoint | **✅ cart 흐름·KCos 정합. 권고** |
| C 양축 분리 | 구매 내역(buyer) + 받은 주문/판매(seller) 2화면 | △ seller 수요가 실재하면 정확하나 IA 확대 |

> **권고 = B**(buyer). GP 의 seller 풀필먼트 UI(접수/배송/customer/shipping)는 legacy(원장 stub 제거된 B2C 모델) 이므로, `/store/commerce/orders` 는 buyer 구매내역으로 교체하고 buyer endpoint 로 연결. seller 풀필먼트가 실제 필요하면 별도 화면(C)으로 분리.

## 11. Phase 7 — canonical 정책 제안

| 정책 | 설명 | 평가 | 추천 |
|------|------|------|:---:|
| **1 buyer 기준** | "내 매장 주문 내역" = 구매/발주 내역(buyerId). seller 는 별도 "받은 주문/판매" 메뉴 | cart 생성(buyerId)·KCos 와 정합. KPA/GP 정렬 필요 | **★ 권고** |
| 2 seller 기준 | "내 매장 주문 내역" = 받은 주문(sellerOrg) | cart 구매가 안 보임 → 핵심 흐름과 불일치 | ✗ |
| 3 양축 분리 | 구매 내역 + 받은 주문 2화면 | 정확하나 seller 수요 확인 + IA 확대 필요 | △(seller 실수요 시) |

**canonical 제안**:
```
내 매장 주문 내역(/store/commerce/orders) = 구매 내역/발주 내역 (buyerId, checkout_orders)
  - cart(O4O 주문 가능 상품) + 이벤트 오퍼 주문이 여기에 모인다.
  - 이행 버튼 없음(조회·결제/배송 상태·취소).
받은 주문/판매 이행 = (필요 시) 별도 메뉴 (sellerOrganizationId)
  - KPA 의 현 "판매자 관점" 화면은 이쪽으로 이동.
```

## 12. Phase 8 — 후속 작업 분리 (정책 1 기준)

**buyer 정렬**
- `WO-O4O-GLYCOPHARM-ORDERS-PAGE-BUYER-LEDGER-REPOINT-V1` — GP `/store/commerce/orders` 를 buyer 구매내역 UI + `/glycopharm/checkout/orders` 로 교체(seller 풀필먼트 UI 분리/보류). (원 repoint WO 의 올바른 buyer 버전.)
- `WO-O4O-KPA-ORDERS-PAGE-BUYER-LEDGER-ALIGNMENT-V1` — KPA `/store/commerce/orders` 를 seller("판매자 관점") → buyer `/checkout/orders` 로 정렬. 현 seller 화면은 별도 "받은 주문" 메뉴로 이동(또는 보류).
- `WO-O4O-STORE-CHECKOUT-STATUS-LABEL-ALIGNMENT-V1` — created/paid/cancelled 등 상태 라벨 buyer 문맥 공통 매핑.

**그 후**
- `WO-O4O-STORE-BUYER-ORDERS-COMMON-COMPONENT-EXTRACTION-V1` — 3서비스 buyer 구매내역 화면 공통 추출.

**seller(필요 시)**
- `IR-O4O-STORE-SELLER-ORDER-FULFILLMENT-NEED-V1` — 매장 seller/판매 이행 수요 실재 여부 + 별도 IA 결정(정책 3 분기).

**권장 순서**: ① 본 IR 정책 확정 → ② GP buyer repoint(B) → ③ KPA buyer 정렬 → ④ 상태 라벨 정렬 → ⑤ buyer 공통 추출 → ⑥ (필요 시) seller 수요 IR.

---

## 13. 결론
- **cart `checkout-confirm` 이 `buyerId=매장 사용자` 로 주문 생성** → "내 매장 주문 내역"(= 매장이 주문한 것)의 canonical 방향은 **buyer(구매/발주 내역)** 이다.
- 현재 **KCos 만 buyer 로 정합**. **KPA 는 의도적 seller("판매자 관점")** 화면을 `/store/commerce/orders` 에 두어 cart 구매내역이 비어 있고, **GP 는 seller-UI/buyer-endpoint 불일치 + stub**.
- KPA·GP 모두 **buyer endpoint 가 이미 존재**(`/checkout/orders`)하나 페이지가 사용하지 않음 → 정렬은 endpoint 신설이 아니라 **페이지 배선/모델 교체** 문제(B).
- **권고: 정책 1(buyer 기준)** — `/store/commerce/orders` = 구매/발주 내역으로 통일, seller "받은 주문/판매 이행"은 별도 화면(정책 3)으로 분리. 선행 GP repoint WO 는 이 buyer 기준으로 재발행(`...BUYER-LEDGER-REPOINT-V1`).

---

*Date: 2026-06-12 · read-only IR · 코드 무변경 · canonical = buyer(구매/발주). cart=buyerId 근거. KPA(seller)/GP(stub) → buyer 정렬, seller 는 별도 화면 분리(정책 1). GP repoint 는 buyer 버전으로 재발행.*
