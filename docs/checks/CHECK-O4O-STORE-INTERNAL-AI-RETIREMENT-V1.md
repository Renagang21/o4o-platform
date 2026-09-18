# CHECK-O4O-STORE-INTERNAL-AI-RETIREMENT-V1

> **WO**: [`WO-O4O-STORE-INTERNAL-AI-RETIREMENT-V1`](../work-orders/WO-O4O-STORE-INTERNAL-AI-RETIREMENT-V1.md) · **실행일**: 2026-09-19 · **base**: `origin/main` `f51d5a362`(접수) → WO `6a0bdf5c0` → 코드 commit `366e5965b`
> **판정**: **COMPLETE_WITH_SMOKE_PENDING** — Store dead AI wiring 0 · QR legacy Gemini 생성 은퇴 · backend `/api/ai/qr-description` 제거(운영 404 확인) · spec 4 suites 202 PASS · 4 build · 배포 3 서비스 + API success · bundle 반영 확인 · CI green(`35406187412`, lint ratchet 1건 수정 후) · 브라우저 smoke = store-owner 계정 blocker 지속 → PENDING_USER_VERIFICATION(§7)

## 1. Fresh Census — Store / non-Store 재분류 (route 근거)

| 파일 | route / 문맥 | 판정 |
|---|---|---|
| KPA `PharmacyBlogPage` · `StoreProductDescriptionsPage` · `StoreDirectContentPage` · `StoreContentEditPage` · `CreateContentFromResourcesModal` · `ProductionMaterialEditorPage` | `/store/**` (WO1~3 census 와 동일) | **Store** — R1 |
| KCos `StoreBlogManagePage` · `StoreProductDescriptionsPage` | `/store/**` | **Store** — R1 |
| PH `ProductDescriptionsPage` | `/store-owner/**` | **Store** — R1 |
| KPA `ContentWritePage` | `App.tsx` `/content/documents/new` · `/content/:id/edit` · `CommunityContentWriteShell`(@o4o/shared-space-ui) | **Community** — 제외 |
| KPA `ForumWritePage` · `CourseEditPage` · PH `InstructorCourseEditPage` · KCos `ForumWritePage` | forum / instructor route | **non-Store** — 제외 |

`aiRequestHeaders` Store 소비 9 파일 전부 `getAccessToken` 이 AI 헤더 전용(다른 용도 0) → import 까지 제거.

### `/api/ai/qr-description` 전역 consumer
ripgrep 전 저장소(`dist` 제외): runtime 소비 = KPA `StoreQrAiDescriptionPage.handleGenerate` **1건** + backend `ai-proxy.routes.ts` route + `ai-prompts/qrDescription.ts`(route 전용 · `ai-prompts/index.ts` 미등록). 나머지 hit 는 WO/CHECK/IR 기록물만. mobile-app · admin · 다른 web 0 → **R4 처분 조건 충족**.

### `AiContentModal` 진입 매핑
KPA `productionTargets.tsx` 의 `AiModeForProduction` · `PRODUCTION_TARGET_TO_AI_MODE` — consumer 0 → dead(R5) 제거.

## 2. 변경 파일 (15 · +277 / −544)

| 파일 | 변경 |
|---|---|
| KPA `PharmacyBlogPage` · `StoreProductDescriptionsPage` · KCos `StoreBlogManagePage` · `StoreProductDescriptionsPage` · PH `ProductDescriptionsPage` | `aiRequestHeaders={(()=>{getAccessToken()…})()}` IIFE prop + `getAccessToken` import 제거 · 낡은 "Toolbar AI 정리 유지" 주석 정정 |
| KPA `StoreDirectContentPage` · `StoreContentEditPage` · `ProductionMaterialEditorPage` | `aiHeaders` useCallback helper + prop + import 제거 · ProductionMaterialEditorPage 헤더에 현행 경로(LlmAssistPanel) 명시 |
| KPA `CreateContentFromResourcesModal` | `aiHeaders` useMemo helper + prop + import 제거 · `useMemo` import 제거 · 헤더 주석 "보존 대상 = 공통 패키지(비-Store 소비자)" 로 정정 |
| KPA `productionTargets.tsx` | `AiModeForProduction` · `PRODUCTION_TARGET_TO_AI_MODE` 제거(consumer 0) · 필드 doc 1줄 중립화 |
| KPA `StoreQrAiDescriptionPage` | `handleGenerate` · `AI_ROOT_BASE` · `getAccessToken` · `generating` · `authoredBy` · `canGenerate` · "AI로 설명 만들기/AI 다시 만들기" 버튼·스타일 제거 → `canAuthor` + `LlmAssistPanel` 만(입력 미충족 시 안내 문구) · 저장 payload 에 `generatedBy` 값 기록 0(신규 POST 는 키 생략 · 편집 PUT 은 `generatedBy: undefined` 로 legacy 값 이월 차단) · 화면 문구 "AI 설명" → "QR 안내 콘텐츠" · legacy `items[].descriptionHtml` 미리보기는 **읽기 전용**(있을 때만) · `AiDescriptionMeta` legacy 필드는 read compat 용 optional 유지 · route/컴포넌트명 불변 |
| `apps/api-server/src/routes/ai-proxy.routes.ts` | `POST /qr-description` route 블록(약 120줄) + `qrDescription` import 제거 · 은퇴 주석 1블록. 다른 route 불변 |
| `apps/api-server/src/services/ai-prompts/qrDescription.ts` | **삭제** |
| `apps/api-server/src/__tests__/store-internal-ai-retirement-contract.spec.ts` | 신설(A~E) |
| `apps/api-server/src/__tests__/store-production-external-llm-realignment-contract.spec.ts` | WO3 (D) "legacy 유지·authoredBy" 단언 → "Gemini provenance 0" 만으로 갱신 · (C) "QR legacy 예외" → 전 대상 `/api/ai/*` 리터럴 0 |

