---
id: IR-O4O-KPA-STORE-PRODUCTION-MATERIALS-CAPABILITY-AUDIT-V1
title: "KPA 매장 제작 자료 — 현재 자료함 구조 수용 가능성 조사"
status: draft
date: 2026-05-09
scope:
  - 현재 KPA "내 자료함" entity / API / UI 구조의 수용 가능성
  - "콘텐츠/자료/직접입력 → 편집/AI 정리 → 매장 제작 자료 → 사용처 결과물 → 결과물이 제작 자료 참조" canonical 흐름
  - 신규 entity 없이 도달 가능한 범위 vs 필드 추가 필요 영역 vs 구조적 부적합 영역 구분
related:
  - docs/investigations/IR-O4O-STORE-LIBRARY-CANONICAL-ASSET-FLOW-V1.md
  - docs/investigations/IR-O4O-COMMUNITY-TO-STORE-COPY-FLOW-AUDIT-V1.md
  - docs/investigations/IR-O4O-LMS-STORE-LIBRARY-INTEGRATION-V1.md
  - docs/investigations/IR-O4O-KPA-STORE-BLOG-SITE-ARCHITECTURE-V1.md
  - docs/architecture/STORE-LAYER-ARCHITECTURE.md
constraint:
  - 조사만 수행 — 코드/migration/entity 변경 없음
  - canonical 판단만 / 추정 금지 / 실제 코드 기준
---

# IR-O4O-KPA-STORE-PRODUCTION-MATERIALS-CAPABILITY-AUDIT-V1

> "매장 제작 자료" 라는 신규 canonical 개념을 현재 KPA 자료함 구조가
> **얼마만큼 수용 가능한지** 정적 조사. 코드 수정 / migration / 신규 entity 생성 없음.

- 작성일: 2026-05-09
- 기준 브랜치: `main` (`d120c273b` 시점, sync 완료)
- 자매 IR
  - [IR-O4O-STORE-LIBRARY-CANONICAL-ASSET-FLOW-V1](IR-O4O-STORE-LIBRARY-CANONICAL-ASSET-FLOW-V1.md) — 자료함 입력측(Community → Store) 흐름
  - [IR-O4O-COMMUNITY-TO-STORE-COPY-FLOW-AUDIT-V1](IR-O4O-COMMUNITY-TO-STORE-COPY-FLOW-AUDIT-V1.md) — 가져오기 정책/저장 비대칭
  - 본 IR — **자료함 출력측(Library → 사용처 결과물)** 흐름의 capability 진단

---

## 0. 결론 요약 (TL;DR)

> **신규 entity 없이도 "매장 제작 자료" 개념의 80% 는 수용 가능하다. 단 한 곳에서 막힌다 — *결과물이 제작 자료를 참조* 하는 단방향 reference 구조가 도메인별로 비대칭이다. POP/QR 은 `libraryItemId` 로 `store_library_items` 를 참조할 수 있으나, Blog (`store_blog_posts`) 와 AI 결과물 (`product_ai_content`) 은 source reference 필드가 부재. 또 POP 결과물은 *entity 자체가 없는 휘발성 PDF* 라 참조 대상이 될 수 없다. 따라서 canonical 결정은 — (a) "매장 제작 자료" 를 어떤 entity 에 위치시킬 것인가 (`kpa_store_contents` 재사용이 가장 자연스러움), (b) 결과물 4종에 source reference 필드를 통일할 것인가 (Blog / ProductAiContent 두 곳만 추가 필요), (c) POP 결과물을 휘발성 그대로 둘 것인가 vs entity 화 할 것인가 — 세 정책으로 압축된다.**

**핵심 발견 7가지**:

1. **"매장 제작 자료" 의 자연스러운 entity 위치 = `kpa_store_contents`** — 이미 `source_type` (`snapshot_edit` / `direct`), `content_json`, `share_status`, `updated_by` 를 보유 → 편집/AI/직접입력 결과를 모두 흡수 가능
2. **`content_json` (jsonb) 으로 인해 *컬럼 추가 없이* `purpose` / `stage` / `usageType` / `createdFrom` 같은 metadata 추가 가능** — migration 불필요
3. **결과물 source reference 비대칭** — POP/QR 은 `libraryItemId` 보유 ✅ / Blog 와 ProductAiContent 는 source 필드 ❌
4. **POP 결과물은 entity 부재** — `POST /pharmacy/pop/generate` 가 PDF 를 즉시 생성 후 응답 (휘발성). 결과물 리스트 자체가 존재하지 않음
5. **lifecycle 개념은 *분산되어 존재*** — `kpa_store_asset_controls.lifecycle_status` (`active`/`expired`/`archived`) + `kpa_store_contents.share_status` (`pending`/`approved`/`rejected`) + `store_blog_posts.status` (`draft`/`published`/`archived`) — 도메인별로 다른 명칭/값
6. **AssetSnapshot 은 *입력측 reference 메커니즘* 으로 이미 작동** — 결과물 reference 의 모범 패턴 (`sourceService` + `sourceAssetId` + jsonb) 이 이미 존재. Blog/AI 에 동일 패턴 적용 가능
7. **자료함 UI 는 inline 스타일 + 커스텀 list** — DataTable 미사용, Tab 추가 시 wrapper layout 필요. 단 batch toolbar 와 checkbox 패턴은 그대로 재사용 가능

**Phase 1 권장 우선순위**:
1. **canonical 판정 — `kpa_store_contents` = "매장 제작 자료" 통합 entity** (정책 결정만, 코드 변경 없음)
2. **결과물 source reference 통일 정책** — Blog / ProductAiContent 에 `source_material_id` 추가 여부
3. **POP 결과물 entity 화 정책 결정** — 휘발성 유지 vs 영속화
4. **자료함 UI 3탭 (콘텐츠 / 자료 / 제작 자료) 가능성 검토**

