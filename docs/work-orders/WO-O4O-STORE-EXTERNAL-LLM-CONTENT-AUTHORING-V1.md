# WO-O4O-STORE-EXTERNAL-LLM-CONTENT-AUTHORING-V1

> **상태**: CLOSED_WITH_SMOKE_PENDING(브라우저 smoke = 테스트 계정 로그인 불가 · CHECK §6) · **접수**: 2026-09-18 · **CHECK**: [`CHECK-O4O-STORE-EXTERNAL-LLM-CONTENT-AUTHORING-V1`](../checks/CHECK-O4O-STORE-EXTERNAL-LLM-CONTENT-AUTHORING-V1.md)
> 내 매장 AI First 리팩터링 **2단계**. 선행 WO1 [`WO-O4O-STORE-AI-FIRST-EDITOR-BOUNDARY-V1`](WO-O4O-STORE-AI-FIRST-EDITOR-BOUNDARY-V1.md)(내부 AI OFF) 위에 **외부 LLM(사용자 ChatGPT 등) 제작 흐름**을 붙인다. 새 외부 AI 연동 시스템을 만들지 않는다.

## 1. 목적

```text
사용자 외부 LLM(ChatGPT·Claude·Gemini 등, 사용자 자신의 계정) → HTML 생성
O4O = 작업 Context · Prompt 조립 · 결과 붙여넣기 → 사용자 검토/편집 → 기존 저장 버튼
```

- 공통 capability = 기존 `LlmAssistPanel`(`@o4o/content-editor`, 태블릿 코너 편집기가 이미 사용) **재사용**. 새 모달·새 API·WebMCP·ChatGPT 자동 열기 없음.
- Store Prompt 조립 = `@o4o/store-ui-core` **순수 함수** `buildStoreContentAuthoringPrompt(context)`. 화면별 Prompt 문구 복사본 0.
- Store 대표 라벨 = **"ChatGPT로 작업"**(패널 자체는 provider-neutral).

## 2. 범위

### 2-1 Store Prompt Core (`packages/store-ui-core/src/llm/storeContentAuthoringPrompt.ts`)

- `StoreContentLlmTask = 'create' | 'revise'` · `StoreContentLlmContext { task; title?; currentHtml?; sourceTitle?; sourceOrigin?; productName?; additionalInstruction? }`.
- `buildStoreContentAuthoringPrompt(ctx): string` = Task + Source Context(화면에 이미 있는 데이터만) + Output Contract(HTML only · 사실 창작 금지 · 인라인 style · script/외부 CSS 금지 · 건강 단서 시 효능·치료 표현 추가 금지) + 본문(revise 는 현재 본문, create 는 참고).
- `resolveStoreContentLlmTask(currentHtml)` = 본문 없음(`<p></p>` 포함) → create, 있음 → revise. `STORE_LLM_ASSIST_LABEL = 'ChatGPT로 작업'`.
- React·API·auth·router 의존 0. PII·주문·매출 Context 없음. Prompt 저장 없음.

### 2-2 공통 capability — `LlmAssistPanel` additive 확장

- `guideText: string | ((opts: { additionalInstruction: string }) => string)`. 함수형일 때만 패널 안에 "추가 요청(선택)" textarea(≤300자, 미저장) 노출. string 소비처(태블릿) 동작 불변.

### 2-3 Store 소비처 (전부 `showInternalAi={false}` 유지)

| 분류 | 파일 | 적용 |
|---|---|---|
| GENERAL_AUTHORING | KPA `CreateContentFromResourcesModal` | 패널(title·currentHtml·productName) → `setEditorHtml` |
| GENERAL_AUTHORING | KPA `StoreDirectContentPage` | 패널(sourceOrigin=direct) → `setEditorInitialHtml`+`setEditorContent` 동시 |
| GENERAL_AUTHORING | KPA `StoreContentEditPage` | 패널(sourceOrigin=store/snapshot) → 동시 갱신 · 원본 snapshot 불변 |
| GENERAL_AUTHORING | PH `ContentPage` | 패널 → `setHtml` |
| PRODUCTION_MATERIAL | `ProductionMaterialEditorShell`(store-ui-core) | `LlmAssistComponent?` 구조적 슬롯 · 편집기 value 상태화(`editorValue`) · 문구 정정("매장 제작 자료 편집" / "직접 작성하거나 ChatGPT 등 외부 AI에서 만든 내용을 붙여넣으세요.") |
| PRODUCTION_MATERIAL | KCos `ProductionMaterialEditorPage`(셸 wrapper) | `LlmAssistComponent={LlmAssistPanel}` 주입 |
| PRODUCTION_MATERIAL | KPA `ProductionMaterialEditorPage` | 패널(sourceTitle/Origin) → 동시 갱신 · 문구 정정 |
| PRODUCTION_MATERIAL | PH `LibraryResourcesPage`(content 유형) | 패널 → `setHtmlContent` |

### 2-4 제외 · 비범위

- TARGET_SPECIFIC(POP/QR/Blog/상품설명/다국어) 12 화면 → WO 3. `StoreLibraryContentsPage` 의 `ContentCreationGuideModal(mode="store")` = 목록 화면 가이드(이미지 URL 안내 등 패널이 대체하지 않는 내용) → **유지**.
- 금지 준수: AI 정리 복원 0 · `AiContentModal`/`/api/ai/content` 재연결 0 · backend/API/DB/migration 0 · 새 provenance 필드 0 · 자동 저장/게시 0. `aiRequestHeaders` 정리는 WO 4.

## 3. 검증

- store-ui-core vitest `src/__tests__/storeContentAuthoringPrompt.test.ts` 15 (CREATE/REVISE · Context 유무 · additionalInstruction · 건강 조항 · 라벨).
- api-server source-contract `store-external-llm-content-authoring-contract.spec.ts` 35 + WO1 spec 34 재실행.
- `@o4o/content-editor` typecheck+build · `@o4o/web-kpa-society`·`@o4o/web-k-cosmetics`·`pharmacy-hub-web` build · `@o4o/web-neture` tsc(태블릿 소비처).
- 브라우저 smoke: 배포 후 Store 화면에서 "ChatGPT로 작업" → 안내 복사 → 붙여넣기 → 편집기 반영 → 저장. 로그인 불가 시 `PENDING_USER_VERIFICATION`.

## 4. 완료 기준

`STORE_EXTERNAL_LLM_AUTHORING=PASS` · `STORE_GENERAL_CONTENT_CHATGPT_ENTRY=PASS` · `STORE_PROMPT_CORE=PASS` · `STORE_CREATE_PROMPT=PASS` · `STORE_REVISE_PROMPT=PASS` · `STORE_LLM_RESULT_TO_EDITOR=PASS` · `STORE_INTERNAL_AI_REINTRODUCED=0` · `STORE_AUTO_SAVE_FROM_LLM=0` · `STORE_AUTO_PUBLISH_FROM_LLM=0` · `STORE_CONTENT_STORAGE_SCHEMA_CHANGE=0` · `NEW_LLM_BACKEND_API=0` · `DB_MIGRATION=0` · `TABLET_LLM_ASSIST_REGRESSION=0`.

## 5. 후속

WO 3 POP/QR/Blog/Product Description 전환(같은 Prompt Core 에 task 추가) → WO 4 Store Internal AI Retirement(`aiRequestHeaders`·QR AI 포함) → WO 5 E2E Closure.

## 6. Git

path-specific stage 만. `apps/api-server` 는 spec 1건만. 다른 세션 파일 불가침.
