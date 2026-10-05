# CHECK-O4O-PERSONAL-ASSISTANT-PHASE-D-EXECUTION-NODE-RUNTIME-STATE-COORDINATION-V1

> **WO**: `WO-O4O-PERSONAL-ASSISTANT-PHASE-D-EXECUTION-NODE-RUNTIME-STATE-COORDINATION-V1` (사용자 지시 2026-10-05, WO 문서 없음 — 이 CHECK 가 기록)
> **일자**: 2026-10-05
> **정본**: [`O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2`](../baseline/O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md) §3 · §3-1 · §11-1 · §23 (노드 원장 KNOWN GAP ①~④)
> **작업공간**: 전용 worktree `../o4o-wt/pa-phase-d` · branch `wo/personal-assistant-phase-d-execution-node-coordination-v1` · base `origin/main` `b2448532c`

---

## 0. 판정

```text
STATE                    = READY_TO_INTEGRATE (main 미통합 · 배포 0 · production migration 0)
GAP ① 노드 원장 소유 주체   = 해소 — 에이전트 0.2.0 · local.db v8 owner_key (업데이트 전 0.1.0 은 예전 동작 = 남은 한계)
GAP ② Node/Cloud 병합      = 해소 — Cloud 우선(극성 충돌 시 Cloud)
GAP ③ 다중 노드 ambiguous   = 해소 — capability 보고 + Assistant 노드 선택 · 사용자 PC 정리 안내 제거
GAP ④ 재개 구조 회귀        = 해소 — 마지막 질문 노드 ≠ 현재 노드면 노드 구조 대신 Cloud 구조
MIGRATION                = 1 (AddLocalAgentDeviceCapabilities1791177033073 — 컬럼 2 · additive)
AGENT                    = 0.2.0 (local.db v8 · heartbeat 보고) — 사용자 PC 수동 업데이트
DEPLOYMENT (통합 시)       = MANUAL/GATED — migration 포함 → Delivery LEVEL 3 → 소유자 promote 1회
```

## 1. KNOWN GAP 해소 방식

| # | 문제 | 해소 | 근거 코드 |
|---|---|---|---|
| ③ | 온라인 노드 2대 이상 → `ambiguous` 로 중단 · "연결된 PC가 여러 대여서…" 안내 | 에이전트가 heartbeat 로 capability(browser · windowsUia · localData · ownerScopedLedger)를 보고 → `local_agent_devices.capabilities`. `selectExecutionNode`: 필요 capability 확인된 부재는 뒤로 → Assistant 선호 노드 → capability 확인 노드 → 보고 없는 이전 노드 → 최근 heartbeat. 멈추지 않는다. ambiguous 상태 · 사용자 안내 문구 6곳 제거 | `local-agent-service.ts` · `ai-tool-router.ts` · `hospital-drug-composite.ts` · `pharmacy-web-executor.ts` |
| ① | 노드 원장에 소유 주체 칸 없음 → 한 노드의 조직 A · B 기억 혼입 | local.db v8: 패턴 · Candidate 유일키 + run · 도움 기록에 `owner_key`. 조회 `owner_key IS ?`. 키 = `o_` + sha256("<scope>:<id>") 32자(원 id 아님). Assistant 가 Task 소유 주체로 키를 정해 `intent.node.ownerKey` 로 넘김(Task 없으면 요청자 USER). 서버는 노드가 `ownerScopedLedger` 를 보고했을 때만 키를 싣는다 | `local-db.mjs` v8 · `work-assistance.mjs` · `handlers.mjs` · `local-agent-protocol.ts` `withOwnerKey` · `work-run-executor.ts` · `node-ledger-owner.ts` · `personal-assistant.ts` |
| ② | 병합 노드 우선 → 오래된 노드 `avoid` 가 최신 Cloud `preferred` 를 가림 | `mergeRecalledPatterns` Cloud 우선. Cloud 에 없는 노드 기억(사설 대상 등)은 유지 | `work-assistance.ts` |
| ④ | A → B → A 시 A 의 오래된 재개 구조 | 재개 검증을 노드 선택 앞으로 옮기고, `work_run_coordination.device_id`(마지막 질문 노드) ≠ 현재 노드면 노드 context recall · 재생 생략 → Cloud 재개 구조. 재개 시 그 노드를 선호 노드로 우선 선택 | `work-agent-runtime.ts` |

호환: 서버 · 에이전트 모두 정확 키 검증이라, 0.1.0 에이전트에 `ownerKey` 를 보내면 명령 전체가 거절된다. 그래서 키는 capability 보고가 있는 노드에만 싣고, 0.1.0 노드는 예전 동작(소유 주체 미구분 읽기)을 유지했다. 0.1.0 에서 노드 원장 읽기를 끄는 안은 재생 · 회상 회귀(그 안으로 돌린 회귀 묶음에서 의도된 계약 변경 2건 외 runtime 테스트 14건 실패로 확인)라 채택하지 않았다.

## 2. 완료조건 대조

