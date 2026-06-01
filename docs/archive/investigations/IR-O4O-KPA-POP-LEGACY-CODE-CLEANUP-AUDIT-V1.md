# IR-O4O-KPA-POP-LEGACY-CODE-CLEANUP-AUDIT-V1

> **KPA POP 기능 legacy / stale / transitional / dead 코드 audit**
> 작성일: 2026-05-09
> 조사 기준: main `965d7030a` 시점 (POP canonical 정렬 직후)
> 상태: READ-ONLY 조사 완료
> 목적: POP 흐름의 잔재(stale) / 사용 중이나 전환 중(transitional) / 호출 끊긴 코드(dead)를 식별하여 후속 cleanup WO의 fact base를 마련. QR/블로그/상품 상세설명에도 반복될 가능성이 있는 패턴을 함께 정리.
>
> ⚠️ 이번 단계는 **조사만** 수행. 코드/route/문구 변경 없음.

---

## 0. 분류 기준

| 분류 | 정의 |
|------|------|
| **active canonical** | 현재 canonical 흐름에서 실제 사용 중인 코드. 유지 대상. |
| **transitional** | 사용 중이지만 장기 통합 후보 또는 구조 전환 중. |
| **stale legacy** | 코드/UI는 살아 있으나 canonical과 라벨/UX 미정렬. |
| **dead code** | import / 호출 / route 모두 끊긴 코드. 즉시 제거 가능. |

---

## 1. POP 관련 전체 inventory

### 1-1. 페이지 / route / 진입

| Component | Route | 진입 | 분류 |
|-----------|-------|------|------|
| StorePopPage | `/store/marketing/pop` | 사이드바 `매장 실행 → POP` + 자료함 → 제작 시작 → POP | **active canonical** |
| ProductPopBuilderPage | `/store/commerce/products/:productId/pop` | ProductMarketingPage `POP 만들기` 버튼 | **transitional** (별개 진입·service·entity) |
| Legacy redirect `/store/pop` | → `/store/marketing/pop` | 외부 링크 호환 | **stale alias** (active redirect) |

### 1-2. 모달 / 컴포넌트

| Component | 파일 | 사용처 | 분류 |
|-----------|------|--------|------|
| `StartProductionModal` | [StartProductionModal.tsx](services/web-kpa-society/src/pages/pharmacy/StartProductionModal.tsx) | StoreLibraryContentsPage / StoreLibraryResourcesPage | **active canonical** |
| `StoreAssetSelectorModal` | [StoreAssetSelectorModal.tsx](services/web-kpa-society/src/components/store/StoreAssetSelectorModal.tsx) | StoreQRPage, StoreSignagePage | **active** (POP은 import 끊김, 다른 페이지가 사용) |
| `StoreLibrarySelectorModal` | [StoreLibrarySelectorModal.tsx](services/web-kpa-society/src/components/store/StoreLibrarySelectorModal.tsx) | **import 0건** (`(renamed from StoreLibrarySelectorModal)` 주석) | **dead code** |
| `StoreQRCreateEntryModal` | [StoreQRCreateEntryModal.tsx](services/web-kpa-society/src/components/store/StoreQRCreateEntryModal.tsx) | **import 0건** (직전 IR에서 추정했던 "QR 자료 변경" 사용처도 부재) | **dead code** |

검증 방법: `grep -rn "from.*Modal\|import.*Modal"` 결과.

### 1-3. 백엔드

| Path | Service | 분류 |
|------|---------|------|
| `POST /pharmacy/pop/generate` | `pop-generator.service` (libraryItemIds + supplierItemIds) | **active canonical** |
| `GET /pharmacy/pop/source/supplier-items` | NetureSupplierLibraryItem 공개 자료 | **active** (StorePopPage 미사용 — 미연결) |
| `GET /api/v1/products/:productId/pop/:layout` | `product-pop-pdf.service` | **transitional** (ProductPopBuilderPage 전용) |

### 1-4. Entity

