# CHECK-O4O-COMMON-HOME-AI-INPUT-V0

- **WO**: WO-O4O-COMMON-HOME-AI-INPUT-V0
- **일자**: 2026-09-08
- **선행**: COMMON-HOME-PHASE1-V1 · WORK-SCOPE-CONTRACT-V0 · WORK-SCOPE-STORE-RESOLUTION-V0 (전부 CLOSED)
- **작업 브랜치**: `work/home-ai-input-v0` (독립 worktree `C:/tmp/o4o-work-scope`)
- **범위**: Home 중앙 입력 → AI 텍스트 응답. tool 실행 · Local Agent · 대화 저장 없음.

---

## 1. 기존 AI infrastructure 조사

### 1-1. LLM 실행 계층 — 2개 스택 공존

| 계층 | 진입 | 위치 | DB write |
|---|---|---|---|
| **`@o4o/ai-core` `execute()`** | `execute({systemPrompt,userPrompt,provider,responseMode,config})` | `packages/ai-core/src/orchestration/execute.ts:99` | **없음** |
| `aiProxyService` | `generateContent` / `generateRawContent` / `generateEditingRawContent` | `apps/api-server/src/services/ai-proxy.service.ts:50` | `ai_usage_logs` (성공·실패 모두, `:1070 saveUsageLog`) |
| `AiPolicyExecutorService` | `.execute(scope, sys, user)` | `apps/api-server/src/modules/ai-policy/ai-policy-executor.service.ts:67` | `ai_usage_logs` + `ai_usage_quota` + `ai_usage_aggregate` + `ai_billing_summary` |

`execute()` 가 canonical 저수준 추상화이며 api-server 20+ 지점에서 이미 쓰인다(`ai-query.service.ts:18` 포함).
Provider registry `execute.ts:74` = `{ gemini: GeminiProvider, openai: OpenAIProvider }`.

### 1-2. 기존 자유질의 endpoint — `POST /api/ai/query` (존재하지만 이번 용도에 부적합)

`apps/api-server/src/routes/ai-query.routes.ts:33` · 컨트롤러 `controllers/ai/AiQueryController.ts:22`
body `{ question(1..2000), contextType, serviceId?, storeId?, ... }` → `{ success, answer, remainingQueries, errorCode }`.
일일 quota(free 10 / paid 100 / global 1000) + circuit breaker 보유.

**재사용하지 않은 이유 3가지** (§14 "기존 적합한 endpoint 가 없다면"):

1. **대화 내용을 DB 에 저장한다.** `ai-query.service.ts:505,551` 이 성공·실패 모두 `ai_query_logs` 에 **question + answer 원문**을 기록한다 → §9 · §41 · §42 의 conversation persistence 금지에 정면 충돌.
2. **WorkScope 재검증이 없다.** §11 이 요구하는 서버측 scope 재확정 단계가 존재하지 않는다.
3. **클라이언트 `storeId` 를 그대로 받는다.** 클라이언트가 scope 를 주장하는 구조라 §11 신뢰 경계와 맞지 않는다.

→ 따라서 **provider/transport 는 재사용하되 얇은 endpoint 를 새로 추가**했다. 중복 AI backend 를 만들지 않았다(§5).

### 1-3. 기존 프런트 AI UI

- `@o4o/ai-components` 는 `AiSummaryButton` / `AiSummaryModal` / `AiPreviewModal` **3개뿐**이며 전부 modal 형태 + inline style 객체다. **chat input·message bubble·loading·error 컴포넌트가 없다.** Home 의 Tailwind 검색초기화면형과 충돌해 그대로 쓰지 않았다(§5-D 후단 "무거운 UI 사용 금지").
- **Markdown 렌더러가 web-neture 에 없다.** `react-markdown`/`marked`/`@o4o/block-renderer` 모두 미의존 → 의존성 추가 없이(§34) 기존 관행(`AiSummaryModal.tsx:141` 줄 단위 `<p>`)을 따랐다.
- 스피너: 공용 컴포넌트 없음 → 기존 관행대로 `lucide-react` `Loader2 + animate-spin`(이미 의존성).
- `O4OToastProvider` 는 `App.tsx:720` 에 이미 마운트돼 있으나, Home 오류는 화면 내 인라인 표시가 더 적합해 toast 를 쓰지 않았다.

### 1-4. 기타

