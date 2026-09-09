# CHECK-O4O-AI-USAGE-FLOW-BASELINE-REALIGNMENT-V1

> **상태**: PASS — 기준 문서 갱신 전용, 코드 변경 0
> **작업일**: 2026-09-09
> **대상 문서**: [O4O-AI-USAGE-FLOW-BASELINE-V1.md](../baseline/O4O-AI-USAGE-FLOW-BASELINE-V1.md)
> **선행**: [CHECK-O4O-COMMON-HOME-AI-INPUT-V0.md](CHECK-O4O-COMMON-HOME-AI-INPUT-V0.md) · [CHECK-O4O-HOME-AI-PRODUCTION-CREDENTIAL-AND-CLOSURE-V1.md](CHECK-O4O-HOME-AI-PRODUCTION-CREDENTIAL-AND-CLOSURE-V1.md)

---

## 1. 기존 baseline 충돌 지점

2026-04-23 판 baseline 이 "독립 AI 입력 화면 없음" 을 canonical 로 유지하고 있어 현재 구현과 충돌했다.

| # | 위치 | 기존 문구 | 충돌 사유 |
|---|---|---|---|
| 1 | §4.1 실행 위치 | "편집기 내부에서만 실행. 독립 AI 입력 화면(`/ai` 등) 없음." | O4O 공통 Home 중앙 입력이 production 에서 AI 진입점으로 동작 |
| 2 | §8 의도적 미적용 항목 | "독립 AI 입력 화면 (`/ai` 등)" | 미적용이 아니라 **구현·배포·검증 완료** |
| 3 | §7 장점 | "독립 AI 화면 없이도 흐름 성립" | 같은 전제 |
| 4 | §10 한 줄 핵심 | "AI 는 '따로 사용하는 기능' 이 아니라…" | 진입점 축이 빠져 Home AI 를 설명하지 못함 |
| 5 | §1 역할 분리 / §2 전체 흐름 | HUB → 편집기 → 실행 단일 흐름만 존재 | Home AI 흐름이 누락 |
| 6 | §6 AI 실행 인프라 | `/api/ai/home-chat` · `@o4o/ai-core execute()` · WorkScope resolver 미등재 | 현재 실행 경로 누락 |
| 7 | §4.1 표 `FloatingAiButton` 행 | "우측 하단 자유 질문" | **코드에 이미 없음** — 컴포넌트가 WO-O4O-ADMIN-DEDICATED-SUPER-ADMIN-CUTOVER-AND-LEGACY-CLEANUP-V1 에서 제거됨 (문서가 코드보다 뒤처져 있던 항목) |

7번은 이번 조사에서 재확인했다. `FloatingAiButton` 은 저장소에서 `apps/admin-dashboard/src/components/layout/AdminLayout.tsx` 의 주석 언급 외에 실체가 없다.

---

## 2. production 근거

문서 수정은 추측이 아니라 아래 실측·구현을 근거로 했다.

| 근거 | 내용 |
|---|---|
| production smoke (2026-09-09) | revision `o4o-core-api-03563-dkd` 기준 `POST /api/ai/home-chat` HTTP 200 × 3, 실브라우저 8항목 PASS |
| `services/web-neture/src/pages/O4OHomePage.tsx` | 중앙 입력 → `sendHomeChat(trimmed, workScope)` → 텍스트 응답 렌더. 워드마크/입력/pill/account UI 4요소 구성 |
| `services/web-neture/src/lib/ai/home-chat.ts` | `organizationId`/`storeId` 미전송 계약, 입력 상한 2000 |
| `apps/api-server/src/routes/ai-proxy.routes.ts:1815~` | 계약 주석 — TEXT RESPONSE ONLY / DB write 0 / client workScope 는 힌트 |
| `apps/api-server/src/services/ai-prompts/homeChat.ts` | `VerifiedScopeFacts` — 식별자를 프롬프트에 넣지 않음 |
| `apps/api-server/src/utils/work-scope-store-resolution.ts` | 서버측 store 재확정 |
| `services/web-neture/src/lib/work-scope/types.ts` | `executionMode` / capability 계약 자리 (V0 는 cloud 고정) |
| `apps/api-server/src/middleware/*limiter*` | `free: { windowMs: 60000, max: 10 }` |

향후 기능은 canonical 로 적지 않고 §14 "예정" 으로 분리했다.

---

## 3. 수정한 canonical flow

baseline §2 를 두 갈래로 분리했다.

```text
2.1 Home AI 흐름 (canonical entry)
neture.co.kr/ → O4O 공통 Home → 중앙 AI 입력창 → WorkScope 확인
  → POST /api/ai/home-chat → 서버가 membership·store 재확정 → 텍스트 응답

2.2 편집기 AI 흐름 (기존)
HUB → 선택 → 복사 → 편집기 → AI 정리 → 삽입 → 실행
```

§1 역할 분리 표에 **Entry 레이어**(O4O 공통 Home 중앙 AI 입력)를 추가했다.
§11.1 에 Home 의 역할을 명시했다 — `neture.co.kr` = O4O 전체 대표 진입점, Supplier/Partner 는 하위 업무영역, 포털형 Home 으로 정의하지 않음.

---

## 4. Home AI 와 service AI 구분

baseline §11.2 에 표로 고정했다. **둘을 합치지 않는다.**

| | 공통 Home AI | 서비스 내부 AI |
|---|---|---|
| 위치 | `neture.co.kr/` 중앙 입력 | 편집기 · POP 제작기 |
| 목적 | O4O 전체 업무 진입 · 자유 질의응답 | 서비스별 특정 업무 지원 |
| endpoint | `POST /api/ai/home-chat` | `POST /api/ai/content` 등 |
| 편집기 반영 | 없음 | 있음 |

