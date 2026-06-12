# CHECK-O4O-MY-STORE-LOCAL-PRODUCTS-COMMON-COMPONENT-EXTRACTION-V2

> **WO**: WO-O4O-MY-STORE-LOCAL-PRODUCTS-COMMON-COMPONENT-EXTRACTION-V2
> **선행**: V1(`LocalProductBadge` 공통) · `IR-...-PHASE6`(판정 B).
> **성격**: GP/KCos 의 99% 동일 StoreLocalProductsPage 전체를 공통 `StoreLocalProductsManager`로 통합. backend/DB/checkout/cart 무변경, KPA 미변경.
> **결과: PASS — StoreLocalProductsManager(@o4o/store-ui-core) 추출 + GP/KCos thin wrapper 전환. store-ui-core+GP+KCos+KPA typecheck 0.**
> **작성일**: 2026-06-12

---

## 1. 목적
GP·KCos 매장 취급 상품 CRUD 페이지(거의 동일 660줄 × 2)를 service-neutral `StoreLocalProductsManager`로 통합. api client + 문맥 라벨만 주입. StoreLocalProduct = non-order 의미 유지.

## 2. 선행 기준
`/store/commerce/local-products` = 매장 취급 상품(StoreLocalProduct). Commerce Object 아님 — checkout/order/cart 미연결. V1 공통 자산(`LocalProductBadge`/`LOCAL_PRODUCT_BADGE_OPTIONS`) 계속 사용.

## 3. Phase 1 — GP/KCos 차이 재확인
V1(배지 공통) 적용 후 GP↔KCos `StoreLocalProductsPage.tsx` **전체 diff = 2건**:
| 항목 | GlycoPharm | K-Cosmetics | 처리 |
|------|-----------|-------------|------|
| api import 경로 | `@/api/localProducts` | `@/services/localProductApi` | wrapper 에서 주입 |
| 카테고리 placeholder | `예: 건강기능식품, 의약품` | `예: 스킨케어, 메이크업` | `labels.categoryPlaceholder` prop |
> api client export 이름·시그니처(fetch/create/update/deleteLocalProduct) + 타입(LocalProduct/Input/BadgeType) **완전 동일**. navigate 경로(`/store/commerce/tablet-displays`·`.../marketing`·`.../pop`) **동일**.

## 4. Phase 2 — StoreLocalProductsManager 추출
- 신규: `packages/store-ui-core/src/components/local-products/StoreLocalProductsManager.tsx`.
- props: `api`(StoreLocalProductsApi — fetch/create/update/deleteLocalProduct) + `labels?.categoryPlaceholder`.
- 공통 타입: `StoreLocalProduct`/`StoreLocalProductInput`(서비스 타입과 구조 동일) · `StoreLocalProductsApi`.
- 보존: 검색(debounce)·활성 필터·목록 table·badge(LocalProductBadge)·활성 dot·액션(수정/마케팅/POP/비활성)·pagination·toast·create/edit modal(ProductFormModal)·Field·Display Domain 경고. `useNavigate`(react-router-dom, store-ui-core dep) 내부 유지(경로 동일).
- export: `store-ui-core/src/index.ts` 에 manager + 타입.

## 5~6. GP / KCos 적용 (thin wrapper)
| 서비스 | 변경 |
|--------|------|
| GP `pages/store-management/StoreLocalProductsPage.tsx` | **660줄 → ~25줄 wrapper**. `<StoreLocalProductsManager api={{fetch/create/update/delete}} labels={{categoryPlaceholder:'예: 건강기능식품, 의약품'}}/>` |
| KCos `pages/store/StoreLocalProductsPage.tsx` | **660줄 → ~25줄 wrapper**. placeholder `'예: 스킨케어, 메이크업'` |
> 타입 호환: 서비스 `fetchLocalProducts`(반환 superset `{items,total,page,limit}`)·create/update(`Partial<Input>`)·delete 가 manager api prop 에 구조적 assignable(tsc 검증).

## 7. Phase 5 — KPA 제외/유지 근거
KPA `StoreLocalProductsPage.tsx`(695줄)는 **BaseTable(@o4o/ui) 기반**으로 list 렌더 구조가 GP/KCos(커스텀 table)와 상이 → 본 V2(Tailwind 커스텀 table manager) 대상 아님. **무변경**(V1 배지 공통만 적용된 상태 유지). KPA 통합은 table primitive/slot 기반 manager 필요 → V3 후보.

## 8. 제외/무변경 항목
- backend / DB / migration / API response shape — 무변경.
- 각 서비스 api client(`localProducts`/`localProductApi`) — 무변경(wrapper 가 그대로 주입).
- StoreLocalProduct non-order 의미 — 유지. 장바구니/발주/주문 버튼 **미혼입**. Display Domain 경고 보존.
- KPA 구조 — 무변경. Neture / 유통참여형 펀딩 — 무변경.

## 9. 검증 결과
- **TypeScript**: `@o4o/store-ui-core` 0 · `web-glycopharm` 0 · `web-k-cosmetics` 0 · `web-kpa-society` 0(회귀 없음).
- **정적**: `StoreLocalProductsManager` index export 확인. GP/KCos 페이지 = thin wrapper(api+labels 주입) 확인. UI/CRUD/모달 동작 보존(manager 로 이동). 주문/장바구니 미혼입.
- **smoke**: 미수행(배포 전) — 동일 코드 이동 + 동일 Tailwind라 시각/동작 동일, tsc 가 api prop 타입 가드. 배포 후 GP/KCos local-products 등록/수정/삭제/배지 렌더 확인 권장.

## 10. 완료 판정
**PASS** — GP/KCos StoreLocalProductsPage(660줄×2) → 공통 `StoreLocalProductsManager` + thin wrapper(~25줄×2). 중복 ~1300줄 → manager 1개로 통합. StoreLocalProduct non-order 유지, 주문/cart 미혼입, backend/DB·KPA 무변경. typecheck(4) 통과.

## 11. 후속 작업
1. `WO-O4O-MY-STORE-LOCAL-PRODUCTS-COMMON-COMPONENT-EXTRACTION-V3` — KPA(BaseTable) 통합 여부 판단(table primitive/slot 필요).
2. `WO-O4O-STORE-HUB-EVENT-OFFER-CROSSSERVICE-PARITY-V1` / `WO-O4O-STORE-HUB-B2B-CATALOG-CROSSSERVICE-PARITY-V1`(Phase 6 C).
3. `IR-O4O-STORE-BILLING-CROSSSERVICE-CANONICAL-MODEL-V1` / `IR-O4O-STORE-SELLER-ORDER-FULFILLMENT-NEED-V1`.

---

*Date: 2026-06-12 · WO-O4O-MY-STORE-LOCAL-PRODUCTS-COMMON-COMPONENT-EXTRACTION-V2 · StoreLocalProductsManager 통합 + GP/KCos thin wrapper PASS. 660줄×2 → manager 1개. KPA(BaseTable) 미변경(V3). non-order 유지, backend/cart 무변경.*