---

## 1. canonical 흐름 정의 (조사 기준)

```text
[입력]
 ├─ 가져온 콘텐츠 (snapshot)
 ├─ 가져온 강의 (lesson reference)
 ├─ 매장 자료 (file/external-link)
 └─ 직접 입력 (direct content)
        │
        ▼
[편집 / AI 정리]
 ├─ snapshot 편집 (kpa_store_contents.snapshot_edit)
 ├─ direct 작성 (kpa_store_contents.direct)
 └─ AI 정리 (product_ai_content)
        │
        ▼
[매장 제작 자료] ← 본 IR 의 핵심 canonical 신규 개념
        │
        ▼
[사용처 결과물 생성]
 ├─ POP
 ├─ QR
 ├─ 블로그
 └─ 상품 상세설명
        │
        ▼
[결과물 리스트가 제작 자료를 참조]
   sourceMaterialId → 매장 제작 자료 ID
```

→ 본 IR 은 *4 → 5 → 6* 단계가 현재 구조에서 **얼마만큼 작동 가능한지** 를 판정한다.

---

## 2. 현재 자료함 entity 구조 조사

### 2.1 entity 별 payload 수용 능력 매트릭스

| Entity | 파일 | title | body/content | html | json | image | metadata | external_url | AI text |
|--------|------|:-----:|:------------:|:----:|:----:|:-----:|:--------:|:------------:|:-------:|
| `o4o_asset_snapshots` | [asset-snapshot.entity.ts](packages/asset-copy-core/src/entities/asset-snapshot.entity.ts) | ✅ | jsonb | jsonb | ✅ | jsonb | jsonb | jsonb | jsonb |
| `kpa_store_contents` | [kpa-store-content.entity.ts](apps/api-server/src/routes/kpa/entities/kpa-store-content.entity.ts) | ✅ | jsonb | jsonb | ✅ | jsonb | jsonb | jsonb | jsonb |
| `store_library_items` | [store-library-item.entity.ts](apps/api-server/src/routes/platform/entities/store-library-item.entity.ts) | ✅ | description | htmlContent | ❌ | fileUrl | mimeType/fileSize | url | description |
| `store_execution_assets` | [store-execution-asset.entity.ts](apps/api-server/src/routes/platform/entities/store-execution-asset.entity.ts) | ✅ | description | htmlContent | ❌ | fileUrl | mimeType/usageType | url | htmlContent |
| `store_qr_codes` | [store-qr-code.entity.ts](apps/api-server/src/routes/platform/entities/store-qr-code.entity.ts) | ✅ | description | ❌ | ❌ | ❌ | ❌ | landingTargetId | ❌ |
| `staff_blog_posts` (KPA) / `store_blog_posts` (Glyco) | [store-blog-post.entity.ts](apps/api-server/src/routes/glycopharm/entities/store-blog-post.entity.ts) | ✅ | content | content (raw HTML) | ❌ | ❌ | ❌ | ❌ | content |
| `product_ai_contents` | [product-ai-content.entity.ts](apps/api-server/src/modules/store-ai/entities/product-ai-content.entity.ts) | ❌ | content | ❌ | ❌ | ❌ | model | ❌ | content (core) |

→ **jsonb 보유 entity 2종 (`o4o_asset_snapshots`, `kpa_store_contents`) 만이 *모든 payload 종류* 를 흡수 가능**.

### 2.2 source / reference 구조 매트릭스

| Entity | source 필드 | 의미 | 추가 reference 필드 |
|--------|-------------|------|--------------------|
| `o4o_asset_snapshots` | `sourceService` + `sourceAssetId` | 원본 community 자산 (FK 없음, soft) | — |
| `kpa_store_contents` | `snapshot_id` (nullable) + `source_type` (`snapshot_edit`/`direct`) | snapshot 편집 또는 직접 작성 | `shared_request_id` (HUB 승인) |
| `store_library_items` | `sourceType` (default `'uploaded'`) | 단순 origin 분류 ("어디서 왔나" 의미가 좁음) | — |
| `store_execution_assets` | `sourceType` (default `'uploaded'`) | 동일 | — |
| `store_qr_codes` | `libraryItemId` (FK 있음) + `landingTargetId` | source = library, target = landing | — |
| `staff_blog_posts` | ❌ 없음 | — | — |
| `product_ai_contents` | `productId` 만 | productId = **target** product (소스 아님) | — |

→ **source reference 가 잘 정의된 entity = `o4o_asset_snapshots`, `kpa_store_contents`, `store_qr_codes` 3종**. 나머지는 부재 또는 기능적으로 다른 의미.

### 2.3 "제작 원본 / 중간 편집 / AI 정리" 저장 가능성 판정

| 단계 | 저장 위치 후보 | 가능 여부 | 비고 |
|------|----------------|:--------:|------|
| **제작 원본 (snapshot)** | `o4o_asset_snapshots` | ✅ | 이미 canonical |
| **제작 원본 (직접 업로드 자료)** | `store_library_items` / `store_execution_assets` | ✅ | 이미 canonical |
| **중간 편집 결과 (snapshot 편집)** | `kpa_store_contents` (`source_type='snapshot_edit'`) | ✅ | 이미 canonical |
| **중간 편집 결과 (direct 작성)** | `kpa_store_contents` (`source_type='direct'`) | ✅ | 이미 canonical |
| **AI 정리 결과 (product 단위)** | `product_ai_contents` | ✅ | productId 기준만 (제품에 종속) |
| **AI 정리 결과 (제품 비종속)** | ❌ 부재 | **부분** | `kpa_store_contents` 로 수용 가능하나 AI metadata 명시적 필드 없음 |

