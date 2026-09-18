# WO-O4O-STORE-AI-FIRST-EDITOR-BOUNDARY-V1

> **상태**: CLOSED · **접수**: 2026-09-18 · **CHECK**: [`CHECK-O4O-STORE-AI-FIRST-EDITOR-BOUNDARY-V1`](../checks/CHECK-O4O-STORE-AI-FIRST-EDITOR-BOUNDARY-V1.md)
> 내 매장 AI First 리팩터링의 **첫 번째 실행 WO**. ChatGPT 기능 추가도, 기존 AI API 삭제도 하지 않는다.

## 1. 목적

공통 `RichTextEditor`(`@o4o/content-editor`)의 `full` preset 은 "✨ AI 정리" 버튼 → `AiContentModal` → O4O 내부 AI API 를 자동 노출한다. Store 화면이 `RichTextEditor` 를 쓰는 것만으로 O4O 내부 생성 AI 와 결합되는 구조를 끊고, **내 매장 영역에서는 내부 AI 를 명시적으로 OFF** 한다.

```text
RichTextEditor
 ├ 일반 편집 기능 (서식·이미지·동영상·표·HTML·미리보기·템플릿)   ← preset 이 결정
 └ 내부 AI (AI 정리 + AiContentModal)                          ← showInternalAi 가 결정
```

AI First 원칙: 내 매장 콘텐츠 생성·재작성은 사용자의 외부 AI(ChatGPT)를 기본으로 하고, O4O 는 Context/Prompt → 결과 저장 → POP/QR/PDF/태블릿/사이니지 실행 환경을 제공한다. O4O 자체 범용 생성 AI 는 장기적으로 제거한다(이번 WO 아님).

## 2. 범위

### 2-1 공통 capability (packages/content-editor)

- `ContentEditorProps.showInternalAi?: boolean` 추가. **기본값 `true`** (다른 서비스 동작 즉시 변경 없음).
- `RichTextEditor` → `Toolbar` 로 전달.
- `Toolbar`: AI 정리 버튼 조건 `preset === 'full'` → `preset === 'full' && showInternalAi`. `AiContentModal` 은 `showInternalAi=false` 면 **mount 자체를 하지 않는다**(버튼만 숨기지 않음).
- preset 주석 정정: `full = 전체 편집 기능`, AI capability 는 `showInternalAi` 로 별도 제어.

### 2-2 Store 소비처 (`showInternalAi={false}` 명시)

역할 = store owner · 업무공간 = `/store/*`(KPA·KCos) / `/store-owner/*`(PharmacyHub) · 목적 = 매장 콘텐츠 작성·실행물 제작. 직접 소비처 19 + 공유 셸 2(`ProductionMaterialEditorShell` 셸 내부 고정 · `TabletContentStepBuilder` passthrough + Store 소비처 2). 목록은 CHECK §3.

### 2-3 제외 (미변경)

Community(`CommunityContentWriteShell`·`ForumWriteForm`·`ResourceWrite*`) · Supplier(`web-neture`) · Operator/Admin(`/operator/*`·`/admin/*`·`operator-core-ui`·`admin-dashboard`) · Lecture(`CourseEditPage`·`InstructorCourseEditPage`) · Guide 편집(`GuideEditableSection`).

### 2-4 비범위 (삭제·추가 금지)

`AiContentModal`·`/api/ai/content`·`/api/ai/qr-description`·ai-proxy·ai-prompts 삭제 없음 / ChatGPT Prompt Builder·버튼·WebMCP 추가 없음 / POP·QR·태블릿·사이니지·ProductMaster·자료함·asset snapshot·store content 저장구조 변경 없음 / `apps/api-server/**` 런타임·DB·migration 변경 없음(추가된 것은 source-contract spec 1건뿐).

- **QR AI**(`/store/marketing/qr/ai-description` → `POST /api/ai/qr-description`)는 Toolbar 와 무관한 독립 page-level AI → 보고만. 해당 페이지의 `RichTextEditor` Toolbar 경로만 OFF.
- `aiRequestHeaders`: Store 소비처에서 제거하지 않는다(§15 — dead 판정은 후속 WO).

## 3. 하위호환 계약

- `showInternalAi` 미지정 소비처 = 현재 동작 그대로(AI 정리 표시).
- **기본값을 `false` 로 뒤집지 않는다.** 커뮤니티·공급자·운영자 전환 후 내부 AI consumer 가 0 이 되었을 때 공통 `AiContentModal`·API 를 제거한다.
- `showInternalAi=false` 는 AI 만 제거. Bold~Table·Undo/Redo·HTML(raw style 보존)·Preview·Template·이미지 폭/정렬·클립보드 업로드·Save/onChange 는 그대로.

## 4. 검증

- source-contract spec: `apps/api-server/src/__tests__/store-ai-first-editor-boundary-contract.spec.ts` (A 공통 5 · B Store 19+3 · C 비Store 7 = 34).
- `@o4o/content-editor` typecheck+build · `@o4o/web-kpa-society`·`@o4o/web-k-cosmetics`·`pharmacy-hub-web` build(tsc 포함) · `web-neture` tsc(tablet editor 시그니처 변경 소비처).
- 브라우저 smoke: 배포 후 Store 편집 화면(AI 정리 없음·HTML 탭·미리보기·저장) + 비Store 1 화면(AI 정리 유지).

## 5. 완료 기준

`CONTENT_EDITOR_AI_BOUNDARY=PASS` · `STORE_RICHTEXT_INTERNAL_AI=0` · `STORE_EDITOR_SAVE_REGRESSION=0` · `STORE_EDITOR_HTML_TAB=PASS` · `STORE_EDITOR_PREVIEW=PASS` · `STORE_EDITOR_TEMPLATE=PASS` · `NON_STORE_DEFAULT_BEHAVIOR=PRESERVED` · `BACKEND_CHANGE=0` · `DB_MIGRATION=0`.

## 6. 후속

WO 2 `STORE EXTERNAL LLM CONTENT AUTHORING`(자료함·제품·콘텐츠 → ChatGPT Prompt → HTML → O4O 저장) → WO 3 POP/QR/Blog/Product Description 전환 → WO 4 Store Internal AI Retirement(QR AI·page-level AI 포함) → WO 5 Store AI First E2E Closure.

## 7. Git

path-specific stage 만. `apps/api-server` 는 spec 1건만. 다른 세션 파일 불가침.
