# CHECK-O4O-STORE-PRODUCTION-EXTERNAL-LLM-REALIGNMENT-V1

> **WO**: [`WO-O4O-STORE-PRODUCTION-EXTERNAL-LLM-REALIGNMENT-V1`](../work-orders/WO-O4O-STORE-PRODUCTION-EXTERNAL-LLM-REALIGNMENT-V1.md) · **실행일**: 2026-09-18 · **base**: `origin/main` `0457843df`(착수) → 코드 commit `3a41a04fe`
> **판정**: **COMPLETE_WITH_SMOKE_PENDING** — 구현 · vitest 119 · jest 143 · 3 서비스 build · 배포 3 서비스 success · bundle 반영(KPA 6 · KCos 3 · PH 4) 확인 · CI green(`35355797605`) · 브라우저 smoke = store-owner 테스트 계정 로그인 불가 blocker 지속 → PENDING_USER_VERIFICATION(§7)

## 1. Fresh Census — TARGET_SPECIFIC 13 (drift 0)

WO 2 CHECK 의 13 과 최신 main 재검색(`RichTextEditor` · `LlmAssistPanel` · `buildStoreContentAuthoringPrompt` · `/api/ai/` · `AiContentModal` · `qr-description` · `generatedBy` · `aiDescription`) 결과 동일. 착수 시점 13 파일 전부 `LlmAssistPanel=0` · `showInternalAi={false}=1` · `/api/ai/` 는 QR 1 파일(2건)만.

| 목적 | task | 파일 | 적용 방식 |
|---|---|---|---|
| BLOG (3) | `blog` | KPA `PharmacyBlogPage` · KCos `StoreBlogManagePage` · PH `BlogEditorPage` | KPA=`StoreBlogEditorPanel.beforeEditor` 직접 · KCos=`StoreBlogManageView.renderAssist` · PH=standalone 직접 |
| POP (3) | `pop` | KPA `PharmacyPopPage` · KCos `StorePopStaffPage` · PH `PopPage` | KPA/PH=standalone 직접 · KCos=`StorePopStaffView.renderAssist` |
| PRODUCT_DESCRIPTION (4) | `product-description` | KPA `StoreLocalProductsPage` · KPA/KCos/PH `(Store)ProductDescriptionsPage` | 3=`StoreProductDescriptionsView.renderAssist` · LocalProducts=폼 modal 직접 |
| MULTILINGUAL (2) | `translate` | KPA/PH `StoreProductMultilingualContentPage` | standalone 직접(두 파일 동일 구조) |
| QR (1) | `qr` | KPA `StoreQrAiDescriptionPage` | 1단계 입력 카드에 외부 경로 추가 · legacy 내부 AI 유지 |

census 제외 판정: 0건(13 전부 LLM authoring 대상). `TARGET_SPECIFIC_WITHOUT_EXTERNAL_LLM_ENTRY=0`.

### §30 `aiDescription` legacy metadata census
`content_json.aiDescription.mode` 는 QR 목록 "AI 설명" 탭 · `StoreContentsSelector` 필터 · `store-library-feed.controller` · `store-qr.service`(`aiDescriptionMode`) 의 **구조 SSOT** 다. `aiDescription.items[].descriptionHtml` 은 공개 landing(`QrLandingPage.QrCornerItems`) 코너 아코디언이 `descriptionHtml` 있는 항목만 그린다. → 외부 경로는 `mode · productName/cornerName · emphasis · items[key/name/emphasis]` (사용자 입력 구조 정보)만 저장하고 `model · generatedBy · generatedAt · descriptionHtml` 은 만들지 않는다. rename/정리는 WO 4.

## 2. 변경 파일 (20)

