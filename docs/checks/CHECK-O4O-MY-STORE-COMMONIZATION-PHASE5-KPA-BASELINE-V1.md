# CHECK-O4O-MY-STORE-COMMONIZATION-PHASE5-KPA-BASELINE-V1

> 내 매장 공통화 Phase 5 — KPA 기준선 확정(baseline). 상품 관련 화면을 5-카테고리 기준 모델로 정리·확인.
> **이벤트 오퍼 정정 기준**: O4O 주문 가능 상품군에 포함되는 **이벤트형 O4O 주문 가능 상품**(진행 중 주문 가능, 종료 시 주문 차단) — 이미 구현됨.
> **결과: PASS** — KPA tsc 0 / 모델·이벤트 차단 코드 검증 / KPA-local commerce 문구 이미 정합. canonical·공유 항목은 후속 분리.
> 상위: `IR-O4O-STORE-ORDERABLE-VS-CARRIED-PRODUCT-MODEL-V1` · `IR-O4O-KPA-SUPPLIER-PRODUCT-EXPOSURE-ORDER-FLOW-AUDIT-V1` — 2026-06-11

---

## 1. 목적
KPA-society 기준으로 내 매장 상품 영역의 기준 모델(매장 취급 상품 / 기본 O4O 주문 가능 상품 / 신청·승인 현황 / 이벤트형 O4O 주문 가능 상품 / 주문 내역)을 확정하고, GP/KCos 확장 baseline 을 만든다. 본 작업은 KPA-only·최소 수정, 3서비스 영향 항목은 후속 분리.

## 2. 선행 IR/WO 기준
- `IR-O4O-KPA-SUPPLIER-PRODUCT-EXPOSURE-ORDER-FLOW-AUDIT-V1`: 신청 ≠ 주문 가능(SERVICE/PRIVATE).
- `WO-O4O-KPA-SUPPLIER-UNIFIED-ORDER-CHECKOUT-PAYMENT-VISIBILITY-FIX-V1`: 공급자 리스트 paid-only.
- `IR-O4O-STORE-ORDERABLE-VS-CARRIED-PRODUCT-MODEL-V1`: DB 구조 분리(StoreLocalProduct vs OrganizationProductListing), 표면 용어 혼선.
- `WO-O4O-MY-STORE-PRODUCT-TERMINOLOGY-ALIGNMENT-V1`: StoreLocalProductsPage "자체 상품"→"매장 취급 상품" 정렬, 메뉴/공유 페이지는 Phase 5 이관.

## 3. 용어 기준 (확정)
```
매장 취급 상품            → StoreLocalProduct (비-O4O, 주문 불가)
기본 O4O 주문 가능 상품    → OrganizationProductListing (승인·활성, 반복 주문)
신청·승인 현황            → ProductApproval (PENDING/APPROVED/REJECTED)
이벤트형 O4O 주문 가능 상품 → EventOffer / store_cart_items(event_offer) (기간·상태 조건부 주문)
주문 내역                → checkout_orders / checkout_order_items
```
> "내 매장 상품" 단독 포괄 표현은 commerce 문맥에서 사용하지 않는다.

## 4. Phase 1 — KPA 내 매장 화면 현황

| route | component | 현재 제목/라벨 | 데이터 기준 | 주문 가능 | 공유 여부 | 조치 |
|-------|-----------|----------------|-------------|:---:|:---:|------|
| `/store/my-products` | StoreProductsManagerPage | "내 매장 상품"(기본 heading) | OrganizationProductListing | ✅ 반복 | **공유 패키지** | Phase 2(deferral) |
| `/store/commerce/local-products` | StoreLocalProductsPage | "매장 취급 상품" | StoreLocalProduct | ❌ | KPA-local | ✅ 정합(직전 WO) |
| `/store/commerce/products` | PharmacyB2BPage | 도메인 탭(일반 B2B/이벤트) | ProductListing | ✅ | KPA-local | 기능적 정확, 무변경 |
| `/store-hub/event-offers` | KpaEventOfferPage | "이벤트 상품 & 직접 주문" | EventOffer | ✅ active만 | KPA-local | ✅ 정합(Phase 3) |
| `/store-hub/cart`, `/store/orders` | StoreCartPage/Orders | 장바구니/주문 | store_cart_items/checkout_orders | — | 혼합 | 무변경 |