미변경(유지 대상 §3): `packages/content-editor`(`AiContentModal` · `StoreUseModal` · `RichTextEditor.aiRequestHeaders/showInternalAi` · `types.ts`) · `/api/ai/content` · non-Store 4 파일 · `productAiContent` · `aiDescription` read 경로(`store-qr.service` · `store-library-feed.controller` · `StoreQRPage`/`StoreContentsSelector` 필터 · `QrLandingPage` 코너 아코디언) · 기존 row 의 `generatedBy` · `aiProxyService` `EditingSurface 'qr'`(다른 store-use 경로가 사용) · `tags=['AI 설명']`(QR 안내 콘텐츠 분류 라벨 — 필터 SSOT 는 `aiDescription.mode`) · DB/migration 0.

## 3. 설계 결정

- **R6 해석**: "신규 write 경로 0" = 최상위 `content_json.generatedBy` 를 어떤 값으로도 쓰지 않음. 편집 PUT 은 `...curJson` 스프레드로 legacy `generatedBy` 가 이월되므로 `generatedBy: undefined` 로 명시 제거(JSON 직렬화 시 키 탈락). `aiDescription` 내부의 legacy `model/generatedBy/generatedAt/items[].descriptionHtml` 은 사용자가 외부 결과를 새로 넣지 않는 한(=handleExternalApply 가 aiMeta 를 재구성) 그대로 이월 — "과거 provenance 유지" 원칙.
- **QR 화면 문구·route**: 사용자 문구는 "AI 설명" → "QR 안내 콘텐츠" 로 정정했으나 `/store/marketing/qr/ai-description` route · 컴포넌트/파일명 · `tags=['AI 설명']` · QR 목록 탭 라벨은 route/데이터 계약이라 유지(변경 시 별도 WO).
- **backend 처분 범위**: route + prompt 모듈만. `detectUsageConditions` · `aiProxyService.generateEditingRawContent` · `EditingSurface 'qr'` 은 다른 route 가 사용 → 불변.

## 4. 테스트

| 항목 | 결과 |
|---|---|
| api-server `store-internal-ai-retirement-contract.spec.ts` (신설) · WO3 · WO2 · WO1 spec | **4 suites · 202/202 PASS** |
| api-server tsc `--noEmit` | 0 오류 |

## 5. Build · Lint

| 대상 | 결과 |
|---|---|
| `@o4o/web-kpa-society` tsc + vite build | PASS (30.6s) |
| `@o4o/web-k-cosmetics` tsc + vite build | PASS (20.3s) |
| `pharmacy-hub-web` tsc -b + vite build | PASS (17.9s) |
| `api-server` `pnpm build` | PASS · `dist/services/ai-prompts/qrDescription.js` 부재 확인 |
| eslint 변경 파일 | 오류 0 · 경고 1(미접촉 기존 라인 `PharmacyBlogPage` exhaustive-deps) |

## 6. 배포 · bundle 확인

### 6-1 배포 (commit `366e5965b`)

| run | 결과 |
|---|---|
| Deploy Web Services `35405253111` | **success** — `deploy-kpa-society` · `deploy-k-cosmetics` · `deploy-pharmacy-hub` success (kpa-branch · neture · lecture · signage-player skipped = 미변경) |
| Deploy API Server `35405253177` | **success** — route 제거 반영 |
| CodeQL `35405253117` | success |
| CI Pipeline `35405253112` | **Code Quality Check failure** — 신규 spec 의 정규식 `\b` 가 Bash heredoc→python 경로에서 제어문자(0x08)로 변형돼 `no-control-regex` 1건 → ESLint ratchet 47 > baseline 46. 로컬 jest 는 PASS 였으나 lint 미실행이 원인. → `e1cc661ee` 로 수정 |
| (fix `e1cc661ee`) CI Pipeline `35406187412` | **success** — Code Quality Check · API Server Jest · Build Applications 전부 success (단독 run, 취소 없음) · Deploy API `35406187358` success · CodeQL success |

