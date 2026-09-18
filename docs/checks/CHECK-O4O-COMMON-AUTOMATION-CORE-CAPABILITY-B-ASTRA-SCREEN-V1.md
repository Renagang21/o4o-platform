# CHECK-O4O-COMMON-AUTOMATION-CORE-CAPABILITY-B-ASTRA-SCREEN-V1

> **선행**: [`CHECK-O4O-COMMON-AUTOMATION-CORE-CAPABILITY-A-GEMINI-WEB-RESEARCH-V1`](CHECK-O4O-COMMON-AUTOMATION-CORE-CAPABILITY-A-GEMINI-WEB-RESEARCH-V1.md) §6 — "코드 변경 전 `gpt-6-astra` 이미지 입력 수용 실측 → PASS 시에만 openai vision 분기(현행 Gemini vision 존치, B1)"
> **상태**: **B0 실측 게이트 PASS(사용자 실측 2026-09-19) · B1 최소 구현 완료** — 운영 경로 실측은 PENDING(§4)
> **작성일**: 2026-09-19

---

## 1. B0 — 코드 변경 전 실측 게이트 (사용자 실행 · 2026-09-19)

| 항목 | 값 |
|---|---|
| model | `gpt-6-astra` |
| image source | 내장 사분면 fixture(64×64 RGB · 좌상 red / 우상 green / 좌하 blue / 우하 yellow) |
| image 답변 | 좌상 빨간색 · 우상 초록색 · 좌하 파란색 · 우하 노란색 |
| fixture 색 적중 | `["red","green","blue","yellow"]` **4/4** |
| text-only 대조 적중 | `[]` **0/4** (이미지 없이 같은 질문 → 색 추측 불가 = 답이 이미지에서 왔다는 대조) |

```text
ASTRA_IMAGE_INPUT        = PASS
ASTRA_SCREEN_UNDERSTANDING = PASS
ASTRA_REAL_SMOKE         = PASS
```

(실행 중 `Remove-Item` 오류 1회는 명령 붙여넣기 오타 — capability 판정과 무관.) 게이트 PASS → B1 착수 승인(사용자).

## 2. B1 — 최소 구현

파일: [work-agent-runtime.ts](../../apps/api-server/src/services/ai-tools/work-agent-runtime.ts) `createLlmPlanner`

- **분기 추가**: `input.image && provider === 'openai'` → `POST https://api.openai.com/v1/chat/completions`.
  - messages: `system` = `WORK_PLANNER_SYSTEM_PROMPT` · `user` = `[{type:'text', text: planner user prompt}, {type:'image_url', image_url:{url:'data:<mime>;base64,<b64>'}}]` — 이미지는 `image_url` 한 자리, 프롬프트 텍스트에 base64 없음.
  - reasoning 세대(`gpt-5.x/6.x/o-series`, ai-core openai provider 와 같은 판정) → `max_completion_tokens: 800` · temperature 생략 / 구세대 → `max_tokens` + `temperature: 0.2`. `response_format: json_object`. 40s timeout.
  - 인증키는 **Authorization 헤더에만**(URL · 로그 · 오류 메시지에 없음 — 오류는 `planner provider <status>` 만).
  - 응답 `choices[0].message.content`(문자열 또는 part 배열) → 기존 `extractJson`.
- **기존 Gemini vision 분기 불변**(`input.image && provider === 'gemini'` → generateContent inline_data). text-only fallback("이 provider 는 이미지를 볼 수 없다" 주의문)은 이제 gemini·openai 외 provider 에서만.
- 화면 캡처(`provenance='screen_capture'`, Visual Computer Use fallback)도 같은 분기를 탄다 — provenance 는 프롬프트 문구만 가른다.
- 공용 헬퍼 `OPENAI_CHAT_COMPLETIONS_URL` · `buildOpenAiVisionBody()` · `openAiMessageText()` export — 후속으로 home-chat 첨부 경로([multimodal-chat.ts](../../apps/api-server/src/services/ai-tools/multimodal-chat.ts), 현재 gemini 만 inline · openai 는 텍스트 fallback)가 같은 형태를 재사용할 수 있게 둠(이번 범위 밖 · 미변경).
- 변경하지 않은 것: provider 선택 규칙(`resolveAiTarget`: 요청 명시 → `AI_DEFAULT_PROVIDER` → 기본 gemini) · strong planner(같은 코드, resolver 만 다름 → openai strong = `gpt-6-astra` 도 자동 적용) · Safety/Risk · 로그 정책(이미지 base64 는 여전히 어디에도 저장·기록 0).

## 3. 검증 (self)

| 항목 | 결과 |
|---|---|
| `work-agent-llm-closure.spec` 신규 2건 — Astra 분기 계약(URL · Bearer 헤더 · 키 URL 미포함 · `[text, image_url]` · `max_completion_tokens` · temperature 없음 · `json_object` · 프롬프트에 base64/"볼 수 없다" 문구 없음 · screen_capture 동일 분기 · part 배열 응답 · 구세대 모델 `max_tokens+temperature`) + 오류/timeout throw(메시지에 키·바이트 없음) | PASS (suite 12/12) |
| 기존 Gemini vision 계약 테스트 | PASS(불변) |
| jest 6 suites(`work-agent` · `visual-fastloop` · `recovery-runtime` · `automation-recovery` · `ai-multi-provider-runtime` 포함) | **94/94** |
| `tsc --noEmit`(api-server) | EXIT 0 |
| eslint(변경 2파일) | 0 errors |

## 4. PENDING

| # | 항목 | 상태 |
|---|---|---|
| 1 | 운영 경로 실측 — Work Agent 이미지 첨부/화면 캡처가 **openai provider 설정**(`AI_DEFAULT_PROVIDER=openai` 또는 관리자 정책)에서 Astra 분기로 실제 계획을 내는지 | PENDING — 현재 운영 기본 provider 는 gemini 라 이 분기는 설정 전환 시에만 탄다. 전환은 운영 정책 결정(승인 게이트) |
| 2 | home-chat 첨부(multimodal-chat) 의 openai inline 채택 | 후속(같은 헬퍼 재사용 · 별도 WO) |
| 3 | Capability C(Router) → `/hospital-drug` 재연결(단계 D) | Capability A CHECK §6 순서대로 다음 |

```text
ASTRA_B0_GATE   = PASS (사용자 실측 4/4 vs 0/4)
ASTRA_B1_IMPL   = DONE (planner openai vision 분기 · Gemini 존치 · 단위 계약 고정)
ASTRA_PROD_PATH = PENDING (provider 전환 정책 필요)
```
