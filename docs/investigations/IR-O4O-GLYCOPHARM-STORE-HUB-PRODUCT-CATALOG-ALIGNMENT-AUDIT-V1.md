# IR-O4O-GLYCOPHARM-STORE-HUB-PRODUCT-CATALOG-ALIGNMENT-AUDIT-V1

**작성 일자**: 2026-05-31
**조사 환경**: HEAD (main) `4b2f0b98e` 시점 정적 코드 (read-only)
**조사 도구**: Read / Grep / Glob
**작업 성격**: read-only 조사 — 코드 / UI / API / DB / menu / tab / 문구 수정 없음

---

## 0. 핵심 결론 (TL;DR)

> ⚠️ **판정: C — 컴포넌트 구조 이식 필요 (단순 config/copy 정렬 아님). API 차단 없음(데이터 소스 동일).**
>
> 1. **KPA와 GlycoPharm은 같은 이름(`HubB2BCatalogPage`)을 쓰지만 완전히 별도의 service-local 구현** — 공유 컴포넌트 아님. KPA 793줄(canonical DataTable+bulk) vs GlycoPharm 144줄(로컬 B2BTableList).
> 2. **GlycoPharm 의 의약품/건기식/의료기기/화장품/생활용품 탭은 단순 UI 가 아니라 실제 API filter** — `getCatalog({ category })` 로 `category` 파라미터 전달. 단, 제거는 frontend-only(파라미터 미전달 → backend 전체 반환)라 **backend 변경 불필요**.
> 3. **테이블 구조가 근본적으로 다름** — KPA = `@o4o/operator-ux-core DataTable` + checkbox multi-select + ActionBar(bulk 내 매장에 추가) + Pagination. GlycoPharm = 로컬 `B2BTableList`(inline-style, checkbox/bulk/ActionBar 전무).
> 4. **탭 축이 다름** — KPA = 유통유형(전체/B2B/운영자/판매자 모집, `distributionType`/`operatorView` param). GlycoPharm = 품목(legal-category, `category` param). GlycoPharm CatalogProduct 에 `distributionType` 필드는 이미 존재(미사용).
> 5. **데이터 소스 동일** — 양쪽 다 `neture_supplier_products PUBLIC`. 엔드포인트는 service-prefix 병렬(`/pharmacy/products/catalog`). **API 차단 차이 없음(Option D 아님)**.
> 6. **문구 divergence + GlycoPharm 내부 불일치** — 페이지 헤더 "내 약국에 신청" vs 로컬 B2BTableList 버튼 "내 매장에 추가"(코드상 혼재). KPA는 "내 매장에 추가" 일관.
>
> → **정렬 = GlycoPharm HubB2BCatalogPage 를 KPA 패턴으로 재구현**(canonical DataTable + bulk ActionBar + 품목탭 제거 + 문구 정합). KPA/Neture/K-Cos 무변경. 후속은 GlycoPharm frontend 4파일 범위.

---

## 1. 조사한 파일 목록

