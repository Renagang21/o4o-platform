# CHECK-O4O-STORE-EXTERNAL-LLM-CONTENT-AUTHORING-V1

> **WO**: [`WO-O4O-STORE-EXTERNAL-LLM-CONTENT-AUTHORING-V1`](../work-orders/WO-O4O-STORE-EXTERNAL-LLM-CONTENT-AUTHORING-V1.md) · **실행일**: 2026-09-18 · **base**: `origin/main` `a5d56fd04`
> **판정**: COMPLETE_WITH_SMOKE_PENDING — 구현·단위/계약 테스트·5 빌드 PASS · 배포 `35302730513` 3 서비스 success · bundle 반영 확인 · 브라우저 smoke = 테스트 계정 로그인 불가 → PENDING_USER_VERIFICATION(§6)

## 1. Fresh Census — Store 콘텐츠 제작 화면 분류

| 분류 | 파일 | 이번 WO |
|---|---|---|
| GENERAL_AUTHORING | KPA `CreateContentFromResourcesModal` · `StoreDirectContentPage` · `StoreContentEditPage` · PH `ContentPage` | 적용 4 |
| PRODUCTION_MATERIAL | `ProductionMaterialEditorShell`(store-ui-core) + KCos wrapper · KPA `ProductionMaterialEditorPage` · PH `LibraryResourcesPage`(content 유형) | 적용 4(셸+wrapper 포함) |
| TARGET_SPECIFIC (WO 3) | KPA `PharmacyBlogPage` · `PharmacyPopPage` · `StoreLocalProductsPage` · `StoreProductDescriptionsPage` · `StoreProductMultilingualContentPage` · `StoreQrAiDescriptionPage` · KCos `StoreBlogManagePage` · `StorePopStaffPage` · `StoreProductDescriptionsPage` · PH `BlogEditorPage` · `PopPage` · `ProductDescriptionsPage` · `StoreProductMultilingualContentPage` | 미변경 13 |
| ALREADY_LLM_ASSISTED | `packages/tablet-screen-set-editor` 코너 편집기(`CORNER_DESC_PROMPT`, string guideText) | 무변경(회귀 가드) |
| OUT_OF_SCOPE | Community·Supplier·Operator·Lecture 편집기 · `ContentCreationGuideModal`(store 모드 = 목록 화면 가이드, 유지) | 미변경 |

KCos 에는 일반 콘텐츠 제작 화면이 없다(제작 자료 셸만) → KCos 는 셸 슬롯 주입으로 parity.

## 2. 변경 파일

| 파일 | 변경 |
|---|---|
| `packages/store-ui-core/src/llm/storeContentAuthoringPrompt.ts` | 신설. 순수 Prompt Builder(create/revise · Source Context · Output Contract · 건강 조항) · `resolveStoreContentLlmTask` · `isBlankStoreHtml` · `STORE_LLM_ASSIST_LABEL` |
| `packages/store-ui-core/src/index.ts` | export 추가 |
| `packages/store-ui-core/src/__tests__/storeContentAuthoringPrompt.test.ts` | 신설 vitest 15 |
| `packages/content-editor/src/components/LlmAssistPanel.tsx` | `guideText` 함수형 허용(additive) + 함수형일 때만 "추가 요청(선택)" textarea. string 소비처 동작 불변 |
| `packages/store-ui-core/src/components/ProductionMaterialEditorShell.tsx` | `LlmAssistComponent?` 구조적 슬롯(`InjectedLlmAssistProps`) · 편집기 `value` 상태화 · 헤더/placeholder 문구 정정 · `@o4o/content-editor` import 없음 유지 |
| `services/web-k-cosmetics/src/pages/store/ProductionMaterialEditorPage.tsx` | `LlmAssistComponent={LlmAssistPanel}` |
| `services/web-kpa-society/src/pages/pharmacy/CreateContentFromResourcesModal.tsx` | 패널(title·currentHtml·productName) → `setEditorHtml` |
| `services/web-kpa-society/src/pages/pharmacy/StoreDirectContentPage.tsx` | 패널 → `setEditorInitialHtml`+`setEditorContent` 동시 |
| `services/web-kpa-society/src/pages/pharmacy/StoreContentEditPage.tsx` | 패널(sourceOrigin=source) → 동시 갱신. 원본 snapshot 미접촉 |
| `services/web-kpa-society/src/pages/pharmacy/ProductionMaterialEditorPage.tsx` | 패널(sourceTitle/Origin) → 동시 갱신 · 문구 정정 2 |
| `services/web-pharmacy-hub/src/pages/store-owner/ContentPage.tsx` | 패널 → `setHtml` |
| `services/web-pharmacy-hub/src/pages/store-owner/LibraryResourcesPage.tsx` | 패널(content 유형 블록 안) → `setHtmlContent` |
| `apps/api-server/src/__tests__/store-external-llm-content-authoring-contract.spec.ts` | 신설 source-contract 35 |