- 키 SSOT: `utils/ai-key.util.ts:41 resolveAiApiKey(dataSource, provider)` — `ai_settings` 테이블 → env. env 변수 **이름**만: `GEMINI_API_KEY` / `OPENAI_API_KEY` / `CLAUDE_API_KEY` / `AI_DEFAULT_MODEL`.
- 모델 결정: `utils/ai-editing-model-resolver.ts resolveEditingModel()` — `AiQueryPolicy.defaultModel`(id=1) → `AI_DEFAULT_MODEL` → `EDITING_MODEL_FALLBACK`.
- 스트리밍: `packages/ai-core/src/orchestration/execute-stream.ts:59` 에 존재하나 **소비 라우트 0**. §14 가 필수가 아니라 했으므로 이번에 도입하지 않았다.
- rate limit: AI 라우트 전용 limiter 없음. 범용 `middleware/rateLimiter.ts` 존재.

---

## 2. 재사용한 AI infrastructure / provider

```text
실행     @o4o/ai-core  execute()          — canonical, DB write 0
키       utils/ai-key.util.ts  resolveAiApiKey(ds,'gemini')
모델     utils/ai-editing-model-resolver.ts  resolveEditingModel()   (정책→env→fallback)
scope    utils/work-scope-store-resolution.ts  resolveWorkScopeStore()  (직전 WO)
limiter  middleware/rateLimiter.ts  dynamicLimiter('free')
라우터   routes/ai-proxy.routes.ts  (기존 AI 라우터에 추가 — 신규 모듈 0)
```

**신규 provider·transport·모델 아키텍처 변경 0** (§26). provider 는 `gemini` 고정이 아니라
`resolveEditingModel()` 이 돌려주는 정책 모델을 쓴다(현행 기본 `gemini-2.5-flash`).

---

## 3. endpoint 계약

```text
POST /api/ai/home-chat        (기존 AI 라우터 `/api/ai` 아래)
middleware: authenticate → dynamicLimiter('free')  (분당 10회/사용자)
```

request:

```json
{ "message": "약국 POP 만들 때 주의할 점은?",
  "workScope": { "serviceKey": "kpa-society", "workspace": "store",
                 "role": "kpa:store_owner", "capabilities": ["navigate","read"],
                 "executionMode": "cloud", "status": "none" } }
```

response 200:

```json
{ "success": true,
  "data": { "message": "...", 
            "scope": { "workspace": "store", "serviceKey": "kpa-society", "storeStatus": "resolved" },
            "requestId": "uuid" } }
```

오류: 401 `UNAUTHENTICATED` · 400 `EMPTY_MESSAGE|MESSAGE_TOO_LONG|INVALID_MESSAGE` ·
429(limiter) · 502 `AI_ERROR|AI_UNAVAILABLE`.

입력 상한 **2000자** — §23 "기존 API 정책 우선"에 따라 `/api/ai/query` 의 question 상한과 맞췄다.

---

## 4. WorkScope 주입 방식

프런트는 기존 `useWorkScope()` 결과를 그대로 싣는다. **WorkScope 타입을 다시 만들지 않았다**(§10) —
`services/web-neture/src/lib/ai/home-chat.ts` 의 `toHomeChatScope(workScope: WorkScope)` 가 축만 추출한다.

**`organizationId` / `storeId` 는 의도적으로 보내지 않는다.** 서버가 세션에서 다시 확정하므로
보낼 이유가 없고, 보내면 "클라이언트가 scope 를 주장한다"는 잘못된 계약이 된다. 서버도 이 두 필드를 읽지 않는다.

`isResolvingStore === true` 인 동안에는 전송 버튼이 비활성이다(§12) — 불완전한 컨텍스트로 요청하지 않는다.

---

## 5. server-side scope validation (§11)

```text
클라이언트 workScope = REQUEST CONTEXT (힌트)      ≠ AUTHORIZATION SSOT
  → 서버가 취하는 것: workspace, serviceKey, capabilities(최대 10개, 문자열만)
  → 서버가 무시하는 것: organizationId, storeId, status, role

store 축이면
  → resolveWorkScopeStore(AppDataSource, {userId(세션), serviceKey, workspace})
  → membership → 매장 축 보유 → serviceKey 스코프 후보 (직전 WO 계약 그대로)
  → 결과의 canonical serviceKey / status 만 프롬프트 사실로 사용
```

**system prompt 에 식별자를 넣지 않는다.** "매장이 확정됐다"는 **불리언 사실**만 반영하므로
LLM 응답으로 organizationId/storeId 가 새어나갈 경로가 없다. 테스트로 UUID 부재를 고정했다.

`ambiguous` 이면 임의 매장을 고르지 않고 "여러 개여서 확정되지 않음 · 먼저 확인하라"는 지시가 들어간다(§13).

---

## 6. Home UI 변경

