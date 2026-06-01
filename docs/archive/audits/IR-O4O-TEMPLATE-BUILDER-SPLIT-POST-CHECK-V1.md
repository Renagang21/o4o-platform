# IR-O4O-TEMPLATE-BUILDER-SPLIT-POST-CHECK-V1

> WO-O4O-TEMPLATE-BUILDER-SPLIT-V1 완료 후 post-check 조사

* 기준 작업: `WO-O4O-TEMPLATE-BUILDER-SPLIT-V1`
* 기준 브랜치: `feature/template-builder-split`
* 기준 커밋: `3ce7c445a`
* 현재 push 전 상태
* 조사일: 2026-03-22

---

## 1. 전체 판정

| 항목 | 판정 |
|------|------|
| TemplateBuilder split 최종 상태 | **SAFE** |
| oversized 정비 1차 완료 | **확정 가능** |
| push 가능 여부 | **즉시 push 가능** |

**근거**: 1,038줄 → 170줄 container (84% 축소). 9개 파일 모두 단일 책임. dead code 0건 (신규 도입분). tsc 신규 오류 0건. index.ts 무변경. default export 보존. Template CRUD + Zone CRUD + Preset + Drag/Resize + Preview 전체 흐름 보존.

---

## 2. 파일별 상세 표

| # | 파일 | 줄 수 | 역할 | 판정 | 책임 혼합 | 비고 |
|---|------|-------|------|------|----------|------|
| 1 | `TemplateBuilder.tsx` | 170 | Container: header + toolbar + grid compose + dialog mount | **SAFE** | 없음 | 비즈니스 로직 0줄, JSX layout만 |
| 2 | `useTemplateBuilder.ts` | 381 | Hook: 14 state + CRUD handlers + drag/resize + form/dialog state | **유지 가능** | 없음 | 아래 별도 판단 참조 |
| 3 | `TemplateBuilderCanvas.tsx` | 117 | Component: canvas + zone overlays + resize handle + empty state | **SAFE** | 없음 | 렌더링 전용 |
| 4 | `TemplateBuilderSidebar.tsx` | 222 | Component: template settings form + zone list | **SAFE** | 없음 | 설정/목록 편집 범위 |
| 5 | `NewTemplateDialog.tsx` | 121 | Component: 새 템플릿 생성 dialog | **SAFE** | 없음 | 단일 dialog |
| 6 | `LayoutPresetDialog.tsx` | 79 | Component: 프리셋 선택 dialog | **SAFE** | 없음 | 단일 dialog |
| 7 | `ZoneEditorDialog.tsx` | 193 | Component: zone add/edit form dialog | **SAFE** | 없음 | 단일 dialog |
| 8 | `TemplatePreviewDialog.tsx` | 49 | Component: iframe 미리보기 dialog | **SAFE** | 없음 | 단일 dialog |
| 9 | `template-builder-constants.ts` | 70 | Constants: ZONE_TYPE_CONFIGS (7종) + DEFAULT_PRESETS (5종) | **SAFE** | 없음 | 상수 전용 |

---

## 3. 조사 항목별 결과

### 3.1 Container 안전성 점검 — **SAFE**

* `TemplateBuilder.tsx` 170줄 중 실제 JSX layout만 존재
* `useTemplateBuilder()` hook에서 모든 state/handler를 받아 렌더링만 수행
* 비즈니스 로직 (API 호출, state mutation) 0줄 — 모두 hook으로 이동됨
* `export default function TemplateBuilder()` — default export 유지
* `index.ts` line 23 `export { default as TemplateBuilder } from './TemplateBuilder'` — 무변경
* 라우트 소비 확인: `DigitalSignageRouter.tsx`에서 TemplateBuilder 직접 import 없음 (Role Reform으로 해당 route는 `RemovedRouteRedirect`로 교체됨). `index.ts` export는 다른 소비처를 위해 유지 — 기존 계약 불변

### 3.2 Hook 책임 분리 점검 — **유지 가능**

* `useTemplateBuilder.ts` 381줄 — orchestration hook 수준
* 구성: 14 state 선언 + 3 drag state + 2 form state + 4 dialog state + 7 handler + 3 drag handler + useEffect 2개 + return object
* UI 렌더링 책임: 없음 (JSX 0줄)
* API 호출: `templateApi.create/get/update/getZones/addZone/updateZone/removeZone` + `layoutPresetApi.list` + `playlistApi.list` — 모두 단일 도메인 CRUD
* 상태 구조: data / filter / dialog / form / drag 5개 그룹으로 구분되어 있으나, 모두 동일 페이지(Template Builder) 내 상호작용에 필요한 것이므로 한 hook에 적정
* drag/resize 로직 (~50줄): `handleZoneMouseDown` + `handleCanvasMouseMove` + `handleCanvasMouseUp` + window event listener useEffect — canvas 인터랙션과 zone state가 동일 생명주기이므로 분리 불필요