미변경: backend 런타임·API·DB·migration 0 · `RichTextEditor` 0 · 태블릿 편집기 0 · `AiContentModal`/`/api/ai/content` 0 · `aiRequestHeaders`(WO 4) 0 · `ContentCreationGuideModal` 0.

## 3. 결과 → 편집기 반영 근거

`RichTextEditor` 는 외부 `value` 변경 시 `editor.commands.setContent(value)` 로 동기화(태블릿 소비처와 동일 경로). `editorInitialHtml`(편집기 value)만 바꾸면 `onChange` 가 즉시 발화하지 않아 저장값(`editorContent`)이 낡을 수 있으므로 KPA 3 화면은 **두 상태를 동시 갱신**한다. 셸은 `editorValue`(value) + `editorHtml`(저장값) 동시 갱신. 저장은 기존 저장 버튼 경로 그대로(자동 저장·게시 없음).

## 4. 테스트

| 항목 | 결과 |
|---|---|
| store-ui-core vitest (`npx vitest run --config packages/store-ui-core/vitest.config.mjs`) | 7 files · **99/99 PASS** (신규 15 포함) |
| api-server `store-external-llm-content-authoring-contract.spec.ts` | **35/35 PASS** |
| api-server `store-ai-first-editor-boundary-contract.spec.ts` (WO1 재실행) | **34/34 PASS** |

## 5. 빌드

| 대상 | 결과 |
|---|---|
| `@o4o/content-editor` tsc `--noEmit` + `build`(tsup DTS) | PASS |
| `@o4o/web-kpa-society` build | PASS (36.2s) |
| `@o4o/web-k-cosmetics` build | PASS (17.1s) |
| `pharmacy-hub-web` build | PASS (16.7s) |
| `@o4o/web-neture` tsc `--noEmit`(태블릿 편집기 소비처) | PASS |

## 6. 배포 · 브라우저 smoke

### 6-1 배포 (commit `5a91a3970` → `origin/main`)

| run | 결과 |
|---|---|
| Deploy Web Services `35302730513` | **success** — `deploy-kpa-society` · `deploy-k-cosmetics` · `deploy-pharmacy-hub` 전부 success (detect-changes 로 `kpa-branch`·`neture`·`signage-player` 도 함께 재배포, success) |
| Deploy API Server `35302730581` | success (런타임 변경 0 · spec 1건만) |
| Admin Dashboard `35302730589` | success |
| CI Pipeline `35302730570` | Code Quality Check success · API Server Jest success · Build Applications success — **success** (신규 spec 35 포함) |

### 6-2 배포 bundle 반영 확인 (cache-bust fetch, 2026-09-18)

| 서비스 | 확인 |
|---|---|
| `kpa-society.co.kr` | main `index-BRSdY-Lw.js` 가 참조하는 263 chunk 스캔 → `storeContentAuthoringPrompt-CDX9p_m-.js` 에 `ChatGPT로 작업` 포함. importer chunk 4 = `ProductionMaterialEditorPage-2zAPjU12` · `StoreContentEditPage-DuOhPCPF` · `StoreDirectContentPage-rEhRV0Nx` · `StoreLibraryContentsPage-DASDKa8H`(= `CreateContentFromResourcesModal`) — 적용 4 화면 전부 · main bundle 에 패널 "추가 요청" textarea placeholder 포함 |
| `k-cosmetics.site` | `ProductionMaterialEditorPage-yt4w7RzN.js` 에 `ChatGPT로 작업` · `매장 제작 자료 편집` · 새 placeholder(`ChatGPT 등 외부 AI에서 만든 내용을 붙여넣으세요`) 포함 · main `index-Dgh49oOo.js` 에 패널 textarea placeholder 포함 |
| `pharmacyhub.co.kr` | main `index-l5I00Hiy.js` 에 `ChatGPT로 작업` · 패널 textarea placeholder 포함 |

