# CHECK-O4O-GOAL-DRIVEN-WORK-AGENT-LLM-MULTIMODAL-CLOSURE-V1

> **WO**: `WO-O4O-GOAL-DRIVEN-WORK-AGENT-LLM-MULTIMODAL-CLOSURE-V1`
> **상태**: **CLOSED** — 실 Gemini Planner · 실 멀티모달 입력 · 실 Chrome 실행 · 재관찰 · takeover 전부 실측 PASS, **production 왕복까지 PASS**
> **작성일**: 2026-09-12
> **선행**: `CHECK-O4O-GOAL-DRIVEN-MULTIMODAL-WORK-AGENT-V0`(loop ESTABLISHED · scripted planner) · `CHECK-O4O-AI-MODEL-DYNAMIC-REGISTRY-V1`(gemini-3.8-flash canonical)
> **commit**: `af6426b09` (결함 3건 + closure spec) · 본 문서

---

## 1. 시작 상태

```text
GOAL-DRIVEN LOOP      = ESTABLISHED (e51d99917)
REAL CHROME LOOP      = PASS (scripted planner · 실 health.kr)
LLM PLANNER           = PENDING (당시 Gemini 키 없음)
MULTIMODAL REAL SMOKE = PENDING
PRODUCTION ROUNDTRIP  = PENDING (pairing)
```

이번 WO 는 새 architecture · workflow engine · scheduler · persistence · vision framework · pill schema 를 **만들지 않았다**(§2). 기존
`runWorkAgent` + `createLlmPlanner` + `local.browser.dom.*` + 확장 content script 를 실제 Gemini 와 실제 Chrome 으로 돌려 결함 3건만 고쳤다.

## 2. Gemini provider / model (§3·§4·§27)

| 항목 | 값 |
|---|---|
| provider / model | **`gemini` / `gemini-3.8-flash`** — 로컬 하네스 · production 모두 |
| 키 | 운영 `GEMINI_API_KEY`(Cloud Run env). 하네스에는 env 로 주입, 어디에도 출력하지 않음 |
| `ai_query_policy.default_model` | 여전히 stale `gemini-3.0-flash`(DB 미변경, §4). 동적 registry 가 거절해 runtime fallback = canonical 3.8 — production `GET /api/ai/models` `current: gemini-3.8-flash` 로 확인 |
| planner 호출 형상 | 텍스트 = `@o4o/ai-core execute()`(json 모드) · 이미지 = `generateContent` + `inline_data`(기존 vision 경로) · `maxOutputTokens 800` · `responseMimeType application/json` |

## 3. Real LLM planner · 4. Planner input/output

- 하네스: api-server 의 `runWorkAgent` 를 그대로 싣고(tsx), `createLlmPlanner(dataSource, fetch, resolveTarget)` — resolver 만 주입(entity 층 없이 같은 planner 코드).
  DOM 명령은 in-memory DB stub → **실 agent handler(`runAction`) → bridge relay → native host → unpacked 확장 → 실 health.kr 탭** 으로 서비스.
- 입력(§10): Goal · 사이트 · 현재 관찰(요소 요약 ≤80, `[webpage]` UNTRUSTED) · 최근 행동 6 · 직전 읽은 내용 · 이미지 유무 · 직전 거절 사유 · 남은 행동. 전체 HTML 없음(§11).
- 출력(§12): `{assessment, action{kind…}, rationale, neededInput}` — 실측된 kind 는 `set_input · click · find · inspect · takeover` 뿐(어휘 밖 0).
- 실제 Gemini 제안 예(텍스트): `set_input e_11 "아모디핀"` → `click e_12` → `takeover goal_sufficiently_advanced`("검색 결과 페이지에 도달하여 2건 확인").

## 5. Runtime validation (§13)

`validateWorkProposal` 이 제안마다 실행됐다(실 smoke 거절 0 — 모델이 어휘·ref 규칙을 지켰다). spec 이 unsupported action · forbidden key(url/selector/riskLevel/script) ·
관찰 밖 ref · COMMIT 대상 · credential 성격 텍스트를 거절함을 잠근다. 그 위에 확장이 COMMIT/credential/cross-origin 을 한 번 더 막는다(production DOM 로그 `riskLevel` 키 유지).

## 6. Real Chrome text smoke (§8·§41) — Chromium + unpacked 확장 + HKCU native host + relay + **gemini-3.8-flash**, 실 health.kr

| 단계 | 실측 |
|---|---|
| 관찰 | get_context(미도달→로딩→준비) → inspect **189 요소** |
| plan 1 | `set_input e_11 "아모디핀"` — "약품 검색창에 입력" → `hasValue` |
| plan 2 | `click e_12` — "검색 버튼 클릭" → `navigated` |
| 재관찰 | `/searchDrug/search_total_result.asp` · 65 요소 |
| plan 3 | `takeover goal_sufficiently_advanced` — "검색 결과 2건 확인 가능" |
| 결과 | `progress: completed` · 명령 10 · AI plan 3 · **10.1 s** · Chrome 은 결과 화면 유지 |