| # | 파일 | 역할 |
|---|------|------|
| 1 | [web-kpa-society/.../App.tsx](../../services/web-kpa-society/src/App.tsx) (L678-690) | KPA store-hub 라우트 |
| 2 | [web-glycopharm/.../App.tsx](../../services/web-glycopharm/src/App.tsx) (L600-612) | GlycoPharm store-hub 라우트 |
| 3 | [web-kpa-society/.../pages/pharmacy/HubB2BCatalogPage.tsx](../../services/web-kpa-society/src/pages/pharmacy/HubB2BCatalogPage.tsx) (793) | **KPA b2b 카탈로그 (canonical)** |
| 4 | [web-glycopharm/.../pages/hub/HubB2BCatalogPage.tsx](../../services/web-glycopharm/src/pages/hub/HubB2BCatalogPage.tsx) (144) | **GlycoPharm b2b 카탈로그 (divergent)** |
| 5 | [web-glycopharm/.../pages/hub/B2BTableList.tsx](../../services/web-glycopharm/src/pages/hub/B2BTableList.tsx) | GlycoPharm 로컬 테이블 |
| 6 | [web-kpa-society/.../api/pharmacyProducts.ts](../../services/web-kpa-society/src/api/pharmacyProducts.ts) | KPA 카탈로그 API client |
| 7 | [web-glycopharm/.../api/pharmacyProducts.ts](../../services/web-glycopharm/src/api/pharmacyProducts.ts) | GlycoPharm 카탈로그 API client |
| 8 | [web-kpa-society/.../components/pharmacy/HubSubNav.tsx](../../services/web-kpa-society/src/components/pharmacy/HubSubNav.tsx) (L29) | KPA HUB 메뉴 정의 |
| 9 | [web-glycopharm/.../components/layouts/GlycoPharmHubLayout.tsx](../../services/web-glycopharm/src/components/layouts/GlycoPharmHubLayout.tsx) (L29-33) | GlycoPharm HUB 메뉴 정의 |

> `packages/store-ui-core/.../storeMenuConfig.ts` 에는 b2b 메뉴 정의 없음 — 양쪽 모두 **service-local 하드코딩**.

---

## 2. KPA `/store-hub/b2b` 구조

- route: `<Route path="b2b" element={<HubB2BCatalogPage />} />` ([App.tsx:680](../../services/web-kpa-society/src/App.tsx)) — `./pages/pharmacy/HubB2BCatalogPage` (lazy, service-local)
- title: **"상품 카탈로그"**
- desc: **"현재 활성 공급자가 제공 중인 상품을 탐색하고 내 매장에 추가할 수 있습니다."**
- note: "이 화면은 현재 공급 가능한 상품만 표시됩니다. 공급자 등록 전체 상품과는 범위가 다를 수 있습니다."
- tabs: `DISTRIBUTION_TABS` = 전체 / **B2B** / **운영자** / **판매자 모집** (keys: all/SERVICE/operator/PRIVATE)
- table: **`@o4o/operator-ux-core DataTable`** + checkbox multi-select + **ActionBar(bulk 내 매장에 추가 / 선택 해제)** + Pagination
- action: `applyBySupplyProductId()` → "내 매장에 추가" (단건 + bulk 병렬), `cancelProductByOfferId()` → 제외

## 3. GlycoPharm `/store-hub/b2b` 구조

- route: `<Route path="b2b" element={<HubB2BCatalogPage />} />` ([App.tsx:602](../../services/web-glycopharm/src/App.tsx)) — `@/pages/hub/HubB2BCatalogPage` (lazy, service-local)
- title: **"B2B 상품 카탈로그"**
- desc: **"공급자가 제공하는 상품을 탐색하고 내 약국에 신청합니다."**
- hint: "관심 상품은 신청 버튼을 눌러 내 약국에 등록할 수 있습니다. 승인 후 매장 B2B 관리에서 확인…"
- tabs: `CATEGORIES` = 전체 / **의약품 / 건강기능식품 / 의료기기 / 화장품 / 생활용품** (하드코딩 로컬 상수, line 15)
- table: **로컬 `B2BTableList`** (inline-style, 자체 탭/정렬/페이지네이션 내장 — checkbox/bulk/ActionBar 없음)
- action: `apiClient.post('/glycopharm/pharmacy/products/apply', {productId, service_key})` → 헤더는 "내 약국에 신청"
- ⚠️ **내부 불일치**: 페이지 헤더 "내 약국에 신청" ↔ `B2BTableList` apply 버튼 라벨 "내 매장에 추가"(line 309/315) 혼재

---

## 4. 메뉴 정의 비교 (조사 2)

