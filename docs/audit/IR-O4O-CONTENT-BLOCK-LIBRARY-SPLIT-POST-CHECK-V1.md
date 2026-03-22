# IR-O4O-CONTENT-BLOCK-LIBRARY-SPLIT-POST-CHECK-V1

> WO-O4O-CONTENT-BLOCK-LIBRARY-SPLIT-V1 완료 후 post-check 조사

* 기준 작업: `WO-O4O-CONTENT-BLOCK-LIBRARY-SPLIT-V1`
* 기준 브랜치: `feature/content-block-library-split`
* 기준 커밋: `17d9a15d6`
* 현재 push 전 상태
* 조사일: 2026-03-22

---

## 1. 전체 판정

| 항목 | 판정 |
|------|------|
| ContentBlockLibrary split 최종 상태 | **SAFE** |
| oversized 정비 1차 완료 | **확정 가능** |
| push 가능 여부 | **즉시 push 가능** |

**근거**: 1,237줄 → 363줄 container (71% 축소). 7개 파일 모두 단일 책임. dead code 0건. tsc 신규 오류 0건. index.ts 무변경. default export 보존. CRUD 흐름 보존.

---

## 2. 파일별 상세 표

| # | 파일 | 줄 수 | 역할 | 판정 | 책임 혼합 | 비고 |
|---|------|-------|------|------|----------|------|
| 1 | `ContentBlockLibrary.tsx` | 363 | Container: header + toolbar + filters + grid/list views + dialog mount | **SAFE** | 없음 | 비즈니스 로직 0줄, JSX layout만 |
| 2 | `useContentBlocks.ts` | 183 | Hook: 11 state + 5 CRUD handlers + 1 filter derived | **SAFE** | 없음 | API 호출 + state 관리에 집중 |
| 3 | `ContentBlockEditors.tsx` | 595 | Component: 10 block type editor switch | **유지 가능** | 없음 | 아래 별도 판단 참조 |
| 4 | `BlockEditorDialog.tsx` | 171 | Component: create/edit dialog shell + style settings | **SAFE** | 없음 | ContentBlockEditors 위임 |
| 5 | `BlockPreviewDialog.tsx` | 49 | Component: preview dialog | **SAFE** | 없음 | 단일 책임 |
| 6 | `BlockDeleteDialog.tsx` | 46 | Component: delete confirmation | **SAFE** | 없음 | 단일 책임 |
| 7 | `content-block-constants.ts` | 34 | Constants: BLOCK_TYPE_CONFIGS map | **SAFE** | 없음 | 상수 전용 |

---

## 3. 조사 항목별 결과

### 3.1 Container 안전성 점검 — **SAFE**

* `ContentBlockLibrary.tsx` 363줄 중 실제 JSX layout만 존재
* `useContentBlocks()` hook에서 모든 state/handler를 받아 렌더링만 수행
* 비즈니스 로직 (API 호출, state mutation) 0줄 — 모두 hook으로 이동됨
* `export default function ContentBlockLibrary()` — default export 유지
* `index.ts` line 26 `export { default as ContentBlockLibrary } from './ContentBlockLibrary'` — 무변경
* 라우트 소비 확인: `DigitalSignageRouter.tsx`에서 ContentBlockLibrary 직접 import 없음 (Role Reform으로 해당 route는 `RemovedRouteRedirect`로 교체됨). `index.ts` export는 다른 소비처를 위해 유지 — 기존 계약 불변

### 3.2 Hook 책임 분리 점검 — **SAFE**

* `useContentBlocks.ts` 183줄 — god-hook 아님
* 구성: 11 state 선언 + 5 handler + 1 derived (filteredBlocks) + return object
* UI 렌더링 책임: 없음 (JSX 0줄)
* API 호출: `contentBlockApi.list/create/update/delete` 4종 — 모두 단순 CRUD
* 상태 구조: data / filter / dialog / form 4개 그룹으로 구분되어 있으나, 동일 엔티티(ContentBlock) CRUD에 대한 것이므로 한 hook에 적정
* 관찰: dialog 상태 (showBlockDialog, showPreviewDialog, editingBlock, previewBlock, deleteTarget)가 5개로 약간 많지만, 모두 동일 페이지 내 dialog 제어이므로 분리 불필요

