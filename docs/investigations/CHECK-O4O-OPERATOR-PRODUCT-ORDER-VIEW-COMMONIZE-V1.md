# CHECK-O4O-OPERATOR-PRODUCT-ORDER-VIEW-COMMONIZE-V1

> **작업명:** WO-O4O-OPERATOR-PRODUCT-ORDER-VIEW-COMMONIZE-V1
> **유형:** 공통화(operator-core-ui 모듈 신설 + GP/KCos thin wrapper 축소). view-only 불변.
> **판정: PASS** — 공통 컴포넌트 추출 완료, GP/KCos typecheck + build 통과, KPA/Neture 미변경.
> 선행: `IR-O4O-KPA-OPERATOR-PRODUCT-ORDER-MENU-PARITY-DECISION-V1`, `WO-O4O-OPERATOR-PRODUCT-ORDER-VIEW-LABEL-CLARIFY-GP-KCOS-V1`
> 작성일: 2026-06-16

---

## 0. 정책 고정

KPA / GlycoPharm / K-Cosmetics operator 서비스 화면은 공통화한다. 단 operator 상품·주문 화면은 **처리 화면이 아니라 서비스 전역 view-only 모니터링("상품 현황 / 주문 현황")** 으로 고정한다. 주문 처리·결제·배송·취소·환불·정산 개입 기능은 추가하지 않는다.

---

## 1. 변경 파일 목록 (이번 WO에서 수정/추가한 파일만)

### 추가 (공통 모듈)
- `packages/operator-core-ui/src/modules/product-order-view/types.ts`
- `packages/operator-core-ui/src/modules/product-order-view/OperatorProductStatusPage.tsx`
- `packages/operator-core-ui/src/modules/product-order-view/OperatorOrderStatusPage.tsx`
- `packages/operator-core-ui/src/modules/product-order-view/index.ts`

### 수정 (export 추가)
- `packages/operator-core-ui/src/index.ts` — 신규 모듈 re-export(additive)

### 수정 (thin wrapper 축소)
- `services/web-glycopharm/src/pages/operator/ProductsPage.tsx` (336L → ~58L)
- `services/web-glycopharm/src/pages/operator/OrdersPage.tsx` (370L → ~52L)
- `services/web-k-cosmetics/src/pages/operator/ProductsPage.tsx` (334L → ~57L)
- `services/web-k-cosmetics/src/pages/operator/OrdersPage.tsx` (382L → ~52L)

### 추가 (문서)
- `docs/investigations/CHECK-O4O-OPERATOR-PRODUCT-ORDER-VIEW-COMMONIZE-V1.md` (본 문서)

> **동시 세션 WIP 미접촉:** Neture supplier-recruitment 작업 파일(`partner-recruitment.controller.ts`, `neture.service.ts`, `partner-contract.service.ts`, `supplier.ts`, `SupplierRecruitmentDetailPage.tsx`)과 GP `store-management/PharmacyB2BProducts.tsx`(다른 세션 수정 중)는 **본 커밋에 포함하지 않음**. path-specific staging 사용, `git add .` 미사용.

---

## 2. 공통 컴포넌트 위치

`packages/operator-core-ui/src/modules/product-order-view/`
- `OperatorProductStatusPage` — 서비스 전역 상품 카탈로그(product_masters) view-only 콘솔.
- `OperatorOrderStatusPage` — 서비스 전역 주문(checkout_orders) view-only 콘솔.
- `@o4o/operator-core-ui` 루트에서 export. 패키지는 `main/types = ./src/index.ts`(소스 직접 소비) → 별도 dist build 불요.

### 주입 인터페이스 (서비스 비종속)
- `fetchProducts(params) => { products, stats, pagination }` / `fetchOrders(params) => { orders, stats, total }` — 각 wrapper 가 자체 api client + serviceKey 로 구현.
- `config`: title/description/empty/error/searchPlaceholder/notice + `accent`(서비스 고유 색 literal) + tableId/detailPathBase.
- 네비게이션은 `useNavigate`(패키지 deps) 내장.

> **accent 를 prop 으로 주입하는 이유:** 서비스 tailwind `content` 글롭에 operator-core-ui 가 **없음**(operator-core 만 포함). 따라서 서비스 primary/pink 계열 accent 클래스는 반드시 wrapper(서비스 src)에 literal 로 두어야 purge 되지 않는다. (기존 product-applications 모듈과 동일 패턴.) semantic 색(green/blue/amber/indigo/slate/red)은 서비스 전반에서 쓰여 survive.

---

## 3. GP wrapper 구조

- `ProductsPage.tsx`: `OperatorProductStatusPage` 에 `fetchProducts`(`api.get('/operator/products?...serviceKey=glycopharm')`) + accent(primary/blue) + tableId `glycopharm-operator-products` 주입. 기존 외곽 `p-6` 래퍼 유지(PageHeader 제거, 공통 헤더 사용).
- `OrdersPage.tsx`: `OperatorOrderStatusPage` 에 `fetchOrders`(`glycopharmApi.getOperatorOrders`) + accent(primary/blue) + description "약국 B2B 주문 현황 (조회 전용)" 주입.

## 4. KCos wrapper 구조

- `ProductsPage.tsx`: `fetchProducts`(`api.get(... serviceKey=k-cosmetics)`) + accent(pink) + tableId `cosmetics-products`.
- `OrdersPage.tsx`: `fetchOrders`(`cosOperatorOrdersApi.list`, `res.data.success/.data`) + accent(pink) + description "B2B 주문 현황 (조회 전용)".