| Entity | 사용 | 분류 |
|--------|------|------|
| `StoreExecutionAsset` (`store_execution_assets`) | StorePopPage source | **active canonical** |
| `NetureSupplierLibraryItem` | `/pharmacy/pop/generate` 백엔드에선 supplierItemIds 지원 | **transitional** (frontend 미연결) |
| `ProductAiContent` (`product_ai_contents`) | ProductPopBuilderPage pop_short/long | **active** (transitional flow) |
| POP 결과물 entity | **부재** | (미설계 — 결과 lifecycle 없음) |

---

## 2. Stale naming inventory

### 2-1. `POP 자료` 잔재

| 위치 | 라인 | 컨텍스트 | 분류 |
|------|------|----------|------|
| [StorePopPage.tsx:233](services/web-kpa-society/src/pages/pharmacy/StorePopPage.tsx#L233) | empty state 문구 `POP 자료가 없습니다.` | WO 명시 문구 | **active canonical** (의도) |
| [StoreHomePage.tsx:181](services/web-kpa-society/src/pages/pharmacy/StoreHomePage.tsx#L181) | "실행 흐름" 카드 라벨 | active UI · sidebar(`POP`)와 미정렬 | **stale legacy** |
| [StoreMarketingDashboardPage.tsx:268](services/web-kpa-society/src/pages/pharmacy/StoreMarketingDashboardPage.tsx#L268) | quick label | 페이지 자체가 route 미등록 → dead | **dead** |
| [pages/pharmacy/index.ts:61](services/web-kpa-society/src/pages/pharmacy/index.ts#L61) | 주석 `WO-O4O-POP-LIBRARY-INTEGRATION-V1: POP 자료 관리` | 주석만 | **stale legacy** (주석) |

### 2-2. `QR 관리` 잔재 (canonical: `QR 코드`)

| 위치 | 라인 | 컨텍스트 | 분류 |
|------|------|----------|------|
| [StoreHomePage.tsx:177](services/web-kpa-society/src/pages/pharmacy/StoreHomePage.tsx#L177) | "실행 흐름" 카드 라벨 | active UI | **stale legacy** |
| [ProductMarketingPage.tsx:222](services/web-kpa-society/src/pages/pharmacy/ProductMarketingPage.tsx#L222) | `title="QR 관리"` tooltip | active UI | **stale legacy** |
| [StoreMarketingDashboardPage.tsx:263](services/web-kpa-society/src/pages/pharmacy/StoreMarketingDashboardPage.tsx#L263) | quick label | dead 페이지 | **dead** |
| [storeMenuConfig.ts:172](packages/store-ui-core/src/config/storeMenuConfig.ts#L172) | 헤더 주석 (`WO-STORE-SIDEBAR-RESTRUCTURE-V1: ...QR 관리→QR 코드...`) | 주석 history | **stale legacy** (주석 노이즈) |

### 2-3. `매장 관리` 잔재 (POP에서는 `매장 실행`으로 통일됨)

| 위치 | 라인 | 컨텍스트 | 분류 |
|------|------|----------|------|
| [StoreQRPage.tsx:379](services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx#L379) | breadcrumb root | active UI · POP과 비대칭 | **stale legacy** |
| [MarketingAnalyticsPage.tsx:70](services/web-kpa-society/src/pages/pharmacy/MarketingAnalyticsPage.tsx#L70) | breadcrumb root | active UI | **stale legacy** |
| [StoreMarketingDashboardPage.tsx:107](services/web-kpa-society/src/pages/pharmacy/StoreMarketingDashboardPage.tsx#L107) | breadcrumb root | dead 페이지 | **dead** |
| [StoreManagementSection.tsx:12](services/web-kpa-society/src/pages/pharmacy/sections/StoreManagementSection.tsx#L12) | `매장 관리` (settings link label) | 의미 다름 (settings 자체) | **active** (라벨 의미 별개) |
| [StoreSidebar.tsx:131](packages/store-ui-core/src/components/StoreSidebar.tsx#L131) | `내 매장 관리` (orgName 없을 때 fallback) | active fallback | **active** |
| [pages/pharmacy/index.ts:46](services/web-kpa-society/src/pages/pharmacy/index.ts#L46) | 주석 (`WO-STORE-ADMIN-CONSOLIDATION-V1`) | 주석 history | **stale legacy** (주석) |

### 2-4. `자료 추가` / `기존 자료 선택` / `새 자산 만들기`

| 문자열 | 위치 | 분류 |
|--------|------|------|
| `자료 추가` | 코드 어디에도 부재 | **제거 완료** ✅ |
| `기존 자료 선택` | [StoreQRCreateEntryModal.tsx](services/web-kpa-society/src/components/store/StoreQRCreateEntryModal.tsx) | **dead** (component 자체 dead) |
| `새 자산 만들기` | [StoreAssetSelectorModal.tsx:216](services/web-kpa-society/src/components/store/StoreAssetSelectorModal.tsx#L216) | **active** (StoreQRPage/StoreSignagePage 사용) |
| `새 자산 만들기` | [StoreLibrarySelectorModal.tsx:232](services/web-kpa-society/src/components/store/StoreLibrarySelectorModal.tsx#L232) | **dead** (deprecated component) |

---

## 3. Route / alias 조사

### 3-1. POP 관련 route 표

| Route | Element | 진입 트리거 | 분류 |
|-------|---------|-------------|------|
| `/store/marketing/pop` | StorePopPage | sidebar / StartProductionModal navigate | **active canonical** |
| `/store/commerce/products/:productId/pop` | ProductPopBuilderPage | ProductMarketingPage `POP 만들기` 버튼 | **active transitional** (별개 흐름) |
| `/store/pop` | Navigate → `/store/marketing/pop` | legacy URL 호환 | **stale alias** (능동 redirect) |

검증: `grep -n "marketing/pop\|/store/pop\|products/.*\\/pop" App.tsx` → 837/855/871 line.

### 3-2. 인접 route 영향 (동일 navigation 도메인)

| Route | 분류 | 비고 |
|-------|------|------|
| `/store/content` (StoreAssetsPage) | **stale** | 사이드바에서 제거됨. `/pharmacy/assets`, `/pharmacy/blog` 등 legacy redirect 4건이 여전히 가리킴 ([App.tsx:535,539,550,551](services/web-kpa-society/src/App.tsx)) |
| `ALL_STORE_MENUS[content]` ([storeMenuConfig.ts:63](packages/store-ui-core/src/config/storeMenuConfig.ts#L63)) | **stale** | flat-mode menu 정의 잔재. KPA는 menuSections 모드로 전환 → 미사용 |

---

## 4. StorePopPage / ProductPopBuilderPage 관계

### 4-1. 역할 차이

| 항목 | StorePopPage | ProductPopBuilderPage |
|------|--------------|----------------------|
| **Route** | `/store/marketing/pop` | `/store/commerce/products/:productId/pop` |
| **진입** | 자료함 → 제작 시작 → POP (또는 사이드바) | 상품 마케팅 → POP 만들기 |
| **Source entity** | `StoreExecutionAsset` | `product_masters` (정확히는 `local_products.id`) |
| **API** | `POST /pharmacy/pop/generate` | `GET /products/:productId/pop/:layout` |
| **Backend service** | `pop-generator.service` | `product-pop-pdf.service` |
| **AI 통합** | 없음 | active (`pop_short` / `pop_long` via `ProductAiContent`) |
| **QR 연결** | optional (`getStoreQrCodes`) | 없음 |
| **Multi-source** | YES (max 8) | NO (1 product) |
| **Layout** | A4 / A5 | A4 / A5 / A6 |
| **Source resolve** | `getStoreLibraryItem` | `getProductAiContents` + state hint |

### 4-2. 중복 기능

- POP PDF 출력 (도메인 동일)
- Layout 선택
- Title / description / image 메타 처리
- 빈 상태 → 결과물 출력 흐름

### 4-3. 공유 가능 기능 (통합 후보)

- PDF 백엔드 통합 (현재 2개 service)
- Layout 선택 컴포넌트
- AI 통합 (ProductPopBuilderPage 패턴을 매장 단위 POP에 확장)
- POP 결과물 entity (현재 부재)

### 4-4. 통합 시 위험

| 위험 | 설명 |
|------|------|
| **진입점 분리** | 자료함 진입 vs 상품 마케팅 진입 — UX 의도 다름 |
| **Source domain 분리** | `StoreExecutionAsset` (자산) vs `product_masters` (상품) — 권한 / scoping 다름 |
| **AI 통합 비대칭** | ProductAiContent는 productId 키. StoreExecutionAsset은 productId 없음 — AI 통합 시 결합 키 정의 필요 |
| **결과물 entity 부재** | 두 흐름 모두 PDF 영구 저장 없음. 통합 전 lifecycle 정의 선행 필요 |
| **백엔드 multi-tenant** | `pop-generator.service`는 organizationId 경계, `product-pop-pdf.service`는 product master 기반 — 결합 시 정책 충돌 가능 |

### 4-5. 장기 canonical 후보 (제안만, 본 IR은 결정하지 않음)

```text
[Option A: 두 흐름 유지 + 명시적 분리]
  StorePopPage      → "자산 기반 POP" (자료함 source, 다중 자산, QR 연결)
  ProductPopBuilderPage → "상품 단위 POP" (상품 단건, AI 자동 채움)
  → 진입점·라벨·breadcrumb로 명시적 분리

[Option B: 단일 페이지로 통합]
  StorePopPage 흐름이 base, productId가 있으면 ProductAiContent 자동 prefill
  → AI 통합 + multi-source + 단일 진입점
  → 백엔드 service 통합 필요
```

---

## 5. Origin 구조 조사

### 5-1. 3개 origin 매핑

| Origin | Source entity | API client | POP 처리 |
|--------|---------------|------------|----------|
| `library` | `StoreExecutionAsset` | `getStoreLibraryItem` ([storeLibrary.ts](services/web-kpa-society/src/api/storeLibrary.ts)) | 단건 fetch → popItems 추가 + PDF 가능 |
| `snapshot` | `o4o_asset_snapshots` | `storeAssetControlApi` ([assetSnapshot.ts](services/web-kpa-society/src/api/assetSnapshot.ts)) | state title/description 직접 사용 + PDF **불가** (toast) |
| `direct` | `kpa_store_contents` | `directContentApi` | 동일 (PDF **불가**) |

### 5-2. 적용 도메인

| 페이지 | library | snapshot | direct |
|--------|:-------:|:--------:|:------:|
| StorePopPage | ✅ PDF | ⚠ 표시만 | ⚠ 표시만 |
| StoreQRPage | ✅ creating | (코드상 미수용) | (코드상 미수용) |
| PharmacyBlogPage | (해당없음) | ✅ prefill (description) | ✅ prefill |
| StoreProductDescriptionsPage | (해당없음) | ✅ prefill (description) | ✅ prefill |

→ POP / QR은 `library` 중심, Blog / 상품 상세설명은 `snapshot/direct` 중심. **Origin coverage가 도메인별로 비대칭**.

### 5-3. transitional 여부

`library`만 PDF가 가능한 것은 **백엔드 제약** (StoreExecutionAsset만 받음). UI는 모든 origin을 받지만 결과물은 library 한정 → **transitional** (장기적으로 snapshot/direct도 supplier item처럼 직접 참조 가능하게 확장 또는 origin filter UI 추가).

### 5-4. canonical 적합성

`StartProductionModal`이 4개 도메인(POP/QR/블로그/상품 상세설명) 모두에 동일한 origin payload(`{id, title, description?, origin}`)를 전달 → **payload schema는 canonical 정렬됨**. 도메인별 처리 방식이 다른 것은 도메인 본질에 가까움 (POP은 image-driven, blog/desc는 text-driven).

---

## 6. Reusable legacy patterns (QR / 블로그 / 상품 상세설명 공통)

### 6-1. 반복 가능성이 있는 패턴

| 패턴 | POP 잔재 | QR | 블로그 | 상품 상세설명 |
|------|:--------:|:--:|:------:|:------------:|
| breadcrumb root `매장 관리` | 정정 완료 ✅ | 잔재 (line 379) | (확인 필요) | (확인 필요) |
| sidebar 라벨 vs page title 미정렬 | 정정 완료 ✅ | (POP/QR 코드 정렬됨) | (확인 필요) | (확인 필요) |
| empty state 안내 문구 미정렬 | 정정 완료 ✅ | StoreHomePage 카드 stale | — | — |
| `자료 추가` 류 modal 진입 흔적 | 모두 제거 ✅ | StoreQRCreateEntryModal dead | — | — |
| 즉석 generator 구조 (결과물 entity 없음) | YES (PDF) | NO (StoreQrCode entity) | NO (StoreBlogPost entity) | NO (ProductAiContent entity) |
| origin coverage gap | snapshot/direct → toast | snapshot/direct 미수용 (코드상) | YES (description prefill) | YES (description prefill) |

### 6-2. 즉석 generator 구조 (POP 특이점)

POP만 **결과물 entity가 없음**. QR / 블로그 / 상품 상세설명은 모두 영구 entity 있음.
- POP: PDF stream → 영구 저장 없음
- QR: `StoreQrCode` (영구)
- Blog: `StoreBlogPost` (영구)
- 상품 상세설명: `ProductAiContent` (영구)

이 비대칭은 도메인 본질(POP은 인쇄용 일회성)에 가까우나, "결과물 관리" 라벨과는 미정렬. canonical 정렬 시 POP 결과물 entity 신설 또는 라벨 명시적 변경 검토 필요 (본 IR 범위 외).

### 6-3. StoreHomePage "실행 흐름" 카드 — 4개 도메인 모두 영향

[StoreHomePage.tsx](services/web-kpa-society/src/pages/pharmacy/StoreHomePage.tsx) Step 2 "콘텐츠 만들기" 카드 그룹 (line 170-187):
- 자료실 (`/store/content`)
- QR 관리 (`/store/marketing/qr`)  ← stale label
- POP 자료 (`/store/marketing/pop`)  ← stale label
- 블로그 (`/store/content/blog`)

→ 4개 카드 라벨 동시 정정 필요. 추가로 "실행 흐름" 자체가 canonical UX(자료함 → 제작 시작) 와 다른 진입을 제시 → 정책 충돌 검토 필요.

---

## 7. 종합 정리

### A. 즉시 제거 가능한 dead code

| 항목 | 위치 | 근거 |
|------|------|------|
| `StoreLibrarySelectorModal` 컴포넌트 | [components/store/StoreLibrarySelectorModal.tsx](services/web-kpa-society/src/components/store/StoreLibrarySelectorModal.tsx) | `(renamed from ...)` 주석 + `import` 0건 |
| `StoreQRCreateEntryModal` 컴포넌트 | [components/store/StoreQRCreateEntryModal.tsx](services/web-kpa-society/src/components/store/StoreQRCreateEntryModal.tsx) | `import` 0건 |
| `StoreMarketingDashboardPage` | [pages/pharmacy/StoreMarketingDashboardPage.tsx](services/web-kpa-society/src/pages/pharmacy/StoreMarketingDashboardPage.tsx) | App.tsx route 미등록, 외부 import 0건 (index.ts export만) |
| `ProductPopBuilderPage.selectedLibraryItem` 분기 | [ProductPopBuilderPage.tsx:36, 76](services/web-kpa-society/src/pages/pharmacy/ProductPopBuilderPage.tsx#L36) | StorePopPage에서 set하던 코드 제거 후 호출처 부재 (단, 외부 navigation에서 set 가능성 미검증) |
| `ALL_STORE_MENUS[content]` flat 정의 | [storeMenuConfig.ts:63](packages/store-ui-core/src/config/storeMenuConfig.ts#L63) | KPA / GlycoPharm / K-Cosmetics 모두 menuSections로 전환 |

### B. Stale naming / UI

| 라벨 | 정정 방향 | 영향 페이지 |
|------|----------|------------|
| `POP 자료` (홈 카드) | `POP` 통일 | StoreHomePage |
| `QR 관리` (홈 카드, 상품 마케팅 tooltip) | `QR 코드` 통일 | StoreHomePage, ProductMarketingPage |
| breadcrumb `매장 관리` (active 페이지) | `매장 실행` 통일 | StoreQRPage, MarketingAnalyticsPage |
| 주석 stale text | 청소 권장 | pages/pharmacy/index.ts, storeMenuConfig.ts header |

### C. Transitional structure

| 항목 | 현 상태 | 통합/정리 후보 |
|------|---------|---------------|
| StorePopPage vs ProductPopBuilderPage 이중 흐름 | 두 별개 service / API / source domain | 후속 WO에서 정책 결정 (Option A 분리 명시 / Option B 통합) |
| Origin coverage gap (POP은 library만 PDF) | toast 안내 | supplier item 직접 참조 또는 snapshot/direct 백엔드 확장 |
| POP 결과물 entity 부재 | stream-only | result entity 신설 vs 라벨 변경 |
| `/store/content` (StoreAssetsPage) | 사이드바 미노출, redirect 다수 | 별도 IR 필요 (자료실 통폐합 정책 결정) |

### D. Canonical 유지 대상 (변경 금지)

- StorePopPage 라벨 / breadcrumb / empty state (이미 통일됨)
- StartProductionModal 4-target 진입 (POP/QR/블로그/상품 상세설명)
- Origin payload schema (`{id, title, description?, origin}`)
- `POST /pharmacy/pop/generate` API 계약
- `StoreExecutionAsset` 구조
- `ProductAiContent` 5 contentType
- StoreLibraryContentsPage / StoreLibraryResourcesPage 진입점 패턴

### E. 후속 cleanup WO 후보

| # | 후보 WO | 범위 | 비고 |
|---|---------|------|------|
| 1 | **WO-O4O-KPA-POP-LEGACY-DEAD-CODE-REMOVAL-V1** | StoreLibrarySelectorModal, StoreQRCreateEntryModal, StoreMarketingDashboardPage 삭제 | TS build 영향 0 예상 |
| 2 | **WO-O4O-KPA-STALE-LABEL-UNIFICATION-V1** | StoreHomePage / ProductMarketingPage / StoreQRPage / MarketingAnalyticsPage 라벨 통일 | 4개 페이지 문구만 |
| 3 | **WO-O4O-KPA-POP-DUAL-FLOW-CONVERGENCE-V1** | StorePopPage ↔ ProductPopBuilderPage 정책 결정 | 큰 결정 — 별도 설계 단계 |
| 4 | **WO-O4O-KPA-POP-RESULT-LIFECYCLE-V1** | POP 결과물 entity 신설 또는 라벨 정정 | 결정 후 진행 |
| 5 | **WO-O4O-KPA-STORE-CONTENT-ROUTE-CLEANUP-V1** | `/store/content` 사용성 / legacy redirect 정리 | 별도 IR 선행 권장 |

### F. QR / 블로그 / 상품 상세설명 공통 cleanup 가능 영역

| 영역 | 공통 작업 가능 여부 | 비고 |
|------|:---:|------|
| breadcrumb root 라벨 통일 (`매장 관리` → `매장 실행`) | ✅ | 4개 페이지 동시 |
| sidebar 라벨 vs page title 정렬 | ✅ | 4개 페이지 동시 |
| StoreHomePage "실행 흐름" 카드 라벨 통일 | ✅ | 4개 라벨 동시 |
| origin coverage 정책 (silent fail / 명시 toast) | ⚠ | 도메인별 본질 다름. 정책 가이드만 통일 |
| `자료 추가` 류 진입 모달 잔재 검사 | ✅ | StoreQRCreateEntryModal 제거 후 도메인별 확인 |
| 즉석 generator 구조 vs 결과물 entity | ⚠ | POP 특이. 다른 도메인은 entity 있음 |

---

## 8. 작업 규칙 준수 확인

- ✅ 조사만 수행 (코드 / route / 문구 변경 없음)
- ✅ canonical 판단만 수행 — 후속 WO 후보로만 표기
- ✅ 실제 코드 / 파일 / line 기준
- ✅ POP 중심, QR / 블로그 / 상품 상세설명은 공통 패턴 확인 수준
- ✅ 추정 금지 — 코드에 없는 흐름은 보고하지 않음 (단, ProductPopBuilderPage.selectedLibraryItem dead 판정은 "외부 navigation 미검증" 명시)

---

*작성: 2026-05-09*
*조사 범위: services/web-kpa-society (POP 4 페이지 + 모달 4개 + storeMenuConfig + App.tsx routes), packages/store-ui-core, apps/api-server (store-pop / pop-generator / product-pop-pdf / ProductAiContent)*
*상태: READ-ONLY 조사 완료. 후속 cleanup WO 5개 후보 식별.*