## 5. Phase 2 — StoreProductsManagerPage 영향 범위

- `StoreProductsManagerPage`(`packages/store-products-ui`)는 **3서비스 공유**. props = `headerSlot`/`containerClassName`/`guideSlot` — **`title`/`subtitle` prop 없음**. 기본 heading "내 매장 상품"은 내부 하드코딩(L676).
- KPA App.tsx 는 `<StoreProductsManagerPage />` 를 **prop 없이** 렌더(L928).
- 데이터: `getMyStoreListings()` = OrganizationProductListing(O4O 주문 가능). ProductApproval(PENDING) 미혼입(승인 후 listing 생성).
- **결론 = B**: 공유 기본 heading 변경은 GP/KCos 영향 → **KPA-only 변경 불가**. headerSlot 주입은 헤더 JSX 복제(과한 변경) → 본 baseline 범위 외. **Phase 5 canonical 후속(§8)으로 분리.**

## 6. Phase 3 — 이벤트형 O4O 주문 가능 상품 기준 (정정 기준 검증)

**정정 기준:** 이벤트 오퍼 = O4O 주문 가능 상품군의 **이벤트형**(기간·상태 조건부). 진행 중 주문 가능, 종료/만료 시 화면에 남아도 주문 생성 차단.

**현황(이미 구현됨, `KpaEventOfferPage.tsx`):**

| 상태 | 화면 표시 | 주문 선택 | 담기(cart add) | 주문 생성 |
|------|-----------|:---:|:---:|:---:|
| upcoming(진행 예정) | ✅ 탭 | ❌ | ❌ | ❌ |
| **active(진행 중)** | ✅ 탭 | ✅ | ✅ | ✅ |
| ended(종료) | ✅ 탭(이력) | ❌ | ❌ | ❌ |
| sold_out/canceled | ✅/배지 | ❌ | ❌ | ❌ |

- L36-38: 4-탭(진행 예정/진행 중/종료/전체), 기본 'active'.
- L133-135: "진행 중(active) 항목만 주문 선택 가능. upcoming/sold_out/ended/canceled 제외." (orderableItems = status==='active').
- L140: 선택 주문도 active 만. L12: "종료 이벤트 주문 UX 차단".
- → **정정 기준 부합**: 이벤트형 O4O 주문 가능 상품으로 노출되되 종료 시 주문 차단. (backend reserve 단계 status validation 은 `EventOfferService.reserve()` 경유 — 본 read-only baseline 에서 deep 검증은 미수행, UI 차단 확정.)

## 7. Phase 4 — KPA-local 문구 정렬 (수정 내용)

- **매장 취급 상품**(StoreLocalProductsPage): 직전 WO 에서 "매장 취급 상품" + "O4O 주문과 무관하게…" 정합 완료 → **본 WO 추가 수정 없음**.
- **이벤트형 O4O 주문 가능 상품**(KpaEventOfferPage): 4-탭/active-only/종료 차단 이미 구현, "주문 불가 상품"처럼 표현하지 않음 → **수정 불필요**.
- **기본 O4O 주문 가능 상품**(/store/my-products): heading 은 공유 패키지(§5) → Phase 5 이관.
- **"내 매장 상품" 잔존**(StoreProductDescriptionsPage L241, StoreProductInfoCreatorPage L183, HubB2BCatalogPage 주석): **콘텐츠 작성(상세/POP) 문맥의 매장 product set(매장 취급+O4O 합집합)** 의미로, commerce orderability 오표기가 아님. 한 카테고리로 rename 시 오히려 부정확 → **미수정**(Phase 5 메타/콘텐츠 계층에서 재검토 후보).