→ **3 단계 중 "제품 비종속 AI 정리 결과" 만 명시적 위치가 모호**. `kpa_store_contents` + `content_json.ai_meta` 로 흡수 가능.

### 2.4 usageType / subtype / category 분포

| Entity | usageType | subtype | category | 비고 |
|--------|:---------:|:-------:|:--------:|------|
| `o4o_asset_snapshots` | `assetType` (`cms`/`signage`/`lesson`/`content`) | — | — | 4종 union |
| `kpa_store_contents` | ❌ | ❌ | ❌ | content_json 으로만 표현 |
| `store_library_items` | — | `assetType` (`file`/`content`/`external-link`) | `category` | category 자유서술 |
| `store_execution_assets` | `usageType` (`pop`/`qr`/`signage`/`banner`/`notice`) | `assetType` (`file`/`content`/`external-link`) | `category` | **3축 분류 보유** |
| `store_qr_codes` | `type` | `landingType` (`product`/`promotion`/`page`/`link`) | — | — |
| `staff_blog_posts` | ❌ | ❌ | ❌ | status 만 |
| `product_ai_contents` | `contentType` (`product_description`/`pop_short`/`pop_long`/`qr_description`/`signage_text`) | — | — | 5종 enum |

→ **`store_execution_assets` 가 가장 풍부한 분류 축 보유** (usageType + assetType + category). canonical 통일 시 reference model.

---

## 3. 현재 API 구조 조사

### 3.1 create / update payload 매트릭스

| API | 엔드포인트 | text/html 저장 | json 저장 | draft 지원 | source reference 필드 |
|-----|----------|:--------------:|:---------:|:----------:|----------------------|
| **storeLibrary** | `POST/PUT /pharmacy/library` | ✅ (`htmlContent`) | ❌ | ❌ | `sourceType` (문자열만) |
| **assetSnapshot copy** | `POST /assets/copy` | (resolver 가 채움) | ✅ (`contentJson`) | (간접: publishStatus) | `sourceService`+`sourceAssetId` (필수 입력) |
| **storeAssetControl** | `PATCH /store-assets/:id/publish` | — | (`channelMap`) | ✅ (`status='draft'`) | snapshot_id (path) |
| **directContent** | `POST /store-contents` | (jsonb) | ✅ (`contentJson`) | ❌ (status 컬럼 없음) | ❌ (`source_type='direct'` 만) |
| **storeContent** | `PUT /store-contents/:snapshotId` | (jsonb) | ✅ (`contentJson`) | ❌ | snapshot_id (path) |
| **productAiContent** | `PUT /products/:productId/ai-contents/:type` | ✅ (`content`) | ❌ | ❌ | productId (target, not source) |
| **blog** | `POST /stores/:slug/blog/staff` | ✅ (`content`) | ❌ | ✅ (`status='draft'`) | ❌ |
| **storeQr** | `POST /pharmacy/qr` | (`description`) | ❌ | ❌ | `libraryItemId` (선택) + `landingTargetId` |
| **storePop** | `POST /pharmacy/pop/generate` | — | — | ❌ (휘발성) | `libraryItemIds[]` + `supplierItemIds[]` (입력만) |

### 3.2 결과물 → 제작 자료 reference 가능성 판정

> "결과물 리스트 → 제작 자료 참조" 구조를 현재 시스템이 수용 가능한가?

| 결과물 도메인 | 결과물 entity | source reference 필드 존재 | 참조 대상 | 가능 여부 |
|--------------|---------------|:--------------------------:|---------|:--------:|
| **POP** | ❌ entity 자체 부재 (휘발성 PDF) | — | — | ❌ **불가 (entity 화 선행 필요)** |
| **QR** | `store_qr_codes` | ✅ `libraryItemId` (FK) | `store_library_items` 만 | **부분** (kpa_store_contents 못 가리킴) |
| **Blog** | `staff_blog_posts` | ❌ | — | ❌ (필드 추가 필요) |
| **상품 상세설명** | `product_ai_contents` | ❌ (productId 는 target) | — | ❌ (필드 추가 필요) |

**가장 큰 GAP**: 결과물 4종 중 *완전히 reference 가능한 것은 0종*. POP 은 entity 부재, QR 은 library_item 만 가리킴, Blog/AI 는 source 필드 자체 부재.

### 3.3 source reference 통일 후보 패턴

기존 `o4o_asset_snapshots` 패턴 (`sourceService` + `sourceAssetId`) 이 모범. 결과물 entity 에 동일 패턴 적용 시:

```text
source_material_service: 'kpa_store_contents' | 'store_library_items' | 'o4o_asset_snapshots'
source_material_id: UUID
```

→ 단 본 IR 은 조사만 수행. 실제 컬럼 추가는 정책 결정 후 별도 WO.

---

## 4. 자료함 UI 구조 조사

### 4.1 현재 탭 구조

[StoreLibraryContentsPage.tsx](services/web-kpa-society/src/pages/pharmacy/StoreLibraryContentsPage.tsx) (`/store/library/contents`) +
[StoreLibraryResourcesPage.tsx](services/web-kpa-society/src/pages/pharmacy/StoreLibraryResourcesPage.tsx) (`/store/library/resources`)