| 파일 | 변경 |
|---|---|
| `packages/store-ui-core/src/llm/storeContentAuthoringPrompt.ts` | `StoreContentLlmTask` += `blog · pop · qr · product-description · translate` · Context additive `referenceText · referenceHtml · sourceLocale · targetLocale` · `TASK_SPECS`(intro/work/result) 단일 표 · `PRODUCT_FACT_CONTRACT_LINES`(§12, 건강 단서 무관 항상) · `TRANSLATE_CONTRACT_LINES`(§13) · locale 라벨 7종 · health hint 에 건기식 원료명 6종 additive · create/revise 출력 불변 |
| `packages/store-ui-core/src/__tests__/storeContentAuthoringPrompt.test.ts` | +20 (공통 계약 7 · blog 3 · pop 2 · qr 2 · product-description 2 · translate 3 · create/revise 회귀 가드 1) |
| `packages/store-ui-core/src/components/blog/StoreBlogManageView.tsx` | optional `renderAssist?({title, excerpt, value, onApplyHtml})` → `StoreBlogEditorPanel.beforeEditor` |
| `packages/store-ui-core/src/components/pop-staff/StorePopStaffView.tsx` | optional `renderAssist?({title, excerpt, value, onApplyHtml})` 본문 라벨 행 |
| `packages/store-ui-core/src/components/product-descriptions/StoreProductDescriptionsView.tsx` | optional `renderAssist?({product, value, prefillNote, onApplyHtml})` 편집기 위 · `onApplyHtml=setContent` |
| KCos `StoreBlogManagePage` · `StorePopStaffPage` · `StoreProductDescriptionsPage` | `renderAssist` 에 `LlmAssistPanel` 주입 |
| KPA `StoreProductDescriptionsPage` · PH `ProductDescriptionsPage` | `renderAssist` 주입(referenceText = prefillNote + product.summary) |
| KPA `PharmacyBlogPage` | `beforeEditor` 에 패널(sourceTitle=`pendingSourceItems[0].title`) · 기존 안내문 유지 |
| PH `BlogEditorPage` | 편집기 위 패널 |
| KPA `PharmacyPopPage` · PH `PopPage` | 본문 라벨 행 패널(referenceText=excerpt) |
| KPA `StoreLocalProductsPage` | 설명 편집기 헤더에 패널(referenceText=카테고리·요약) · 적용 시 `setDescription`+`setEditorKey` 재마운트(기존 가져오기 패턴) |
| KPA/PH `StoreProductMultilingualContentPage` | `translateSource`(§14: target 본문=currentHtml · source=defaultLocale→ko, 메모리 draft 만) · 본문 라벨 행 패널 · `onApplyHtml → setActiveDraft({html})` 만 |
| KPA `StoreQrAiDescriptionPage` | `authoredBy` 상태 · `externalReferenceText`/`buildExternalPrompt`/`handleExternalApply` · 1단계에 `[ChatGPT로 작업]`(입력 갖춰졌을 때만) · `ensureContentSaved`/`handleUpdate` 의 `generatedBy` 를 `authoredBy==='external' ? undefined : 'gemini-qr-description'` · 2단계 helper 문구 분기 · legacy `handleGenerate`/`/api/ai/qr-description` 불변 |
| `apps/api-server/src/__tests__/store-production-external-llm-realignment-contract.spec.ts` | 신설 source-contract(A~E) |
| `apps/api-server/src/__tests__/store-external-llm-content-authoring-contract.spec.ts` | task union 단언을 additive 허용(`create`·`revise` 잔존 확인)으로 1줄 조정 |

미변경: backend 런타임·API·DB·migration 0 · `LlmAssistPanel`/`RichTextEditor` 0 · POP V2(template/layout/PDF/`store_execution_assets`) 0 · 저장 원장 6종 0 · `AiContentModal`/`/api/ai/content` 0 · `aiRequestHeaders` 0(WO 4) · 태블릿 편집기 0 · `StoreBlogEditorPanel` 0(기존 `beforeEditor` 슬롯 재사용).

## 3. 설계 결정 기록

- **Prompt 단일 출처(§34)**: 화면은 `task` + 화면에 이미 있는 Context 만 넘긴다. `TASK_SPECS` 는 `currentHtml` 유무로 "새로 작성/다듬기" 분기 → 목적별 task 에 별도 revise 변형 없음.
- **공통 View 우선(§32)**: 5 wrapper 는 `renderAssist` 슬롯, 나머지 8 은 standalone 직접. `store-ui-core` 의 `@o4o/content-editor` import 0 유지(spec B 고정).
- **결과 → 편집기 반영**: 모두 편집 상태 setter 만 호출(`RichTextEditor` 는 외부 `value` 변경 시 `setContent` 동기화 — WO 2 CHECK §3 과 동일 경로). LocalProducts 는 `key` 재마운트 기존 패턴.
- **QR provenance(§29)**: 외부 경로 저장은 `generatedBy` 키 자체를 내지 않는다(`undefined` → JSON 직렬화 시 제거). edit 모드에서 외부 결과로 갱신하면 `...curJson` 의 옛 `generatedBy` 도 명시 `undefined` 로 덮어 제거. `tags=['AI 설명']` 은 기능 분류 라벨(QR 목록 탭·자료함 필터 보조)로 유지 — 판단 근거 §30 census. provider-specific 신규 값 0.
- **QR 코너 외부 경로**: ChatGPT 결과는 코너 소개 본문 하나(상품별 h3 지시). per-item `descriptionHtml` 을 만들지 않으므로 landing 아코디언은 비노출(항목 정보는 본문에 포함). legacy Gemini 항목 설명이 있던 콘텐츠를 외부 결과로 갱신하면 `aiMeta` 가 사용자 입력 구조로 재구성돼 혼합 provenance 를 남기지 않는다.
- **자동화 금지(§38)**: spec E 가 13 파일 전부의 `onApplyHtml` 블록에서 save/publish/QR/PDF 호출 0 을 고정.