| # | 조건 | 결과 |
|---|---|---|
| 1 | 여러 노드라는 이유만으로 ambiguous 중단 안 함 | 충족 — 상태 자체 제거 · 테스트 14 |
| 2 | 정상 경우 사용자에게 PC 선택 · 정리를 요구하지 않음 | 충족 — 안내 문구 제거 · 테스트 19 |
| 3 | Node-local Memory 가 다른 사용자 · 조직 업무에 섞이지 않음 | **충족(0.2.0 노드)** — 에이전트 테스트 ①② · 0.1.0 노드는 남은 한계(업데이트 필요). 다른 사용자: 기기는 한 사용자에 묶이고 키가 사용자 · 조직별로 다르다 |
| 4 | 충돌 시 Node-first 라는 이유로 오래된 기억이 우선되지 않음 | 충족 — Cloud 우선 |
| 5 | 노드 이동 후 오래된 resume state 로 회귀하지 않음 | 충족 — A→B→A 테스트 |
| 6 | 노드 변경이 Assistant · Task · Experience 를 새로 만들지 않음 | 충족 — 노드는 실행 선택일 뿐 Task(1:N run) · 소유 주체 키 · Cloud 기억은 노드와 무관 |
| 7 | Node-local / Cloud 경계 유지 | 충족 — 배치 레지스트리 무변경 · 노드에는 해시 키 · boolean capability 만 추가 |
| 8 | Phase A~C · Work Agent 회귀 없음 | 충족 — 관련 34 suites 575/575 |
| 9 | 자동 integration test · 문서 · CHECK | 충족 — 아래 §3 · V2 §23 · Memory 정책 · Experience Model · 에이전트 README |
| 10 | 사용자가 "어느 PC 에서 실행할지" 를 관리하지 않아도 됨 | 충족 — 서버 선택 + heartbeat 보고. 실제 화면 장면은 Runtime smoke(V2 §11-1-a) |

## 3. 검증

| 항목 | 결과 |
|---|---|
| migration | 격리 PG 17.10: POST assertion PASS · `d2b32f7c…`(6021). 같은 DB 에서 `down()` 후 state 14 `c5bd4a49…`(6018, production 실측과 동일) 재현 · re-up 일치. contract 21/21 |
| 노드 선택 (`local-agent-runtime.spec` 14 · 19) | capability 우선 · 선호 노드 · 선호여도 부재면 제외 · 이전 에이전트 후순위 · 전부 부재여도 선택 · heartbeat 형식 검증 · 다중 노드 상태 안내 없음 |
| Phase D runtime (`personal-assistant-memory-cloud-continuity.spec` F 7건) | 소유 주체 키 형식 · 원장 명령 ownerKey 검증 · 소유 주체 원장 노드에 키 전달(재개 구조 · 상태엔 없음) · Task 없으면 USER 키 · 0.1.0 노드엔 키 미전송 · A→B→A Cloud 구조 · 같은 노드 노드 구조 |
| 병합 · 실행 지시 | Cloud 우선 병합 · USER/ORG 실행 지시는 소유 주체 키만 다름 · 같은 Task 최근 노드 조회(요청자 조건) |
| 에이전트 (`node --test` 151) | v8 · 소유 주체별 패턴 · 업무 키 · Candidate · 반대 극성 은퇴가 다른 소유 주체를 건드리지 않음 · 이전 NULL 행 격리 · 이전 서버 요청 호환 · 잘못된 키 거절 · v7→v8 행 보존 · heartbeat 보고 |
| 회귀 | api-server 관련 34 suites 575/575 · 에이전트 소스 정적 검사 18 suites 356/356 · `tsc` 0 · 변경 파일 eslint 0 |

참고: `personal-assistant-memory-cloud-continuity.spec` 의 기존 runtime 테스트 1건이 한 번 실패 후 단독 · 전체 재실행 3회 통과 — harness 의 명령 대기 시간 의존(1 s) 흔들림으로 판정.

## 4. 남은 한계 (Phase D 를 막지 않음)

1. **0.1.0 에이전트 노드**는 노드 원장을 소유 주체로 나누지 못한다(예전 동작). 사용자 PC 에서 에이전트를 0.2.0 으로 업데이트해야 해소된다 — 자동 업데이트 없음(README).
2. 0.1.0 에서 쌓인 노드 기억은 0.2.0 에서 격리된다(어느 소유 주체에도 안 쓰인다) — 그 부분은 다시 쌓인다.
3. 마지막 질문 노드가 기록되지 않은 이전 run 은 예전 재개 동작.
4. 작업 단위 dispatch(명령 1개씩 원격 왕복)는 그대로 — V2 §11-2 의 다음 과제.
5. Runtime smoke(실제 화면 · 여러 노드 · 이동)는 Execution Runtime smoke 로 별도(V2 §11-1-a). Phase C 장면은 빈 노드 조건.

## 5. 통합 · 배포 영향

- main 통합: PR → CI · Codex → 사용자 승인 후 merge.
- API: migration 1건 포함 → Delivery **LEVEL 3** → 소유자 승인 후 `promote` 1회. migration 은 컬럼 2 추가(additive · 기존 행 NULL).
- 배포 순서 안전성: 새 서버 + 0.1.0 에이전트 = 예전 동작(키 미전송 · 다중 노드 선택만 개선). 0.2.0 에이전트 + 이전 서버 = `{}` 대신 보고를 보내도 이전 서버는 body 를 무시하고, ownerKey 없는 요청은 이전 묶음으로 동작.
- 에이전트: 사용자 PC 수동 업데이트(서버 배포와 독립).

`문서 정합: V2 §3-1 · §11-1 · §23 · Memory 배치 정책 · Experience Model §0-1 · 에이전트 README 를 구현에 맞춤 — 새 drift 없음`
