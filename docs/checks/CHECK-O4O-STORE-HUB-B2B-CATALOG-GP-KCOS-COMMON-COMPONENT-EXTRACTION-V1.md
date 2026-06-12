# CHECK-O4O-STORE-HUB-B2B-CATALOG-GP-KCOS-COMMON-COMPONENT-EXTRACTION-V1

> **WO**: WO-O4O-STORE-HUB-B2B-CATALOG-GP-KCOS-COMMON-COMPONENT-EXTRACTION-V1
> **선행**: `IR-O4O-STORE-HUB-B2B-CATALOG-CROSSSERVICE-PARITY-V1`(A 계약/B GP·KCos near-identical/C KPA fuller).
> **성격**: GP/KCos B2B 카탈로그(370/371 near-identical) → 공통 `B2BCatalogHub`. KPA fuller 무변경. backend/ProductApproval/cart 무변경.
> **결과: PASS — B2BCatalogHub(@o4o/store-ui-core) 추출 + GP/KCos thin wrapper. store-ui-core+GP+KCos+KPA typecheck clean.**
> **작성일**: 2026-06-12

---

## 1. 목적
GP/KCos 공급 상품 신청 화면(370/371 near-identical)을 공통 컴포넌트로 통합. service api + accent + tableId + 문맥 라벨 주입. 신청=ProductApproval(PENDING), 신청≠주문 의미 유지.

## 2. 선행 IR 기준
계약·용어·신청 흐름 3서비스 정합(A): distribution 탭(전체/B2B/운영자/공급 승인 대상), `applyBySupplyProductId → POST /{svc}/pharmacy/products/apply → ProductApproval(PENDING)`, operator-ux-core DataTable. GP/KCos 컴포넌트 near-identical(B), KPA fuller(C).

## 3. Phase 1 — GP/KCos 차이 재확인
| 항목 | GlycoPharm | K-Cosmetics | 처리 |
|------|-----------|-------------|------|
| 컴포넌트명 | `HubB2BCatalogPage` | `HubB2BPage` | export명 각자 유지(wrapper) |
| api client | `api/pharmacyProducts`(glycopharm) | `api/pharmacyProducts`(cosmetics) | `api` prop 주입 |
| 테마색 | teal | pink | `accent` prop(정적 class map) |
| tableId | `glyco-store-hub-b2b-products` | `kcos-store-hub-b2b-products` | `tableId` prop |
| supplier 라벨 | "공급자" | "공급사" | `labels.supplierLabel` prop |
| 채널 관리 링크 | 안내문에 `/store/channels` 링크 有 | 링크 無(plain text) | `labels.channelManageHref` optional prop |
| 품목 예시/주석 | 의약품/건기식 | 화장품/뷰티 | 주석(wrapper) — 본문 미사용 |
> 로직/구조 차이 0(DISTRIBUTION_TABS·apply/remove/bulk·DataTable·ActionBar·columns·pagination 동일). 채널 링크 유무만 optional prop으로 pixel-faithful 보존(KCos 무링크 유지).

