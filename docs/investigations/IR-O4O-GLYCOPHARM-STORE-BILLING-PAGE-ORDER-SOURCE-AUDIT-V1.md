# IR-O4O-GLYCOPHARM-STORE-BILLING-PAGE-ORDER-SOURCE-AUDIT-V1

> **유형**: Investigation (read-only) — GP `StoreBillingPage`(정산/인보이스)의 주문 데이터 소스 조사.
> **성격**: 코드/DB/UI **무변경**. 조사 문서만 (file:line 근거).
> **결론(요약)**: StoreBillingPage 는 **buyer 주문내역이 아니라 seller 지향 "매출 정산(billing)" foundation placeholder**. deprecated stub(`/glycopharm/pharmacy/orders`)으로 "이번 달 매출"을 계산해 **항상 0원** + mock 정산 내역. **메뉴 노출됨**(경영 > 정산/인보이스). → buyer endpoint repoint **부적합**(매출≠구매). billing canonical 모델 확정 + 임시 placeholder/숨김 권고.
> **선행**: `IR-O4O-STORE-ORDER-DIRECTION-SEMANTICS-CROSSSERVICE-V1`(buyer/seller 분리) · `WO-...-GLYCOPHARM-ORDERS-PAGE-BUYER-LEDGER-REPOINT-V1`.
> **작성일**: 2026-06-12

---

## 1. 목적
GP buyer 주문화면 buyer 정렬 후 남은 **StoreBillingPage 의 stub 의존**을 확인하고, 화면 의미(buyer/seller/billing/legacy)와 후속 처리(repoint/숨김/모델 IR)를 판정한다.

## 2. 선행 기준
`/store/commerce/orders` = buyer 구매/발주(checkout_orders). `/glycopharm/pharmacy/orders` = deprecated stub(빈 배열). seller "받은 주문/판매 이행/정산"은 별도 축(방향 IR).

## 3. 조사 대상
`pages/store-management/StoreBillingPage.tsx` · `api/pharmacy.ts` · `App.tsx` · `store-ui-core/config/storeMenuConfig.ts` · backend `pharmacy.controller.ts`.

---

## 4. Phase 1 — route 노출 여부

| route | component | menu link | guard | 사용자 노출 | 판정 |
|-------|-----------|-----------|-------|:---:|:---:|
| `/store/billing` | `StoreBillingPage`(lazy, App.tsx:960, WO-STORE-BILLING-FOUNDATION-V1) | **있음** `storeMenuConfig.ts:216` 경영 그룹 > **"정산/인보이스"**(subPath `/billing`) | store(약국) 경로 | **노출됨** | — |

> `menuCapabilityMap.ts:6` — billing 은 "매핑되지 않은 메뉴 → 항상 표시". 즉 GP store 사용자에게 **경영 > 정산/인보이스로 접근 가능**.

## 5. Phase 2 — API 호출 경로

| 파일 | 호출 함수 | endpoint | 원장 | 문제 |
|------|-----------|----------|------|------|
| `StoreBillingPage.tsx:39` | `pharmacyApi.getOrders({status:'delivered', pageSize:100})` | **`/glycopharm/pharmacy/orders`** | **STUB(빈 배열)** | "이번 달 매출"이 stub 으로 계산되어 **항상 0** |

> **stub 유일 소비처 확정**: `pharmacyApi.getOrders` 의 현재 사용처는 **StoreBillingPage 단독**(PharmacyOrders 는 buyer repoint 로 `getCheckoutOrders` 전환됨). 즉 deprecated stub 의존은 StoreBillingPage 에만 잔존.

## 6. Phase 3 — 화면 의미 분류

| 항목 | 확인 결과 |
|------|-----------|
| 화면 제목 | "정산/인보이스" / "매출 정산 현황과 내역을 확인합니다"(`:77-78`) |
| KPI | 이번 달 **매출** / 예상 수수료(COMMISSION_RATE) / 정산 예정(`:6, :89-110`) |
| 데이터 계산 | `getOrders(delivered)` → `monthlyRevenue = Σ totalAmount`(이번 달) → 수수료/정산 차감(`:38-46`) |
| 정산 내역 | **mock**(`:26-29` `'2026-02'/'2026-01' 정산 예정`) |
| buyer/seller 방향 | **seller 지향**(매출=판매 수익 + 수수료 차감 정산) — buyer 구매내역 아님 |
| 판정 | **billing/settlement foundation placeholder**(stub 매출 always-0 + mock 정산). legacy/미완성 |

