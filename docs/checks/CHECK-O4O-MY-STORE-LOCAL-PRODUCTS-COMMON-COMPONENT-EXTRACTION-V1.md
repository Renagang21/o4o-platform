# CHECK-O4O-MY-STORE-LOCAL-PRODUCTS-COMMON-COMPONENT-EXTRACTION-V1

> **WO**: WO-O4O-MY-STORE-LOCAL-PRODUCTS-COMMON-COMPONENT-EXTRACTION-V1
> **선행**: `IR-O4O-MY-STORE-COMMONIZATION-PHASE6-...`(local-products 판정 B).
> **성격**: 매장 취급 상품(StoreLocalProduct, non-order) 화면의 **반복 presentation 추출(V1)**. backend/DB/checkout/cart 무변경.
> **결과: PASS — 공통 `LocalProductBadge`+`LOCAL_PRODUCT_BADGE_OPTIONS`(@o4o/store-ui-core) 추출 + KPA/GP/KCos 적용. store-ui-core + 3 web typecheck 0.**
> **작성일**: 2026-06-12

---

## 1. 목적
KPA/GP/KCos 의 동일한 매장 취급 상품 배지(BADGE_OPTIONS + 목록 배지 render) 중복을 공통 컴포넌트로 추출. StoreLocalProduct = O4O 주문 무관(non-order) 의미 유지.

## 2. 선행 기준
`/store/commerce/local-products` = 매장 취급 상품(StoreLocalProduct). O4O 주문 가능 상품(OPL)·ProductApproval·EventOffer·checkout_orders 와 무관. 장바구니/발주 버튼 없음.

## 3. Phase 1 — local-products 중복 구조

| 서비스 | page(줄) | API client | 타입 | UI |
|--------|----------|-----------|------|-----|
| KPA | `pages/pharmacy/StoreLocalProductsPage.tsx`(695) | `api/localProducts` | `LocalProduct/Input/BadgeType` | BaseTable(@o4o/ui) + Tailwind |
| GP | `pages/store-management/StoreLocalProductsPage.tsx`(660) | `api/localProducts` | 동일 | 커스텀 table + Tailwind |
| KCos | `pages/store/StoreLocalProductsPage.tsx`(660) | `services/localProductApi` | 동일 | 커스텀 table + Tailwind |

> **핵심 발견**: **GP ↔ KCos 페이지는 99% 동일**(diff 6줄 — 실질 차이 = import 경로 + 카테고리 placeholder 예시 문구 1개). `BADGE_OPTIONS` const 는 **3서비스 byte-identical**(none/new/recommend/event, 동일 Tailwind class). 3서비스 모두 **Tailwind 기반**(주문 배지의 inline-theme 분기 없음) → 배지 공유 안전.

## 4. Phase 2 — V1 추출 범위

| 후보 | 추출 | 이유 |
|------|:---:|------|
| `LocalProductBadge` + `LOCAL_PRODUCT_BADGE_OPTIONS` | ✅ | 3서비스 동일 const·동일 render·동일 Tailwind → 안전 |
| empty/loading/error · KPI · table column · form/modal | ✖ V2 | KPA 는 BaseTable(@o4o/ui) / GP·KCos 는 커스텀 table 로 list 구조 상이. 폼/모달은 660줄 풀 CRUD — 전체 page shell 추출은 V2(WO "전체 page shell V1 금지") |
| **전체 페이지(GP+KCos)** | ✖ V2(권고) | GP≡KCos 99% 동일 → `StoreLocalProductsManager`(apiClient/labels prop) 로 두 서비스 통합이 최대 dedup. KPA(BaseTable, 35줄 차이)는 별도. **디자인 시스템 충돌 없음(둘 다 Tailwind)이라 V2 안전 — 별도 WO 권장** |

## 5. Phase 3 — 공통 컴포넌트 추가
| 파일 | export |
|------|--------|
| `packages/store-ui-core/src/components/local-products/LocalProductBadge.tsx` | `LocalProductBadge`, `LOCAL_PRODUCT_BADGE_OPTIONS`, type `LocalProductBadgeType/Option/Props` |
| `packages/store-ui-core/src/index.ts` | 위 export |

