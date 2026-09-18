# WO-O4O-STORE-INTERNAL-AI-RETIREMENT-V1

> **상태**: ACTIVE(접수 즉시 실행 승인) · **접수**: 2026-09-19 · **CHECK**: (실행 후 `docs/checks/CHECK-O4O-STORE-INTERNAL-AI-RETIREMENT-V1.md`)
> 내 매장 AI First 리팩터링 **4단계**. 선행 WO1 [`WO-O4O-STORE-AI-FIRST-EDITOR-BOUNDARY-V1`](WO-O4O-STORE-AI-FIRST-EDITOR-BOUNDARY-V1.md) · WO2 [`WO-O4O-STORE-EXTERNAL-LLM-CONTENT-AUTHORING-V1`](WO-O4O-STORE-EXTERNAL-LLM-CONTENT-AUTHORING-V1.md) · WO3 [`WO-O4O-STORE-PRODUCTION-EXTERNAL-LLM-REALIGNMENT-V1`](WO-O4O-STORE-PRODUCTION-EXTERNAL-LLM-REALIGNMENT-V1.md)(13 화면 외부 LLM 진입점 완료, `3a41a04fe`) 로 **Store runtime 에서 이미 대체된 내부 AI 잔존물만** 제거한다.
>
> **범위 = ① Store runtime 한정.** `packages/content-editor` 공통 AI 인프라(`AiContentModal` · `/api/ai/content` · `StoreUseModal`)와 Community/Lecture/Operator 등 non-Store AI 는 건드리지 않는다(② 별도 WO). 실행 시 최신 `origin/main` 에서 다시 census 하고, 동일 파일에 다른 세션 WIP 가 있으면 즉시 보고·중지한다.

## 1. 목적

```text
WO1  Store RichTextEditor 내부 AI OFF (showInternalAi={false})
WO2  공통 Prompt Core + LlmAssistPanel — 일반 콘텐츠/제작자료 외부 LLM
WO3  POP · QR · Blog · 상품 설명 · 다국어 13 화면 외부 LLM 정렬
WO4  (이번) 대체 완료된 Store 내부 AI 잔존물 제거 — dead wiring 0
WO5  E2E closure (브라우저 smoke 일괄)
```

## 2. 제거 대상 (Store runtime)

| # | 대상 | 근거 |
|---|---|---|
| R1 | Store-facing `RichTextEditor` 의 `aiRequestHeaders` prop 과 그 전용 `getAccessToken` import/helper | WO1 이후 `showInternalAi={false}` 라 dead prop |
| R2 | KPA `StoreQrAiDescriptionPage` legacy `handleGenerate()` · `AI_ROOT_BASE` · `generating` 상태 · "AI로 설명 만들기/AI 다시 만들기" 버튼 · `authoredBy` 분기 | WO3 외부 경로가 대체 |
| R3 | Store frontend 의 `POST /api/ai/qr-description` 호출 | R2 와 동일 |
| R4 | `/api/ai/qr-description` backend route · `services/ai-prompts/qrDescription` · 관련 wiring — **전역 runtime consumer 0 확인 시에만** | consumer census §5 |
| R5 | Store 파일 안의 명백한 dead AI 주석·상수·문구·import(예: "Toolbar AI 정리 유지" 류 낡은 문구, `Sparkles` 등 미사용 import) | 코드 = 현행 계약 |
| R6 | `generatedBy='gemini-qr-description'` **신규 write 경로** | 외부 결과에 Gemini provenance 금지(WO3 §29) |

## 3. 유지 대상 (이번 WO 불변)

- `packages/content-editor` 의 `AiContentModal` · 공통 `/api/ai/content` · `StoreUseModal` · `types.ts` AI 필드 — 비-Store 소비자 존재.
- Community / Lecture / Operator / Supplier / Admin 의 AI(`ForumWritePage` · `CourseEditPage` · `InstructorCourseEditPage` 등).
- `productAiContent` 원장·API — 별도 census 없이 삭제 금지.
- 기존 `contentJson.aiDescription` **read** compatibility(QR 목록 "AI 설명" 탭 · `StoreContentsSelector` 필터 · `store-library-feed.controller` · `store-qr.service` `aiDescriptionMode` · `QrLandingPage` 코너 아코디언 `descriptionHtml`).
- 과거 저장 데이터의 provenance(`generatedBy='gemini-qr-description'` 기존 row) — 마이그레이션·백필 없음.
- `LlmAssistPanel` · Prompt Core · WO3 renderAssist 슬롯.