**PASS** (2회 재현 동일).

## 7. Multimodal smoke (§18·§20·§42) · 8. Need-based interpretation (§19·§21·§22)

이미지 = **민감정보 없는 합성 알약**(HTML 로 그린 흰 타원 + 각인 `AMD 5`, PNG 15 KB). 고정 스키마로 "약 이름" 을 묻지 않았다.

| 단계 | 실측 |
|---|---|
| 관찰 | health.kr 홈 189 요소(제품명 검색창 · **모양/식별 검색 문자 입력란 e_25** 등) |
| plan 1 | `set_input e_25 "AMD 5"` — "이미지의 알약에 적힌 식별문자 'AMD 5' 를 식별문자 입력창에 입력" → **현재 화면이 요구하는 조건(식별문자)만 이미지에서 추출** |
| plan 2 | `click e_47`(모양 검색) → `navigated` → **`/searchIdentity/search.asp`** 117 요소 |
| plan 3~5 | `find role=button name=검색` → 3건 · `click` · 재관찰 |
| plan 6 | `takeover goal_sufficiently_advanced`(로컬) / `ambiguous_result`(production) — 후보 화면을 사용자에게 인계 |
| 결과 | 로컬 6 plans · 21 명령 · 26.8 s / production 6 plans · 11 steps · 64.6 s |

- Gemini 가 이미지만 보고 "이 약은 ○○" 라고 확정한 적이 없다(§22) — 응답의 `rationale` 전부 "식별문자 입력/검색" 이고 약품명 문자열이 나오지 않았다.
- 정확한 식별은 완료조건이 아니다(§21): 식별문자 하나로 검색 → 후보 화면 → takeover. 사용자의 수작업(사이트 이동 · 검색 UI 찾기 · 입력)을 줄였다.
- **FIXED DRUG IMAGE SCHEMA = 0** — 소스 잠금(`PillVisualFeatures · drugName · frontMark · backMark` 부재).

## 9. Result re-observation (§15) — 실 smoke 에서 잡은 결함 ①

첫 이미지 run 에서 `click`(navigated) 뒤 700 ms 재관찰이 **옛 문서(홈, 189 요소)** 를 결과 화면으로 받았다 — health.kr 폼 이동이 4 s 를 넘긴다.
수정: content script 가 문서 인스턴스 id(`docId`, 무작위)를 `get_context` 에 싣고(agent trim · 서버 whitelist 형식 `d_[a-z0-9]{4,32}`), runtime 은 이동 뒤 **새 docId 가
올 때까지**(최대 10회 ≈ 7 s) 기다린다. 재현 run: 옛 문서 6회 → 새 문서 `/searchIdentity/search.asp` 정상 관찰. `DOM action success ≠ goal progress` 구분 유지.

## 10. Progress / Takeover (§16·§17) — 결함 ②③

- ② 대기 probe(미도달 · 로딩 · 옛 문서)가 `maxSteps 14` 를 잠식해 결과 화면 직전에 `loop_limit`(그것도 `site_not_ready` 로 오보고). 수정: 쓸 수 없는 관찰의 probe 는 예산을 쓰지 않는다
  (대기는 attempts · maxDuration 90 s 가 막는다), 예산 소진은 `loop_limit` 으로 구분.
- ③ Planner 가 `assessment: completed` + `takeover` 를 함께 내면 인계 사유가 유실(`takeover: null`). 수정: takeover 를 먼저 본다 — production 이미지 run 의 `ambiguous_result` 가 그렇게 보존됐다.
- takeover 사유는 기존 enum 만 썼다(신규 0): 실측 `goal_sufficiently_advanced · ambiguous_result`, spec `commit_required · credential_required · planner_unavailable · no_progress · loop_limit`.

## 11. Loop safety (§31·§32)

실 smoke 4회 모두 3~6 plans · 10~23 명령 · ≤65 s 로 종료 — 무한 루프 0. spec: 같은 관찰 반복 → `no_progress`, 매번 다른 요소 클릭 → `loop_limit`(≤14 steps · ≤8 plans),
planner throw → `planner_unavailable`(추가 명령 0).

## 12. Prompt injection · 13. Learning signal · 14. Privacy/logging (§14·§23·§34)

- 관찰 · 읽은 텍스트 · 이미지 = `source=webpage / user_image · UNTRUSTED`(system prompt 규칙 유지). 페이지 문구가 tool policy 에 닿는 경로 없음(spec).
- production `work-agent run` 로그 = **10 키뿐**: `siteId · inputMode · actionCount · aiPlanCount · takeoverReason · takeoverStep · userCorrectionCount · completionState · durationMs · timestamp`
  (실측 2건: `text` 3 plans/completed · `text+image` 6 plans/needs_user·ambiguous_result). goal 원문 · 관찰 · 입력값 · 이미지 없음. DOM 로그 18건 전부 whitelist 키, 600 B 초과 0.
- **IMAGE PERMANENT STORAGE = 0** — 이미지는 planner `inline_data` 한 자리에만 실리고 명령 · 응답 · 로그에 base64 가 없다(spec 이 전체 직렬화에서 부재 단언).