### 3.3 Component 책임 분리 점검 — **SAFE**

* `BlockEditorDialog.tsx` (171줄): dialog shell + basic info form + style settings + ContentBlockEditors 위임. 편집 dialog 조립 역할에 집중. **SAFE**
* `BlockPreviewDialog.tsx` (49줄): preview 전용. JSON dump 표시. **SAFE**
* `BlockDeleteDialog.tsx` (46줄): delete confirm 전용. AlertDialog wrapper. **SAFE**
* `content-block-constants.ts` (34줄): BLOCK_TYPE_CONFIGS 상수 1개 + lucide icon import. 상수 전용. **SAFE**
* 과도한 상호 의존 없음: 의존 방향 단방향 (container → hook, container → dialogs, dialog → editors, editors/dialogs → constants)

### 3.4 `ContentBlockEditors.tsx` 570줄 판단 — **유지 가능**

**판정: 유지 가능 (현재 상태로 허용)**

근거:

1. **응집도 높음**: 10개 case 모두 동일한 `blockForm` + `setBlockForm` props 2개만 사용. 동일 계약, 동일 패턴.

2. **상호 참조 없음**: 각 case는 완전 독립. case 간 shared state나 cross-reference 없음. 이는 분리하더라도 각 파일이 동일 import (Input, Label, Select, Textarea) + 동일 props interface를 반복하게 됨을 의미.

3. **줄 수 대비 복잡도 낮음**: 595줄이지만 실제 로직은 `setBlockForm` spread pattern 반복. JSX 폼 필드 나열이 대부분. cyclomatic complexity는 switch 1개 + 10 case뿐.

4. **분할 시 비용 > 이득**: 10개 파일로 분할하면 각 파일 30-80줄 + 동일 import boilerplate + 동일 props interface 반복. 총 줄 수 오히려 증가. 탐색 비용도 증가.

5. **유사 패턴 참조**: 동일 codebase에서 `TemplateBuilder.tsx` (1,038줄), `LayoutPresetList.tsx` (862줄) 등이 아직 단일 파일. ContentBlockEditors 595줄은 이 대비 적정 수준.

6. **새 oversized 후보 아님**: 이 파일은 switch dispatch component로, "1개 기능 10개 변형"이지 "10개 서로 다른 기능 혼합"이 아님. god-component 패턴과 근본적으로 다름.

**후속 분해 불필요**. 다만, 향후 block type이 20개 이상으로 늘어나면 registry pattern 도입을 고려할 수 있음 (현재는 불필요).

### 3.5 Dead Code / Orphan 여부 — **CLEAN**

* 사용되지 않는 helper/component: 0건
* import만 남고 사용되지 않는 type/function: 0건
* stale state / unused props: 0건
* 원본에서 옮기며 남은 중복 코드: 0건
* 중복 constants: 0건 — BLOCK_TYPE_CONFIGS는 `content-block-constants.ts` 단일 소스

관찰 1건:
* 원본의 `renderBlockPreview()` 함수 (lines 798-807)가 container에 inline으로 흡수됨 (lines 200-203). 함수 추출 없이 직접 `<Icon className="h-8 w-8 text-muted-foreground" />` 렌더링. 원본 동작과 동일하므로 문제 없음.

### 3.6 UI/API 정합성 — **SAFE**

| 항목 | 상태 |
|------|------|
| 페이지 route | 유지 (`index.ts` line 26 무변경) |
| 목록 조회 | `contentBlockApi.list()` — hook에서 동일 호출 |
| 생성 | `contentBlockApi.create()` — handleSaveBlock |
| 수정 | `contentBlockApi.update()` — handleSaveBlock |
| 복제 | `contentBlockApi.create()` — handleDuplicate |
| 삭제 | `contentBlockApi.delete()` — handleDelete |
| Preview | setPreviewBlock → BlockPreviewDialog |
| Grid/List 뷰 토글 | viewMode state → container 분기 |
| 검색/필터 | searchQuery + filterType → filteredBlocks |
| Quick filter badges | BLOCK_TYPE_CONFIGS iteration — 동일 |
| default export | `export default function ContentBlockLibrary()` — 보존 |
| index.ts | 변경 없음 |