| 항목 | KPA | GlycoPharm |
|------|-----|-----------|
| 정의 위치 | HubSubNav.tsx:29 (service-local) | GlycoPharmHubLayout.tsx:29-33 (service-local) |
| label | **"상품 카탈로그"** | **"B2B 상품"** |
| desc | (없음 — label만) | "공급사 상품을 탐색하고 약국에 신청합니다" |
| path | `/store-hub/b2b` | `/store-hub/b2b` |
| 공통 config 사용 | ❌ (store-ui-core 미사용) | ❌ |

→ 메뉴명/설명 모두 service-local 하드코딩. 정렬 시 GlycoPharm `GlycoPharmHubLayout.tsx` 수정 필요.

---

## 5. 페이지 제목 / 설명 / 안내 문구 비교 (조사 3)

| 항목 | KPA | GlycoPharm | 정의 위치 | 정렬 |
|------|-----|-----------|----------|:----:|
| title | 상품 카탈로그 | B2B 상품 카탈로그 | page 하드코딩 | 문구 교체 |
| desc | …탐색하고 **내 매장에 추가**할 수 있습니다 | …탐색하고 **내 약국에 신청**합니다 | page 하드코딩 | 문구 교체 |
| action 라벨 | 내 매장에 추가 | 내 약국에 신청(헤더) / 내 매장에 추가(버튼) | page+B2BTableList | 문구 통일 |
| note | 공급 가능한 상품만 표시… | (다른 hint) | page 하드코딩 | 문구 교체 |

→ 전부 **page 내부 하드코딩** — service config/공통 props 아님. KPA 문구를 그대로 적용 가능(문구 자체는 단순 교체).

---

## 6. 탭 구조 비교 (조사 4)

| 항목 | KPA | GlycoPharm |
|------|-----|-----------|
| 탭 정의 | `DISTRIBUTION_TABS` (전체/B2B/운영자/판매자 모집) | `CATEGORIES` (전체/의약품/건기식/의료기기/화장품/생활용품) |
| 탭 축 | **유통유형(distributionType)** | **품목(legal-category)** |
| API 연결 | `distributionType`/`operatorView`/`recommended` param | **`category` param** |
| 단순 UI 인가 | ❌ API filter | ❌ API filter (`category` 전달) |
| backend query 영향 | 있음 (distribution 필터) | 있음 (`category` 필터) — 단 GlycoPharm CatalogProduct 에 `distributionType` 필드 이미 존재 |

**GlycoPharm 품목 탭의 실제 동작**: `getCatalog({ category: cat==='전체'?undefined:cat })` 로 `category` 쿼리 파라미터 전달 → backend 필터. **단순 hardcoded UI 아님**. 그러나 **제거는 frontend-only** — `category` 파라미터를 안 보내면 backend 가 전체 반환(엔드포인트는 param optional). **backend 변경 불필요**.

**정책 기준 적용**: 의약품/건기식/의료기기/화장품/생활용품 품목 탭은 서비스 화면에서 유지하지 않음(품목·대상·노출 제어는 Neture 공급자/운영자 영역). → GlycoPharm 탭 제거 또는 KPA 유통유형 탭으로 교체.

---

## 7. 테이블 / 선택 / ActionBar 구조 비교 (조사 5)

| 항목 | KPA | GlycoPharm | 차이 | 정렬 필요 |
|------|-----|-----------|------|:--------:|
| 테이블 | `@o4o/operator-ux-core DataTable` (canonical) | 로컬 `B2BTableList` (inline-style) | **근본 차이** | ✅ |
| checkbox multi-select | ✅ (selectedKeys) | ❌ | 있음 | ✅ |
| ActionBar (bulk) | ✅ (bulk 내 매장에 추가 / 선택 해제) | ❌ | 있음 | ✅ |
| row action | 내 매장에 추가 / 제외(취소) | 내 매장에 추가(only) | 부분 | ✅ |
| Pagination | `@o4o/operator-ux-core Pagination` | B2BTableList 자체 페이저 | 다름 | ✅ |
| empty state | DataTable empty | "현재 공급 가능한 상품이 없습니다" | 다름 | △ |
| loading/error | DataTable + 자체 | spinner + 재시도 버튼 | 다름 | △ |
| sort | DataTable column sort | B2BTableList sortKey | 다름 | △ |