## 15. Production roundtrip (§28·§29·§30)

이 PC 는 이미 pairing 되어 있어(DOM V0) 왕복이 가능했다.

```text
neture.co.kr 세션 → POST api.neture.co.kr/api/ai/work-agent/run (o4o-core-api-03635-8dm)
  → Gemini Planner(운영 키 · gemini-3.8-flash) → local_agent_commands → 실 폴링 agent → relay → native host
  → 확장 → health.kr 탭 → DOM → 재관찰 → takeover
```

| Goal | 결과 |
|---|---|
| 약학정보원에서 아모디핀을 찾아줘 | `completed` · `goal_sufficiently_advanced` · steps 6 · plans 3 · 34.0 s · Chrome `/searchDrug/search_total_result.asp` |
| 약학정보원에서 이 사진의 약을 찾는 데까지 해줘 (+합성 알약 PNG) | `needs_user` · `ambiguous_result` · steps 11 · plans 6 · 64.6 s · Chrome `/searchIdentity/search.asp` |

API 응답에는 history 의 종류·상태만(검색어 미반환). `severity>=ERROR` 0.

## 16. Tests · CI (§39·§40·§54)

| 게이트 | 결과 |
|---|---|
| `work-agent-llm-closure.spec.ts`(신규 10) — planner call contract(inline_data · JSON 모드 · 3.8 · 예산 ≥800) · invalid/empty/503/timeout → planner_unavailable · unsupported/forbidden/risk bypass/COMMIT/관찰 밖 ref 거절 · 구조화 관찰/UNTRUSTED/HTML 부재/docId · **결함 ①②③ 잠금** · no_progress/loop_limit · COMMIT/credential 인계 · 이미지 비저장/usage 10키/고정 스키마 0 | 10 PASS |
| `work-agent.spec.ts`(기존 14) | 14 PASS |
| 회귀(§40): Browser DOM · Bridge · Execution Layer · Tool Routing · Computer Use · Pharmacy Web Core · Supplier Adapter · Local Agent runtime · Gemini registry · Browser Control | **232 PASS** |
| agent node:test 3 파일 | 59 PASS |
| tsc(api-server WO 파일) · eslint(변경 6 파일) | 0 |
| CI · Deploy API (`af6426b09`) | success |

## 17. DB migration · write (§48)

cloud/local migration **0** · agent run persistence table **0** · `ai_query_policy` 미변경(§4) · DB write 는 기존 `local_agent_commands` envelope 뿐.

## 18. Limitations

1. 이미지 run 의 두 번째 클릭(식별 페이지의 `검색` 버튼 3후보 중 상단 제품명 검색 버튼)은 무의미한 클릭이었다 — 동명 버튼이 여럿일 때 Planner 가 위치 맥락 없이 고른다. runtime 은 재관찰로 회복했고 takeover 로 끝났다(수작업 감소 목적 달성). 후보 구분 정보(섹션/근접 라벨)는 Browser DOM V1 몫.
2. 이동 대기는 최대 ~7 s 고정(docId 불변이면 마지막 관찰을 받아들임). SPA 내부 이동은 docId 가 바뀌지 않으므로 기존 `changed` 경로에 의존한다.
3. production 왕복은 폴링(5 s) 때문에 로컬 하네스보다 2~3배 느리다(34 s · 65 s) — 비용 최적화 · 폴링 간격은 이번 범위 밖.
4. 하네스(`work-agent-real.mts` · `work-agent-prod.mjs`)는 커밋하지 않았다(실 키 · 실 사이트 의존). 기록은 본 문서.
5. 테스트 이미지는 합성(HTML 렌더) 알약이다 — 실제 사진의 조명·각도 편차는 미실측.

## 19. Final closure status (§46·§47)

```text
REAL GEMINI PLANNER              = PASS   (gemini-3.8-flash · 로컬 4회 · production 2회)
CURRENT UI OBSERVATION           = PASS
LLM NEXT ACTION                  = PASS
RUNTIME VALIDATION               = PASS
DOM EXECUTION                    = PASS
RESULT RE-OBSERVATION            = PASS   (docId 대기 — 결함 ① 수정 후)
PROGRESS JUDGMENT                = PASS
TAKEOVER                         = PASS   (goal_sufficiently_advanced · ambiguous_result)

REAL MULTIMODAL INPUT            = PASS
NEED-BASED IMAGE INTERPRETATION  = PASS   (식별문자만 추출 → 식별 검색)
FIXED DRUG IMAGE SCHEMA          = 0

COMMIT AUTO ACTION               = 0
CREDENTIAL AUTO ACTION           = 0
IMAGE PERMANENT STORAGE          = 0
ARBITRARY URL/SELECTOR/JS        = 0

REAL CHROME TEXT LOOP            = PASS
REAL CHROME IMAGE LOOP           = PASS
PRODUCTION PAIRING ROUNDTRIP     = PASS   (text · image)

GOAL-DRIVEN-MULTIMODAL-WORK-AGENT-V0 = CLOSED
```

---

*문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건*
