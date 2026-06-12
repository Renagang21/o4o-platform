# CHECK-O4O-STORE-BUYER-ORDERS-COMMON-COMPONENT-EXTRACTION-V1

> **WO**: WO-O4O-STORE-BUYER-ORDERS-COMMON-COMPONENT-EXTRACTION-V1
> **선행**: `WO-O4O-STORE-CHECKOUT-STATUS-LABEL-ALIGNMENT-V1`(공통 라벨 헬퍼) · KPA/GP/KCos buyer 정합.
> **성격**: buyer 주문 내역 화면의 **반복 presentation 추출(V1)**. backend/DB/API/주문로직 무변경, seller 미혼입.
> **결과: PASS — 공통 `BuyerOrderStatusBadge`(@o4o/store-ui-core) 추출 + KPA/KCos 적용. GP 는 payment-aware deriveState 유지(의도된 예외). 3 web + store-ui-core typecheck 0.**
> **작성일**: 2026-06-12

---

## 1. 목적
KPA/KCos buyer 주문 내역의 **중복 inline 상태 배지 렌더**를 공통 컴포넌트로 추출해, 공통 라벨/tone 헬퍼(`buyerCheckoutStatus`)를 단일 컴포넌트에서 사용. 후속 전면 공통화 기반 확보.

## 2. 선행 기준
`/store/commerce/orders` = buyer 구매/발주 내역(checkout_orders, buyerId). 상태 라벨/tone 은 `@o4o/store-ui-core/buyerCheckoutStatus` 로 이미 공통화(선행 WO). 본 WO 는 그 위에 **presentation 컴포넌트** 1개를 추출.

## 3. 추출 범위 (V1 — 최소 안전 추출)
- **추출**: `BuyerOrderStatusBadge` (inline-style, 디자인 시스템 비종속, 공통 tone hex 사용).
- **V2 보류**: KPI 카드 / 상태 탭 버튼 / empty·loading·error / table column / amount·date text / list item / page shell / data hook.
  - 보류 사유: 3서비스가 **상이한 스타일 시스템**(KPA: `colors`/theme 상수 + inline `S`, KCos: 로컬 `s` inline, GP: Tailwind class+icon)으로 렌더 → 공유 시 한 디자인 시스템을 강제하게 되어 시각 회귀 위험. 라벨/의미·tone 은 이미 헬퍼로 공통화되어 있으므로, **시각 컴포넌트 강제 통일은 디자인 시스템 canonical 결정(IR-...-PAGINATION-RESPONSIVE §3 의 ag-DataTable↔operator-ux-core 단일화 등) 이후 V2** 로 분리. (WO: "무리하면 V2로 분리" 부합.)

## 4. 공통 컴포넌트 목록
| 파일 | export | 내용 |
|------|--------|------|
| `packages/store-ui-core/src/components/buyer-orders/BuyerOrderStatusBadge.tsx` | `BuyerOrderStatusBadge`, `BuyerOrderStatusBadgeProps` | `getBuyerCheckoutStatusDisplay(status)` + `BUYER_CHECKOUT_TONE_HEX[tone]` → inline-style 배지. optional `style` override |
| `packages/store-ui-core/src/index.ts` | 위 export 추가 | |

> 배지는 **자체 inline-style** 이라 KPA/KCos(inline theme) 양쪽에서 동일 렌더. 디자인 시스템 비종속.