## 4. 테스트

| 항목 | 결과 |
|---|---|
| store-ui-core vitest (`npx vitest run --config packages/store-ui-core/vitest.config.mjs`) | 7 files · **119/119 PASS** (신규 20 · WO2 15 유지) |
| api-server `store-production-external-llm-realignment-contract.spec.ts` (신설) | PASS |
| api-server `store-external-llm-content-authoring-contract.spec.ts` (WO2) · `store-ai-first-editor-boundary-contract.spec.ts` (WO1) | PASS |
| 위 3 spec 합계 | **143/143 PASS** |

## 5. Typecheck · Build · Lint

| 대상 | 결과 |
|---|---|
| `@o4o/store-ui-core` tsc `--noEmit` | 변경 파일 오류 0 (기존 baseline: 미접촉 `workspace/__tests__/storeWorkspace.test.tsx` mock 타입 오류만) |
| `@o4o/auth-client` · `@o4o/content-editor` build (사전 빌드) | PASS |
| `@o4o/web-kpa-society` tsc + vite build | PASS (24.4s) |
| `@o4o/web-k-cosmetics` tsc + vite build | PASS (27.4s) |
| `pharmacy-hub-web` tsc -b + vite build | PASS (24.9s) |
| eslint 변경 17 파일 | 오류 0 · 경고 3(전부 미접촉 기존 라인 `react-hooks/exhaustive-deps`) |

## 6. 배포 · bundle 확인

### 6-1 배포 (commit `3a41a04fe` → `origin/main`)

| run | 결과 |
|---|---|
| Deploy Web Services `35353030253` | **success** — `deploy-kpa-society` · `deploy-k-cosmetics` · `deploy-pharmacy-hub` success (detect-changes 로 `kpa-branch` · `neture` · `signage-player` 도 재배포, success) |
| Deploy API Server `35353030199` | success (런타임 변경 0 · spec 2건만) |
| Deploy Admin Dashboard `35353030211` | success |
| CodeQL `35353030227` | success |
| CI Pipeline `35353030138` | API Server Jest **success** · Code Quality Check **success** · Build Applications(admin-dashboard) **cancelled** — 직후 타 세션 docs 커밋 `5a07042cf` push 의 concurrency 취소. `5a07042cf` = 내 코드 + docs 만이므로 그 CI run `35354355557` 이 Build 검증을 대신한다 → `5a07042cf` · `b16f4896b` run 도 연쇄 취소 → **`35355797605`(`35548dd65`, `3a41a04fe` 포함 · 타 세션 auth feat 15파일 추가) success**: API Server Jest · Code Quality Check · Build Applications 전부 success. 내 코드 포함 상태의 green 이므로 Build 검증 성립(단독 run 은 아님) |

### 6-2 배포 bundle 반영 확인 (cache-bust fetch, 2026-09-18 14:0x UTC)

marker 6종 = `ChatGPT로 작업` · `짧은 포인트 2~5개`(pop) · `제품명만 보고 성분·효능·원산지`(product-description) · `숫자·단위·제품명·고유명사`(translate) · `QR 주소·slug·링크`(qr) · `h1 은 사용하지 마세요`(blog).

| 서비스 | 확인 |
|---|---|
| `kpa-society.co.kr` | main `index-CBXnlk8g.js` → 공통 chunk `storeContentAuthoringPrompt-D3fH40IP.js` 에 marker 6/6. importer = `PharmacyBlogPage-CjUi9XD8` · `PharmacyPopPage-en4YF-b3` · `StoreLocalProductsPage-DsA8mf-e` · `StoreProductDescriptionsPage-CO_qwjjk` · `StoreProductMultilingualContentPage-CyAPxhSy` · `StoreQrAiDescriptionPage-BDLkvKUB` — **KPA 대상 6/6** |
| `k-cosmetics.site` | main `index-BBGiKrm8.js` → 같은 Prompt chunk(marker 6/6). importer = `StoreBlogManagePage-CmyMVLqN` · `StorePopStaffPage-D_bOFhH_` · `StoreProductDescriptionsPage-a8Iuu_VH` — **KCos 대상 3/3** |
| `pharmacyhub.co.kr` | 단일 main `index-CXyvSieu.js` 에 marker 6/6 (PH 는 route chunk 분리 없음 — 4 대상 화면이 main 에 포함) |

## 7. 브라우저 smoke — **PENDING_USER_VERIFICATION**

