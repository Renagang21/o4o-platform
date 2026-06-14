# IR-O4O-AI-MODEL-PROVIDER-SELECTION-SETTINGS-V1

> **유형:** Read-only 조사 (코드/DB/route/UI/API/package/Dockerfile/backend 변경 없음, 문서 1개만 생성)
> **목적:** admin.neture.co.kr 의 AI 엔진/모델 선택값이 **실제 AI 생성 endpoint 에 어떻게 연결되는지** 코드 레벨로 확정한다. 핵심 질문 — **"admin 에서 엔진/모델을 바꾸면 실제 생성 모델이 바뀌는가?"**
> **작성일:** 2026-06-14 · 기준 HEAD `8e67fcaf8`
> **선행:** `IR-O4O-AI-EDITING-SURFACE-CURRENT-STATE-AUDIT-V1`(§9/§12-1, R3 배선 갭 가설)

---

## 1. 목적

1단계 audit 가설("AiEnginesPage 는 있으나 생성 endpoint 가 선택값을 무시")을 코드로 검증. 결과는 단순 "예/아니오" 가 아니라 **부분 배선 + 경로 파편화**로 확정됐다(§2). read-only.

## 2. 결론 요약 (먼저)

**답: 부분적으로만. AI *질의*(`/api/ai/query`)는 바뀌지만, *편집 AI 생성*(`/api/ai/content` 등 6개)은 안 바뀐다.**

1. **admin activate 는 미배선이 아니다 — 저장은 된다.** `aiAdminService.activateEngine()` 이 `ai_engines.is_active` + **`ai_query_policy.activeEngineId` / `ai_query_policy.defaultModel = engine.slug`** 두 곳에 기록(`ai-admin.service.ts:207-217`).
2. **그 값을 읽는 건 `/api/ai/query` 단 하나.** `ai-query.service.ts:482` 가 `policy.defaultModel` 사용. → 이 경로는 **A(배선됨)**.
3. **편집 AI 생성 6개 endpoint 는 `gemini-2.5-flash` 하드코딩** — admin 설정/엔진/policy 를 **읽지 않음**(`ai-proxy.routes.ts` 핸들러 + `generateRawContent()` 가 provider='gemini' 하드코딩). → **B(저장되나 생성 무시) = 핵심 갭**.
4. **모델 결정 경로가 5갈래로 파편화**(§6) → **D(endpoint별 상이, 단계 분할 필요)**.
5. **provider 추상화는 존재하나 편집 경로가 우회.** `callProvider` switch 가 있으나 편집 endpoint 는 `generateRawContent`(provider 고정)로 빠져 모델뿐 아니라 **provider 교체도 막힘**.

→ **종합 판정: B + D.** admin 선택값(→`AiQueryPolicy.defaultModel`)을 **편집 생성 경로가 읽도록 배선**하는 것이 1순위 WO. hardcode 는 fallback 으로 강등.

## 3. 조사 범위

- 포함: web-neture admin AI 설정(AiEnginesPage/AiPolicyPage) · admin-dashboard AiQuerySettings · backend AI 엔진/정책/설정 entity · 생성 endpoint(`/api/ai/*`,`/api/v1/ai/*`) 모델 결정 · signage AI · admin-dashboard builder generators · `gemini-2.5-flash` hardcode · provider abstraction.
- 제외(E): 모델 교체/provider 추가/prompt preset/모달 정렬/비용 최적화 **구현**, 모델 후보 확정, DB/migration.

## 4. admin AI 설정 화면 현황

| UI | 위치 | 동작 | 기록 대상 |
|----|------|------|----------|
| **AiEnginesPage** | `web-neture/src/pages/admin/ai/AiEnginesPage.tsx` | 엔진 활성화 | `PUT /api/ai/admin/engines/:id/activate` |
| AiPolicyPage | `web-neture/.../AiPolicyPage.tsx` | 쿼터/aiEnabled. model read-only 표시 | `PUT /api/ai/admin/policy` |
| AiQuerySettings | `apps/admin-dashboard/src/pages/settings/AiQuerySettings.tsx` | defaultModel 드롭다운(Gemini 계열) | `PUT /ai/policy` |
| AiUsageDashboard/AiBillingPage | `web-glycopharm/src/pages/operator/*` | 사용량/빌링 조회(편집 아님) | `/api/ai/admin/analytics\|billing` |