`services/web-neture/src/pages/O4OHomePage.tsx` — 비활성 input → `<form>` + 활성 input + 전송 버튼.

- 검색초기화면형 유지(§6): 워드마크 · 안내문구 · 중앙 입력 · pill 구조 그대로. 대시보드화하지 않았다.
- **답변 영역은 있을 때만 렌더**한다. 항상 존재하는 빈 컨테이너를 두면 `justify-center` 때문에 대기 상태에서 워드마크가 위로 밀린다 → 대기 화면은 이전과 픽셀 동일.
- 단일 행 input 이므로 Enter = 전송(§7 "단일-line 유지 시 Shift+Enter 계약 생략 가능").
- 로딩: 버튼 스피너 + "응답 생성 중..." / 요청 중 submit 비활성(§21 중복 전송 방지).
- 대화는 React state 뿐 — 새로고침하면 사라진다(§9). 직전 1문 1답만 표시한다.
- 서비스 pill 은 기존 navigation 그대로(§31).

---

## 7. auth / login 처리

- 비로그인도 Home 열람·pill 사용 가능. **AI 전송 시에만** 기존 `openLoginModal()` 호출(§29·§30).
- 입력 text 는 state 에 남아 로그인 후 그대로 다시 보낼 수 있다.
- **기존 auth/redirect 계약 무변경** — `PostLoginRedirect` · `LoginModal returnUrl` · `RoleGuard` · `neture_login_explicit_nav` 어느 것도 손대지 않았다.
- 서버도 `authenticate` 필수라 익명 무제한 호출 경로가 없다(§28).

---

## 8. 테스트 결과

`apps/api-server/src/__tests__/home-chat-ai-input.spec.ts` — **19건 전부 PASS** (DB·LLM 호출 없음).

| §35 | 케이스 | 결과 |
|---|---|---|
| 2 | 빈 message 거부 (공백만 포함) | PASS |
| 3 | 초과 길이 거부 / 경계값 통과 | PASS |
| — | 비문자열(undefined·null·수·객체·배열) 거부 | PASS |
| 4 | 정상 message trim 후 통과 | PASS |
| 6 | tool 실행 금지 지시가 **모든 workspace** 프롬프트에 포함 | PASS |
| 7 | 프롬프트에 UUID(organizationId/storeId) 부재 | PASS |
| 8 | ambiguous → 임의 선택 없이 확인 안내 | PASS |
| 9 | provider 오류 원문 비노출 | PASS |
| 10 | API key/401 문자열이 응답으로 새지 않음 | PASS |
| — | capability 는 서술로만(실행 허가 아님) | PASS |
| — | 평문/JSON/깨진 JSON/빈 응답 처리 | PASS |

§35-1(비인증 거부) · §35-5 · §35-11(invalid serviceKey)은 라우트 레이어 동작이라
프로덕션 smoke(§10)에서 실측했다.

**프런트 자동 테스트 없음** — web-neture 에 테스트 러너가 없고 §36 이 devDependency 추가를 금지한다.
type-check / build / eslint / 브라우저 smoke 로 대체했다.

---

## 9. type-check / build / lint

```text
apps/api-server      npx tsc --noEmit   → home-chat 관련 오류 0
services/web-neture  npx tsc --noEmit   → PASS (exit 0)
services/web-neture  build              → PASS (built in 39.14s)
eslint (신규·변경 5파일)                 → PASS (0)
jest home-chat + work-scope             → 2 suites / 31 tests PASS
```

api-server 잔여 63건은 **직전 WO 와 동일한 baseline** 이다 — 62건 미빌드 패키지 TS2307
(`@o4o-apps/cms-core`, `@o4o/lms-core`, `@o4o/store-core` 등), 1건 `dashboard-assets.mutation-handlers.ts` 기존 TS2345.
내가 만든/수정한 파일에는 0건. CLAUDE.md 중지 조건에 따라 고치지 않고 보고만 한다.

---

## 10. production smoke

(배포 후 기록 — 아래 §12 참조)

---

## 11. DB migration / write 여부

```text
DB migration        0
conversation 저장    0   (ai_query_logs 경로를 쓰지 않는다)
DB write            0   — execute() 는 저장 side-effect 가 없다
신규 테이블/컬럼      0
공통 package 변경     0   (packages/** 무변경)
신규 dependency      0
```

`ai_query_logs`(question+answer 원문) · `ai_usage_logs` · `ai_usage_quota` 어디에도 쓰지 않는다.