**관찰**: `layoutPresets` state는 `loadData()`에서 fetch하고 return object에 포함되나, container에서 소비되지 않음. 이는 원본 코드에서도 동일한 상태 (원본 lines 140, 195-197에서 set만 하고 JSX에서 미사용). **기존 dead state** — 이번 split에서 도입된 것이 아님.

**관찰**: `ZONE_TYPE_CONFIGS`의 `icon` 필드는 정의되나 template-builder 파일군 어디에서도 `.icon` 접근 없음. 이 역시 원본에서도 동일 — 기존 dead field. 향후 zone type 아이콘 렌더링 도입 시 활용 가능하므로 유지해도 무방.

### 3.3 Component 책임 분리 점검 — **SAFE**

* `TemplateBuilderCanvas.tsx` (117줄): canvas area + zone overlay + resize handle + empty state + info bar. Canvas 렌더링 전용 책임. Props 7개 (template, zones, selectedZoneId, canvasRef, onZoneSelect, onZoneMouseDown, onAddZone). **SAFE**
* `TemplateBuilderSidebar.tsx` (222줄): template settings form (name/desc/resolution/orientation/bgColor) + zone list (선택/편집/삭제). 사이드 패널 편집 역할에 집중. Props 8개. **SAFE**
* `NewTemplateDialog.tsx` (121줄): 새 템플릿 생성 dialog (이름, 해상도 프리셋, 배경색). **SAFE**
* `LayoutPresetDialog.tsx` (79줄): DEFAULT_PRESETS 기반 레이아웃 선택 dialog with visual preview. **SAFE**
* `ZoneEditorDialog.tsx` (193줄): zone add/edit form (이름, 타입, 위치, 크기, zIndex, playlist 선택). 단일 dialog form 책임. **SAFE**
* `TemplatePreviewDialog.tsx` (49줄): iframe 미리보기 전용. **SAFE**
* `template-builder-constants.ts` (70줄): ZONE_TYPE_CONFIGS (7개 zone type) + DEFAULT_PRESETS (5개 레이아웃 프리셋). 상수 전용. **SAFE**
* 과도한 상호 의존 없음: 의존 방향 단방향 (container → hook, container → sub-components, container → dialogs, canvas/sidebar/dialogs → constants)

### 3.4 Dead Code / Orphan 여부 — **CLEAN (신규 도입 0건)**

* 사용되지 않는 helper/component: 0건
* import만 남고 사용되지 않는 type/function: 0건
* stale state / unused props: 0건 (신규 도입분)
* 원본에서 옮기며 남은 중복 코드: 0건
* 중복 constants: 0건 — ZONE_TYPE_CONFIGS, DEFAULT_PRESETS 각각 `template-builder-constants.ts` 단일 소스

기존 관찰 2건 (split과 무관):
1. `layoutPresets` state — hook에서 fetch/return하지만 소비처 없음. 원본에서도 동일.
2. `ZONE_TYPE_CONFIGS.icon` 필드 — 정의되나 `.icon` 접근 없음. 원본에서도 동일.

### 3.5 UI/API 정합성 — **SAFE**

| 항목 | 상태 |
|------|------|
| 페이지 route | 유지 (`index.ts` line 23 무변경) |
| 목록 조회 | `templateApi.get()` + `templateApi.getZones()` — hook에서 동일 호출 |
| 템플릿 생성 | `templateApi.create()` — handleCreateTemplate |
| 템플릿 수정 | `templateApi.update()` — handleUpdateTemplate |
| Zone 추가 | `templateApi.addZone()` — handleAddZone |
| Zone 수정 | `templateApi.updateZone()` — handleUpdateZone |
| Zone 삭제 | `templateApi.removeZone()` — handleDeleteZone |
| Preset 적용 | removeZone loop + addZone loop — handleApplyPreset |
| Drag/Resize | mousedown/mousemove/mouseup + window listeners + updateZone — 보존 |
| Preview | getPreviewUrl → TemplatePreviewDialog iframe — 보존 |
| Grid/List 레이아웃 | 12-column grid (8+4) — 보존 |
| default export | `export default function TemplateBuilder()` — 보존 |
| index.ts | 변경 없음 |

### 3.6 Oversized 잔존 여부 — **충분히 해소**