| 탭 | 라우트 | 데이터 source | 제작 시작 진입 |
|----|--------|--------------|:--------------:|
| **콘텐츠** | `/store/library/contents` | `o4o_asset_snapshots` + `kpa_store_contents` (direct) | ✅ |
| **자료** | `/store/library/resources` | `store_library_items` | ✅ |
| (제안) **매장 제작 자료** | `/store/library/production-materials` (가칭) | `kpa_store_contents` (편집+direct+AI 통합 view) | (제작 시작은 동일) |

→ **3번째 탭 추가는 cleanly 가능**. 단 현재 두 페이지가 독립 라우트이며 wrapper layout 부재 → tab navigation 컴포넌트 도입 필요 (소규모 UI 작업).

### 4.2 list schema 재사용 가능성

| 요소 | 콘텐츠 탭 | 자료 탭 | 제작 자료 탭 (제안) | 재사용 |
|------|----------|---------|---------------------|:------:|
| Checkbox + 전체 선택 | ✅ | ✅ | ✅ | **그대로** |
| Batch toolbar (제작 시작 / 선택 삭제) | ✅ | ✅ | ✅ | **그대로** |
| Section 분리 (직접 작성 vs 가져온) | ✅ (콘텐츠 탭) | ❌ | ✅ (확장 패턴 동일) | **그대로** |
| Type filter | (전체/콘텐츠/강의) | (없음) | (편집/직접/AI 정리) 가능 | **유사 패턴** |
| Metadata badge (assetType / category / lifecycle) | ✅ | ✅ | ✅ (purpose/stage 추가 가능) | **확장 가능** |
| DataTable 사용 | ❌ (커스텀 list) | ❌ (커스텀 list) | ❌ | (그대로 — 통일성 유지) |

→ **list schema 와 batch toolbar 는 거의 그대로 재사용 가능**.

### 4.3 제작 자료 전용 metadata 추가 가능성

| 추가 후보 | 추가 위치 | 방법 | migration 필요 |
|-----------|----------|------|:--------------:|
| `purpose` | `kpa_store_contents.content_json` | jsonb 키 | ❌ |
| `sourcePurpose` | 동일 | 동일 | ❌ |
| `stage` (`draft`/`finalized`/`reused`) | 동일 | 동일 | ❌ |
| `createdFrom` (`from_contents`/`from_resources`/`ai`/`direct`) | `source_type` 확장 또는 jsonb | 컬럼 확장 (선택) | (선택적) |

→ **`content_json` (jsonb) 덕분에 모든 신규 metadata 가 컬럼 추가 없이 즉시 추가 가능**.

### 4.4 제작 시작 entry point

`StartProductionModal.tsx` 가 이미 canonical 게이트:

| 결과물 | 라우트 | state.production 수신 | 자료함 → 결과물 단방향 |
|--------|--------|:---------------------:|:---------------------:|
| POP | `/store/marketing/pop` | ✅ | ✅ |
| QR | `/store/marketing/qr` | ✅ | ✅ |
| 블로그 | `/store/content/blog` | ✅ (auto-open editor + prefill) | ✅ |
| 상품 상세설명 | `/store/marketing/product-descriptions` | ✅ | ✅ |

→ **frontend 측 "자료함 → 결과물" 흐름은 이미 견고**. 단 backend reference 만 부재.

---

## 5. 결과물 참조 구조 조사

### 5.1 결과물 4종의 독립성 / source reference

| 결과물 | 독립 저장 | 현재 source reference | "매장 제작 자료" 참조 가능 여부 |
|--------|:--------:|----------------------|---------------------------------|
| **POP** | ❌ entity 없음 (휘발성 PDF) | 입력으로 `libraryItemIds[]` + `supplierItemIds[]` 받음 | ❌ entity 화 선행 필요 |
| **QR** | ✅ `store_qr_codes` | `libraryItemId` (단일 FK) | ⚠️ `library_items` 만 가리킴. `kpa_store_contents` 미지원 |
| **Blog** | ✅ `staff_blog_posts` / `store_blog_posts` | ❌ | ❌ 필드 추가 필요 |
| **상품 상세설명** | ✅ `product_ai_contents` | productId (target only) | ❌ 필드 추가 필요 |

### 5.2 POP 결과물 entity 화 정책 분기

POP 결과물은 현재 휘발성 PDF (`POST /pharmacy/pop/generate` 가 즉시 PDF 응답). canonical 흐름 5번째 단계 ("결과물 리스트") 를 만족하려면 두 가지 옵션:

| 옵션 | 설명 | 장단 |
|------|------|------|
| (a) 휘발성 유지 | POP 은 결과물 entity 없이 PDF 만 | 단순 / 결과물 reference 불가 |
| (b) `store_pop_outputs` entity 신규 | POP 생성 이력 + sourceMaterialIds 배열 저장 | 재사용/추적 가능 / **신규 entity 필요 (본 IR 범위 외 — 별도 WO)** |

→ **본 IR 은 정책만 제시**. 신규 entity 결정은 사용자 / WO 차원.

### 5.3 결과물 reference 통일 시 정합성

만약 결과물 4종이 모두 `source_material_id` (또는 동등 필드) 를 가지면:
- ✅ "결과물 리스트가 제작 자료를 참조" canonical 흐름 완성
- ✅ "제작 자료 1개 → 결과물 N개" 1:N 추적 가능
- ✅ 제작 자료 삭제 시 cascade 정책 결정 가능
- ⚠️ POP 은 entity 화 또는 휘발성 명시 둘 중 하나로 결정 필요

---

## 6. 재사용 가능 canonical 후보 매트릭스

### 6.1 분류