## 4. Phase 2 — B2BCatalogHub 추출
- 신규: `packages/store-ui-core/src/components/b2b-catalog/B2BCatalogHub.tsx`.
- **generic** `B2BCatalogHub<T extends B2BCatalogProduct>`: props `api`(getCatalog/applyBySupplyProductId/cancelProductByOfferId) · `accent`(teal/pink **정적** class map, ~8 spot) · `tableId` · `labels.supplierLabel` · `labels.channelManageHref`(optional).
- 보존: DISTRIBUTION_TABS(전체/B2B/운영자/**공급 승인 대상**)·검색 없음(서버 필터)·DataTable(operator-ux-core)·checkbox multi-select·ActionBar(bulk 내 매장에 추가)·단건 추가/제외·`내 매장` 배지·Pagination(offset)·범위 안내·채널 관리 안내·empty/loading/error.
- export: index.ts.

### 4-A. 의존성 경계 정리 (의도 변경 — CHECK 명시)
B2BCatalogHub는 store-ui-core 최초로 sibling `@o4o/*`를 코드 import(이전 컴포넌트는 lucide/react만 사용). store-ui-core가 source로 소비되므로 **의존성을 숨기지 않고 명시**:
- `packages/store-ui-core/package.json`: `dependencies`에 `@o4o/operator-ux-core` · `@o4o/ui` · `@o4o/error-handling` = **`workspace:*`** 추가(외부 registry 패키지 추가/버전 변경 0).
- `pnpm install` → workspace symlink 생성 + `pnpm-lock.yaml` importer 블록 갱신(`link:../*` 만, 외부 버전 drift 없음).
- `packages/store-ui-core/tsconfig.json`: `types: ["vite/client"]` 추가 — error-handling가 `import.meta.env` 사용 → store-ui-core standalone 컴파일 시 ImportMeta.env 타입 필요(vite/client.d.ts root resolve). React JSX는 react import로 타입 resolve(회귀 없음).
- 순환 의존 없음: operator-ux-core/ui/error-handling 모두 store-ui-core 미의존.
- 동적 Tailwind class 미사용(정적 ACCENT_CLASSES 맵).

## 5~6. GP/KCos 적용 (thin wrapper)
| 서비스 | 변경 |
|--------|------|
| GP `pages/hub/HubB2BCatalogPage.tsx` | **370줄 → ~40줄 wrapper**. `<B2BCatalogHub<CatalogProduct> accent="teal" tableId="glyco-..." labels={{supplierLabel:'공급자', channelManageHref:'/store/channels'}} api={{getCatalog/apply/cancel}}/>` |
| KCos `pages/hub/HubB2BPage.tsx` | **371줄 → ~40줄 wrapper**. `accent="pink"` + supplierLabel '공급사' + tableId 'kcos-...' + channelManageHref 미지정(무링크 유지) |
> 타입: 서비스 `CatalogProduct`(superset) → generic `T` assignable. `getCatalog`(CatalogResponse superset)·apply/cancel 가 `B2BCatalogApi` 에 구조적 assignable.

## 7. Phase 5 — KPA 무변경 확인
- KPA `HubB2BCatalogPage`(796 fuller) **무변경**. canonical 패턴 동일이나 제거 confirm/추가 기능 보유 → 후속 `WO-...-KPA-FOLD-IN-V1` 평가.

## 8. 제외/무변경 항목
- backend / DB / migration / ProductApproval service / OPL 생성 / applyBySupplyProductId 계약 / SupplierProductOffer — 무변경.
- 신청 = ProductApproval(PENDING) 의미 유지. 주문/장바구니/발주 버튼 **미혼입**(b2b 는 "내 매장에 추가"=신청, 주문 아님).
- KPA b2b 파일 — 무변경. Neture / 유통참여형 펀딩 — 무변경. GP/KCos api client — 무변경(wrapper 주입).

## 9. 검증 결과
- **TypeScript**:
  - `@o4o/store-ui-core` standalone(`tsc -p`, root TS 5.4.5) — **0** (vite/client types 추가 후, 이전 1건 error-handling `import.meta.env` 해소).
  - `web-glycopharm`(local TS 5.9.3, `tsc -b`) — B2B/store-ui/pharmacyProducts 관련 **0**(잔여 2건은 `ForumPage.tsx` viewCount 사전 존재·무관).
  - `web-k-cosmetics`(`tsc -p tsconfig.json`) — **0**.
  - `web-kpa-society`(`tsc -p tsconfig.json`) — **0**(회귀 없음).
- **lockfile**: `pnpm-lock.yaml` importer 변경 = store-ui-core `link:../*` 3건만. 외부 registry 패키지 추가/버전 변경 **0**(중단 조건 미해당).
- **정적**: `B2BCatalogHub` index export 확인. GP/KCos = thin wrapper(api+accent+tableId+labels). PRIVATE='공급 승인 대상' 유지(판매자 모집 재혼입 0). 주문/cart 미혼입. KPA 파일 무변경. 동적 class 미사용.
- **smoke**: 미수행(배포 전) — 동일 코드 이동 + accent 정적 class라 시각/동작 동일, tsc가 generic/api prop 가드. 배포 후 GP(teal)/KCos(pink) `/store-hub/b2b` 목록·탭·단건/일괄 신청 확인 권장.

## 10. 완료 판정
**PASS** — GP/KCos HubB2BCatalogPage/HubB2BPage(370/371) → 공통 `B2BCatalogHub` + thin wrapper(~40줄×2). KPA fuller 무변경. 신청=ProductApproval(PENDING) 유지, 주문/cart 미혼입. backend/DB 무변경. store-ui-core 의존성 명시(workspace:* 3건) + 4 typecheck clean.

## 11. 후속 작업
1. `WO-O4O-STORE-HUB-B2B-CATALOG-KPA-FOLD-IN-V1` — KPA 제거 confirm/추가 기능을 B2BCatalogHub optional prop/slot 으로 흡수 평가, 또는 별도 유지.
2. `IR-O4O-PRODUCT-APPROVAL-TO-OPL-CROSSSERVICE-AUDIT-V1` — 승인→OPL 생성 경로 audit.
3. `IR-O4O-STORE-HUB-EVENT-OFFER-CANONICAL-UX-DECISION-V1` — KPA enriched event offer canonical.

---

*Date: 2026-06-12 · WO-O4O-STORE-HUB-B2B-CATALOG-GP-KCOS-COMMON-COMPONENT-EXTRACTION-V1 · B2BCatalogHub 통합 + GP/KCos thin wrapper PASS. store-ui-core 의존성 명시(workspace:*). KPA fuller 무변경. 신청=ProductApproval(PENDING) 유지. backend/cart 무변경.*
