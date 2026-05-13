# IR-O4O-STORE-PRODUCTION-MATERIALS-CONTENT-SELECTION-FLOW-AUDIT-V1

**조사 유형:** Investigation Report (IR)  
**조사 대상:** 내 자료함 콘텐츠 선택 → AI 제작 흐름 구조  
**조사 날짜:** 2026-05-13  
**상태:** COMPLETE

---

## 목적

`/store/library/production-materials`에서 AI 제작 자료를 만들 때 `SelectContentForAiModal`이 왜 생겼는지, 실제로 `/store/library/contents` 선택 흐름을 재사용해야 하는지, 현재 구현이 UX 흐름을 왜곡하고 있는지 판단한다.

---

## 1. 관련 컴포넌트 구조 요약

### 1-A. `StoreLibraryContentsPage.tsx`

**위치:** `/store/library/contents`  
**자산 소스:** `storeLibraryApi.listContents({ type:'document' })` + `storeAssetControlApi.list({ type:'lesson' })`  
**탭 구조:** 상위 탭(콘텐츠|강의) / 하위 탭(문서형|코스형)  
**선택 구조:** `DataTable` + `selectable` prop → 체크박스 다중 선택 완비  
**제작 진입:** 선택 후 "제작 시작" → `StartProductionModal` → `navigate(route, { state: buildProductionState(...) })`  
**기타:** `CreateContentFromResourcesModal` (자료→콘텐츠 변환) 헤더에 버튼으로 내장

```
/store/library/contents
  └─ TopTab: 콘텐츠 / 강의
       └─ 콘텐츠 탭: SubTab 문서형 / 코스형
            └─ DocumentsSection: DataTable(selectable) + "제작 시작" → StartProductionModal
       └─ 강의 탭: LessonsSection: DataTable(selectable) + "제작 시작" → StartProductionModal
```

### 1-B. `StoreProductionMaterialsPage.tsx`

**위치:** `/store/library/production-materials`  
**자산 소스:** `directContentApi.list()` (kpa_store_contents, sourceType='direct') + `getStoreExecutionAssets(limit=100)` (store_execution_assets, sourceType='generated')  
**역할:** AI/직접 생성된 제작 자료 결과물 목록 관리  
**진입 버튼 2개:**
- `"AI로 제작 자료 초안 만들기"` → `usingContentBridge=true` + `ProductionTypeSelectorModal`
- `"매장 제작 자료 만들기"` → `usingContentBridge=false` + `ProductionTypeSelectorModal`

**AI 브리지 흐름 (WO-O4O-STORE-PRODUCTION-MATERIALS-CONTENT-AI-BRIDGE-V1):**
```
"AI로 제작 자료 초안 만들기" 클릭
  → ProductionTypeSelectorModal (유형 선택: POP/QR/블로그/상품설명)
  → SelectContentForAiModal (내 자료함 문서형 콘텐츠 단일 선택)
  → composeSourceTextFromContent(item) → AiContentModal(initialText=...)
  → 저장: store_execution_assets (showProductionMaterialSave)
```

### 1-C. `SelectContentForAiModal.tsx`

**역할:** `production-materials` 페이지 내부 인라인 모달 — 내 자료함 콘텐츠 단일 선택  
**API 호출:** `storeLibraryApi.listContents({ type:'document', limit:50 })`  
**선택 방식:** radio (단일 선택만)  
**페이지네이션:** 없음 (limit=50 고정)  
**탭 구조:** 없음 (문서형만, 강의 탭 없음)

---

## 2. `SelectContentForAiModal`이 생긴 배경 (추정 판단)

`StoreProductionMaterialsPage`에 "AI로 제작 자료 초안 만들기" 버튼이 존재한다. 이 버튼 클릭 시점에서 콘텐츠를 선택해야 하는데, 별도 페이지(`/store/library/contents`)로 navigate하면:
1. 현재 흐름(유형 선택 이후 단계)에서 벗어남
2. 돌아왔을 때 유형 선택 상태가 사라짐
3. `production-materials` 안에서 흐름을 완결하려는 설계 의도