| 구분 | 항목 | 결정 |
|------|------|------|
| **A. 즉시 재사용 가능 구조** | `kpa_store_contents` 를 "매장 제작 자료" 통합 entity 로 canonical 선언 | content_json + source_type 만으로 충분 |
| **A.** | `o4o_asset_snapshots` 의 `sourceService`+`sourceAssetId` 패턴 (결과물 reference 모범) | — |
| **A.** | `StartProductionModal` (자료함 → 결과물 게이트) | — |
| **A.** | 자료함 UI batch toolbar / checkbox / section 분리 패턴 | — |
| **B. 약간의 필드 추가로 가능 (migration 1회)** | `staff_blog_posts` 에 `source_material_id` 추가 | (정책 결정 후 별도 WO) |
| **B.** | `product_ai_contents` 에 `source_material_id` 추가 | (동일) |
| **B.** | `store_qr_codes.libraryItemId` → `source_material_id` 로 의미 확장 (또는 별도 컬럼) | (동일) |
| **B.** | `kpa_store_contents.content_json` 에 `purpose`/`stage`/`usageType` 키 정착 | jsonb → migration 불필요 |
| **C. 구조적으로 부적합한 영역** | `store_library_items` 를 "매장 제작 자료" 로 사용 | 파일 중심 schema 라 편집/AI 흐름과 mismatch |
| **C.** | `o4o_asset_snapshots` 를 "매장 제작 자료" 로 사용 | snapshot 은 read-mostly 시점-고정. 편집 결과는 `kpa_store_contents` 가 정확 |
| **C.** | POP 결과물 reference (현 휘발성) | entity 화 또는 휘발성 명시 둘 중 결정 필요 |
| **D. 신규 entity 필요할 수 있는 경우** | POP 결과물 영속화 (`store_pop_outputs` 가칭) | 정책 결정 시 |
| **D.** | "제작 자료 ↔ 결과물 N:N 매핑" 별도 link table | 1:N 만 필요하면 불필요 |

### 6.2 권장 canonical 매핑

```text
┌─────────────────────────────────────────────────────────┐
│  매장 제작 자료 = kpa_store_contents (canonical)        │
│  (source_type: snapshot_edit / direct / ai_organized*)  │
│  (* ai_organized 는 추후 확장)                          │
└─────────────────────────────────────────────────────────┘
            │
            ├──── (참조 by source_material_id) ────────┐
            │                                          │
            ▼                                          ▼
  [POP 결과물 — 현 휘발성]              [QR / Blog / ProductAi]
  entity 화 정책 결정 필요              source_material_id 필드 추가 정책 결정
```

---

## 7. lifecycle 개념 조사

### 7.1 도메인별 lifecycle 분포

| Entity | lifecycle 필드 | 값 | 위치 |
|--------|----------------|----|------|
| `kpa_store_asset_controls` (V3) | `lifecycle_status` | `active` / `expired` / `archived` | snapshot 운영 제어 layer |
| `kpa_store_asset_controls` | `publish_status` | `draft` / `published` / `hidden` | snapshot publish 상태 |
| `kpa_store_contents` | `share_status` | `pending` / `approved` / `rejected` / null | HUB 공유 승인 상태 |
| `staff_blog_posts` / `store_blog_posts` | `status` | `draft` / `published` / `archived` | 블로그 발행 상태 |
| `store_library_items` | `isActive` | boolean | 단순 활성/소프트 삭제 |
| `store_execution_assets` | `isActive` | boolean | 동일 |
| `store_qr_codes` | `isActive` | boolean | 동일 |
| `o4o_asset_snapshots` | (없음) | — | 자체 lifecycle 부재. controls 가 대신 보유 |
| `product_ai_contents` | (없음) | — | 단일 row upsert 패턴 |

### 7.2 canonical 흐름 lifecycle 매핑

> "draft → finalized → reused → archived" lifecycle 가 이미 부분적으로 존재하는가?

| 단계 | 매핑 후보 | 현 시스템 명칭 |
|------|----------|---------------|
| `draft` | publish_status=`draft` (snapshot) / blog status=`draft` | ✅ 부분 존재 |
| `finalized` | publish_status=`published` / share_status=`approved` / blog status=`published` | ✅ 부분 존재 (도메인별 명칭 다름) |
| `reused` | (결과물 entity 의 source_material_id 가 이 자료를 가리키는 row 존재 여부로 도출) | ❌ derived field 부재 |
| `archived` | lifecycle_status=`archived` / blog status=`archived` | ✅ 부분 존재 |

→ **lifecycle 개념 자체는 모두 존재하나 *명칭 / 위치 / 의미가 도메인별로 분산***. canonical 통일 시 우선순위 낮음 (운영적 영향 작음).

### 7.3 "매장 제작 자료" lifecycle 위치 제안

`kpa_store_contents` 가 canonical 이 되면:
- `share_status` (현 HUB 공유) 와는 별개로 자체 `material_status` (`draft`/`finalized`/`archived`) 추가 검토 가능
- 또는 `content_json.stage` 로 jsonb 흡수 (migration 불필요)

→ **본 IR 은 정책만 제시**.

---

## 8. 최종 정리

### 8.1 현재 자료함 구조의 "매장 제작 자료" 수용 가능 여부

| 축 | 수용 가능? | 비고 |
|----|:---------:|------|
| **A. 입력 (콘텐츠/자료/직접입력)** | ✅ 완전 수용 | 4 entity (`o4o_asset_snapshots`, `kpa_store_contents`, `store_library_items`, `store_execution_assets`) 로 분담 |
| **B. 편집/AI 정리** | ✅ 거의 완전 수용 | `kpa_store_contents` (편집/direct) + `product_ai_contents` (제품 AI). 제품 비종속 AI 만 부분 |
| **C. 매장 제작 자료 저장** | ✅ 신규 entity 없이 가능 | `kpa_store_contents` 재사용 + `content_json.purpose`/`stage`/`usageType` jsonb |
| **D. 사용처 결과물 생성** | ⚠️ 부분 | POP 휘발성 (entity 부재) / QR·Blog·AI 는 결과물 entity 있음 |
| **E. 결과물이 제작 자료 참조** | ❌ **현재 불가 (도메인별 비대칭)** | QR 만 부분 (`libraryItemId`), Blog/AI 는 필드 부재, POP 은 entity 자체 부재 |

