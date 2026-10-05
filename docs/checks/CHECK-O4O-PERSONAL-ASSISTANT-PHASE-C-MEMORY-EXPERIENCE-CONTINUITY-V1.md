# CHECK-O4O-PERSONAL-ASSISTANT-PHASE-C-MEMORY-EXPERIENCE-CONTINUITY-V1

> **WO**: `WO-O4O-PERSONAL-ASSISTANT-PHASE-C-MEMORY-EXPERIENCE-CONTINUITY-V1` (사용자 지시 2026-10-04, WO 문서 없음 — 이 CHECK 가 기록)
> **일자**: 2026-10-04
> **정본**: [`O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2`](../baseline/O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md) §9 (Ownership-first) · §17 (Legal / Data Processing Gate) · §0-1 (P3) · §18 단계 C
> **선행**: Phase A (배포 · closure smoke PENDING) · Phase B [`CHECK-…-PHASE-B-PLANNING-SEPARATION-V1`](CHECK-O4O-PERSONAL-ASSISTANT-PHASE-B-PLANNING-SEPARATION-V1.md) (CLOSED)
> **작업공간**: 전용 worktree `C:/Users/sohae/o4o-wt/pa-phase-c` · branch `wo/personal-assistant-phase-c-memory-continuity-v1` · base `origin/main` `5e2fe0063`
>
> **현재 해석 (2026-10-05 · `WO-O4O-PERSONAL-ASSISTANT-PC-INDEPENDENCE-DOCUMENT-ALIGNMENT-V1`)** — 본문은 당시 기록 그대로 둔다.
> - **Node-independent Memory Continuity = Architecture / Execution integration 검증** — 본문 ④ "새 노드 연속성 실 runtime harness" 처럼 빈 노드 원장을 주입해 자동 검증한다. 특정 PC 가 필요하지 않다. 본문의 "실 PC 는 Phase A closure 와 같은 조건(사무실 PC)" 은 V2 §11-1-a 의 Execution Runtime smoke(capability 를 가진 아무 노드)로 읽는다.
> - 본문 표의 "부분 — 절차 기억은 Gate 뒤" 는 당시 상태다. 이후 Memory Cloud Continuity(PR #303 · 2026-10-05 API 배포)가 검증된 방법(M3) · 재개 구조(M5)를 소유 주체 전용 Cloud 로 옮겼다 — [MEMORY-PLACEMENT-POLICY](../baseline/O4O-ASSISTANT-MEMORY-PLACEMENT-POLICY-V1.md) · [V2](../baseline/O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md) §23.
> - 기억의 경계는 노드가 아니라 소유 주체다(V2 §3-1). 특정 PC 의 `local.db` 는 기준 원장이 아니다.

---

## 0. 판정

```text
STATE                     = CLOSED (2026-10-04 · §7) — Gate 허용 범위 구현 · main 통합(PR #295 66f5ae11e) · API 배포 · production 확인. 절차 기억 이동은 LEGAL_GATE_PENDING 유지
(이전 판정)                = READY_TO_INTEGRATE (main 미통합 · 배포 0)
MEMORY_OWNERSHIP          = services/assistant/memory-ownership.ts — 기억 10종 × 소유 주체 × 배치(allowed · gate_required · never) · 판정 함수 · Gate 상수 PENDING
ASSISTANT_MEMORY          = services/assistant/assistant-memory.ts — 노드 무관 recall: assistant_tasks 의 Task type 이력(같은 소유 주체 · 같은 대상)
CONTINUITY (지금)          = 새 노드(Local 원장 빔)에서도 같은 업무를 같은 키로 이어감 → 노드의 절차 기억 조회 키 일치
CONTINUITY (Gate 뒤)       = Preferred/Avoid · Workflow Candidate · 재개 frame · 실행 기록의 노드 간 이어짐 — 아직 아님
NODE_LOCAL_PROMOTION      = 차단 — node_environment · slot_values · raw_content 는 Gate 통과 후에도 Cloud 기억 불가(never)
SHARED                    = 이번 경로로 오지 않음 — 소유 주체 밖(다른 사용자 · 조직) 조회 0
SCHEMA / MIGRATION        = 0 (기존 assistant_tasks 읽기 · 기존 인덱스)
NEW_PERSONAL_DATA_STORAGE = 0 · NEW_EXTERNAL_PROCESSING = 0
DEPLOYMENT                = LEVEL 2 — 뒤이은 commit bc1a0bcdd(⊇ 66f5ae11e) Delivery 가 api DEPLOYED · o4o-core-api-03822-quk traffic 100% · /health/ready 200 · migration 실행 0
```

## 1. Legal / Data Processing Gate 판정

정본 조사 결과(인용은 IR 수준 조사 — 이 절에 요지):

| 항목 | 정본 | 판정 |
|---|---|---|
| 구조적 Experience(Preferred/Avoid · Candidate · stage 경로 · 실행 기록 · 재개 frame)를 `local.db` 밖 Cloud 로 | V2 §9-4 "Gate 통과 후에만" · §17-1 · EXP-MODEL §0-1 "실제 이동은 Gate 통과 후" | **Gate 필요 — 구현하지 않음** |
| 이미 Cloud 에 있는 `assistant_tasks.task_type_key` 를 Assistant 판단 근거로 읽기 | §17-1 의 트리거(Memory 의 Cloud 이동 · 새 외부 처리)에 해당하지 않음. 단 "task history 보유기간" 은 §17-3 · §24 Gate 항목 | **진행** — 새 저장 · 새 외부 처리 0. 보유기간 미정은 그대로 KNOWN GAP |
| 소유 · 배치 구조를 코드로 고정 · node 정보 승격 차단 | §17-2 "원칙과 구조는 지금 확정, 데이터가 움직이는 구현만 Gate 뒤" | **진행** |
| 개인정보처리방침 | Assistant 절차 기억 · Local Agent · 자동화에 해당하는 수집 항목 명시 없음(가까운 것: "서비스 이용 · 업무기록" — 보안기록 분류) | 법률 판단 — 결론 내리지 않음 |
| 보유기간 정책 :178 "새 개인정보 저장소는 행 추가 전 무기한 금지" | `assistant_tasks` 는 Phase A 에서 `PENDING_LEGAL_DATA_PROCESSING_GATE` 로 보류 | 기존 격차 — 이번 WO 가 확대하지 않음 |

### 1-1. Gate 를 열려면 사용자 결정이 필요한 것 (V2 §17-1 통과 조건)

1. **저장 승인** — 구조적 절차 기억(값 · 원문 없음)을 소유 주체(조직 · 사용자)별로 Cloud 에 둘 것인가.
2. **보유기간** — 절차 기억 · 재개 frame · Task 이력의 구체 기간 또는 종료 사건(무기한 금지).
3. **처리방침 · 이용계약** — 처리방침 수집 항목에 "업무 자동화 절차 기록(구조)" 류를 추가할지, 매장 경영자 이용계약 별표의 반환 분류(A–F 어디에도 없음)를 어떻게 둘지.
4. **거부 경로 · 재동의** — "AI 를 쓰지 않는 방법으로 거부" 와 재동의 필요 여부.

이 네 가지가 정해지면 Gate 통과를 기록하는 WO 에서 `LEGAL_DATA_PROCESSING_GATE = 'PASSED'` 로 바꾸고, 그때 처음으로 `gate_required` 종류의 Cloud 저장소(migration 포함)를 만든다 — 레지스트리 · recall 경로 · 실행 지시 칸은 이번에 준비됐다.

## 2. 구조

```text
Task (Phase A · 소유 범위 USER | ORGANIZATION)
  → Assistant Memory  recallAssistantMemory(userId, ownership, targetId)
        task_type_history  cloud  → 읽음 (USER: 본인 USER Task / ORGANIZATION: 그 조직 Task · 같은 대상 · 최근 10)
        procedural_memory  node   → Execution 이 노드에서 읽음 (LEGAL_GATE_PENDING 표시)
  → Assistant Planning (Phase B)  intent.knownTaskTypes
  → Execution  노드가 아는 키 + Cloud 기억 키(중복 제거) → planner 의 "확인된 업무 키"
```

### 2-1. 기억 10종 레지스트리

| 종류 | 소유 | 지금 | Cloud |
|---|---|---|---|
| assistant_task | 조직 또는 사용자 | cloud | allowed |
| task_type_history | 조직 또는 사용자 | cloud | allowed (읽기) |
| procedural_memory | 조직 또는 사용자 | node | gate_required |
| assistant_experience | 사용자 | node | gate_required |
| execution_experience | 조직 또는 사용자 | node | gate_required |
| run_resume_frame | run | node | gate_required |
| request_summary | 사용자 | node | gate_required |
| slot_values | run | node | **never** (D3) |
| node_environment | node | node | **never** (credential · 로그인 세션 · 현재 화면 · 로컬 파일 경로 · PC 이름) |
| raw_content | — | 어디에도 없음 | **never** (DO_NOT_STORE) |

### 2-2. 주요 설계 판단

1. **복제로 시작하지 않았다.** `local.db` 를 Cloud 로 동기화하는 대신, 먼저 "어떤 기억이 누구 것이고 어디에 있어도 되는가" 를 코드로 고정했다. 이후 Gate 가 열리면 종류 단위로 옮긴다.
2. **지금 성립하는 연속성은 업무 식별의 연속성이다.** 새 PC 에서도 Assistant 가 "이 사용자(매장)는 이 대상에서 이 업무를 해 왔다" 를 알고 같은 키로 이어간다. 그 키로 노드의 절차 기억을 찾으므로 키가 갈라져 경험이 흩어지는 일이 사라진다. 절차 자체(Preferred/Avoid 등)의 노드 간 이동은 Gate 뒤다.
3. **소유 범위 = 기억 경계, 절차 아님.** ORGANIZATION Task 는 그 조직의 기억을, USER Task 는 본인의 기억을 쓴다. 다른 사용자 · 조직의 기억은 이 경로로 오지 않는다(Shared 는 §10 경로).
4. **기억이 실패해도 실행은 계속** — 조회 실패 · 대상 없음은 빈 기억으로 진행한다.

## 3. 변경 파일

| 파일 | 내용 |
|---|---|
| `services/assistant/memory-ownership.ts` (신규) | `MEMORY_KINDS` · `decideCloudPlacement` · `assertCloudPlacement` · `isNodeOnly` · `LEGAL_DATA_PROCESSING_GATE='PENDING'` |
| `services/assistant/assistant-memory.ts` (신규) | `recallAssistantMemory` — 소유 주체 경계 · parameter binding · 키/대상 형식 검사 · 실패 시 빈 기억 |
| `services/assistant/personal-assistant.ts` | Task → Memory → Planning 연결 · `resolveTaskTarget`(재개는 Task 의 대상만) |
| `services/assistant/assistant-planning.ts` | 입력 `knownTaskTypes` → intent |
| `services/ai-tools/work-agent-contract.ts` | `ExecutionIntent.knownTaskTypes` |
| `services/ai-tools/work-agent-runtime.ts` | intent 의 업무 유형을 노드가 아는 키 뒤에 병합 |
| `__tests__/personal-assistant-memory-continuity.spec.ts` (신규) | ①~⑥ |
| `__tests__/personal-assistant-planning-separation.spec.ts` | 실행 지시 칸 목록에 `knownTaskTypes` 반영 1줄 |

## 4. 검증

| 항목 | 결과 |
|---|---|
| `tsc --noEmit` (api-server) | PASS |
| eslint (변경 파일) | PASS (경고 0) |
| Phase C spec | PASS — ① 레지스트리(Gate 는 코드가 열지 않음 · never 는 Gate 후에도 불가) ② 경계(USER/ORG 쿼리 · binding) ③ 실패 · 대상 없음 ④ **새 노드 연속성 실 runtime harness**(빈 Local 원장 + Cloud 기억 → planner 의 확인된 업무 키) ⑤ Assistant 경로 통합(원문 미사용) ⑥ node 정보 미승격 |
| 회귀 — Phase A/B 4 spec · work-agent 7 spec · work-assistance · work-experience · work-target-discovery · windows 2 · unified-request-http | **16 suites · 184 tests PASS** (`--maxWorkers=2`) |
| production · 실 PC | 하지 않음 — 통합 · 배포 뒤. 실 PC 는 Phase A closure 와 같은 조건(사무실 PC) |

## 5. 완료조건 대응

| # | 조건 | 상태 |
|---|---|---|
| 1 | 특정 PC 의 local.db 에만 의존하지 않고 사용자 Experience 를 이어 씀 | **부분** — 업무 식별(Task type)은 노드 무관. 절차 기억은 Gate 뒤 |
| 2 | 다른 노드에서도 학습이 처음부터 시작되지 않음 | **부분** — 업무 키 연속(테스트 ④). Preferred/Avoid 등은 Gate 뒤 |
| 3 | User / Work Context / Target / Node 경계 명확 | 충족 — 레지스트리 · recall 경계 |
| 4 | 개인 Experience 와 Shared 구분 · 강제 없음 | 충족 — 소유 주체 밖 조회 0 · Shared 미경유 |
| 5 | credential · 세션 · 현재 화면 미승격 | 충족 — never(Gate 후에도) |
| 6 | Phase A/B 를 통해 Assistant 가 Experience 를 판단 근거로 사용 | 충족 — Task → Memory → Planning → intent |
| 7 | 기존 자산 폐기 없음 | 충족 — local.db 무변경 |
| 8 | 민감정보 저장 범위 확대 없음 | 충족 — 새 저장 0 |
| 9 | 테스트 · CHECK | 충족 |
| 10 | 채널 · 노드가 늘어도 Memory 구조 재작성 불필요 | 충족 — 기억은 소유 주체 축으로 조회(노드 · 채널 인자 없음) |

## 7. 통합 · 배포 · production 확인 (2026-10-04)

| 단계 | 결과 |
|---|---|
| 통합 대기 | 다른 세션 #288(Store role registry) CI · #293 Promote(전 서비스) 진행 중 → `WAITING_FOR_INTEGRATION` 으로 순서 대기 후 진행 |
| PR | #295 — CI Gate · API Server Jest 3 shard · CodeQL · Code Quality PASS → merge `66f5ae11e` |
| main CI | `66f5ae11e` CI Pipeline · CodeQL success |
| Delivery | `66f5ae11e` 의 Delivery 는 뒤이어 merge 된 #296 로 `SUPERSEDED` → `bc1a0bcdd`(⊇ 66f5ae11e) Delivery 가 **api DEPLOYED (LEVEL 2)** |
| rollout | `o4o-core-api-03822-quk` traffic 100% · `/health/ready` 200 · migration Job `INCREMENTAL_EXECUTED = 0` |
| production 경로 | Demo 매장 경영자 work 요청 1건(403 · 노드 없음 예상 경로) → 새 revision `assistant plan` 로그: `memorySources = [task_type_history:cloud:read, procedural_memory:node:LEGAL_GATE_PENDING]` · `memoryTaskTypes = 0`(이 계정은 이전 Task type 이력 없음). **Assistant Memory 가 production 에서 노드 무관하게 Cloud Task 이력을 읽고, 절차 기억은 Gate 대기로 표시** |
| 실 PC | 하지 않음 — 이전 Task type 이 있는 계정 · 노드에서 knownTaskKeys 이어짐 관찰은 Phase A closure 와 같은 조건(사무실 PC) |
| 생성된 production 행 | `assistant_tasks` blocked 1행(구조만) — 삭제하지 않음 |

## 8. 다음 작업 제안 (사용자 방향 2026-10-04 반영)

- **Assistant Memory Legal / Data Placement Gate 정렬 — 큰 목표 1개**: 무엇이 실제로 Cloud Assistant Memory 로 필요한가 · USER/ORGANIZATION 소유 차이 · 절대 Cloud 금지 · 종류별 보존 목적 · 기간 · 삭제/탈퇴/조직 이탈 처리 · 처리방침/이용계약 고지 · 재동의 필요성(법률 판단은 선택지로만 상신) · OpenAI 국외 이전 STILL_OPEN 정리. "여러 노드 연속성 필요" ≠ "모든 실행 흔적 Cloud 저장" — 재개 frame · 실행 기록 전체는 별도 판단.
- `knownTaskTypes` 는 **첫 연속성 신호**이며 최종 Memory 모델이 아니다. Assistant 가 판단해야 할 기억(선호 · 업무 맥락 · 검증된 방법 · 교정 · 이번 Task 의 차이)은 Gate 정렬 결과로 모델을 정한다.

## 6. KNOWN GAP

1. **절차 기억의 노드 간 이동 — LEGAL_GATE_PENDING** (§1-1 사용자 결정 4건).
2. 재개 frame 이 노드에 있어 다른 노드로 재개하면 구조가 비는 문제(GAP-CENSUS §I) — run_resume_frame 은 gate_required.
3. `assistant_tasks` · Task 이력 보유기간 미정(Phase A 부터) — 보유기간 정책 :178 과의 격차 유지.
4. OpenAI 처리 vs 국외 이전 고지 격차(V2 §17-3 STILL_OPEN) — 이번 WO 무관 · 무변경.
5. Phase A closure smoke — 별도 PENDING.

`문서 정합: 해당 없음`
