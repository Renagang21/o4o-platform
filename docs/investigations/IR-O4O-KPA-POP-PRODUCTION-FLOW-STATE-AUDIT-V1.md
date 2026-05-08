# IR-O4O-KPA-POP-PRODUCTION-FLOW-STATE-AUDIT-V1

> **KPA POP 화면 실제 구조·흐름 조사**
> 작성일: 2026-05-09
> 상태: READ-ONLY 조사 완료
> 목적: 현재 KPA POP의 메뉴/라우트/UI/흐름/저장 구조를 식별하고, 직전 WO들 이후 실제 active 경로와 dead/mock 경로를 분리하여 canonical 흐름 정렬에 필요한 fact base를 만든다.
>
> ⚠️ **이번 단계는 "조사"만 수행한다. canonical 흐름은 §7에 후보로 기술하되 구현 미수행.**

---

## 0. 조사 방법

| 항목 | 내용 |
|------|------|
| 1차 소스 | `services/web-kpa-society/src/pages/pharmacy/StorePopPage.tsx`, `ProductPopBuilderPage.tsx`, `StartProductionModal.tsx`, `components/store/StoreAssetSelectorModal.tsx`, `components/store/StoreQRCreateEntryModal.tsx` |
| 메뉴/라우트 | `packages/store-ui-core/src/config/storeMenuConfig.ts`, `services/web-kpa-society/src/App.tsx` |
| 백엔드 | `apps/api-server/src/routes/o4o-store/controllers/store-pop.controller.ts`, `routes/platform/entities/store-execution-asset.entity.ts`, `modules/store-ai/controllers/product-ai-content.controller.ts`, `services/pop-generator.service.ts`, `modules/store-ai/services/product-pop-pdf.service.ts` |
| 검증 방식 | 직접 파일 read + grep("POP 자료", "자료 추가", "POP 디스플레이에 사용할", "/marketing/pop", "/store/commerce/products/.*/pop", "StoreExecutionAsset") + import 그래프 추적 |
| 추정 금지 원칙 | 코드에 없는 흐름·entity·route는 보고하지 않음. dead/mock은 명시적으로 표시 |

---

## 1. POP 메뉴/라우트/UI 구조

### 1-1. 사이드바 메뉴

| 항목 | 위치 | 값 |
|------|------|-----|
| 그룹 | `storeMenuConfig.ts:221-229` (KPA_SOCIETY_STORE_CONFIG `매장 실행`) | `매장 실행` |
| key | `storeMenuConfig.ts:224` | `pop` |
| 라벨 | `storeMenuConfig.ts:224` | `POP` (직전 WO에서 "POP 자료" → "POP"으로 정리) |
| subPath | `storeMenuConfig.ts:224` | `/marketing/pop` |

### 1-2. Route 등록

