# CHECK-O4O-GLYCOPHARM-ORDERS-PAGE-CHECKOUT-LEDGER-REPOINT-V1

> **WO**: WO-O4O-GLYCOPHARM-ORDERS-PAGE-CHECKOUT-LEDGER-REPOINT-V1
> **선행 IR**: `IR-O4O-STORE-ORDER-LEDGER-CROSSSERVICE-AUDIT-V1`
> **성격**: read-only 조사 결과. **코드/DB/UI 무변경.**
> **결과: HALT(중단) — repoint 타깃이 방향(buyer/seller)상 부적합. 선행 IR 의 "단순 repoint" 결론 정정. 의사결정 필요.**
> **작성일**: 2026-06-12

---

## 1. 목적
GP 주문 내역 페이지(`PharmacyOrders`)를 deprecated stub(`/glycopharm/pharmacy/orders`) → 실제 checkout_orders 로 repoint 하려 했으나, 조사 중 **repoint 타깃이 의미상(주문 방향) 부적합**함을 확인하여 구현을 중단한다.

## 2. 선행 IR 기준 (정정 대상)
선행 IR `...ORDER-LEDGER-CROSSSERVICE-AUDIT-V1` 은 "GP 페이지가 stub 을 읽으니 `/glycopharm/checkout/orders` 로 repoint" 를 권고했다. 본 CHECK 는 그 권고가 **주문 방향(buyer vs seller) 불일치**로 부적합함을 정정한다.

## 3. Phase 1 — 현재 호출 경로 (확인)
| 화면 | 현재 API | endpoint | 동작 |
|------|----------|----------|------|
| `PharmacyOrders.tsx`(+`StoreBillingPage.tsx`) | `pharmacyApi.getOrders` | `/glycopharm/pharmacy/orders` | **deprecated stub — `{items:[],total:0}` 고정**(`pharmacy.controller.ts:164`, "Phase 4-A Legacy Order System Deprecated") |

> `pharmacyApi.getOrders` 재사용처 = `PharmacyOrders` + `StoreBillingPage` 2곳(둘 다 stub → 빈 목록).

## 4. Phase 2 — 후보 endpoint shape + 의미 비교 (BLOCKER 발견)

### 4.1 GP `PharmacyOrders` 의 성격
단순 주문 조회가 아니라 **B2C 셀러 풀필먼트 콘솔**:
- 쓰기 액션 `pharmacyApi.receiveOrder`(접수), `updateOrderStatus`(confirmed/shipped/delivered/cancelled)
- 렌더 필드 `order.customerName / items / shippingAddress / trackingNumber` (`PharmacyOrder` 타입 = customerId/customerName/customerPhone/shippingAddress/trackingNumber)
- → **매장이 받은 주문을 이행(배송)하는 SELLER 측 화면.**

### 4.2 후보 endpoint = `/glycopharm/checkout/orders` 의 성격
`checkout.controller.ts:631-634` — `co.buyerId = :buyerId AND metadata.serviceKey='glycopharm'`. → **매장이 구매한 주문(BUYER 측).** 응답 필드 = `{id, orderNumber, status, paymentStatus, totalAmount, pharmacy, itemCount, createdAt}`(summary, customer/items/shipping 없음).

### 4.3 방향 불일치 (핵심 BLOCKER)
| | 방향 | 필터 | 필드 |
|---|------|------|------|
| GP `PharmacyOrders`(UI) | **SELLER**(이행) | — | customer/items/shipping/tracking |
| `/glycopharm/checkout/orders`(후보) | **BUYER**(구매) | `buyerId` | summary(customer/items/shipping 없음) |

> repoint 시 **약국의 "구매 주문"을 "판매 이행 UI"(접수/배송 버튼)에 표시**하게 됨 — 의미 정반대 + 필드 부재. **부적합.**

## 5. Phase 3/4 — 변경 내용
**없음.** repoint 부적합으로 코드 변경 미수행.

## 6. 추가 발견 — canonical 방향이 서비스별 불일치 (선행 IR 보강)

