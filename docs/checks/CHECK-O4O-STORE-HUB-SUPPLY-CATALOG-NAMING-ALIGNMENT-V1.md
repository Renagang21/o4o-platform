# CHECK-O4O-STORE-HUB-SUPPLY-CATALOG-NAMING-ALIGNMENT-V1

> **WO:** WO-O4O-STORE-HUB-SUPPLY-CATALOG-NAMING-ALIGNMENT-V1
> **선행:** `WO-O4O-STORE-HUB-B2B-CATALOG-GP-KCOS-COMMON-COMPONENT-EXTRACTION-V1` (B2BCatalogHub 추출 원본)
> **성격:** 명칭 정렬 전용 — 컴포넌트/문서/export rename. route·distributionType·API·backend·DB·migration 무변경.
> **결과:** PASS (naming 정렬 완료). typecheck = 사전 존재 dep 미빌드 오류 외 신규 오류 0 (§8).
> **작성일:** 2026-06-13

---

## 1. 목적

직전 추출 작업에서 공통 컴포넌트명이 `B2BCatalogHub`로 생성되었으나, 매장 허브에는 B2C가 없어야 하며 이 화면의 의미는 "B2B vs B2C" 대비가 아니라 **공급자 → 매장 공급 상품 신청 카탈로그**다. `B2B Catalog` 표현을 **Supply Catalog / 공급 상품 카탈로그** 기준으로 정렬한다.

## 2. Naming 기준

- 공통 컴포넌트: `B2BCatalogHub` → **`SupplyCatalogHub`** (+ Props/Labels/Product/Api/GetParams/ListResponse/Accent 동일 prefix 정렬)
- 디렉터리: `components/b2b-catalog/` → **`components/supply-catalog/`** (`git mv`)
- 사용자-facing/문서: "공급 상품 카탈로그 / 공급 상품 신청 / 공급 승인 대상" 유지
- `B2B`는 **내부 distributionType(`SERVICE`) · 기존 route(`/store-hub/b2b`) · legacy 식별자**에서만 유지
- B2C 의미 미혼입

## 3. Phase 1 — B2B 명칭 사용처 조사

| 파일 | 표현 | 성격 | 처리 |
|---|---|---|---|
| `packages/store-ui-core/src/components/b2b-catalog/B2BCatalogHub.tsx` | 컴포넌트 본체 + 8개 export 심볼 | rename 대상 | `git mv` → `supply-catalog/SupplyCatalogHub.tsx` + `B2BCatalog`→`SupplyCatalog` |
| `packages/store-ui-core/src/index.ts` | export 8종 + 경로 | rename 대상 | SupplyCatalog* + supply-catalog 경로 |
| `services/web-glycopharm/src/pages/hub/HubB2BCatalogPage.tsx` | `B2BCatalogHub` import/usage | wrapper | `SupplyCatalogHub` 로 정렬 (파일명·route 유지) |
| `services/web-k-cosmetics/src/pages/hub/HubB2BPage.tsx` | `B2BCatalogHub` import/usage | wrapper | `SupplyCatalogHub` 로 정렬 (파일명·route 유지) |
| `SupplyCatalogHub.tsx` `DISTRIBUTION_TABS` `{ key:'SERVICE', label:'B2B' }` | 유통유형 탭 라벨 | **KPA canonical 정합 — 유지** | 미변경 (cross-service 분포 라벨 drift 방지, §7) |
| `services/web-*/.../store/StoreChannelsPage·StoreSettingsPage`, `ChannelType 'B2C'` | 매장 채널 타입(B2C/KIOSK/...) | **범위 외 — 별개 개념** | 미변경 (온라인 스토어 채널, supply catalog 아님) |
| `services/web-glycopharm/.../business/BusinessProductsPage.tsx` `판매자 모집` | KPA business 페이지 | 범위 외 | 미변경 |
| 그 외 `판매자 모집`(storeCart.ts 주석 등) | Neture 파트너 모집 경계 주석 | 범위 외 | 미변경 |

> supply catalog 컴포넌트 내부에는 이미 '판매자 모집' 잔재 0 (PRIVATE = '공급 승인 대상', SELLER-RECRUITMENT-FIX 적용 상태 유지).

## 4. Phase 2 — 공통 컴포넌트 rename

- `git mv packages/store-ui-core/src/components/b2b-catalog/B2BCatalogHub.tsx → components/supply-catalog/SupplyCatalogHub.tsx`
- 파일 내 `B2BCatalog` → `SupplyCatalog` (8개 export 심볼 일괄): `SupplyCatalogHub` / `SupplyCatalogHubProps` / `SupplyCatalogHubLabels` / `SupplyCatalogProduct` / `SupplyCatalogApi` / `SupplyCatalogGetParams` / `SupplyCatalogListResponse` / `SupplyCatalogAccent`
- 헤더 주석에 canonical Naming Note 추가. `HubB2BCatalogPage`/`HubB2BPage` 파일명 참조는 실제 파일명이므로 원복 유지.
- `index.ts` export 8종 + import 경로(`./components/supply-catalog/SupplyCatalogHub`) 정렬.