---

## 5. WorkScope 관계

baseline §11.4 에 반영했다.

- 클라이언트가 싣는 축: `serviceKey` / `workspace` / `role` / `capabilities` / `executionMode` / `status`
- **client WorkScope 는 authorization SSOT 가 아니다.** 서버가 로그인 사용자 + membership + 기존 resolver 로 재확정한다.
- `organizationId` / `storeId` 는 전송하지 않으며 서버도 읽지 않는다.
- production 실측 대조표를 함께 기록했다 (`kpa` → 서버가 `kpa-society` 로 확정).

---

## 6. 현재 기능 / 미구현 기능 경계

baseline §13 에 명시했다.

```text
가능 : 사용자 질문 · WorkScope context · 서버 AI 호출 · 텍스트 응답
불가 : tool calling · RPA · Computer Use · Browser control · Local Work Agent
       local file access · POS 조작 · 약국 프로그램 조작 · 자동 write action

AI = 질문/응답
AI ≠ 자동 실행 agent
```

`executionMode: 'local'|'hybrid'` 와 `local_read`/`local_write`/`browser` capability 는
**계약 자리일 뿐 현재 부여되지 않는다**는 점도 함께 적었다.

---

## 7. Conversation persistence 상태

baseline §11.7 — V0 계약의 일부로 기록했다. 결함으로 적지 않았다.

```text
conversation DB       = 없음
message persistence   = 없음
새로고침 시 대화 유지 = 없음
```

두 번째 질문이 첫 질문 문맥을 기억하지 못하는 것은 DB write 0 유지를 위한 의도적 설계다.

---

## 8. Privacy / identifier 경계

baseline §11.5 — Home AI 는 `storeId` · `organizationId` · UUID 를 LLM 에 넣지 않는다.
store 가 `resolved` 여도 system prompt 에는 `매장 컨텍스트: 확정됨` 수준의 불리언 사실만 전달한다.
식별자를 넣지 않으므로 응답으로 새어나갈 수 없다.

---

## 9. 비용 / usage 상태

baseline §11.6 — 있는 그대로 기록했다.

| 항목 | 현재 |
|---|---|
| rate limit | 있음 (`dynamicLimiter('free')` 60s/10회) |
| maxTokens | 있음 (2048) |
| input length 제한 | 있음 (2000자) |
| retry 제한 | 있음 (`maxAttempts: 1`) |
| 토큰 사용량 DB 집계 | **없음** |
| conversation 원문 저장 | **없음** |

조사에서 확인한 구조적 이유를 함께 적었다 — Home AI 는 `@o4o/ai-core execute()` 를 직접 호출하고
`AiPolicyExecutorService` 를 경유하지 않으므로 `ai_usage_logs` 에 기록이 남지 않는다
(`ai_usage_logs` write 는 `ai-policy-executor.service.ts` 와 `ai-proxy.service.ts` 뿐).

---

## 10. Known drift (이번에 수정하지 않음)

baseline §13.1 에 "기록만" 으로 등재했다.

| drift | 상태 |
|---|---|
| `ai_query_policy.default_model = 'gemini-3.0-flash'` 가 `MODEL_WHITELIST.gemini` 에 없어 admin 선택이 무시됨 | 후속 정비 대상 |
| `/api/ai/query` 의 `column AiSettings.apikey does not exist` | 후속 정비 대상 (baseline §12) |
| AI 키가 Cloud Run 평문 env 주입 (Secret Manager 미경유) | 구조 개선 후보 |

---

## 11. 후속 작업

1. `ai_query_policy.default_model` drift 정리 (별도 WO)
2. AI Capability / Tool Routing V0
3. Local Work Agent V0
4. Home AI 비용/사용량 telemetry (§9 의 미집계 상태 해소)

---

## 12. 완료 기준 대조 (WO §18)

| # | 기준 | 결과 |
|---|---|:---:|
| 1 | "독립 AI 입력 화면 없음" 전제 제거 | PASS |
| 2 | O4O Home 중앙 AI 입력 canonical 반영 | PASS (§1 Entry · §2.1 · §11) |
| 3 | `/api/ai/home-chat` canonical 명시 | PASS (§11.3) |
| 4 | WorkScope 관계 반영 | PASS (§11.4) |
| 5 | 현재 AI = text response only | PASS (§13) |
| 6 | Local Agent / Tool Calling 미구현 명확화 | PASS (§13) |
| 7 | conversation persistence 없음 명확화 | PASS (§11.7) |
| 8 | identifier leakage 경계 반영 | PASS (§11.5) |
| 9 | 기존 구현/CHECK 와 문서 충돌 0 | PASS |
| 10 | 코드 변경 0 | PASS |
| 11 | DB migration / write 0 | PASS |
| 12 | commit / push | PASS |

---

## 13. 문서 정합

```text
문서 정합: 발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건
```

- 발견 1건 = 본 WO 의 대상인 `O4O-AI-USAGE-FLOW-BASELINE-V1` 자체 (갱신 완료).
- 새 baseline 문서를 만들지 않고 기존 문서를 갱신했다 (WO §15). 섹션 번호 §1~§10 은
  외부(`IR-O4O-CONTENT-CREATION-AI-ENTRY-AUDIT-V1` §10 · `IR-NETURE-PHILOSOPHY-ALIGNMENT-AUDIT-V1` §10 ·
  `WO-O4O-IOREDIS-BULLMQ-RESIDUE-CENSUS-REMOVAL-V1-CHECK` §9)에서 참조되므로 **재배치하지 않고**
  신규 내용을 §11~§14 로 덧붙였다.
- 별도 WO 제안 1건 = `ai_query_policy.default_model` drift 정리.