| 서비스 | "내 매장 주문 내역" endpoint | 필터 | 방향 |
|--------|------------------------------|------|------|
| **KPA** | `/checkout/store-orders`(`kpa-checkout.controller.ts:1042`) | `sellerOrganizationId` + `requireStoreOwner` | **SELLER**(받은 주문, items 포함 rich) |
| **KCos** | `/cosmetics/orders`(`cosmetics-order.controller.ts:637`) | `buyerId` | **BUYER**(구매 주문) |
| **GP** | (page=`PharmacyOrders` 셀러 UI) / endpoint `/checkout/orders` | `buyerId` | **UI=SELLER, endpoint=BUYER 불일치** |

> **"내 매장 주문 내역" 의미가 서비스별로 다르다**: KPA=판매 주문(seller), KCos=구매 주문(buyer). GP 는 UI(seller)와 가용 endpoint(buyer)가 어긋남. **GP 에는 KPA 식 seller `/store-orders` 엔드포인트가 존재하지 않음**(`checkout.controller.ts` 에 store-orders 없음). → 선행 IR 의 "checkout_orders 통일 → 단순 repoint/UI 공통화" 전제는 **원장(table)은 맞으나 주문 방향(semantic)이 미정렬**이라 보강 필요.

## 7. Phase 5 — deprecated stub 처리
`/glycopharm/pharmacy/orders` stub 은 본 CHECK 에서 **삭제하지 않음**(repoint 미수행). frontend 호출자 2곳(PharmacyOrders/StoreBillingPage) 잔존.

## 8. Phase 6 — read-only 검증
주문 데이터 실측은 **미수행**(repoint 자체가 부적합 판정되어 의미 없음). 단 선행 `CHECK-...-CONVERTED-LISTING-DATA-AUDIT-V1` 에서 검증된 Cloud SQL Auth Proxy 경로로 후속 확인 가능.

## 9. 제외/무변경 항목
- 코드/DB/migration/UI/response shape — **전부 무변경**.
- KPA/KCos/Neture — 무변경.

## 10. 검증 결과
구현 중단(HALT). 코드 변경 0. 조사 결과만 기록.

## 11. 완료 판정
**HALTED — 의사결정 필요.** repoint 타깃이 주문 방향(buyer/seller)상 부적합하고, GP 에 seller-side store-orders endpoint 가 부재하며, "내 매장 주문 내역" 의미가 KPA(seller)/KCos(buyer)로 서비스별 불일치. 이는 frontend repoint 범위를 넘는 **방향 의미 결정 + backend endpoint 설계** 사안.

## 12. 후속 작업 (의사결정 분기)
**선행: 방향 의미 결정 IR**
- `IR-O4O-STORE-ORDER-DIRECTION-SEMANTICS-CROSSSERVICE-V1` — "내 매장 주문 내역" = 판매 주문(seller) vs 구매 주문(buyer) 의 서비스별 의미 확정. KPA(seller)/KCos(buyer)/GP(혼선) 정렬 기준 결정.

**결정 후 분기**
- (A) 정렬 기준 = seller → GP 에 `/glycopharm/checkout/store-orders`(sellerOrganizationId+serviceKey) 추가(KPA 1:1 복사) → GP PharmacyOrders repoint + adapter. KCos 도 seller 로 재정렬 여부 검토.
- (B) 정렬 기준 = buyer → GP PharmacyOrders 의 seller 풀필먼트 UI(접수/배송) 를 buyer 구매내역 UI 로 교체(KCos/KPA 모델로) → 그 후 repoint.
- (C) seller/buyer 양축 분리 → 각 서비스 "구매 내역" + "판매 주문" 2화면 정의.

> 어느 경우든 **단순 frontend repoint 로는 해결 불가**. 방향 결정이 선행되어야 한다.

---

*Date: 2026-06-12 · read-only · 코드 무변경 · HALT: repoint 타깃 방향(buyer/seller) 부적합 + GP seller endpoint 부재 + KPA(seller)/KCos(buyer) 의미 불일치. 선행 IR 단순 repoint 결론 정정. 방향 의미 결정 IR 선행 필요.*