→ **종합 판정**: *"매장 제작 자료" 의 80% 는 현재 구조로 수용 가능. 마지막 20% (결과물 → 제작 자료 reference) 만 정책/필드 결정 필요*.

### 8.2 추천 canonical 구조

```text
[입력 layer] (이미 canonical)
  o4o_asset_snapshots / kpa_store_contents.direct /
  store_library_items / store_execution_assets

         ↓ (편집 / AI 정리)

[매장 제작 자료 = kpa_store_contents] ← canonical 신규 선언
  - source_type: snapshot_edit / direct / (ai_organized 확장)
  - content_json.purpose / stage / usageType (jsonb 즉시 추가 가능)
  - share_status (HUB 공유와 분리 유지)

         ↓ (StartProductionModal — 이미 canonical)

[결과물 layer]
  store_qr_codes      — libraryItemId 의미 확장 또는 source_material_id 추가
  staff_blog_posts    — source_material_id 신규 (정책 결정)
  product_ai_contents — source_material_id 신규 (정책 결정)
  POP 결과물          — 휘발성 유지 OR store_pop_outputs entity 신규 (정책 결정)
```

### 8.3 재사용 가능 entity / API 매트릭스

| 자원 | 재사용 가능 | 의미 변경/확장 필요 | 신규 필요 |
|------|:----------:|:------------------:|:--------:|
| `kpa_store_contents` entity | ✅ | (`source_type` enum 확장 가능) | — |
| `o4o_asset_snapshots` entity | ✅ | — | — |
| `store_library_items` entity | ✅ | — | — |
| `store_execution_assets` entity | ✅ | — | — |
| `kpa_store_asset_controls` entity | ✅ | — | — |
| `store_qr_codes` entity | ⚠️ | `libraryItemId` 의미 확장 또는 `source_material_*` 추가 | — |
| `staff_blog_posts` entity | ⚠️ | `source_material_*` 추가 필요 | — |
| `product_ai_contents` entity | ⚠️ | `source_material_*` 추가 필요 | — |
| POP 결과물 entity | ❌ | — | (정책 결정 후 신규 가능) |
| storeContent API | ✅ | — | — |
| assetSnapshot copy API | ✅ | — | — |
| storeLibrary API | ✅ | — | — |
| productAiContent API | ⚠️ | source_material_id 입력 필드 추가 | — |
| blog API | ⚠️ | source_material_id 입력 필드 추가 | — |
| storeQr API | ⚠️ | source_material_id 매핑 결정 | — |
| storePop API | ⚠️ | (영속화 정책 결정 시 변경) | — |
| StartProductionModal UI | ✅ | — | — |
| 자료함 list/batch UI | ✅ | (3번째 탭 추가 시 wrapper layout 신규) | — |

### 8.4 부족한 필드 / 구조

| 항목 | 위치 | 추가 방법 | migration 필요 |
|------|------|----------|:--------------:|
| `purpose` | `kpa_store_contents.content_json` | jsonb 키 | ❌ |
| `stage` | 동일 또는 별도 컬럼 | jsonb 키 (1차) → 컬럼 (필요시) | (선택) |
| `sourcePurpose` | `kpa_store_contents.content_json` | jsonb 키 | ❌ |
| `createdFrom` | `kpa_store_contents.source_type` 확장 OR `content_json` | enum 확장 OR jsonb | (선택) |
| `source_material_id` (Blog) | `staff_blog_posts` | 신규 컬럼 | ✅ |
| `source_material_id` (ProductAi) | `product_ai_contents` | 신규 컬럼 | ✅ |
| `source_material_service` (Blog/ProductAi) | 동일 | 신규 컬럼 | ✅ |
| POP 결과물 entity | 신규 | 신규 entity | (정책 결정 시) |

### 8.5 결과물 reference 가능 여부 종합

| 결과물 | 현재 가능 | 컬럼 추가 후 가능 | 신규 entity 후 가능 |
|--------|:--------:|:-----------------:|:-------------------:|
| POP | ❌ | ❌ (entity 부재) | ✅ (영속화 시) |
| QR | ⚠️ (library_items 만) | ✅ (의미 확장) | — |
| Blog | ❌ | ✅ | — |
| 상품 상세설명 | ❌ (productId 만 target) | ✅ | — |

### 8.6 신규 entity 없이 가능한 범위

> *"신규 entity 없이도 90% 의 canonical 흐름이 작동 가능하다."*

- ✅ "매장 제작 자료 = `kpa_store_contents`" 선언 — 0 migration
- ✅ `content_json.purpose` / `stage` / `usageType` jsonb 정착 — 0 migration
- ✅ 자료함 3번째 탭 추가 — 0 migration (UI 만)
- ✅ StartProductionModal 게이트 — 0 변경
- ⚠️ Blog / ProductAi 결과물 ↔ 제작 자료 reference — **migration 1회 필요** (소규모)
- ⚠️ QR 결과물 ↔ 제작 자료 reference — **의미 확장 OR migration 1회**
- ❌ POP 결과물 영속화 — **신규 entity 필요** (정책 결정 시)

### 8.7 향후 분리 필요 가능성