### 3.7 Oversized 잔존 여부 — **충분히 해소**

| 파일 | 줄 수 | oversized 판정 |
|------|-------|---------------|
| `ContentBlockEditors.tsx` | 595 | 아님 — 응집된 switch dispatch, 로직 단순 |
| `useContentBlocks.ts` | 183 | 아님 — 단일 엔티티 CRUD hook 적정 크기 |
| `BlockEditorDialog.tsx` | 171 | 아님 — dialog form shell |
| `ContentBlockLibrary.tsx` | 363 | 아님 — container JSX layout |

이번 분해로 oversized risk 충분히 해소됨.

---

## 4. `ContentBlockEditors.tsx` 별도 판단

| 항목 | 결과 |
|------|------|
| 현재 상태 유지 가능 여부 | **유지 가능** |
| 후속 분해 필요 여부 | **불필요** |
| oversized 후보 여부 | **아님** |

**이유 요약**:

* Props 2개뿐 (`blockForm`, `setBlockForm`) — 최소 계약
* 10개 case 완전 독립, cross-reference 없음
* 분할 시 10개 파일 × 동일 boilerplate = 총 줄 수 증가
* JSX 폼 필드 나열이 대부분, 복잡한 orchestration 없음
* "1개 기능의 10개 변형" ≠ "10개 기능 혼합"

---

## 5. 다음 Oversized 정비 추천

### Admin Dashboard 내 남은 1,000줄 이상 파일

| # | 파일 | 줄 수 | 성격 |
|---|------|-------|------|
| 1 | `VendorsCommissionAdmin.tsx` | 1,161 | Page: 벤더 커미션 관리 |
| 2 | `lms-yaksa/credits/index.tsx` | 1,141 | Page: LMS 학점 관리 |
| 3 | `ShortcodeBlock.tsx` | 1,129 | Component: 숏코드 블록 에디터 |
| 4 | `VendorsAdmin.tsx` | 1,077 | Page: 벤더 관리 |
| 5 | `CosmeticsPartnerRoutines.tsx` | 1,070 | Page: 화장품 파트너 루틴 |
| 6 | `FileSelector.tsx` | 1,050 | Component: 파일 선택기 |
| 7 | `TemplateBuilder.tsx` | 1,038 | Page: 사이니지 템플릿 빌더 |

### 추천 1순위: `TemplateBuilder.tsx` (1,038줄)

**이유**:
* 동일 `digital-signage/v2/` 디렉토리에 위치 — 이번 split과 동일 도메인
* 이번 ContentBlockLibrary split에서 확립한 패턴 (container + sub-components + hook) 그대로 적용 가능
* 유사 구조 예상: canvas state + block editing + API calls + dialogs 혼합

**WO 형태**: 단독 WO 권장 (`WO-O4O-TEMPLATE-BUILDER-SPLIT-V1`). 동일 도메인 내 후속 작업으로 자연스러움.

### 추천 2순위: `VendorsCommissionAdmin.tsx` (1,161줄) 또는 `VendorsAdmin.tsx` (1,077줄)

**이유**: 벤더 관리 2개 파일을 묶음 WO로 처리 가능 (`WO-O4O-VENDORS-ADMIN-SPLIT-V1`). 다른 도메인이므로 사이니지 정비 완료 후 진행.

---

## 6. 잔존 이슈 요약

| 항목 | 결과 |
|------|------|
| Dead code | 0건 |
| 중복 로직 | 0건 |
| 과분할 | 0건 — 7개 파일 모두 적정 크기 |
| 미분리 | 0건 |
| Follow-up 필요 | 없음 |

---

## 결론

이번 ContentBlockLibrary split은 **안전하게 완료**되었다.

* 1,237줄 → 7개 파일, container 363줄 (71% 축소)
* `ContentBlockEditors.tsx` 595줄은 응집된 switch dispatch로 **유지 가능** (새 oversized 후보 아님)
* Dead code 0건, 중복 0건, 타입 오류 0건
* **즉시 main merge + push 가능**

다음 oversized 정비 대상은 동일 디렉토리 `TemplateBuilder.tsx` (1,038줄) 권장.
