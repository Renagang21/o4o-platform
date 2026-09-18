# IR-O4O-COMMON-AUTOMATION-CORE-CAPABILITY-GATE-V1

> **유형**: Investigation (조사 전용 · 코드/DB 변경 0)
> **작성일**: 2026-09-18 · **기준 커밋**: main(3480add8a 시점)
> **상위 맥락**: `WO-O4O-HOSPITAL-DRUG-GOAL-DRIVEN-AI-COMPOSER-REALIGNMENT-V1` 증분 2 STOP
> ([CHECK](../checks/CHECK-O4O-HOSPITAL-DRUG-GOAL-DRIVEN-AI-COMPOSER-REALIGNMENT-V1.md)) →
> **대안 2 채택**: `/hospital-drug` 에 급히 붙이지 않고 **O4O 공통 자동화 Core 의 부족한 두 capability를
> 먼저 별도 단계로 보강**한다.
> **상위 원칙**: [`O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1`](../baseline/O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1.md)
> (목적/결과 기준 · 사이트별 업무 사전 정의 금지) · [`웹 자동화 우선 재정렬 트랙`](project 메모).

## 0. 이 IR 이 답하는 것

사용자 지시: "두 capability의 **구현 가능성 · 현재 provider 계약 변경 범위**를 조사하고, 각각 **최소 구현안**을
보고하라. 공통 계약 변경이 필요하므로 바로 대규모 구현하지 말고 **capability별 경계를 확정**한다. **Gemini Web
Research 부터** 먼저." → 본 IR 은 조사·경계 확정까지다. **코드는 바꾸지 않는다.** 각 capability 구현은 경계 승인
후 별도 WO 로 착수한다.

목표 형태:

```text
현재                              목표
Gemini → 텍스트/이미지 LLM        Gemini → 일반 검색·웹 조사·문서/데이터 해석
Astra  → 텍스트 LLM(이미지 X)     Astra  → 현재 화면 이미지 이해·조작 판단
                                  Workflow → 반복 안정 업무 실행
```

개발 순서(확정): **① Gemini Web Research → ② Astra Screen → ③ Task Modality Router → ④ /hospital-drug 재연결
→ ⑤ 다른 실업무 확장 → ⑥ 패턴 축적 → Workflow.** 라우터는 두 capability가 실측 PASS 된 **뒤에** 붙인다
(빈 capability에 라우터를 먼저 연결하지 않는다).

---

## 1. 현재 provider 계층 사실 (공통)

`@o4o/ai-core` 의 provider 추상화가 SSOT다. **공유 패키지**이므로 계약 변경은
[`O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1`](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md) 절차 대상
(모든 소비처 식별 · `node scripts/quality/check-literal-consumers.mjs`).

| 요소 | 파일 | 현재 계약 |
|---|---|---|
| Provider 인터페이스 | `packages/ai-core/src/orchestration/providers/provider.interface.ts` · `types.ts:104-114` | `complete(systemPrompt: string, userPrompt: string, config)` — **텍스트 2문자열만.** 이미지·tools 슬롯 없음 |
| Provider config | `types.ts:93-102` `AIProviderConfig` | `apiKey/model/maxTokens/temperature/responseMode/timeoutMs` — **tools·grounding·image 표현 필드 없음** |
| Provider 응답 | `types.ts:116-` `AIProviderResponse` | `content/model/promptTokens/completionTokens` — **citation/grounding 필드 없음** |
| execute() | `execute.ts:30-53` `ExecuteRequest` | `systemPrompt/userPrompt/provider/responseMode/config/retry/timeoutMs/meta` — 텍스트 전용 |
| Gemini provider | `providers/gemini.provider.ts:55-69` | `generateContent` body = `system_instruction + contents(text) + generationConfig`. **tools 없음.** 응답은 `candidates[].content.parts[].text` 만 파싱 |
| OpenAI provider | `providers/openai.provider.ts:77-97` | `chat/completions` messages `content` = **문자열 전용**. reasoning-gen(`gpt-6-astra`)은 `max_completion_tokens`·temperature 거부(`isReasoningGenerationModel` :56-58) |
| 모델 whitelist | `apps/api-server/src/types/ai-proxy.types.ts:23-45` | gemini: `gemini-3.8-flash`(canonical)·`2.5-pro`·`2.5-flash`·`2.0-flash` 등 / openai: `gpt-6-astra`(플래그십) 등 |
| provider/model/key 해석 | `apps/api-server/src/utils/ai-provider-runtime.ts:88-94·201-211` | `resolveProvider(requested)` — 호출부 명시 → env → 코드 기본(gemini). 모달리티 개념 없음 |
| 이미지 직접경로(현행) | `work-agent-runtime.ts:253-273` · `multimodal-chat.ts:42-63` | **Gemini 전용** `inline_data` — execute() 를 **우회**한 직접 `generateContent` 호출 |