| 시점 | 분리 후보 | 이유 |
|------|----------|------|
| **단기** | (없음) | 현 통합 entity (`kpa_store_contents`) 가 충분 |
| **중기** | "매장 제작 자료" 와 "매장 편집 콘텐츠" 의미 분리 | content_json.stage 가 늘어나면 검색/조회 부담 |
| **장기** | POP 결과물 entity 분리 | 영속화 + 재발행 + 통계 요구가 생기면 |
| **장기** | "제작 자료 ↔ 결과물" link table | 1개 자료 → N개 결과물 + N개 자료 → 1개 결과물 (N:N) 시 |

---

## 9. 정책 결정 필요 항목

| # | 결정 | 옵션 |
|---|------|------|
| 1 | **"매장 제작 자료" canonical entity 선택** | (a) `kpa_store_contents` 재사용 ← 권장 / (b) 신규 `store_production_materials` entity |
| 2 | **결과물 → 제작 자료 reference 통일 정책** | (a) Blog/AI 에 `source_material_id` 추가 + QR 의미 확장 / (b) 휘발성 유지 (단방향만) |
| 3 | **POP 결과물 영속화** | (a) 휘발성 유지 (신규 entity 없음) / (b) `store_pop_outputs` entity 신규 |
| 4 | **자료함 3번째 탭 도입** | (a) 별도 탭 (`/store/library/production-materials`) / (b) 콘텐츠 탭 내 필터로 통합 |
| 5 | **lifecycle 통일** | (a) 도메인별 명칭 그대로 (`status`/`share_status`/`lifecycle_status` 분산) / (b) `material_status` 통합 |
| 6 | **`source_type` enum 확장** | (a) `ai_organized` 추가 / (b) 모든 신규 case 는 `content_json` 으로 흡수 |

---

## 10. 후속 WO 후보 (정책 결정 후)

| 우선순위 | WO 후보 | 작업 범위 | 의존 |
|:---:|---|---|---|
| **1** | **WO-O4O-KPA-PRODUCTION-MATERIAL-CANONICAL-DECLARATION-V1** | "매장 제작 자료 = `kpa_store_contents`" canonical 선언 IR / docs 갱신 (코드 변경 없음) | (정책 1) |
| **2** | **WO-O4O-RESULT-SOURCE-MATERIAL-REFERENCE-ALIGN-V1** | Blog / ProductAiContent 에 `source_material_id` + `source_material_service` 컬럼 추가 (migration) | (정책 2) |
| **3** | **WO-O4O-QR-LIBRARY-REFERENCE-EXPANSION-V1** | `store_qr_codes.libraryItemId` 의미 확장 또는 `source_material_id` 신규 | (정책 2) |
| **4** | **WO-O4O-KPA-STORE-LIBRARY-3RD-TAB-V1** | 자료함 wrapper layout + 3번째 탭 (제작 자료) UI 도입 | (정책 1, 4) |
| **5** | **WO-O4O-POP-OUTPUT-ENTITY-DECISION-V1** | POP 결과물 영속화 vs 휘발성 정책 IR | (정책 3) |
| **6** | **WO-O4O-PRODUCTION-MATERIAL-LIFECYCLE-UNIFICATION-V1** | lifecycle 통일 (선택) | (정책 5) |

---

## 11. 핵심 질문 답변 매트릭스

| 질문 | 답 |
|------|---|
| Q1. 현재 자료함 구조가 "매장 제작 자료" 를 수용 가능? | ✅ 80% 즉시 수용 (`kpa_store_contents` + `content_json` jsonb). 결과물 reference 만 도메인별 비대칭 |
| Q2. 신규 entity 필요? | ❌ "매장 제작 자료" 자체는 불필요 (`kpa_store_contents` 재사용). POP 결과물 영속화 시만 신규 검토 |
| Q3. 제작 원본 / 중간 편집 / AI 정리 저장 가능? | ✅ 모두 기존 entity 로 분담 가능. 제품 비종속 AI 만 `kpa_store_contents` 흡수 정책 결정 필요 |
| Q4. text/html/json/draft 저장 가능? | jsonb 보유 entity 2종 (`o4o_asset_snapshots`, `kpa_store_contents`) 은 모든 payload 흡수. `staff_blog_posts` 는 draft 지원 |
| Q5. 결과물 entity 가 제작 자료 참조 가능? | POP ❌ entity 부재 / QR ⚠️ library_items 만 / Blog ❌ / ProductAi ❌ — **컬럼 추가 정책 결정 필요** |
| Q6. 자료함 3번째 탭 추가 가능? | ✅ cleanly 가능. wrapper layout 신규만 필요 |
| Q7. list schema / batch toolbar 재사용 가능? | ✅ 그대로 재사용 가능 |
| Q8. usageType / subtype / category 추가 가능? | ✅ `kpa_store_contents.content_json` 으로 0 migration. 또는 `store_execution_assets` 패턴 (`usageType`+`assetType`+`category`) 참고 |
| Q9. lifecycle 개념 존재? | ✅ 부분적 존재 (도메인별 분산). draft / finalized / archived 매핑 가능. `reused` 는 derived field |
| Q10. 자료함 → 결과물 단방향 흐름 견고? | ✅ frontend (`StartProductionModal`) 는 canonical. backend reference 만 부재 |
| Q11. POP 결과물 자체가 제작 자료를 참조? | ❌ POP 은 entity 없는 휘발성 PDF — 영속화 정책 결정 선행 필요 |
| Q12. 가장 큰 GAP? | **결과물 → 제작 자료 reference 도메인별 비대칭** (POP entity 부재 / QR 부분 / Blog·AI 필드 부재) |
| Q13. 본 IR 권장 우선순위? | (1) `kpa_store_contents` canonical 선언 → (2) Blog/AI source_material_id 추가 → (3) POP 영속화 정책 → (4) 3번째 탭 |