### 6-3 브라우저 smoke — **PENDING_USER_VERIFICATION**

- WO §검증의 smoke(“ChatGPT로 작업” → 안내 복사 → 붙여넣기 → 편집기 반영 → 저장)는 **매장 경영자 로그인이 전제**다.
- 같은 날 WO1 CHECK §6 에서 `docs/local/TEST-ACCOUNTS.local.md` 의 store-owner 계정으로 KPA·PH 로그인 API 가 `401 INVALID_USER`, 보조 계정은 KPA `403` lockout 으로 실패했고(WO1 CHECK `c996691c0`), 이 WO 는 auth 를 고치지 않는 범위이며 재시도는 lockout 위험만 키우므로 **추가 로그인 시도 없이** 미검증으로 둔다.
- 재개 방법: 유효한 store-owner 계정으로 KPA `/pharmacy/store/contents/direct/new`(직접 작성) · 자료함 “가져와서 만들기” 모달 · PH `/store-owner/content` · KCos 제작 자료 편집 화면에서 ① 패널 라벨 `ChatGPT로 작업` ② 추가 요청 입력 후 “안내 복사” → 클립보드에 `[결과 조건]` 포함 ③ HTML 붙여넣기 → 편집기 본문 즉시 반영 ④ 기존 저장 버튼 저장 → 저장값 = 붙여넣은 HTML 을 확인하면 §7 `STORE_LLM_RESULT_TO_EDITOR` 브라우저 열을 PASS 로 갱신한다.
- 로그인이 필요 없는 확인(배포 bundle 문자열)은 6-2 로 대체했다. 빌드·bundle 확인만으로 UI 동작을 PASS 로 적지 않는다.

## 7. 완료 기준

| 기준 | 판정 | 근거 |
|---|---|---|
| STORE_EXTERNAL_LLM_AUTHORING | PASS | §2 · §4 |
| STORE_GENERAL_CONTENT_CHATGPT_ENTRY | PASS | GENERAL_AUTHORING 4 화면 `label={STORE_LLM_ASSIST_LABEL}` (spec C) |
| STORE_PROMPT_CORE | PASS | 순수 함수 · import 0 (spec B) |
| STORE_CREATE_PROMPT / STORE_REVISE_PROMPT | PASS | vitest CREATE/REVISE 블록 |
| STORE_LLM_RESULT_TO_EDITOR | PASS(source) / 브라우저 PENDING_USER_VERIFICATION | §3 · §6-3 |
| STORE_INTERNAL_AI_REINTRODUCED | 0 | spec C (`showInternalAi={false}` 유지 · AiContentModal/`/api/ai/content` 0) |
| STORE_AUTO_SAVE_FROM_LLM / STORE_AUTO_PUBLISH_FROM_LLM | 0 | onApplyHtml = 상태 갱신만 |
| STORE_CONTENT_STORAGE_SCHEMA_CHANGE / NEW_LLM_BACKEND_API / DB_MIGRATION | 0 | api-server 변경 = spec 1건 |
| TABLET_LLM_ASSIST_REGRESSION | 0 | spec A(태블릿 string guideText 무변경) · web-neture tsc PASS |

## 8. 보고만 (미변경)

- `ContentCreationGuideModal(mode="store")` 은 목록 화면 가이드로 유지 — 편집기 패널과 역할이 겹치는 부분(HTML 탭 붙여넣기 안내)은 있으나 이미지 URL·다국어 안내는 패널이 대체하지 않음. 통합 여부는 WO 3/4 에서 판단.
- `aiRequestHeaders` 잔존(KPA 4·셸 1) — 이번 WO 접촉 파일에서도 제거하지 않음(WO 4 일괄).
- 셸 `getAccessToken` prop 은 `aiRequestHeaders` 용으로만 남아 있음(WO 4 정리 대상).