**admin AI 라우트 전체(`ai-admin.routes.ts`):** dashboard / engines(list·activate) / policy(get·put) / usage / ops(summary·errors) / analytics(summary·by-scope·by-model·recent) / quotas(CRUD·status) / billing(list·generate·adjustment·confirm·paid·export).

## 5. DB / setting 저장 구조

| Entity / Table | 역할 | 모델 필드 | activate 시 기록 |
|----------------|------|-----------|-----------------|
| `AiEngine`(`ai_engines`) | 엔진 레지스트리 | `slug`(=model id), `provider`, **`isActive`(불리언 — 활성 표현)** | `isActive` 전체 false→선택 true (`ai-admin.service.ts:207-211`) |
| `AiQueryPolicy`(`ai_query_policy`) | **질의** 정책+쿼터 | **`defaultModel`**, `activeEngineId` | `activeEngineId=engine.id`, `defaultModel=engine.slug` (`:215-217`) |
| `AiLlmPolicy`(`ai_llm_policies`) | **scope별** LLM 정책 | `model`(scope 단위) | 별도(executor) |
| `AiSettings`(`ai_settings`) | provider **API 키**(legacy) | `defaultModel`(nullable, **미사용**) | activate 시 미기록 |
| `ai_model_settings` | care 잔재 | (DB read 코드 제거됨) | — |

→ "활성 엔진" 은 `AiEngine.isActive` + `AiQueryPolicy.defaultModel/activeEngineId` 에 **이중 기록**. `AiSettings`/`ai_model_settings` 는 별개(키/잔재).

## 6. runtime 생성 endpoint별 모델 결정 경로 (핵심)

| 경로 | 모델 출처 | endpoint | admin 반영 | 근거 |
|------|----------|----------|:---:|------|
| **편집 생성(하드코딩)** | `'gemini-2.5-flash'` 리터럴 | `/api/ai/content` · `url-to-blocks` · `vision/analyze` · `course-structure` · `lesson-body` · `content-to-store-use` (6개) | **❌** | `ai-proxy.routes.ts` 각 핸들러 + `ai-proxy.service.generateRawContent()`(provider='gemini' 고정) |
| **프록시(client-supplied)** | `req.body.model`(whitelist 검증) | `/api/ai/generate` | △(client가 보냄) | `ai-proxy.routes.ts:47,61` → `resolveModel()`(`ai-proxy.service.ts:191-219`). admin-dashboard `BlockAIGenerator` 등이 body 에 `gemini-2.5-flash` 하드코딩 |
| **질의(policy DB)** | `AiQueryPolicy.defaultModel` | `/api/ai/query` | **✅** | `ai-query.service.ts:482` |
| **scope policy(DB+fallback)** | `ai_llm_policies.model` by scope, 없으면 `'gemini-2.5-flash'` | 내부 scope 호출(CARE/STORE_INSIGHT 등) | △(scope별) | `ai-policy-executor.service.ts:222-262`(:246 fallback) |
| **resolver(하드코딩 fallback)** | `ai-config-resolver` → `'gemini-2.5-flash'`(DB read 제거됨) | store-ai insight / product tagging | **❌** | `ai-config-resolver.ts:24`(care 제거로 DB read 삭제) |
| **signage(스텁)** | `modelName:'placeholder'`(실 LLM 호출 없음) | `/api/signage/:svc/ai/generate` | — | signage `content.service.ts:143-202` |