| Route | Element | File:Line |
|-------|---------|-----------|
| `/store/marketing/pop` | `StorePopPage` | [App.tsx:837](services/web-kpa-society/src/App.tsx#L837) |
| `/store/commerce/products/:productId/pop` | `ProductPopBuilderPage` | [App.tsx:855](services/web-kpa-society/src/App.tsx#L855) |
| `/store/pop` (legacy) | Navigate → `/store/marketing/pop` | [App.tsx:871](services/web-kpa-society/src/App.tsx#L871) |

→ POP은 **2개 분리된 페이지**가 존재:
- 매장 단위 POP — StorePopPage
- 상품 단위 POP — ProductPopBuilderPage (상품 마케팅 화면 내부 진입)

사이드바 `매장 실행 → POP`은 StorePopPage만 가리키며, ProductPopBuilderPage는 사이드바 미노출 (상품 상세 페이지에서만 진입).

### 1-3. 페이지 헤더 / breadcrumb / title / empty state

[StorePopPage.tsx:166-188](services/web-kpa-society/src/pages/pharmacy/StorePopPage.tsx#L166):

| 요소 | 값 | 정합성 |
|------|------|--------|
| Breadcrumb 1 | `매장 관리` (Link → `/store`) | 사이드바 그룹 라벨(`매장 실행`)과 **불일치** |
| Breadcrumb 2 | `POP 자료` | 사이드바 라벨(`POP`)과 **불일치** |
| `<h1>` | `POP 자료 관리` | 사이드바 라벨(`POP`)과 **불일치** |
| Subtitle | `선택된 자료에 QR 코드를 연결하여 POP 광고를 PDF로 출력합니다` | — |
| Empty state line 1 | `선택된 자료가 없습니다` | — |
| Empty state line 2 | `"내 자료함 → 자료" 또는 "내 자료함 → 콘텐츠"에서 자료를 선택해 "제작 시작 → POP"으로 진입하세요.` | 직전 WO의 흐름과 정합 |

→ "POP 자료" 문자열은 [StorePopPage.tsx:171](services/web-kpa-society/src/pages/pharmacy/StorePopPage.tsx#L171), `<h1>` "POP 자료 관리"는 [StorePopPage.tsx:173](services/web-kpa-society/src/pages/pharmacy/StorePopPage.tsx#L173)에 잔존.

### 1-4. 버튼

[StorePopPage.tsx](services/web-kpa-society/src/pages/pharmacy/StorePopPage.tsx) 내부:

| 버튼 | 위치 | 상태 |
|------|------|------|
| `자료 추가` (Plus + 모달 트리거) | 이전 코드 | **제거됨** (WO-O4O-KPA-STORE-PRODUCTION-ENTRY-CANONICAL-CORRECTION-V1) |
| 카드별 `removeBtn` (Trash2) | line 228-230 | active |
| `POP PDF 생성 (N개)` | line 285-295 | active |

→ 페이지에는 **신규 진입 버튼이 부재**. 자료는 오직 `location.state`로만 유입.

### 1-5. Modal 연결 흐름

| Modal | StorePopPage 사용 | 다른 페이지 사용 |
|-------|-------------------|------------------|
| `StoreQRCreateEntryModal` | **제거됨** (직전 WO) | StoreQRPage `자료 변경` 시점에서만 잔존 |
| `StoreAssetSelectorModal` | **제거됨** (직전 WO) | StoreQRPage(QR 자료 선택), StoreSignagePage(사이니지 자료 선택)에서 active |
| `StartProductionModal` | StorePopPage가 직접 사용 안 함. 본 페이지로 navigate해 들어옴 | 자료함 페이지(StoreLibraryContentsPage / StoreLibraryResourcesPage)에서 active |

`StoreAssetSelectorModal`은 컴포넌트로서 살아 있고 `usageType='pop'` 필터까지 지원 (`StoreAssetSelectorModal.tsx:152-154`). 단, StorePopPage에서는 import 자체가 끊김.

---

## 2. 현재 "자료 추가" 흐름 (직전 WO 후 현 상태)

### 2-1. 진입 경로

`StorePopPage`가 자료를 받는 경로는 **2개 location.state 형식**:

#### 경로 A — 레거시 단건 ([StorePopPage.tsx:79-90](services/web-kpa-society/src/pages/pharmacy/StorePopPage.tsx#L79))

```ts
state.selectedLibraryItem = { id, title, category, fileUrl, assetType, url, ... }
```

→ 즉시 `popItems`에 push. 별도 fetch 없음.

이 state를 set하는 코드는 **현재 KPA 코드베이스 어디에도 없음** (이전엔 `StoreLibraryNewPage` 자동 복귀 시 사용했던 것으로 보이는 흔적). → **dead path** (코드는 살아있으나 트리거 없음).

#### 경로 B — 제작 시작 (active) ([StorePopPage.tsx:93-122](services/web-kpa-society/src/pages/pharmacy/StorePopPage.tsx#L93))

```ts
state.production = {
  source: { fromLibrary: 'contents'|'resources', items: [{id, title, description?, origin}] },
  target: 'pop' | 'qr' | 'blog' | 'product-description',
  template: 'default',
  aiPrefillRequested: true,
}
```

→ `incoming.filter(it => it.origin === 'library')` 후 `getStoreLibraryItem(it.id)` 단건 fetch 반복 → `popItems` 추가.

State setter: `StartProductionModal` ([StartProductionModal.tsx:80-93](services/web-kpa-society/src/pages/pharmacy/StartProductionModal.tsx#L80))이 `navigate('/store/marketing/pop', { state })`로 set.

### 2-2. Source 처리 — 누락된 케이스

`StorePopPage`의 production 처리는 **`origin === 'library'`만 통과**:

```ts
const libraryItems = incoming.filter((it) => it.origin === 'library');  // line 96
```

→ 자료함의 **콘텐츠 페이지에서 선택한 항목**(origin='snapshot' or 'direct')은 무시됨.
- StoreLibraryContentsPage에서 콘텐츠 선택 → 제작 시작 → POP 진입 시 `popItems`에 아무것도 추가되지 않음 → 빈 화면
- 즉 "내 자료함 → 콘텐츠 → POP" 흐름은 **fail-silent**

### 2-3. Source 데이터 source

| Origin | Backend entity | 사용 여부 in StorePopPage |
|--------|----------------|--------------------------|
| `library` | `StoreExecutionAsset` (구 `store_library_items`) — `getStoreLibraryItem` | active |
| `snapshot` | `o4o_asset_snapshots` (storeAssetControlApi) | **drop** |
| `direct` | `kpa_store_contents` (directContentApi) | **drop** |
| Dashboard asset (`/dashboard/assets`) | `o4o_asset_snapshots` 별도 view | StorePopPage 미사용 |

→ StorePopPage는 **자료함의 "자료" 페이지 항목만 처리 가능**. 다른 origin은 silent drop.

### 2-4. 자료 추가 모달의 구 흐름 (참고)

직전 WO 이전 흐름 (이제 dead):

```
"자료 추가" 버튼
  → StoreQRCreateEntryModal (2-choice "기존 자료 선택" / "새 자산 만들기")
      → 기존 자료 선택 → StoreAssetSelectorModal (StoreExecutionAsset 검색·페이지네이션·선택)
      → 새 자산 만들기 → navigate('/store/content') (StoreAssetsPage)
```

이 코드 경로는 StorePopPage에서 잘렸으나 StoreQRCreateEntryModal·StoreAssetSelectorModal 자체는 다른 페이지에서 사용 중이므로 컴포넌트 제거 불가.

---

## 3. 내 자료함 연결 가능성

### 3-1. 자료함 페이지 selection 구조

| 페이지 | Selection 구조 | Payload origin | 파일 |
|--------|----------------|----------------|------|
| StoreLibraryContentsPage | `Set<SelectionKey>` (key=`${origin}:${id}`) | `snapshot` (asset_snapshots), `direct` (kpa_store_contents) | [StoreLibraryContentsPage.tsx](services/web-kpa-society/src/pages/pharmacy/StoreLibraryContentsPage.tsx) |
| StoreLibraryResourcesPage | `Set<id>` | `library` (StoreExecutionAsset) | [StoreLibraryResourcesPage.tsx](services/web-kpa-society/src/pages/pharmacy/StoreLibraryResourcesPage.tsx) |

### 3-2. Batch toolbar / 제작 시작 버튼

두 페이지 모두 동일 패턴 ([StoreLibraryContentsPage.tsx:111-143](services/web-kpa-society/src/pages/pharmacy/StoreLibraryContentsPage.tsx#L111)):
- 전체 선택 checkbox
- 선택 카운트 (`{selected.size}/{totalCount}`)
- `제작 시작` 버튼 → `StartProductionModal` open
- `선택 삭제` 버튼

→ **재사용 가능**. POP 제작용 source selector 별도 신설 불필요.

### 3-3. 선택 payload → StartProductionModal → POP 흐름

```text
[자료함] selected → ProductionSourceItem[] = [{id, title, description?, origin}]
   ↓
[StartProductionModal] target='pop' 선택 → navigate('/store/marketing/pop', { state.production })
   ↓
[StorePopPage] location.state 수신
   ↓ (현재 origin='library'만 통과)
   getStoreLibraryItem(id) → StoreExecutionAsset → popItems 추가
```

**연결 가능성:** 구조적으론 이미 연결됨. 제약:
- StorePopPage가 snapshot/direct origin을 처리하지 않음 → StoreLibraryContentsPage에서 POP 진입은 결과 무.
- 자료함 페이지에 origin filter 부재 → 사용자가 POP에 못 쓰는 항목을 선택할 수 있음 (UX gap).

---

## 4. POP 제작 흐름 end-to-end

POP 흐름은 **2개 별개 경로**가 공존:

### 4-1. 매장 단위 POP (StorePopPage) — `/store/marketing/pop`

| 단계 | 구현 | 상태 |
|------|------|------|
| Source 선택 | location.state.production.source.items (origin='library'만) | active (제한적) |
| Template 선택 | UI 부재. StartProductionModal에 default 1개 placeholder만 (`StartProductionModal.tsx:42-44`) | **placeholder/mock** |
| AI text 생성 | StorePopPage 내부에 AI 호출 코드 없음 | **부재** |
| ProductAiContent 사용 | 없음 | **부재** |
| QR 연결 | `getStoreQrCodes()` → `<select>` ([StorePopPage.tsx:239-257](services/web-kpa-society/src/pages/pharmacy/StorePopPage.tsx#L239)) | active |
| PDF 생성 | `POST /pharmacy/pop/generate` → `generatePopPdf` ([store-pop.controller.ts:77-178](apps/api-server/src/routes/o4o-store/controllers/store-pop.controller.ts#L77)) | active |
| 저장 | PDF blob을 `window.open`으로만 표시. **DB 저장 없음** ([StorePopPage.tsx:148-153](services/web-kpa-society/src/pages/pharmacy/StorePopPage.tsx#L148)) | **부재** |
| 출력 | A4 / A5 (8개 항목 max) | active |

### 4-2. 상품 단위 POP (ProductPopBuilderPage) — `/store/commerce/products/:productId/pop`

[ProductPopBuilderPage.tsx](services/web-kpa-society/src/pages/pharmacy/ProductPopBuilderPage.tsx):

| 단계 | 구현 | 상태 |
|------|------|------|
| Source 선택 | URL `:productId` (상품) + optional `state.selectedLibraryItem` | active |
| Template 선택 | UI 부재 (layout만 A4/A5/A6 선택) | placeholder |
| AI text 생성 | `getProductAiContents(productId)` → `pop_short`/`pop_long`/`product_description` prefill ([ProductPopBuilderPage.tsx:66-107](services/web-kpa-society/src/pages/pharmacy/ProductPopBuilderPage.tsx#L66)) | **active** |
| ProductAiContent 사용 | `saveProductAiContent` upsert (pop_short, pop_long) ([ProductPopBuilderPage.tsx:124-138](services/web-kpa-society/src/pages/pharmacy/ProductPopBuilderPage.tsx#L124)) | **active** |
| QR 연결 | 없음 (상품별 POP은 QR 미연결) | 부재 |
| PDF 생성 | `GET /api/v1/products/:productId/pop/:layout` → `product-pop-pdf.service.ts` 별도 service | **active** (별도 백엔드 path) |
| 저장 | ProductAiContent (pop_short/long 텍스트) 저장. PDF는 stream | active (텍스트만) |

### 4-3. 두 경로의 분리 정리

| 항목 | StorePopPage | ProductPopBuilderPage |
|------|--------------|----------------------|
| 진입 | 사이드바 / 자료함 → 제작 시작 → POP | 상품 마케팅 페이지 → POP 만들기 |
| Source | StoreExecutionAsset (자료실 항목) | 상품 master + AI 콘텐츠 |
| AI | 미연결 | active (pop_short/long) |
| PDF API | `/pharmacy/pop/generate` (POST, items + qr + layout) | `/products/:productId/pop/:layout` (GET, productId 기반) |
| QR | optional | 없음 |
| 결과 저장 | 없음 | ProductAiContent 텍스트만 |

→ 동일 도메인("POP")이지만 **백엔드 service/route/entity가 분리**되어 있고 흐름이 합쳐지지 않음.

### 4-4. dead / mock

| 항목 | 위치 | 상태 |
|------|------|------|
| `state.selectedLibraryItem` 경로 | [StorePopPage.tsx:79-90](services/web-kpa-society/src/pages/pharmacy/StorePopPage.tsx#L79) | dead (set하는 코드 부재) |
| `addBtn` style | [StorePopPage.tsx:329-342](services/web-kpa-society/src/pages/pharmacy/StorePopPage.tsx#L329) | dead (참조 부재) |
| StartProductionModal 템플릿 | `default` 1개만 | placeholder |
| `aiPrefillRequested: true` flag | StartProductionModal → POP 전달 | **mock** (StorePopPage 무시, 사용 안 함) |
| StoreLibraryContentsPage → POP 흐름 | snapshot/direct origin filter | **fail-silent** (POP가 처리 안 함) |

---

## 5. 결과물 관리 구조

### 5-1. 현 StorePopPage 성격

| 측면 | 판단 | 근거 |
|------|------|------|
| Source 관리 | YES | `popItems`(임시 in-memory list) 추가/제거 |
| 결과물 관리 | NO | PDF가 영구 저장되지 않음. 같은 source로 매번 재생성 |
| Mixed | YES (실질) | source 입력 + 즉석 PDF 출력 — wizard 같은 단발 흐름 |

→ 직전 WO의 의도("결과물 관리 전용")는 **미실현**. 페이지가 "선택된 자료 기반 즉시 PDF 생성기"로 작동.

### 5-2. 실제 저장 entity / 데이터 source

| 데이터 | Entity / Table | 저장 시점 |
|--------|----------------|-----------|
| 입력 자료 | `StoreExecutionAsset` (`store_execution_assets`) | 자료실 등록 시점 (POP과 무관) |
| 입력 자료 (공급자 공개) | `NetureSupplierLibraryItem` | Neture 공급자 등록 (POP은 read-only) |
| QR 연결 | `StoreQrCode` (별도 entity) | QR 페이지에서 별도 생성 |
| **POP 결과물** | **없음** | PDF는 stream으로만 응답 |
| 상품별 AI 텍스트 | `ProductAiContent` (`product_ai_contents`) | ProductPopBuilderPage 저장 시 |

### 5-3. StoreExecutionAsset 사용 양상

[store-execution-asset.entity.ts](apps/api-server/src/routes/platform/entities/store-execution-asset.entity.ts):
- `usageType: pop | qr | signage | banner | notice` 컬럼 존재 (line 56-57)
- POP 흐름은 `usageType` 필터를 검색 시에만 사용 (`StoreAssetSelectorModal usageType='pop'`). 결과물 저장에 사용 안 함

### 5-4. PDF 기록 / 재편집

- StorePopPage: PDF 출력 후 ID 없음 → 재출력하려면 source 다시 선택 + 재생성
- ProductPopBuilderPage: ProductAiContent 텍스트는 저장되어 재편집 가능. PDF 자체는 매번 재생성

---

## 6. "매장 실행" 그룹 명칭 조사

### 6-1. 현 그룹 항목 ([storeMenuConfig.ts:221-229](packages/store-ui-core/src/config/storeMenuConfig.ts#L221))

| key | 라벨 | subPath | 성격 |
|-----|------|---------|------|
| channels | 채널 관리 | `/channels` | 운영(채널 설정) |
| tablet-displays | 태블릿 진열 | `/commerce/tablet-displays` | 운영(진열 설정) |
| pop | POP | `/marketing/pop` | 결과물 (출력) |
| qr | QR 코드 | `/marketing/qr` | 결과물 + 진입 자산 |
| blog | 블로그 | `/content/blog` | 결과물 (게시글) |
| product-descriptions | 상품 상세설명 | `/marketing/product-descriptions` | 결과물 (텍스트) |
| requests | 상담 요청 | `/requests` | 운영(고객 요청 인박스) |

→ **운영(3) + 결과물(4) mixed**.

### 6-2. 후보 명칭 비교

| 후보 | 운영(채널/태블릿/상담) 적합 | 결과물(POP/QR/블로그/상품 상세설명) 적합 | 종합 |
|------|:---:|:---:|------|
| 매장 실행 (현) | ○ | ○ | 다소 추상적이나 mixed 그룹에 무난 |
| 매장 활용 | △ (운영은 "활용"이 아님) | ○ (자료를 활용한 결과물) | 결과물 중심 표현 |
| 매장 콘텐츠 | × (채널/태블릿/상담은 콘텐츠 아님) | ○ | 운영 항목 부적합 |
| 매장 운영 | ◎ | △ (운영 자체보다 산출물) | 운영 중심 표현 |

### 6-3. 정합성 옵션

| 옵션 | 설명 | 영향 |
|------|------|------|
| A. 명칭 유지 | "매장 실행" 그대로 | 변경 없음. 라벨/페이지 헤더 ("매장 관리")는 여전히 페이지에 잔존 |
| B. "매장 운영"으로 명칭 변경 | 운영 색을 강화 | 결과물 4개의 그룹 적합성이 약간 약화. 페이지 breadcrumb "매장 관리" 와도 정렬 필요 |
| C. 그룹 분리 | "매장 운영"(채널/태블릿/상담) + "매장 자산"(POP/QR/블로그/상품 상세설명) | 직전 WO에서 "내 제작물" 그룹을 제거한 결정과 충돌. 재논의 필요 |

→ 본 IR은 옵션을 식별만 하며, 결정은 후속 WO에서.

---

## 7. 종합 정리

### A. 현재 active 구조

- **사이드바 진입:** `매장 실행 → POP` → StorePopPage
- **상품 진입:** 상품 마케팅 → POP 만들기 → ProductPopBuilderPage (별도)
- **자료 유입:** 자료함 → 제작 시작 → POP (`production.source.items` with origin='library')
- **백엔드 Source:** `StoreExecutionAsset` (구 `store_library_items`)
- **PDF 생성:** `POST /pharmacy/pop/generate` (StorePopPage), `GET /api/v1/products/:productId/pop/:layout` (ProductPopBuilderPage)
- **AI 통합:** ProductPopBuilderPage만 (`ProductAiContent` pop_short/long)

### B. canonical과 충돌하는 UX

| 충돌 | 위치 | 설명 |
|------|------|------|
| 사이드바 라벨 vs 페이지 제목 | sidebar `POP` ↔ 페이지 `POP 자료 관리` ↔ breadcrumb `POP 자료` | 3개 라벨 미정렬 |
| breadcrumb root | `매장 관리 → POP 자료` ([StorePopPage.tsx:167-171](services/web-kpa-society/src/pages/pharmacy/StorePopPage.tsx#L167)) | 사이드바 그룹 `매장 실행`과 불일치 |
| origin coverage gap | StorePopPage가 origin='library'만 처리 | 자료함 콘텐츠 페이지에서 POP 진입 = silent fail |
| 매장 vs 상품 POP 분리 | 두 페이지·두 백엔드 service | "POP 제작"이 단일 진입점이 아님. 사용자에게 분리 노출 |
| 결과물 미저장 | 매장 단위 POP은 PDF 보관 없음 | 사이드바 라벨이 "관리"인데 실제로 관리 대상이 없음 |
| 템플릿 placeholder | StartProductionModal 모든 target에 default 1개 | 템플릿 선택 단계가 mock |

### C. 즉시 제거 가능한 dead 흐름

| 항목 | 위치 |
|------|------|
| `state.selectedLibraryItem` 분기 | [StorePopPage.tsx:79-90](services/web-kpa-society/src/pages/pharmacy/StorePopPage.tsx#L79) (set하는 코드 부재) |
| `addBtn` style 정의 | [StorePopPage.tsx:329-342](services/web-kpa-society/src/pages/pharmacy/StorePopPage.tsx#L329) (참조 없음) |

→ 단, 이번 IR 범위는 조사 only. 제거는 후속 WO에서 결정.

### D. 재사용 가능한 component / API

**Frontend:**
- `StoreAssetSelectorModal` (`usageType='pop'` 필터, 검색·페이지네이션·카드 그리드 — POP source selector로 즉시 재사용 가능)
- `StoreLibraryResourcesPage` checkbox/batch toolbar/제작 시작 버튼 패턴
- `StartProductionModal` (target+template+navigate)
- `getStoreLibraryItem` / `getStoreExecutionAssets` (자료 단건/리스트 조회)
- `getStoreQrCodes` (QR 후보 조회)

**Backend:**
- `POST /pharmacy/pop/generate` (StoreExecutionAsset + supplierItem + qr 조합, layout=A4/A5, max 8 items)
- `GET /pharmacy/pop/source/supplier-items` (Neture 공개 자료)
- `ProductAiContent` entity (5 contentType — `pop_short`/`pop_long`은 매장 단위 POP에도 활용 가능)
- `StoreExecutionAsset.usageType='pop'` 필터

### E. POP 제작 canonical 흐름 제안

(WO 기준 후보 — 본 IR은 제안만, 구현 미수행)

```text
내 자료함 (콘텐츠 / 자료)
  → 항목 선택 (checkbox)
  → 제작 시작
  → 제작 대상: POP
  → 템플릿 선택 (단일/이중/그리드 등 실제 layout 후보)
  → AI 변환 (ProductAiContent.pop_short / pop_long 또는 자료 description 기반)
  → POP 편집 화면 (현재 ProductPopBuilderPage 패턴 차용)
      · 짧은 문구 / 긴 설명 / 이미지 / QR 연결 / 레이아웃
      · 저장 (StoreExecutionAsset usage_type='pop' 또는 신규 result entity)
      · PDF 생성 (`POST /pharmacy/pop/generate`)
  → 결과물 목록(매장 실행 → POP)에 등록
      · 재편집 / 재출력 / 삭제
```

핵심 정합 포인트:
1. **단일 진입점**: 매장 단위 POP과 상품 단위 POP을 흐름 차원에서 합치거나 명시적으로 분리
2. **모든 origin 처리**: snapshot / direct / library 모두 POP 흐름이 수용 (현재는 library만)
3. **AI 통합**: ProductAiContent 활용을 매장 단위 POP에도 확장
4. **결과물 entity**: 현재 PDF stream-only — 결과 보관/재편집을 위한 metadata entity 필요 여부 결정 (StoreExecutionAsset에 `usage_type='pop'` 결과 row 저장 vs 신규 entity)
5. **라벨/breadcrumb 정렬**: 사이드바 / 페이지 헤더 / breadcrumb의 "POP" 명칭 통일

---

## 8. 작업 규칙 준수 확인

- ✅ 조사만 수행 (코드/route/문구 변경 없음)
- ✅ POP 중심 (QR/Blog/상품 상세설명은 비교 맥락에서만 언급)
- ✅ 실제 존재 코드/path/line 기준
- ✅ dead/mock 명시적 표기
- ✅ canonical 흐름은 §7 E에 후보로만 기술

---

*작성: 2026-05-09*
*조사 범위: services/web-kpa-society (StorePopPage, ProductPopBuilderPage, StartProductionModal, modals), packages/store-ui-core, apps/api-server (store-pop, store-execution-asset, product-ai-content)*
*상태: READ-ONLY 조사 완료. canonical 정렬 결정은 후속 WO에서.*