핵심 관찰 2가지:
- **이미지는 이미 execute() 를 우회**해 Gemini 에 직접 간다(work-agent·multimodal 둘 다). 즉 "provider 직접 호출"
  선례가 존재한다 → Astra 이미지도 같은 자리에 **병렬 분기**로 얹을 수 있다(공유 계약 무변경).
- **웹 조사는 provider 계약 자체에 표현 수단이 없다**(config 에 tools 슬롯 없음) → capability A 는 공유 config
  계약을 **최소 additive 확장**해야 한다.

---

## 2. Capability A — Gemini Web Research (①, 먼저)

### 2-1. 구현 가능성 = 가능 (Gemini 네이티브 grounding)

Gemini API 는 "Grounding with Google Search" 를 네이티브로 제공한다 — 요청 body 에
`tools: [{ google_search: {} }]` 를 넣으면 모델이 **실제 웹 검색 → 근거 페이지 확인 → citation(groundingMetadata)**
을 붙여 답한다. 별도 검색엔진·외부 검색 API·새 저장소가 필요 없고, **기존 Gemini provider·기존 Gemini 키**를
그대로 재사용한다. whitelist 에 grounding 지원 세대(2.0+/2.5/3.x)가 이미 있다(§1 표).

> 이는 "특정 사이트 검색기" 가 아니라 **범용 web research** 다. health.kr/HIRA/식약처 등 특정 Source 를 넣지
> 않는다(WO 금지). 상품·업체·약품·제도·시장·비교 조사에 공통으로 쓴다.

### 2-2. 최소 구현안 (additive · opt-in)

1. `AIProviderConfig` 에 `grounding?: boolean`(또는 `webSearch?`) **선택 필드 1개** 추가(`types.ts`). 미지정 시
   현행과 100% 동일 → 기존 소비처 무영향.
2. `gemini.provider.ts` complete(): `config.grounding === true` 면 body 에 `tools: [{ google_search: {} }]`
   추가 + 응답의 `groundingMetadata`(sources/queries)를 파싱해 표면화.
3. `AIProviderResponse` 에 `grounding?: { sources; queries }` **선택 필드** 추가(additive) — citation 을
   근거로 반환(호출부가 무시 가능).
4. `execute.ts ExecuteRequest` 는 config 로 이미 흐르므로 별도 시그니처 변경 최소(문서상 grounding 사용법만 명시).
5. 호출부(hospital-drug/일반 조사)는 `resolveProvider('gemini')` + `grounding:true` 로 요청.

### 2-3. 경계·제약 (확정 필요 항목)

- **grounding ↔ JSON 강제 충돌**: Gemini grounding 은 `responseMimeType: application/json` 과 함께 쓰기
  어렵다(구글 제약). 조사 경로는 **text 모드**로 두고, 구조화는 후처리(별도 파싱)로 분리한다. → planner 의
  JSON 강제 경로와 **다른 경로**임을 계약에 못박는다.
- **모델 id 실측**: 이 저장소는 최신 세대 모델 id 를 config/registry 로 관리한다(`ai-model-registry.service`).
  실제 grounding 동작은 **운영 키·해당 모델로 1회 실측**해야 확정된다(가정 금지). 구현 WO 의 완료 게이트.
- **비용·지연**: grounding 은 검색 왕복이 붙어 느리고 비싸다 → 조사 goal 에만 켠다(전 요청 기본값 아님).
- **인증키 분리**: 공공데이터 `PUBLIC_DRUG_API_SERVICE_KEY` 와 **무관**하다. 이 capability 는 Gemini 키만
  쓰며, 어떤 인증키도 코드·문서·로그에 기록하지 않는다.

### 2-4. 공유 계약 변경 범위

`@o4o/ai-core` (types.ts · gemini.provider.ts) — **additive 3필드/1분기**. Shared Module Protocol 적용:
구현 WO 착수 시 `check-literal-consumers.mjs --source packages/ai-core/...` 로 소비처 회귀 확인. 변경이 opt-in
이라 파손 위험은 낮으나 절차는 밟는다.

---

## 3. Capability B — Astra Screen / Computer Understanding (②, A 다음)

### 3-1. 구현 가능성 = 조건부 가능 (모델 vision 실측 게이트)

OpenAI chat/completions 는 message `content` 를 **부분 배열**(`[{type:'text'},{type:'image_url',image_url:{url:'data:image/png;base64,…'}}]`)로
주면 vision 입력을 받는다. 현재 openai.provider 의 `content` 는 **문자열 전용**(§1)이라 이 경로가 없다.
`gpt-6-astra` 플래그십의 **실제 이미지 입력 지원 여부는 운영 키·해당 모델로 실측**해야 확정된다(가정 금지 —
사용자가 지정한 게이트).

### 3-2. 최소 구현안 — 두 옵션