그 결과, **이미 `/store/library/contents`에 존재하는 콘텐츠 목록을 모달로 재구현**하게 되었다.

---

## 3. 현재 구현의 구조적 문제

### 3-1. 콘텐츠 목록 중복 구현

| 항목 | `StoreLibraryContentsPage` | `SelectContentForAiModal` |
|------|---------------------------|--------------------------|
| API | `storeLibraryApi.listContents({ type:'document' })` | 동일 |
| 탭 구조 | 문서형 / 코스형 / 강의 | 없음 (문서형만) |
| 선택 방식 | 다중 체크박스 | 단일 radio |
| 페이지네이션 | 서버사이드 (20개/페이지) | 없음 (limit=50 고정) |
| 검색 | debounce 서버 검색 | 클라이언트 필터 |

→ 동일 API를 쓰지만 기능이 열화된 버전으로 재구현됨.

### 3-2. 흐름 역전 (진입점 왜곡)

현재 흐름:
```
production-materials 페이지 (결과물 저장소)
  → "AI로 제작" 버튼 (진입점)
  → 유형 선택 모달
  → 콘텐츠 선택 모달 ← 여기서 내 자료함 콘텐츠 목록 소환
  → AI 편집
```

올바른 흐름 (직관적):
```
/store/library/contents (재료 화면)
  → 항목 선택 (이미 selectable DataTable 있음)
  → "제작 시작" / "AI로 제작" 버튼
  → 유형 선택 → AI 편집
```

**결과물 저장소(production-materials)가 재료 선택 진입점을 흡수**한 구조다. 재료는 재료 화면에서 선택해야 한다.

### 3-3. 강의/코스형 콘텐츠 누락

`SelectContentForAiModal`은 문서형(`type:'document'`)만 로드한다. 강의(`type:'lesson'`)는 선택 불가. 하지만 강의 자산도 AI 제작의 원본 재료가 될 수 있다(강의 요약 → POP 등).

`StoreLibraryContentsPage`는 이미 강의 탭을 갖고 있으므로, 재사용하면 자동으로 포함된다.

### 3-4. "자료 없음 확인" UX가 3단계 후에야 나타나는 문제

사용자가 내 자료함에 콘텐츠가 없는 상태에서 "AI로 제작" 흐름을 시도하면:

1. `"AI로 제작 자료 초안 만들기"` 클릭
2. `ProductionTypeSelectorModal` → 유형 선택
3. `SelectContentForAiModal` 열림 → "내 자료함에 콘텐츠가 없습니다." 표시

→ 3단계를 거쳐서야 빈 상태를 확인. 진입점에서 사전 확인이 없다.

반면, `/store/library/contents`에서 시작하면 화면 자체에서 즉시 확인 가능.

### 3-5. `production-materials` 역할 이탈

현재 `production-materials` 페이지는:
- 결과물 목록 관리 (원래 역할)
- 새 제작 자료 생성 (직접/AI)
- 내 자료함 콘텐츠 선택 (SelectContentForAiModal 통해 진행)

이 중 세 번째 역할(재료 화면 기능)이 페이지 성격을 넘어선다.

---

## 4. `StoreLibraryContentsPage`에 이미 재사용 가능한 구조가 있는가

| 확인 항목 | 상태 |
|---------|------|
| 콘텐츠 목록 (문서형) 로드 | ✅ `DocumentsSection` 완비 |
| 콘텐츠 목록 (강의) 로드 | ✅ `LessonsSection` 완비 |
| 다중 체크박스 선택 | ✅ `DataTable selectable` |
| 제작 시작 → `StartProductionModal` | ✅ `openProduction(items)` |
| `buildProductionState` router state | ✅ |
| `AiContentModal` 직접 연결 | ❌ 현재 없음 — 추가 필요 |
| `composeSourceTextFromContent` | ❌ 현재 없음 — 추가 필요 |