---

## 부록 A. 핵심 파일 인벤토리

### Entity
- [packages/asset-copy-core/src/entities/asset-snapshot.entity.ts](packages/asset-copy-core/src/entities/asset-snapshot.entity.ts) — `o4o_asset_snapshots`
- [apps/api-server/src/routes/kpa/entities/kpa-store-content.entity.ts](apps/api-server/src/routes/kpa/entities/kpa-store-content.entity.ts) — `kpa_store_contents`
- [apps/api-server/src/routes/platform/entities/store-library-item.entity.ts](apps/api-server/src/routes/platform/entities/store-library-item.entity.ts) — `store_library_items`
- [apps/api-server/src/routes/platform/entities/store-execution-asset.entity.ts](apps/api-server/src/routes/platform/entities/store-execution-asset.entity.ts) — `store_execution_assets`
- [apps/api-server/src/routes/platform/entities/store-qr-code.entity.ts](apps/api-server/src/routes/platform/entities/store-qr-code.entity.ts) — `store_qr_codes`
- [apps/api-server/src/routes/glycopharm/entities/store-blog-post.entity.ts](apps/api-server/src/routes/glycopharm/entities/store-blog-post.entity.ts) — `store_blog_posts` (Glyco) / `staff_blog_posts` (KPA)
- [apps/api-server/src/modules/store-ai/entities/product-ai-content.entity.ts](apps/api-server/src/modules/store-ai/entities/product-ai-content.entity.ts) — `product_ai_contents`

### API Controller
- [apps/api-server/src/routes/o4o-store/controllers/store-library.controller.ts](apps/api-server/src/routes/o4o-store/controllers/store-library.controller.ts)
- [apps/api-server/src/routes/o4o-store/controllers/asset-snapshot.controller.ts](apps/api-server/src/routes/o4o-store/controllers/asset-snapshot.controller.ts)
- [apps/api-server/src/routes/o4o-store/controllers/store-content.controller.ts](apps/api-server/src/routes/o4o-store/controllers/store-content.controller.ts)
- [apps/api-server/src/routes/o4o-store/controllers/store-qr-landing.controller.ts](apps/api-server/src/routes/o4o-store/controllers/store-qr-landing.controller.ts)
- [apps/api-server/src/routes/o4o-store/controllers/store-pop.controller.ts](apps/api-server/src/routes/o4o-store/controllers/store-pop.controller.ts)
- [apps/api-server/src/routes/o4o-store/controllers/blog.controller.ts](apps/api-server/src/routes/o4o-store/controllers/blog.controller.ts)
- [apps/api-server/src/modules/store-ai/controllers/product-ai-content.controller.ts](apps/api-server/src/modules/store-ai/controllers/product-ai-content.controller.ts)

### Frontend
- [services/web-kpa-society/src/pages/pharmacy/StoreLibraryContentsPage.tsx](services/web-kpa-society/src/pages/pharmacy/StoreLibraryContentsPage.tsx)
- [services/web-kpa-society/src/pages/pharmacy/StoreLibraryResourcesPage.tsx](services/web-kpa-society/src/pages/pharmacy/StoreLibraryResourcesPage.tsx)
- [services/web-kpa-society/src/pages/pharmacy/StoreContentEditPage.tsx](services/web-kpa-society/src/pages/pharmacy/StoreContentEditPage.tsx)
- [services/web-kpa-society/src/pages/pharmacy/StartProductionModal.tsx](services/web-kpa-society/src/pages/pharmacy/StartProductionModal.tsx)
- [services/web-kpa-society/src/pages/pharmacy/PharmacyBlogPage.tsx](services/web-kpa-society/src/pages/pharmacy/PharmacyBlogPage.tsx)
- [services/web-kpa-society/src/api/storeLibrary.ts](services/web-kpa-society/src/api/storeLibrary.ts)
- [services/web-kpa-society/src/api/assetSnapshot.ts](services/web-kpa-society/src/api/assetSnapshot.ts)
- [services/web-kpa-society/src/api/productAiContent.ts](services/web-kpa-society/src/api/productAiContent.ts)
- [services/web-kpa-society/src/api/blogStaff.ts](services/web-kpa-society/src/api/blogStaff.ts)
- [services/web-kpa-society/src/api/storeQr.ts](services/web-kpa-society/src/api/storeQr.ts)

### Canonical / Architecture 문서
- [docs/architecture/STORE-LAYER-ARCHITECTURE.md](docs/architecture/STORE-LAYER-ARCHITECTURE.md)
- [docs/baseline/STORE-LOCAL-PRODUCT-BOUNDARY-POLICY-V1.md](docs/baseline/STORE-LOCAL-PRODUCT-BOUNDARY-POLICY-V1.md)
- [docs/investigations/IR-O4O-STORE-LIBRARY-CANONICAL-ASSET-FLOW-V1.md](IR-O4O-STORE-LIBRARY-CANONICAL-ASSET-FLOW-V1.md)
- [docs/investigations/IR-O4O-COMMUNITY-TO-STORE-COPY-FLOW-AUDIT-V1.md](IR-O4O-COMMUNITY-TO-STORE-COPY-FLOW-AUDIT-V1.md)

---

*IR-O4O-KPA-STORE-PRODUCTION-MATERIALS-CAPABILITY-AUDIT-V1*
*Updated: 2026-05-09*
*Status: Investigation Complete — 정책 결정 + 후속 WO 분기 대기 (변경 없음)*