- `LocalProductBadge({badgeType})`: 'none'/미정의/빈값 → null. 아니면 `inline-block px-2 py-0.5 ... rounded-full {color}` Tailwind 배지. optional `className`.
- `LOCAL_PRODUCT_BADGE_OPTIONS`: 폼 옵션(.map) + 배지 색/라벨 공통 소스.

## 6~8. 서비스별 적용
| 서비스 | 변경 |
|--------|------|
| KPA `StoreLocalProductsPage.tsx` | 로컬 `BADGE_OPTIONS` 제거 → `LOCAL_PRODUCT_BADGE_OPTIONS as BADGE_OPTIONS`(폼 옵션 호환) import. BaseTable status 컬럼 badge render(10줄) → `<LocalProductBadge>` |
| GP `StoreLocalProductsPage.tsx` | 동상. 목록 td badge render(9줄) → `<LocalProductBadge>` |
| KCos `StoreLocalProductsPage.tsx` | 동상. 목록 td badge render → `<LocalProductBadge>` |

> 폼의 BADGE_OPTIONS.map(옵션 선택)은 aliased import 로 **무변경 동작**. 각 서비스 `BadgeType`(api client) 타입은 폼 state 에서 계속 사용 → 유지(공통 옵션의 `LocalProductBadgeType` ≡ 동일 union 이라 assignable).

## 9. 제외/무변경 항목
- heading "매장 취급 상품" / 약국·매장 문맥 설명 — 무변경.
- StoreLocalProduct 의미(non-order) — 유지. 장바구니/발주/주문 버튼 **미혼입**.
- backend / DB / migration / ProductMaster / OPL / ProductApproval / checkout / cart / event offer / billing / seller — 무변경.
- API client 동작·fetch·CRUD flow — 무변경(배지 표시만 컴포넌트화).
- Neture / 유통참여형 펀딩 — 무변경.

## 10. 검증 결과
- **TypeScript**: `@o4o/store-ui-core` 0 · `web-kpa-society` 0 · `web-glycopharm` 0 · `web-k-cosmetics` 0.
- **정적**: `LocalProductBadge`/`LOCAL_PRODUCT_BADGE_OPTIONS` index export 확인. 3서비스 로컬 `BADGE_OPTIONS` const 정의 제거(공통 import 로 대체) 확인. 목록 배지 = 공통 컴포넌트 경유. 주문/장바구니 문구·버튼 미혼입. O4O 주문 가능 상품 회귀 0.
- **smoke**: 미수행(배포 전) — 동일 Tailwind 배지 치환이라 시각 동일, tsc 가 prop 가드.

## 11. 완료 판정
**PASS** — `LocalProductBadge` 공통 추출 + KPA/GP/KCos 적용(중복 BADGE_OPTIONS·배지 render 통합). StoreLocalProduct non-order 의미 유지, 주문/cart 미혼입. backend/DB 무변경. typecheck(store-ui-core + 3 web) 통과.

## 12. 후속 작업
1. **`WO-O4O-MY-STORE-LOCAL-PRODUCTS-COMMON-COMPONENT-EXTRACTION-V2`** — GP≡KCos 99% 동일 페이지를 `StoreLocalProductsManager`(apiClient/문맥 라벨 prop)로 통합(둘 다 Tailwind라 안전). KPA(BaseTable)는 별도/확장 슬롯. **최대 dedup 지점.**
2. `IR-O4O-STORE-BILLING-CROSSSERVICE-CANONICAL-MODEL-V1` — billing/정산 모델.
3. `IR-O4O-STORE-SELLER-ORDER-FULFILLMENT-NEED-V1` — seller 수요.

---

*Date: 2026-06-12 · WO-O4O-MY-STORE-LOCAL-PRODUCTS-COMMON-COMPONENT-EXTRACTION-V1 · LocalProductBadge 공통 추출 + 3서비스 적용 PASS. GP≡KCos 99% 동일 발견 → V2 전체페이지 통합 권고. StoreLocalProduct non-order 유지, backend/cart 무변경.*