**결정적:** 편집 AI(AiContentModal 이 호출하는 `/api/ai/content` 등 6개)는 admin 선택을 **전혀 읽지 않음**. admin 선택은 `AiQueryPolicy.defaultModel` 로 저장되나 **오직 `/api/ai/query` 만 소비.** `/api/ai/generate` 는 client(빌더)가 보낸 모델을 whitelist 검증 후 사용 → 빌더가 gemini 하드코딩이라 실질 고정.

## 7. `gemini-2.5-flash` hardcode 위치 목록

- `ai-proxy.routes.ts` — content(:235) · url-to-blocks(:1069) · vision(:123) · content-to-store-use(:1326) · course-structure(:1468) · lesson-body(:1621) 각 핸들러 리터럴.
- `ai-proxy.service.ts` — `generateRawContent()`(:660 provider='gemini' 고정) · `resolveModel()` provider 기본값(:191-219).
- `ai-config-resolver.ts:24` — `const model = 'gemini-2.5-flash'`(DB read 제거 후 하드코딩).
- `ai-policy-executor.service.ts:246` — fallback `'gemini-2.5-flash'`.
- `LmsAIService.ts:136` — `provider==='gemini'?'gemini-2.5-flash':'gpt-4o-mini'`.
- `operator-ai-llm.service.ts:147` — Neture operator LLM 동형.
- policy 기본값 — `AiQueryPolicy`/`AiLlmPolicy` 스키마 default.
- admin-dashboard — `BlockAIGenerator`/`PageAIImprover`/`SectionAIGenerator`/`BlockCodeGenerator` body 에 `model:'gemini-2.5-flash'`.

## 8. provider abstraction 존재 여부

- **존재(부분):** `AIProvider='openai'|'gemini'|'claude'`, `MODEL_WHITELIST`(gemini-2.5-flash/gpt-5-mini/claude-sonnet-4.5 등), `ai-proxy.service.callProvider()` switch(`callOpenAI/callGemini/callClaude`).
- **우회:** 편집 endpoint 6개는 `callProvider` 대신 `generateRawContent()`(provider='gemini' 고정)로 진입 → **모델·provider 모두 교체 불가.** `/api/ai/generate` 만 `callProvider` 경유(provider 교체 가능하나 client 의존).

## 9. admin 선택값 미배선 여부 (정밀)

- **미배선(핵심 갭):** 편집 생성 6개 + resolver(store-ai) 경로는 `AiEngine`/`AiQueryPolicy`/`AiLlmPolicy` 를 **import·read 0**. `AiEngine` 을 읽는 곳은 `ai-admin.service`(대시보드 표시)뿐 — 생성 경로 read 없음.
- **배선됨:** `/api/ai/query`(→`AiQueryPolicy.defaultModel`), scope 내부 호출(→`ai_llm_policies.model`).
- → admin 의 "엔진 활성화" 는 **질의/scope 정책에만 도달**, **편집 AI 생성에는 도달하지 않음.**

## 10. signage / admin-builder 등 별도 경로 여부

- **Signage:** `/api/signage/:svc/ai/generate` 는 **현재 placeholder 스텁**(실 LLM 미호출, `modelName:'placeholder'`). 모델 결정 경로 자체가 미구현 → 별도 트랙(C).
- **admin-dashboard builder:** `/api/ai/generate` 프록시 경유, **client 가 모델을 body 로 전송**(현재 gemini 하드코딩). 백엔드는 whitelist 검증 후 honor → admin 설정과 무관(client-side 결정).

## 11. 판정 A~E

- **A (배선됨):** `/api/ai/query`(AiQueryPolicy.defaultModel), scope 내부 호출(ai_llm_policies). — admin 활성화 반영됨.
- **B (저장되나 생성 endpoint 무시) — 주 판정:** 편집 AI 생성 6개(`/api/ai/content` 등). admin→`AiQueryPolicy.defaultModel` 저장돼도 **편집 경로가 안 읽음**. **후속 WO = resolver 배선.**
- **C (설정 UI ↔ runtime 분리):** resolver(store-ai, DB read 제거→하드코딩), signage(스텁). 설정 체계 정리 선행 필요.
- **D (endpoint별 경로 상이) — 동반 판정:** §6 의 5갈래(하드코딩/client/query-policy/scope-policy/resolver) → **한 번에 고치지 말고 endpoint군별 단계 분할.**
- **E (제외):** 모델 후보 비교/확정, prompt preset 표준, 편집 모달 정렬, 비용 최적화.