### 6-2 운영 API 확인 (2026-09-19)

`POST https://api.neture.co.kr/api/ai/qr-description` → **404** (은퇴) · `POST /api/ai/content` → **401** (유지 · 인증 요구). 다른 ai-proxy route 회귀 없음.

### 6-3 배포 bundle 반영 확인 (cache-bust fetch)

| 서비스 | 확인 |
|---|---|
| `kpa-society.co.kr` | `StoreQrAiDescriptionPage-BXzZtlVB.js`: `AI로 설명 만들기` · `AI 다시 만들기` · `api/ai/qr-description` · `gemini-qr-description` **0** · `ChatGPT로 작업` · `QR 안내 콘텐츠 만들기` **존재**. Store 7 chunk(Blog · ProductDescriptions · DirectContent · ContentEdit · ProductionMaterialEditor · LibraryContents · QR) 에 `aiRequestHeaders` 리터럴 0 |
| `k-cosmetics.site` | `StoreBlogManagePage-BsVwJQfb` · `StoreProductDescriptionsPage-DBTpSQs3` 에 `aiRequestHeaders` 리터럴 0 · legacy 문자열 0 |
| `pharmacyhub.co.kr` | main `index-Ckq0uPAH.js` 에 legacy 문자열 4종 0 |

## 7. 브라우저 smoke — **PENDING_USER_VERIFICATION**

store-owner 테스트 계정 blocker(401 INVALID_USER / 403 lockout) 가 WO1~3 과 동일하게 지속. 재시도·auth 수정 없음(WO §9). 재개 시 확인 항목: KPA `/store/marketing/qr/ai-description` 에 "AI로 설명 만들기" 버튼 부재 · 상품명 입력 시 `ChatGPT로 작업` 노출 · 결과 적용 → 저장 → 저장 row `content_json` 에 `generatedBy` 키 부재 · QR 목록 "AI 설명" 탭에 정상 분류(`aiDescription.mode`) · 기존 legacy QR 콘텐츠 편집 진입 정상 · Store 9 화면 편집기 툴바에 AI 버튼 없음(WO1 이후 동일). WO5 에서 일괄.

## 8. 완료 기준

| 기준 | 상태 |
|---|---|
| `STORE_INTERNAL_GENERATION_AI` | **0** — Store 화면에서 O4O 내부 AI 로 콘텐츠를 생성하는 경로 없음(spec A·B) |
| `STORE_QR_INTERNAL_GEMINI_CONSUMER` | **0** — frontend fetch 0 · backend route/prompt 제거(spec B·C) |
| `STORE_DEAD_AI_REQUEST_HEADERS` | **0** — Store 23 파일 `aiRequestHeaders=` 0 (spec A) |
| `STORE_AICONTENTMODAL_CONSUMER` | **0** — import/mount 0 · dead 매핑 제거(spec D) |
| `STORE_API_AI_CONTENT_CONSUMER` | **0** — 문자열 리터럴 0(spec D) |
| `NON_STORE_AI_UNCHANGED` | **PASS** — 4 대표 파일 AI 연결 유지 · ContentWritePage Community 판정(spec E) |
| `CONTENT_EDITOR_COMMON_AI_UNCHANGED` | **PASS** — AiContentModal/StoreUseModal/RichTextEditor props 존재(spec E) · 패키지 diff 0 |
| `DB_MIGRATION` | **0** |

## 9. 후속

- WO5 `WO-O4O-STORE-AI-FIRST-E2E-CLOSURE-V1` — WO1~4 브라우저 smoke 일괄(유효 store-owner 계정 전제).
- 범위 ② (별도 WO 후보): `packages/content-editor` `AiContentModal`/`/api/ai/content`/`StoreUseModal` 의 non-Store 소비자 census 후 처분 · `aiDescription` 스키마 이름/`/ai-description` route 명 정리 · `tags=['AI 설명']` 라벨 정리.

## 10. Git

코드 `366e5965b`(15 files) + lint fix `e1cc661ee`(1 file) → `origin/main`. path-specific stage · `check-staged-scope` 15/15 · pathspec commit. 타 세션 수정 파일 3건(`docs/baseline/O4O-STORE-OWNER-SERVICE-AGREEMENT-V1.0.md` · `apps/api-server/src/__tests__/work-agent-llm-closure.spec.ts` · `apps/api-server/src/services/ai-tools/work-agent-runtime.ts`) 미접촉.

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건(범위 ② content-editor 공통 AI 처분 — §9) .