→ **테이블 계층이 완전히 다름**. GlycoPharm 은 canonical DataTable 미사용 + bulk/ActionBar 부재. KPA 정렬 = canonical DataTable 패턴 이식.

---

## 8. API / 데이터 source 비교 (조사 6)

| 항목 | KPA | GlycoPharm |
|------|-----|-----------|
| 카탈로그 endpoint | `/pharmacy/products/catalog` (kpa-prefix) | `/glycopharm/pharmacy/products/catalog` |
| **데이터 소스** | **neture_supplier_products PUBLIC** | **동일 (neture_supplier_products)** |
| getCatalog params | distributionType / recommended / operatorView / limit / offset | **category** / limit / offset |
| CatalogProduct 필드 | id/name/category/description/purpose/distributionType + **priceGeneral/priceGold** | id/name/category/description/purpose/distributionType/supplier*/isAdded (price 필드 미노출) |
| 신청 endpoint | `applyBySupplyProductId()` → POST `/pharmacy/products/apply` | POST `/glycopharm/pharmacy/products/apply` {productId, service_key} |
| 신청 흐름 | "내 매장에 추가" (단건+bulk) | "신청" (단건) |

**핵심**: 데이터 소스 동일(neture_supplier_products). 엔드포인트는 service-prefix 병렬 구조. GlycoPharm 도 `distributionType` 필드를 응답에 보유 → KPA 유통유형 탭 채택 가능. **신청 흐름은 실제로 다른 API(엔드포인트만 service-prefix 차이)이나 기능 동등**("내 매장/약국에 추가/신청"). **API 구조 차단 없음 — Option D 아님**. GlycoPharm API client 의 param(`category`→`distributionType`)·apply 시그니처 정합은 frontend 범위.

---

## 9. KPA 기준 정렬 가능성 / 후속 WO 권장 범위

### 판정: **C — 컴포넌트 구조 이식 필요** (A 단순 config/copy 아님, D API 차단 아님)

GlycoPharm `HubB2BCatalogPage` 를 KPA 패턴으로 재구현하는 후속 WO 권장. **GlycoPharm frontend 단독 범위** (KPA/Neture/K-Cos 무변경, backend 무변경):

| # | 수정 대상(GlycoPharm) | 변경 |
|---|----------------------|------|
| 1 | `pages/hub/HubB2BCatalogPage.tsx` | 로컬 B2BTableList → `@o4o/operator-ux-core DataTable` + checkbox + ActionBar(bulk 내 매장에 추가) + Pagination 이식. 품목 탭 제거(또는 KPA 유통유형 탭). title/desc 문구 KPA 정합("상품 카탈로그" / "…탐색하고 내 매장에 추가") |
| 2 | `pages/hub/B2BTableList.tsx` | 제거(또는 미사용화) — canonical DataTable 로 대체 |
| 3 | `api/pharmacyProducts.ts` | getCatalog `category` param 제거(정책상 품목 필터 미유지). 필요 시 distributionType param 추가. apply 흐름 "내 매장에 추가" 정합 |
| 4 | `components/layouts/GlycoPharmHubLayout.tsx` | 메뉴 label "B2B 상품" → "상품 카탈로그", desc "…약국에 신청" → KPA 정합("…내 매장에 추가") |

> **장기 이상(별도 IR)**: KPA/GlycoPharm/K-Cos 의 HubB2BCatalogPage 를 **공유 컴포넌트(store-ui-core)** 로 추출 + service-config 주입(DomainIASidebar 패턴). 단 API client 가 service-prefix 별로 달라 config 주입 설계 필요 — 큰 범위. 근시일 정렬은 **GlycoPharm 단독 재구현(C)** 이 현실적.