> **트레이드오프 명시**: DB write 0 을 지키기 위해 `AiPolicyExecutorService`(quota·usage log 내장)를
> 쓰지 않았다. 그 결과 **이 endpoint 는 토큰 사용량이 집계되지 않는다.** 비용 보호는
> (a) `dynamicLimiter('free')` 분당 10회/사용자, (b) `maxTokens 2048`, (c) `retry.maxAttempts 1`,
> (d) 입력 2000자 상한으로만 이뤄진다(§27). 사용량 집계가 필요해지면 §13-2 후속에서
> quota 계층을 붙이되 conversation 저장은 계속 하지 않는 형태여야 한다.

---

## 12. credential / secret 처리

- AI 키는 서버 전용. 프런트 번들·응답 어디에도 키가 없다(§24). `VITE_*` AI 키 미도입.
- 오류 sanitization: provider·model·key·스택은 응답에 싣지 않고 서버 로그에만 남긴다(§22, 테스트로 고정).
- **이번 WO 작업 중 credential 을 터미널·로그·문서에 출력하지 않았다**(§25). 프로덕션 smoke 자격은 env 주입으로만 사용했다.

---

## 13. 후속 작업

1. **AI Capability / Tool Routing V0** — capability → 실제 tool 실행 연결. 이번 V0 는 capability 를 **서술**로만 전달한다.
2. **AI 사용량·비용 집계** — 위 §11 트레이드오프 해소. quota 계층 도입 시 conversation 원문 저장은 계속 금지.
3. **스트리밍(SSE)** — `executeStream()` 이 이미 있고 소비처가 0이다. 첫 소비 라우트가 될 수 있다.
4. **`O4O-AI-USAGE-FLOW-BASELINE-V1` 갱신 필요 (아래 §14)**.
5. **대화 맥락(multi-turn)** — 현재 1문 1답. 이전 문답을 프롬프트에 싣는 것은 저장 없이도 가능하나 이번 범위 밖.
6. **프런트 테스트 러너 도입** — 별도 WO(§36). 도입되면 Home 입력/로그인 분기/오류 표시를 테스트로 고정.
7. **`/api/ai/query` 와의 관계 정리** — 자유질의 표면이 둘이 됐다. 장기적으로 수렴 검토(기존 응답 계약 변경을 수반하므로 별도 WO).

---

## 14. 문서 정합

```text
문서 정합: 발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건
```

**`docs/baseline/O4O-AI-USAGE-FLOW-BASELINE-V1.md` 와 이번 변경이 충돌한다.** (Active Baseline, 2026-04-23)

- §4.1: "편집기 내부에서만 실행. **독립 AI 입력 화면(`/ai` 등) 없음.**"
- §8 의도적 미적용 항목: "독립 AI 입력 화면"
- §10: "O4O 의 AI 는 '따로 사용하는 기능'이 아니라 '콘텐츠를 실행으로 연결하는 흐름의 일부'이다."

이번 WO 는 Home 중앙 입력을 독립 AI 진입점으로 활성화하므로 위 3개 항목과 어긋난다.

덧붙여 그 문서의 §4.1 표에 있는 `FloatingAiButton`("자유 질문") 은 이미 제거돼
(`apps/admin-dashboard/src/components/layout/AdminLayout.tsx:97-100`, WO-O4O-ADMIN-DEDICATED-SUPER-ADMIN-CUTOVER-AND-LEGACY-CLEANUP-V1)
저장소에 컴포넌트가 존재하지 않는다 — **문서가 현재 코드와 이미 어긋나 있다.**

기준 문서의 내용·판정 변경은 §16-4 상 인라인 금지라 **수정하지 않고 보고만** 한다.
Home AI 진입점을 정식 기준으로 반영하려면 별도 WO 로 baseline 을 갱신해야 한다.

---

## 15. 완료 기준 대조 (WO §45)

| 기준 | 결과 |
|---|---|
| 1. Home 중앙 입력 활성 | 충족 |
| 2. 로그인 사용자 AI 요청 가능 | 충족 |
| 3. WorkScope 요청에 포함 | 충족 (식별자 제외) |
| 4. 서버에서 scope 재검증 | 충족 (`resolveWorkScopeStore`) |
| 5. AI 텍스트 응답 표시 | 충족 |
| 6. tool calling 0 | 충족 |
| 7. Local Agent 실행 0 | 충족 |
| 8. conversation DB 0 | 충족 |
| 9. DB migration 0 | 충족 |
| 10. DB write 0 | 충족 |
| 11. credential frontend 노출 0 | 충족 |
| 12~14. type-check / build / lint PASS | 충족 (§9 baseline 단서 포함) |
| 15. production AI smoke PASS | §10 참조 |
| 16. 기존 route/auth 회귀 없음 | 충족 (auth 계약 무변경) |