| 파일 | 줄 수 | oversized 판정 |
|------|-------|---------------:|
| `useTemplateBuilder.ts` | 381 | 아님 — orchestration hook, 단일 페이지 전체 state 관리 적정 크기 |
| `TemplateBuilderSidebar.tsx` | 222 | 아님 — settings form + zone list 2카드, form 필드 나열이 대부분 |
| `ZoneEditorDialog.tsx` | 193 | 아님 — zone form dialog, 7개 필드 나열 |
| `TemplateBuilder.tsx` | 170 | 아님 — container JSX layout |

이번 분해로 oversized risk 충분히 해소됨.

---

## 4. `useTemplateBuilder.ts` 별도 판단

| 항목 | 결과 |
|------|------|
| 현재 상태 유지 가능 여부 | **유지 가능** |
| 후속 분해 필요 여부 | **불필요** |
| oversized 후보 여부 | **아님** |

**이유 요약**:

1. **단일 페이지 orchestration**: Template Builder는 template CRUD + zone CRUD + drag/resize + preset + preview가 모두 동일 캔버스 위에서 상호작용하는 단일 페이지. 이 모든 state가 동일 생명주기를 공유하므로 한 hook에 있는 것이 적정.

2. **구성 명확**: 5개 그룹 (data state 7개, dialog state 4개, form state 3개, drag state 3개, handler 10개)이 주석으로 구분되어 있음. 복잡한 orchestration이 아닌 직선적 CRUD + 이벤트 핸들링.

3. **분할 시 비용 > 이득**: drag 로직만 분리하면 `useDragResize(zones, setZones, canvasRef, selectedZoneId, template)` — 5개 파라미터 + return value. 연결 비용이 분리 이득보다 큼.

4. **유사 패턴 참조**: 동일 codebase `useContentBlocks.ts` (183줄)은 단순 CRUD hook. `useTemplateBuilder` 381줄은 CRUD + drag/resize + 2개 form으로 약 2배 크기. 기능 복잡도 비례.

5. **JSX 0줄**: 순수 state/handler hook. UI 렌더링 책임 없음.

**후속 분해 불필요**. 다만, 향후 Template Builder에 undo/redo, snapping grid, multi-zone selection 등 복잡한 canvas 인터랙션이 추가되면 drag 로직 분리를 고려할 수 있음 (현재는 불필요).

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

### 추천 1순위: `VendorsCommissionAdmin.tsx` (1,161줄) + `VendorsAdmin.tsx` (1,077줄)

**이유**:
* 벤더 관리 2개 파일을 묶음 WO로 처리 가능 — 동일 도메인 (Vendors)
* Page 컴포넌트이므로 이번 ContentBlockLibrary + TemplateBuilder split에서 확립한 패턴 그대로 적용 가능
* 유사 구조 예상: data table + CRUD dialog + filter + API calls 혼합

**WO 형태**: 묶음 WO 권장 (`WO-O4O-VENDORS-ADMIN-SPLIT-V1`). 동일 도메인 2파일 동시 정비.

### 추천 2순위: `ShortcodeBlock.tsx` (1,129줄)

**이유**:
* 사이니지 도메인 (`digital-signage/v2/`) 정비 연장선
* ContentBlockEditors와 유사한 switch dispatch 패턴일 가능성
* 단독 WO (`WO-O4O-SHORTCODE-BLOCK-SPLIT-V1`)

---

## 6. 잔존 이슈 요약

| 항목 | 결과 |
|------|------|
| Dead code (신규 도입) | 0건 |
| Dead code (기존) | 2건 관찰 (layoutPresets 미사용, icon 필드 미사용) — split과 무관 |
| 중복 로직 | 0건 |
| 과분할 | 0건 — 9개 파일 모두 적정 크기 |
| 미분리 | 0건 |
| Follow-up 필요 | 없음 |

---

## 결론

이번 TemplateBuilder split은 **안전하게 완료**되었다.

* 1,038줄 → 9개 파일, container 170줄 (84% 축소)
* `useTemplateBuilder.ts` 381줄은 단일 페이지 orchestration hook으로 **유지 가능** (새 oversized 후보 아님)
* Dead code 0건 (신규 도입), 중복 0건, 타입 오류 0건
* Template CRUD + Zone CRUD + Preset + Drag/Resize + Preview 전체 흐름 보존
* **즉시 main merge + push 가능**

다음 oversized 정비 대상은 `VendorsCommissionAdmin.tsx` (1,161줄) + `VendorsAdmin.tsx` (1,077줄) 묶음 WO 권장.
