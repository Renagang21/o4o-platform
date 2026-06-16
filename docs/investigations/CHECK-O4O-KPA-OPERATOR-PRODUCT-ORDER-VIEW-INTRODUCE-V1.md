# CHECK-O4O-KPA-OPERATOR-PRODUCT-ORDER-VIEW-INTRODUCE-V1

> **작업명:** WO-O4O-KPA-OPERATOR-PRODUCT-ORDER-VIEW-INTRODUCE-V1
> **유형:** KPA operator view-only 화면 도입 (route/menu/wrapper wiring). backend 무변경.
> **판정: PARTIAL PASS** — **상품 현황 도입 완료**. **주문 현황은 KPA backend(`/kpa/operator/orders`) 부재로 보류**(중단 기준 #2 해당 → 별도 backend WO).
> 선행: `WO-O4O-OPERATOR-PRODUCT-ORDER-VIEW-COMMONIZE-V1`(공통 모듈), `IR-O4O-KPA-OPERATOR-PRODUCT-ORDER-MENU-PARITY-DECISION-V1`
> 작성일: 2026-06-16

---

## 1. 사전 API 적용 가능성 확인 결과

| 화면 | KPA backend | 판정 |
|---|---|---|
| **상품 현황** | `/api/v1/operator/products`(플랫폼 extension, `routes/operator/products.routes.ts`) — VALID scope 에 **`kpa-society:operator` 포함**(line 24). serviceKey 쿼리 지원(GP/KCos 동일 사용). | ✅ **적용 가능** (frontend wiring only) |
| **주문 현황** | GP=`/glycopharm/operator/orders`, KCos=`/cosmetics/operator/orders` 존재. **KPA `/kpa/operator/orders` 라우트 부재**(kpa routes grep 0). 공통 헬퍼 `routes/common/order/operatorOrderQuery.ts` 는 있으나 KPA 미마운트. | ⛔ **부재 → 보류** (backend 확장 필요, 중단 기준 #2/#5) |

→ 데드링크 방지를 위해 **상품 현황만 도입**, 주문 현황 메뉴/route 추가 안 함.

---

## 2. 변경 파일 목록 (이번 WO에서 수정/추가한 파일만)

### 공통 컴포넌트 (additive, backward-compatible)
- `packages/operator-core-ui/src/modules/product-order-view/types.ts` — `detailPathBase?: string | null` (null = 행 클릭 비활성)
- `packages/operator-core-ui/src/modules/product-order-view/OperatorProductStatusPage.tsx` — `onRowClick={detailPathBase ? ... : undefined}`

### KPA 도입
- `services/web-kpa-society/src/pages/operator/ProductsPage.tsx` (신규 thin wrapper)
- `services/web-kpa-society/src/pages/operator/index.ts` — barrel export `OperatorProductsPage`
- `services/web-kpa-society/src/routes/OperatorRoutes.tsx` — import + `<Route path="products">`
- `services/web-kpa-society/src/config/operatorMenuGroups.ts` — `products` 그룹 `상품 현황` 추가(UNIFIED_MENU)

### 문서
- `docs/investigations/CHECK-O4O-KPA-OPERATOR-PRODUCT-ORDER-VIEW-INTRODUCE-V1.md`

> **동시 세션 WIP 미접촉:** `storeMenuConfig.ts`, GP `App.tsx`, GP `PharmacyB2BProducts.tsx`, KCos `StoreCommerceProductsPage.tsx`, KPA `PharmacyB2BPage.tsx`(다른 세션 store 작업) **본 커밋 미포함**. path-specific staging, `git add .` 미사용.

---

## 3. KPA wrapper 구조

- `OperatorProductStatusPage`(@o4o/operator-core-ui)에 주입:
  - `fetchProducts`: `coreApiClient.get('/operator/products', { serviceKey:'kpa-society', page, limit, sortBy, sortOrder, search })`. `coreApiClient`(base `/api/v1`, **kpa-prefix 없음** — 플랫폼 공통 도메인용, `api/client.ts:158`)는 JSON body 직접 반환 → `{products, stats, pagination}` 매핑.
  - `config`: title `상품 현황`, description `KPA-Society 서비스 전체 상품 현황을 조회합니다.`, tableId `kpa-operator-products`, **`detailPathBase: null`**(KPA 상품 상세 화면 부재 → 행 클릭 비활성, 데드링크 방지), accent primary/blue(KPA 테마 literal).

## 4. KPA route 추가 내용

- `services/web-kpa-society/src/routes/OperatorRoutes.tsx`: `<Route path="products" element={<OperatorProductsPage />} />` → `/operator/products` (operator 블록 내, event-offers 다음).
- store측 `/store/commerce/products`·`/store/commerce/orders` 및 store 블록의 `products`/`orders` redirect(App.tsx) **미변경**.

## 5. KPA menu 추가 내용

- `operatorMenuGroups.ts` UNIFIED_MENU 에 `products: [{ label: '상품 현황', path: '/operator/products' }]` 추가(approvals 다음). GP/KCos 와 동일 group key `products` → 공유 domain IA(operator-ux-core) 매핑 재사용으로 노출.
- capability: 기존 `STORE_MANAGEMENT`(ENABLED) 사용 — **신규 capability 없음**.
- **주문 현황 메뉴 미추가**(backend 부재 → 데드링크 금지 원칙).

## 6. serviceKey / API endpoint

- serviceKey: **`kpa-society`** (products.routes VALID scope `kpa-society:operator` 와 정합).
- endpoint: `GET /api/v1/operator/products?serviceKey=kpa-society&...` (플랫폼 extension, GP/KCos 동일 경로·shape).

## 7. view-only 정책 유지 확인

- 생성/수정/삭제·주문 상태변경/배송/취소/환불/송장/정산/bulk/selectable **0**(공통 컴포넌트 불변 — 액션 미추가).
- KPA 는 추가로 `detailPathBase: null` 로 **행 클릭 네비게이션도 비활성**(상세 화면 없음 → 순수 목록 조회).

## 8. GP/KCos/Neture 미변경 확인

- GP/KCos wrapper·route·menu **미접촉**. 공통 컴포넌트 변경은 **additive**(`detailPathBase` 미전달 시 기본 `/operator/products` 유지) → GP/KCos 행 클릭 동작 **불변**(build 로 검증).
- Neture 미접촉.

## 9. TypeScript 결과

| 대상 | 결과 |
|---|---|
| `packages/operator-core-ui` | error **0** (무관한 error-handling 제외) |
| `services/web-kpa-society` | error **0** |
| `services/web-glycopharm` | error **0** |
| `services/web-k-cosmetics` | error **0** |

## 10. build 결과

| 대상 | 결과 |
|---|---|
| `web-kpa-society` (`vite build`) | ✅ built in 14.31s |
| `web-glycopharm` (`vite build`) | ✅ built in 12.96s (공통 컴포넌트 변경 무영향 확인) |
| `web-k-cosmetics` (`vite build`) | ✅ built in 11.98s (무영향 확인) |

## 11. smoke 결과 / 보류 사유

- 브라우저 smoke(KPA `/operator/products` 렌더·"상품 현황" 메뉴·목록/empty·검색·새로고침·행 클릭 비활성·처리 버튼 부재·console error 0)는 **프로덕션 배포 후** 권장(로컬은 프로덕션 DB/Cloud Run 의존). typecheck + production build 통과로 정적 정합성 확보. 요청 시 배포 후 Playwright 검증.

## 12. 중단 기준 해당 여부

- ✅ **#2 해당(주문 현황):** KPA operator orders API 부재 → 주문 현황 **미도입**, 별도 backend WO 로 분리.
- 그 외(#1/#3/#4/#5/#6): 상품 현황은 backend-ready + auth scope OK + 순수 frontend wiring → 해당 없음.
- 공통 컴포넌트 `detailPathBase` nullable 추가는 **additive backward-compatible**(GP/KCos 불변, build 검증) — 데드링크 방지 위한 최소 변경. 명시적 deviation 으로 기록.

## 13. 후속 필요 여부

- **WO-O4O-KPA-OPERATOR-ORDER-VIEW-BACKEND-ENABLE-V1**(신규): KPA 에 `/kpa/operator/orders` view-only 라우트 마운트(공통 `operatorOrderQuery.ts` 재사용) → 이후 KPA OrdersPage wrapper + `주문 현황` 메뉴 추가로 parity 완성.
- (선택) KPA operator 상품 상세 화면 도입 시 `detailPathBase` 를 실제 경로로 전환.

---

## 보고 요약

| 항목 | 결과 |
|---|---|
| 사전 git 상태 | 동시 세션 store WIP 존재(미접촉), 대상 파일 무충돌 |
| 상품 현황 | ✅ 도입(route+menu+wrapper, backend-ready) |
| 주문 현황 | ⛔ 보류(backend `/kpa/operator/orders` 부재) |
| view-only | 유지(액션 0, 행 클릭도 비활성) |
| GP/KCos/Neture | 미변경(공통 컴포넌트 additive, build 검증) |
| TypeScript / build | 전부 PASS |
| KPA parity | **부분 완성**(상품 ✅ / 주문 ⛔ backend 대기) |

*Date: 2026-06-16 · KPA operator '상품 현황' view-only 도입(serviceKey=kpa-society, /operator/products extension) · 주문 현황은 KPA backend 부재로 보류 · 공통 컴포넌트 detailPathBase nullable additive(GP/KCos 불변) · typecheck+build(KPA/GP/KCos) PASS · backend 무변경 · 후속: KPA operator orders backend WO.*