- **옵션 B1 (권장 · 국소 · 공유계약 무변경)**: 현행 Gemini 이미지 직접경로(`work-agent-runtime.ts:253-273`)의
  **병렬 분기**로 `if (input.image && provider === 'openai')` 를 추가해 OpenAI vision content-part 요청을
  **직접** 만든다(execute() 우회 — Gemini 와 동일 패턴). `@o4o/ai-core` 공유 인터페이스 **무변경**. 변경은
  api-server work-agent-runtime(필요 시 multimodal-chat) 안에 갇힌다. **현행 Gemini vision 은 그대로 공존**하므로
  "Astra 실측 PASS 전 제거 금지"(사용자 지시)를 자연히 만족.
- **옵션 B2 (공유계약 확장 · 후속 통합)**: `AIProvider.complete()`/`execute()` 에 이미지 입력을 일반화하고
  openai.provider 에 vision content-part 빌더를 넣는다. 더 정합적이나 **모든 provider 인터페이스**를 건드리는
  Core 인접 계약 변경 → blast radius 큼. **Astra vision 이 B1 으로 실증된 뒤** 통합 단계로 미룬다.

→ capability 스파이크는 **B1**. B2 는 실증 후 리팩터.

### 3-3. 경계·제약 (확정)

- **권한 상향 금지**: Astra 는 **화면 이해·다음 행동 판단**만 한다. 실제 실행은 기존 **Work Agent Runtime +
  Safety gate + takeover**([automation-execution-layer](../checks 계열))가 그대로 수행. Astra 에 더 높은 권한을
  주지 않는다.
- **Gemini vision 존치**: Astra 화면 입력이 **실 스모크 PASS** 하기 전에는 현행 Gemini vision 을 제거하지 않는다.
- **입력 구성**: 화면 이미지 + 현재 Goal + structured observation(현행 planner 가 이미 만드는 관측)을 함께 넘겨
  판단하게 한다. 새 관측 파이프라인을 만들지 않는다.

### 3-4. 공유 계약 변경 범위

B1 = `@o4o/ai-core` **무변경**(api-server 국소). B2 = provider 인터페이스 변경(후속·별도 판단).

---

## 4. Capability C — Task Modality Router (③, A·B 실측 후에만)

두 capability가 **실제로 존재·실측된 뒤에만** 배선한다. canonical routing:

```text
검증된 Workflow 있음?            → Workflow (deterministic 우선)
없음 ↓
research/search/text/document/data → Gemini (grounding)
screen/UI 이해/computer action     → Astra (vision)
정보 부족 + 사용자가 알 가능성 높음 → QUESTION (기존 same-run QUESTION/resume 재사용)
```

- 라우터는 **결정적·비용0**(모달리티 판정만) — 새 classifier LLM 을 만들지 않는다. 모델 비용 최적화용 복잡한
  classifier 금지(WO §13).
- seam 은 이미 있다(`resolveProvider(requestedProvider)`). 라우터는 goal→modality→provider 매핑만 얹는다.
- **빈 capability 에 라우터를 먼저 연결하지 않는다**(이번 STOP 의 교훈).

`/hospital-drug`(④)는 이 공통 Core 를 쓰는 **첫 contextual surface** 로 재연결한다.

---

## 5. 하지 않을 것 (경계)

- 특정 Source(health.kr/HIRA/MFDS) 를 조사 정본으로 하드코딩 — 금지.
- 공공 API 신규 구현 · `PUBLIC_DRUG_API_SERVICE_KEY` 배선 — 이번 트랙 범위 밖(무접촉).
- `/hospital-drug` 전용 AI engine · 새 Workflow Engine · PC 프로그램 자동화 · WebMCP — 금지.
- Astra 실측 전 Gemini vision 제거 — 금지.
- capability 실측 전 Router 배선 · 성공기준 하향(대안 3) — 금지.
- 대규모 즉시 구현 — 금지. capability별 경계 승인 후 **각각 별도 WO**.

---

## 6. 판정 · 다음 절차

| capability | 구현 가능성 | 공유 계약 변경 | 최소안 | 실측 게이트 |
|---|---|---|---|---|
| A. Gemini Web Research | 가능(네이티브 grounding) | ai-core additive 3필드/1분기 | §2-2 | 운영 키·grounding 모델 1회 실측 |
| B. Astra Screen | 조건부(모델 vision 실측) | B1=무변경 / B2=후속 | §3-2 B1 | `gpt-6-astra` 이미지 입력 실 스모크 |
| C. Task Modality Router | A·B 이후 | 없음(seam 존재) | §4 | A·B PASS 선행 |

**다음 절차**: 본 IR 의 **capability별 경계 승인** → 승인되면 **A(Gemini Web Research) 구현 WO** 부터 착수
(additive 계약 · Shared Module Protocol · 실측 게이트 포함). B·C 는 A 종료 후 순차.

## 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 3건(capability A·B·C 각 구현 WO — 경계 승인 후 분리 착수).