## 5. Phase 3 — GP/KCos wrapper import 변경

- GP `HubB2BCatalogPage.tsx`: `import { SupplyCatalogHub }` + `<SupplyCatalogHub<CatalogProduct>>`. 파일명/route(`/store-hub/b2b`)/accent(teal)/tableId/labels 유지.
- KCos `HubB2BPage.tsx`: 동일(accent pink). 파일명/route 유지.
- 두 wrapper의 user-facing 문구는 이미 "공급 상품 / 상품 카탈로그 / 내 매장에 추가" 기준 — B2C 문구 없음.

## 6. Phase 4 — 기존 문서 Naming Note 추가

- `docs/investigations/IR-O4O-STORE-HUB-B2B-CATALOG-CROSSSERVICE-PARITY-V1.md` — Naming Note 추가 (전체 rewrite 없음).
- `docs/checks/CHECK-O4O-STORE-HUB-B2B-CATALOG-GP-KCOS-COMMON-COMPONENT-EXTRACTION-V1.md` — Naming Note 추가.

## 7. 유지 / 무변경 항목

- route `/store-hub/b2b` (변경 시 링크/북마크/문서 영향 → 별도 WO)
- distributionType 값 (`SERVICE`/`PRIVATE`/operator), `DISTRIBUTION_TABS` 구조 및 'B2B' 탭 라벨(KPA canonical)
- `applyBySupplyProductId` API · `ProductApproval(PENDING)` · `OrganizationProductListing` 생성 흐름
- backend / DB / migration / checkout / order / cart / event-offer
- KPA fuller `HubB2BCatalogPage`(796줄, web-kpa-society) — 본 컴포넌트 범위 외, 무변경 (fold-in 은 후속 WO)
- 매장 채널 `ChannelType 'B2C'`(온라인 스토어) — 별개 개념, 무변경

## 8. 검증 결과

- **정적 grep:** `B2BCatalogHub` 코드 심볼 사용처 = 0 (잔존은 index.ts/컴포넌트의 "구 B2BCatalogHub →" 명칭 노트 주석뿐). `SupplyCatalogHub` export/import 정상. GP/KCos wrapper가 `SupplyCatalogHub` 사용.
- **PRIVATE = '공급 승인 대상' 유지**, supply catalog 컴포넌트 내 '판매자 모집'·B2C 문구 0.
- **route `/store-hub/b2b` 유지**, backend/DB/migration/ProductApproval/OPL 무변경.
- **typecheck:**
  - `@o4o/store-ui-core` (자체 tsconfig) — `SupplyCatalogHub.tsx` 에 **12건 오류**가 있으나 전부 **사전 존재(pre-existing)**: `@o4o/error-handling`/`@o4o/ui`/`@o4o/operator-ux-core` 로컬 dist 미빌드(TS2307) + 그로 인한 `ListColumnDef=any` cascade(TS7006). 동일 import/render 시그니처가 **원본 `B2BCatalogHub.tsx`(HEAD)에 그대로 존재** → rename 으로 인한 신규 오류 0. CI `build:deps` 후 해소.
  - GP(`tsconfig.app.json`)·KCos(`tsconfig.json`) — store-ui-core src 를 transitive 컴파일하며 동일 dep-미빌드 오류만 표면화(신규 0). GP 에 무관한 사전 오류 `ForumPage.tsx` viewCount 2건 — 본 WO 범위 외.
  - 즉 **rename 은 module graph 동일(심볼/경로만 변경) → type 안전**.

## 9. 완료 판정

**PASS** — B2BCatalogHub → SupplyCatalogHub rename + 경로/export/wrapper 정렬 + 기존 문서 Naming Note 완료. route/API/distributionType/backend/DB 무변경. 신규 type 오류 0.

## 10. 후속 작업

1. `WO-O4O-STORE-HUB-SUPPLY-CATALOG-KPA-FOLD-IN-V1` — KPA fuller 를 SupplyCatalogHub optional prop/slot 으로 흡수 평가
2. `IR-O4O-PRODUCT-APPROVAL-TO-OPL-CROSSSERVICE-AUDIT-V1` — 승인 후 OPL 생성 경로 audit
3. (선택) `/store-hub/b2b` → supply 기반 route 정렬은 링크/북마크 영향으로 별도 WO 분리
4. (환경) `@o4o/error-handling`/`@o4o/ui`/`@o4o/operator-ux-core` 로컬 dist 빌드 시 store-ui-core typecheck 12건 해소 — 본 WO 무관