## 12. 위험 요소

| # | 위험 | 대응 |
|---|------|------|
| R1 | "미배선" 으로 단정 → 실제 일부(query/scope) 배선됨 | §6/§9 경로별 구분 — 편집 생성만 미배선 |
| R2 | 정책 테이블 3종(AiQueryPolicy/AiLlmPolicy/AiSettings) + ai_model_settings 파편화 | 배선 전 **SSOT 통합** 판단(어느 값을 진리로) |
| R3 | 편집 endpoint 6개 일괄 수정 → 회귀 | endpoint군별 단계 + hardcode 를 fallback 으로 강등(제거 아님) |
| R4 | provider 교체까지 한 번에 | 1차는 model 배선, provider 교체는 `generateRawContent` 우회 해소 후속 |
| R5 | signage 스텁을 "경로 있음" 으로 오인 | 미구현 — 별도 트랙 |
| R6 | client-supplied(`/api/ai/generate`)를 admin 배선으로 착각 | client 결정 — 별도(빌더 도메인) |
| R7 | 모델 후보를 본 IR 에서 확정 | 금지 — §13-3 비교 IR |

## 13. 권장 후속

1. **`WO-O4O-AI-MODEL-SELECTION-RUNTIME-RESOLVER-V1` (1순위)** — 편집 생성 6개 endpoint + `generateRawContent()` 가 **공통 resolver**(우선순위: scope policy → `AiQueryPolicy.defaultModel`/active engine → env fallback)를 읽도록 배선. `gemini-2.5-flash` 리터럴은 **fallback 으로 강등**. **선결:** §R2 정책 SSOT 통합(어느 테이블이 진리인지) 결정. provider 교체는 model 배선 후 `callProvider` 경유로 확장.
2. **`WO-O4O-AI-HARDCODED-GEMINI-CALLSITE-INVENTORY-FIX-V1`** — §7 callsite 목록을 endpoint군(proxy 편집 / LMS / resolver / admin-builder)별 **단계적 제거**. (1순위 WO 와 통합 또는 분할.)
3. **`IR-O4O-AI-MODEL-CANDIDATE-COMPARISON-V1`** — Gemini/DeepSeek/Qwen/Kimi 후보 비교(본 IR 미확정). 배선이 끝나야 후보 교체가 의미.
4. **`IR-O4O-AI-EDITING-PROMPT-PRESET-STANDARD-V1`** — prompt preset 표준은 **별도 작업선**(모델 배선과 독립).

## 14. Neture / LMS 경계 확인

- 본 IR 은 **AI 운영 거버넌스**(엔진/정책/모델) 조사 — Neture admin(web-neture)이 control plane. **Neture LMS 제외 결정과 무관**(양립).
- LMS 공통화 1차 closure 결정·Neture LMS 제외 결정 **재논의 없음**.

## 15. 검증 (이 IR 자체)

- [x] 문서 1개만 생성(`docs/investigations/IR-O4O-AI-MODEL-PROVIDER-SELECTION-SETTINGS-V1.md`)
- [x] 코드/package.json/pnpm-lock/Dockerfile/backend/DB/migration 변경 없음(read-only)
- [x] admin 설정(§4)/저장 구조(§5)/endpoint별 모델 경로(§6)/hardcode 목록(§7)/abstraction(§8)/미배선(§9)/signage·builder(§10)
- [x] 판정 A~E(§11, 주 = B+D)/위험(§12)/후속(§13)
- [x] LMS closure·Neture LMS 제외 결정 재논의 없음, 모델 후보 미확정

---

*End of IR-O4O-AI-MODEL-PROVIDER-SELECTION-SETTINGS-V1*