### 후속 WO 후보

| 순서 | WO (가칭) | 범위 |
|:---:|-----------|------|
| 1 | **WO-O4O-GLYCOPHARM-STORE-HUB-B2B-CATALOG-KPA-ALIGNMENT-V1** | GlycoPharm b2b 카탈로그 KPA 패턴 재구현 (§9 4파일). 품목 탭 제거 + canonical DataTable + bulk + 문구/메뉴 정합. GlycoPharm frontend 단독, backend 무변경. + GlycoPharm store-hub smoke |
| 2 (선택, 장기) | IR-O4O-CROSSSERVICE-STORE-HUB-B2B-CATALOG-COMMONIZATION-V1 | KPA/Glyco/K-Cos 공유 HubB2BCatalogPage 추출 검토 (store-ui-core + service-config 주입) |

---

## 10. Current Structure vs O4O Philosophy Conflict Check

| 원칙 | 판정 |
|------|------|
| O4O 공통 구조 §13 (forum/lms/signage 등 플랫폼 공통 구조) | ⚠️ Store HUB b2b 카탈로그도 공통 구조여야 하나 **KPA/GlycoPharm 별도 구현 = drift**. 정렬(C)이 정합 회복 |
| 사업 철학 §5 HUB / §4 Canonical Flow (공급자→운영자→매장) | ⚠️ GlycoPharm 품목 탭(의약품/건기식)은 **품목·노출 제어를 서비스 화면이 떠안은 drift**. 정책상 Neture 공급자/운영자 영역 책임 → 탭 제거가 철학 정합 |
| Store Production Material / Store HUB 표준 | ⚠️ KPA canonical(DataTable+bulk "내 매장에 추가") 기준 미정렬. GlycoPharm 정렬 필요 |
| Twin Axis (KPA reference) | ✅ KPA 가 reference — GlycoPharm 을 KPA 기준 정렬(역방향 아님). KPA 무변경 |
| Drift 방지 §7 | ⚠️ 품목 어휘(의약품 등) + 별도 테이블 = drift. 정렬로 해소 |
| 1인 개발 속도 | ✅ GlycoPharm 단독 frontend 4파일, backend 무변경 — 관리 가능 범위 |

**결론**: GlycoPharm b2b 카탈로그는 **품목 탭 + 로컬 테이블 + 문구**에서 KPA canonical 과 drift. 정책(품목 필터는 Neture 책임, Store HUB는 공통 탐색·추가 화면)과 철학(공통 구조 §13, HUB §5)에 따라 **KPA 기준 정렬(C)** 이 정합. 데이터 소스 동일 + backend 무변경이라 정렬 비용은 GlycoPharm frontend 범위로 제한.

---

## 11. Working tree 격리 / commit 정책

- 조사 시작 시점 다른 세션 WIP 존재 — `M apps/api-server/.../kpa/controllers/operator-summary.controller.ts`, `?? apps/api-server/.../kpa/services/operator-dashboard.service.ts` (KPA dashboard 트랙, 본 IR 무관). **미접촉/미포함.**
- 본 IR 문서 1개만 생성. **read-only — 코드/UI/API/DB/menu/tab/문구 미변경.**
- commit 시 본 IR 문서 1개만 path-restricted. `git add .` 금지.

---

> **상태**: read-only 조사 완료. 판정 = **C (컴포넌트 구조 이식 필요)**. KPA `HubB2BCatalogPage`(canonical DataTable+bulk, 유통유형 탭, "내 매장에 추가") vs GlycoPharm(로컬 B2BTableList, 품목 탭, "신청") — 별도 구현이며 데이터 소스는 동일. 정렬은 GlycoPharm frontend 단독 재구현(품목 탭 제거 + canonical DataTable + 문구/메뉴 정합), backend 무변경. 후속 = WO-O4O-GLYCOPHARM-STORE-HUB-B2B-CATALOG-KPA-ALIGNMENT-V1.