## 5. 서비스별 적용 결과
| 서비스 | 적용 | 변경 |
|--------|------|------|
| **KPA** `pages/pharmacy/StoreOrdersPage.tsx` | ✅ | status 컬럼 inline 배지(15줄) → `<BuyerOrderStatusBadge status={row.status} />`. import 의 `getBuyerCheckoutStatusDisplay`/`BUYER_CHECKOUT_TONE_HEX` 제거(미사용) + `BuyerOrderStatusBadge` 추가. `BUYER_CHECKOUT_STATUS_TABS` 유지 |
| **KCos** `pages/store/StoreOrdersPage.tsx` | ✅ | 목록 status 배지 inline(파생 `statusDisplay`/`statusHex`/`statusBadge` 3줄 + span 11줄) → `<BuyerOrderStatusBadge status={order.status} />`. import 의 `BUYER_CHECKOUT_TONE_HEX` 제거(미사용), `BuyerOrderStatusBadge` 추가. detail drawer 의 `getBuyerCheckoutStatusDisplay`·`getBuyerPaymentStatusLabel` 유지 |
| **GP** `pages/store-management/PharmacyOrders.tsx` | **미변경(의도된 예외)** | `deriveState` 가 status+paymentStatus **payment-aware** 파생(예: status=created+payment=paid → 결제완료) + Tailwind class + icon. status-only 공통 배지로 바꾸면 **의미·표시 회귀** → GP 보존(WO Phase 4 "deriveState 유지" 부합) |

## 6. 제외/무변경 항목
- backend / DB / migration / API response shape — 무변경.
- 각 서비스 data fetching(`getBuyerOrders`/`getCheckoutOrders`/`/cosmetics/orders`), filter/pagination, KPI 계산 — 무변경.
- buyer endpoint·방향 유지: KPA `/checkout/orders`, KCos `/cosmetics/orders`. seller(`/checkout/store-orders`, stub `/pharmacy/orders`) 재사용 0.
- Neture / 유통참여형 펀딩 — 무변경.

## 7. seller 기능 미혼입 확인
- 3 화면에 seller 액션(`getStoreOrders`/`updateOrderStatus`/`receiveOrder`/`StoreOrderDetailDrawer`/접수·배송 처리)·문구(판매자 관점/매출/이행) 재혼입 **0**(UI). 공통 배지는 표시 전용(상태 변경 액션 없음).

## 8. 검증 결과
- **TypeScript**: `@o4o/store-ui-core` `tsc --noEmit` → 0 · `@o4o/web-kpa-society` → 0 · `@o4o/web-k-cosmetics` → 0 · `glycopharm-web` → 0(무변경 확인).
- **정적**: `BuyerOrderStatusBadge` index export 확인. KPA/KCos 목록 status 배지 = 공통 컴포넌트 경유. 미사용 import(`BUYER_CHECKOUT_TONE_HEX` 등) 제거 확인. seller 잔재 0.
- **smoke**: 미수행(배포 전) — inline-style 배지 동등 치환이라 시각 동일, tsc 가 prop/타입 가드. 배포 후 3 화면 status 배지 렌더 확인 권장.

## 9. 완료 판정
**PASS** — `BuyerOrderStatusBadge` 공통 추출 + KPA/KCos 적용(중복 inline 배지 제거). GP 는 payment-aware 보존(예외 명시). backend/DB/seller 무변경. typecheck(store-ui-core + 3 web) 통과. 라벨/의미·시각 추가 통일은 디자인 시스템 canonical 결정 후 V2.

## 10. 후속 작업
1. (디자인 시스템 결정 후) `WO-...-BUYER-ORDERS-COMMON-COMPONENT-EXTRACTION-V2` — KPI/탭/empty/loading/error/page-shell 추출(ag-DataTable↔operator-ux-core canonical 단일화 전제).
2. `IR-O4O-GLYCOPHARM-STORE-BILLING-PAGE-ORDER-SOURCE-AUDIT-V1` — GP StoreBillingPage stub 의존.
3. `IR-O4O-STORE-SELLER-ORDER-FULFILLMENT-NEED-V1` — seller 수요/별도 IA.
4. `WO-O4O-TABLE-PRIMITIVE-RESPONSIVE-HARDENING-V1`(선행 IR §8-1) — RowActionMenu Portal 등 공통 primitive.

---

*Date: 2026-06-12 · WO-O4O-STORE-BUYER-ORDERS-COMMON-COMPONENT-EXTRACTION-V1 · BuyerOrderStatusBadge 공통 추출 + KPA/KCos 적용 PASS. GP payment-aware deriveState 보존(예외). 시각 전면 통일은 V2(디자인 시스템 결정 후). backend/DB/seller 무변경.*