→ 본 WO 에서 **KPA-local commerce 문구는 이미 정합**(직전 WO + 이벤트 페이지 구현). 추가 안전 수정 대상 없음 → 코드 무변경, baseline 확정·문서화가 산출물.

## 8. Phase 5 — 3서비스 canonical 후속 분리

| 항목 | 사유 | 후속 WO 후보 |
|------|------|--------------|
| 공유 `StoreProductsManagerPage` 기본 heading "내 매장 상품" | 3서비스 공유 — 동시 정렬 필요 | `WO-O4O-STORE-PRODUCTS-MANAGER-HEADING-PROP-ALIGNMENT-V1`(title prop 추가 후 서비스별 주입) |
| `storeMenuConfig.ts` canonical 라벨("내 약국/매장 제품"·"자체 상품") | 3서비스 canonical 정렬 축(WO-KCOS-KPA-CANONICAL-MENU-ALIGN-V1) | `WO-O4O-MY-STORE-CANONICAL-MENU-LABEL-ALIGNMENT-3SERVICES-V1` |
| 콘텐츠 작성 페이지 "내 매장 상품" product set 표현 | 매장 취급+O4O 합집합 — 메타/콘텐츠 계층 정의 필요 | 위 canonical WO 또는 콘텐츠 계층 WO |
| 판매자 모집 mechanism / 펀딩 정의 | 선행 IR 미확정(D) | `IR-O4O-SELLER-RECRUITMENT-TO-SUPPLY-APPROVAL-FLOW-V1` / `IR-O4O-DISTRIBUTION-FUNDING-VS-MARKET-TRIAL-DEFINITION-V1` |

## 9. 검증 결과
- **web-kpa-society tsc 0** ✅ (직전 WO 이후 코드 무변경, 회귀 없음)
- 정적 검증: 이벤트 오퍼 active-only 주문 차단 확정(§6) ✅. 매장 취급 상품 비-주문 표기 확정(직전 WO) ✅. ProductApproval(PENDING) 주문 가능 미표시(승인 후 listing) ✅.
- browser smoke: NOT TESTED(미배포). 배포 후 `/store/commerce/local-products`(매장 취급)·`/store-hub/event-offers`(종료 탭 주문 차단)·`/store/my-products` 렌더 확인 권장.

## 10. 완료 판정 — PASS (baseline 확정)
- ✅ KPA 내 매장 5-카테고리 기준 모델 문서화.
- ✅ 매장 취급 상품 = StoreLocalProduct(비-O4O), 기본 O4O 주문 가능 = OrganizationProductListing, 신청·승인 = ProductApproval 분리 확정.
- ✅ 이벤트 오퍼 = 이벤트형 O4O 주문 가능 상품(진행 중 주문 가능, 종료 차단) — 정정 기준 + 구현 확인.
- ✅ KPA-only 안전 commerce 문구 이미 정합(추가 수정 불요).
- ✅ 공유 heading·canonical 메뉴·콘텐츠 product set 표현은 3서비스 후속 WO 로 분리.
- ✅ DB/API/주문·결제 로직 무변경.

## 11. 후속 WO 후보
- `WO-O4O-STORE-PRODUCTS-MANAGER-HEADING-PROP-ALIGNMENT-V1`(공유 heading title prop)
- `WO-O4O-MY-STORE-CANONICAL-MENU-LABEL-ALIGNMENT-3SERVICES-V1`(canonical 메뉴)
- `IR-O4O-SELLER-RECRUITMENT-TO-SUPPLY-APPROVAL-FLOW-V1` / `IR-O4O-DISTRIBUTION-FUNDING-VS-MARKET-TRIAL-DEFINITION-V1`
- 이후 GP/KCos 확장: 본 baseline 모델 적용(service-neutral entity 기반 — 적용 가능성 높음).

---

*Date: 2026-06-11 · Status: PASS (KPA 내 매장 baseline 확정. 이벤트형 O4O 주문 가능 상품 정정 기준 + 종료 주문 차단 확인. 코드 무변경 — 모델 이미 정합, canonical·공유 항목 후속 분리).*