## 4. 경계 재분류 규칙

- 이름만으로 Store 로 판정하지 않는다. `ContentWritePage` 등은 **실제 route(App.tsx/router) · 레이아웃 · 업무 문맥**으로 재확인하고 Community/shared-space 면 제외한다.
- `aiRequestHeaders` 제거는 **Store 레이아웃 아래 route 의 화면**만. 같은 파일이 Store/비-Store 를 겸하면 보고 후 판단.
- `getAccessToken` 은 **AI 헤더 전용**일 때만 제거. 다른 용도(업로드 등)가 있으면 import 유지.

## 5. `/api/ai/qr-description` 처분 조건

consumer 전수 census(frontend 5 서비스 + mobile + admin + backend 내부 호출 + 테스트 + 문서 `docs/**` 의 현행 기준 문서):

```text
runtime consumer 0  → route + prompt 모듈 + 라우터 등록 + 전용 타입 제거, 관련 테스트 정리
runtime consumer ≥1 → 제거하지 않고 CHECK 에 consumer 목록 기록, 후속 WO
```

`ai-proxy.routes.ts` 의 다른 route(`/api/ai/content` 등)는 건드리지 않는다.

## 6. 금지

```text
새 LLM backend API · DB migration · 데이터 삭제/백필
content-editor 공통 AI 변경 · non-Store 화면 변경
AiContentModal / /api/ai/content Store 재연결
showInternalAi={true}
aiDescription read 경로 변경 · 스키마 rename
```

## 7. 구현 순서

```text
A. Fresh census — Store/non-Store consumer 재분류(route 근거) · qr-description 전역 consumer
B. R1 dead aiRequestHeaders + 전용 getAccessToken 제거 (Store 파일만)
C. R2·R3·R6 QR legacy 내부 생성 제거 — 외부 경로만 남기고 화면 문구 정리
D. R4 backend 처분 (§5 조건 충족 시)
E. R5 dead 주석·상수·import 정리 (수정 파일 안에서만)
F. 테스트 — WO1~3 spec 유지 + 신규 source-contract spec(은퇴 계약) · api-server jest · store-ui-core vitest
G. build/typecheck(KPA · KCos · PH · api-server) → 배포 → bundle 확인 → CHECK → path-specific commit/push
```

## 8. 테스트

- 신규 `apps/api-server/src/__tests__/store-internal-ai-retirement-contract.spec.ts`: Store 파일 `aiRequestHeaders` 0 · `/api/ai/qr-description` frontend 0 · `gemini-qr-description` write 0 · `AiContentModal`/`/api/ai/content` Store import 0 · non-Store 파일(대표 3)·content-editor 공통 파일 무변경(존재+핵심 export) · qr-description backend 처분 상태.
- WO1·WO2·WO3 spec 은 계속 PASS(WO3 spec 의 "QR legacy 예외" 단언은 은퇴에 맞게 갱신).

## 9. 완료 기준

```text
STORE_INTERNAL_GENERATION_AI=0
STORE_QR_INTERNAL_GEMINI_CONSUMER=0
STORE_DEAD_AI_REQUEST_HEADERS=0
STORE_AICONTENTMODAL_CONSUMER=0
STORE_API_AI_CONTENT_CONSUMER=0

NON_STORE_AI_UNCHANGED=PASS
CONTENT_EDITOR_COMMON_AI_UNCHANGED=PASS
DB_MIGRATION=0
```

브라우저 smoke 는 WO1~3 과 같은 계정 blocker 지속 시 `PENDING_USER_VERIFICATION`(WO5 일괄) 허용.

## 10. Git · 문서

path-specific stage/commit 만. 다른 세션 WIP 불가침. 완료 후 `docs/checks/CHECK-O4O-STORE-INTERNAL-AI-RETIREMENT-V1.md`. 후속 = WO5 `WO-O4O-STORE-AI-FIRST-E2E-CLOSURE-V1`.