결론: **선택 흐름 자체는 재사용 가능. AI 연결 경로만 추가하면 된다.**

---

## 5. 판정

### Q1. `SelectContentForAiModal`이 정말 필요한가?
**판정: NO — 제거 가능**  
동일 API를 쓰는 열화 버전 재구현. `StoreLibraryContentsPage`의 선택 흐름을 재사용하면 불필요하다.

### Q2. `/store/library/contents`에 이미 선택 가능한 구조가 있는가?
**판정: YES — 완비**  
`DataTable selectable` + `StartProductionModal` 연결까지 구현됨. AI 연결 경로(AI 제작 버튼 → `composeSourceText` → `AiContentModal`)만 추가하면 된다.

### Q3. 기존 콘텐츠 화면에서 선택 후 production-materials AI 흐름으로 넘길 수 있는가?
**판정: YES — 가능**  
`StartProductionModal` 패턴과 동일하게 `openAiProduction(items)` 흐름을 추가하면 된다. 또는 `StartProductionModal` 안에 "AI로 제작" 경로를 추가해도 된다.

### Q4. 현재 모달 방식이 콘텐츠/강의 구조를 중복 구현하게 만드는가?
**판정: YES — 중복 구현 확인**  
`SelectContentForAiModal`은 문서형만 지원, limit=50, 페이지네이션 없음. `StoreLibraryContentsPage`의 열화 버전이다.

### Q5. production-materials에서 바로 선택 모달을 띄우는 것이 맞는가, 아니면 콘텐츠 화면에서 시작해야 하는가?
**판정: 콘텐츠 화면에서 시작해야 한다**  
재료 선택은 재료 화면에서. `production-materials`는 결과물 저장소 역할에 집중해야 한다.

### Q6. 유지해야 할 흐름은 무엇인가?

**유지 흐름 (Canonical):**
```
/store/library/contents
  → 문서형/강의 선택 (이미 구현된 DataTable selectable)
  → "제작 시작" → StartProductionModal → 편집기 navigate  (기존 유지)
  → "AI로 제작" → composeSourceText(items) → AiContentModal(initialText=...)  (신규 추가)
  → AiContentModal에서 showProductionMaterialSave → store_execution_assets 저장
  → 저장 후 자동으로 /store/library/production-materials에 표시됨
```

**제거 대상:**
- `SelectContentForAiModal` 컴포넌트
- `StoreProductionMaterialsPage`의 `contentSelectorOpen` / `usingContentBridge` / `pendingBridgeTarget` 상태들
- `"AI로 제작 자료 초안 만들기"` 버튼 (production-materials 헤더에서 제거)
- 관련 `handleTypeSelectedToAi` 브리지 분기

**production-materials 페이지 역할 재정의:**
- 결과물 목록 관리 (직접 작성 + AI 생성 통합 뷰)
- 개별 삭제, 일괄 삭제
- 기존 결과물에서 "제작 시작" (편집기 진입)
- ~~콘텐츠 선택 진입점~~ → 제거

---

## 6. 관련 파일 목록

| 파일 | 현재 역할 | 변경 방향 |
|------|---------|---------|
| `StoreLibraryContentsPage.tsx` | 콘텐츠/강의 목록 + 선택 + StartProductionModal | AI 제작 경로 추가 필요 |
| `SelectContentForAiModal.tsx` | 콘텐츠 단일 선택 모달 | 제거 대상 |
| `StoreProductionMaterialsPage.tsx` | 결과물 저장소 + AI 브리지 진입점 | AI 브리지 진입점 제거, 저장소 역할에 집중 |
| `StartProductionModal.tsx` | 제작 대상 선택 → 편집기 navigate | AI 경로 추가 또는 현행 유지 |
| `productionTargets.tsx` | SSOT 카탈로그 | 구조 변경 없음 |