> 핵심: StoreBillingPage 는 **"매출 정산"**(공급/판매 수익에서 수수료 차감) 화면 = **seller/정산 축**. buyer 구매/발주 내역과 **다른 개념**. 현재 실데이터 미연동(stub) + mock.

## 7. Phase 4 — 위험도 판단

| 항목 | 결과 |
|------|------|
| stub 으로 항상 0원/0건? | **예**(getOrders stub empty → 매출/수수료/정산 0) |
| 실주문 있어도 누락? | 예(stub 이라 실 checkout_orders 미반영) |
| 잘못된 결제/정산 정보? | 매출 0 + mock 정산 rows 노출(단 disclaimer `:143-144` "실제 정산은 익월 10일 이후" 존재) |
| 메뉴 접근 가능? | **예**(경영 > 정산/인보이스) |
| **판정** | **B/C** — 데이터 손상/긴급 아님(disclaimer 有). 단 **메뉴 노출 + 항상 0 + mock** = 미완성 기능이 사용자에게 보임 → 정정(숨김) 또는 모델 확정 후순위 대상 |

## 8. Phase 5 — 후속 작업 제안

### repoint 부적합 (중요)
StoreBillingPage 를 `/glycopharm/checkout/orders`(buyer) 로 repoint하면 **약국의 "구매액"을 "매출"로 오표시** → 의미 회귀. **buyer endpoint repoint 금지.** billing 은 seller/정산 축이므로 별도 모델 필요.

### 후속 후보
1. `IR-O4O-STORE-BILLING-CROSSSERVICE-CANONICAL-MODEL-V1` — "매출 정산(billing)"의 canonical 데이터 모델 정의(매출=어느 원장? seller orders vs supplier settlement vs commission ledger). 3서비스 billing 의미 정렬. **buyer 주문축과 분리.**
2. `WO-O4O-GLYCOPHARM-STORE-BILLING-PAGE-HIDE-LEGACY-V1` — 모델 확정 전, 매출 0+mock 노출을 **"준비 중" placeholder 또는 메뉴 미노출**로 처리(저위험, 사용자 혼란 제거). mock 정산 내역 제거.
3. `WO-O4O-GLYCOPHARM-LEGACY-PHARMACY-ORDERS-STUB-DEPRECATION-V1` — StoreBillingPage 정리 후 `pharmacyApi.getOrders`(유일 소비처) + backend stub `/glycopharm/pharmacy/orders` 제거(이제 stub 의존 = StoreBillingPage 단독이라 정리 경로 명확).

> **권장 순서**: (즉시 저위험) 2 placeholder/숨김 → (정의) 1 billing 모델 IR → (정리) 3 stub deprecation. 또는 1을 먼저 해 billing 방향 확정 후 2/3.

## 9. 결론
- StoreBillingPage = **seller 지향 "매출 정산(billing)" foundation placeholder** — buyer 주문내역 아님. `getOrders` **deprecated stub** 의존으로 이번 달 매출 **항상 0** + mock 정산 내역. **경영 > 정산/인보이스 메뉴로 노출**.
- `pharmacyApi.getOrders` stub **유일 소비처 = StoreBillingPage**(buyer repoint 후).
- **buyer endpoint repoint 부적합**(매출≠구매). billing 은 seller/정산 축 → 별도 canonical 모델 필요.
- **위험 B/C**: 긴급 아님(disclaimer)이나 미완성 기능 노출 → **임시 placeholder/숨김(2) + billing 모델 IR(1) + stub deprecation(3)** 으로 분리. 코드 무변경(본 IR).

---

*Date: 2026-06-12 · read-only IR · 코드 무변경 · StoreBillingPage = seller billing placeholder(stub 매출 always-0 + mock, 메뉴 노출). buyer repoint 부적합 → billing canonical 모델 IR + 임시 숨김 + stub deprecation 분리.*