- WO §47~§51 의 smoke(Blog · POP · 상품 설명 · 다국어 · QR 각 1회: `ChatGPT로 작업` → 안내 복사 → HTML 붙여넣기 → 편집기 반영 → 기존 저장 버튼 → 재조회)는 **store-owner 로그인이 전제**다.
- WO1 CHECK(`c996691c0`) 에서 `docs/local/TEST-ACCOUNTS.local.md` 의 store-owner 계정이 KPA·PH 로그인 API `401 INVALID_USER`, 보조 계정 KPA `403` lockout 으로 실패했고 WO2 도 같은 이유로 PENDING. 이 WO 는 auth 를 고치지 않는 범위(WO §52)이며 재시도는 lockout 위험만 키우므로 **추가 로그인 시도 없이** 미검증으로 둔다. (같은 날 Google Identity 트랙에서 `renagang21` 은 Google-only 테스트 계정(password NULL)으로 재정의됨 — password 로그인 경로 아님.)
- 재개 절차(유효한 store-owner 계정 확보 시): KPA `/store/content/blog`(글쓰기) · `/store/pop` 사본 수정 · `/store/commerce/product-descriptions` · `/store/commerce/local-products` 등록 modal · `/store/products/multilingual/:kind/:id` English 탭 · `/store/marketing/qr/ai-description`(상품명 입력 후 패널) / KCos `/store/content/blog` · `/store/pop/staff` · 상품 설명 / PH `/store-owner/blog/*` · `/store-owner/pop` · `/store-owner/product-descriptions` · `/store-owner/products/multilingual/*` 에서 ① 라벨 `ChatGPT로 작업` ② "안내 복사" 클립보드에 목적별 조건(`h1 은 사용하지 마세요` / `짧은 포인트 2~5개` / `제품명만 보고 성분·효능·원산지` / `English 로만 작성하세요` / `QR 주소·slug·링크는 만들지 마세요`) 포함 ③ 붙여넣기 → 편집기 즉시 반영 ④ 기존 저장 → 재조회 값 = 붙여넣은 HTML ⑤ 다국어는 자동 발행 없음 · QR 은 저장 후 `content_json.generatedBy` 키 부재 확인 → §8 의 5 그룹 열을 PASS 로 갱신한다.
- 로그인이 필요 없는 확인(배포 bundle 문자열 · Prompt 조건 6종)은 §6-2 로 대체했다. 빌드·bundle 확인만으로 UI 동작을 PASS 로 적지 않는다.

## 8. 완료 기준

| 기준 | 상태 |
|---|---|
| `STORE_PRODUCTION_EXTERNAL_LLM` | **PASS**(구현·계약·빌드·배포·bundle) / 브라우저 PENDING_USER_VERIFICATION |
| `STORE_BLOG_EXTERNAL_LLM` · `STORE_POP_EXTERNAL_LLM` · `STORE_PRODUCT_DESCRIPTION_EXTERNAL_LLM` · `STORE_MULTILINGUAL_EXTERNAL_LLM` · `STORE_QR_EXTERNAL_LLM` | 구현·계약 PASS(각 그룹 spec C) · 브라우저 실측 §7 |
| `TARGET_SPECIFIC_WITHOUT_EXTERNAL_LLM_ENTRY` | **0** (spec C census 13/13) |
| `STORE_TARGET_SPECIFIC_INTERNAL_AI_REQUIRED` | **0** (13 화면 전부 외부 경로만으로 제작 가능 · QR legacy 는 선택지) |
| `STORE_INTERNAL_AI_REINTRODUCED` | **0** (`showInternalAi={false}` 13/13 · AiContentModal/`/api/ai/content` 0) |
| `AUTO_SAVE_FROM_LLM` · `AUTO_PUBLISH_FROM_LLM` · `AUTO_QR_CREATE_FROM_LLM` | **0** (spec E) |
| `PROMPT_CORE_SINGLE_SOURCE` | **PASS** (spec A · 13 파일 Prompt 전문 0) |
| `NEW_LLM_BACKEND_API` · `DB_MIGRATION` | **0** |

## 9. 남아 있어도 정상(WO 4 대상)

`StoreQrAiDescriptionPage` legacy `handleGenerate`/`POST /api/ai/qr-description` · Store `aiRequestHeaders` 잔존(KPA Blog/ProductDescriptions · KCos Blog/ProductDescriptions · PH ProductDescriptions) · 공통 `AiContentModal`/`/api/ai/content` · `aiDescription` 스키마 이름.

## 10. Git

코드 `3a41a04fe` (20 files · path-specific stage · `check-staged-scope` PASS · pathspec commit) → `origin/main`. 착수~커밋 사이 같은 트리에 타 세션 docs 커밋 `7bfe0a0ea` 유입(범위 무관 · 미접촉).

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건 — 해당 없음.