---

## 5. 보존된 기능

- 목록 조회 / 검색 / (주문) 상태·결제 필터 / 새로고침 / pagination / loading·error·empty 상태
- 상품 컬럼: 이미지·상품명(+규제명)·바코드·브랜드·카테고리·공급자수·생성일
- 주문 컬럼: 주문번호·매장/채널·품목수·금액·결제·상태·주문일시
- 상품 행 클릭 → `/operator/products/:id` 이동 (기존 동일)
- API 호출 방식: 각 서비스 기존 endpoint/serviceKey/auth 그대로(공통 컴포넌트는 fetch 결과만 소비)

## 6. 제거/추가하지 않은 기능 (view-only 불변)

- 생성/수정/삭제 버튼 **없음**
- 주문 상태변경/배송/취소/환불/송장/정산/bulk action/selectable **없음**
- 공통 컴포넌트에 어떠한 mutation 액션도 추가하지 않음

## 7. view-only 정책 확인

- `OperatorProductStatusPage`: DataTable `onRowClick`(상세 이동)만, row action/selectable/ActionBar 없음.
- `OperatorOrderStatusPage`: DataTable 에 selectable/onRowClick/rowActions 미전달 — 순수 조회. "주문 조회 전용" 안내 배너 유지.

## 8. KPA 미변경 확인

- KPA 파일(`operatorMenuGroups.ts`/`App.tsx`/operator pages) **미접촉**. KPA route/menu/page 추가 없음.
- KPA typecheck: error 0 (operator-core-ui index.ts 변경은 additive export → 기존 소비처 무영향).
- KPA 도입은 후속 `WO-O4O-KPA-OPERATOR-PRODUCT-ORDER-VIEW-INTRODUCE-V1` 로 분리(공통 컴포넌트는 kpa-society 연결 가능하도록 serviceKey 비종속 설계).

## 9. Neture 미변경 확인

- Neture 파일 미접촉. Neture operator 화면은 별도 도메인 IA(공급/B2B) — 본 공통화 대상 아님.

---

## 10. TypeScript 결과

| 대상 | 결과 |
|---|---|
| `packages/operator-core-ui` | product-order-view error **0** (유일 오류는 무관한 `packages/error-handling` 기존 ImportMeta.env) |
| `services/web-glycopharm` | error **0** |
| `services/web-k-cosmetics` | error **0** |
| `services/web-kpa-society` | error **0** (무영향 확인) |

## 11. build 결과

| 대상 | 결과 |
|---|---|
| `web-glycopharm` (`vite build`) | ✅ built in 17.55s |
| `web-k-cosmetics` (`vite build`) | ✅ built in 13.39s |

> operator-core-ui 는 소스 소비 패키지로 별도 build 단계 없음(서비스 build 에 포함).

## 12. smoke 결과 / 보류 사유

- 브라우저 smoke(GP/KCos `/operator/products`·`/operator/orders` 렌더·검색·새로고침·처리 버튼 부재·console error 0)는 **프로덕션 배포 후** 확인 권장(로컬은 프로덕션 DB/Cloud Run 의존). typecheck + production build 통과로 정적 정합성 확보. 요청 시 배포 후 Playwright 로 검증.
- 시각적 참고: 공통화로 GP/KCos 화면이 단일 canonical 프레젠테이션으로 수렴(헤더/페이지네이션/상태 뱃지 통일), 서비스 accent(primary vs pink)만 유지. 기능·컬럼·필터·API 는 기존과 동일.

## 13. 후속 WO 가능 여부

- ✅ **WO-O4O-KPA-OPERATOR-PRODUCT-ORDER-VIEW-INTRODUCE-V1** 착수 가능: KPA `/operator/products`·`/operator/orders` route 추가 + 메뉴 "상품 현황 / 주문 현황" 추가 + 공통 컴포넌트에 kpa-society config(serviceKey, accent) 연결. backend operator products/orders API 의 KPA 적용 여부는 해당 WO 에서 확인.

---

## Shared Module Protocol 확인

- 변경 공통 모듈: `@o4o/operator-core-ui`(신규 모듈 추가 + index export). 소비처: GlycoPharm/K-Cosmetics(본 WO 직접 전환), KPA-Society(무영향, 미연결), Neture(미사용).
- route/role/capability/feature flag/visibility 필터 변경 없음 — 라벨/페이지 컴포넌트 내부 구조만.
- 회귀 위험: 낮음 — additive export + GP/KCos typecheck·build 통과, KPA typecheck 통과.

## Out of Scope / 무변경 확인

- API/route/DB/migration/capability/메뉴 라벨/group key/DomainIASidebar/OperatorAreaShell **변경 0**.
- 주문 처리·결제·배송·취소·환불·정산 기능 **추가 0**.
- KPA/Neture **미변경**. 동시 세션 WIP **미접촉**(path-specific staging).

---

*Date: 2026-06-16 · operator 상품/주문 현황 view-only 공통화 · operator-core-ui product-order-view 모듈 신설 · GP/KCos thin wrapper 축소(≈1422L → ≈220L) · typecheck(pkg/GP/KCos/KPA) + build(GP/KCos) PASS · view-only 불변 · KPA/Neture 미변경 · 후속 KPA INTRODUCE 가능.*
