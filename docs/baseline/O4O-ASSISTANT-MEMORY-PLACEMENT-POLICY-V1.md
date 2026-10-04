# O4O-ASSISTANT-MEMORY-PLACEMENT-POLICY-V1

> **상태**: DRAFT — Gate 결정 대기 (§8 사용자 결정 D1~D5). 결정이 기록되면 ACTIVE 로 바꾸고 V2 §17 Gate 통과를 별도 WO 로 기록한다.
> **작성일**: 2026-10-04
> **근거 WO**: `WO-O4O-PERSONAL-ASSISTANT-MEMORY-LEGAL-DATA-PLACEMENT-GATE-V1`
> **상위 정본**: [`O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2`](O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md) §0-1 (P3) · §6 · §9 · §10 · §17 — 이 문서는 V2 §9 · §17 의 **세부 배치 · 보존 · 고지 정책**이다. 충돌하면 V2 가 우선한다.
> **관련 정본**: [`O4O-AUTOMATION-EXPERIENCE-MODEL-V1`](O4O-AUTOMATION-EXPERIENCE-MODEL-V1.md) §15 · §16 · [`O4O-PRIVACY-POLICY-V1.0`](O4O-PRIVACY-POLICY-V1.0.md) · [`O4O-PRIVACY-DATA-RETENTION-POLICY-V1`](O4O-PRIVACY-DATA-RETENTION-POLICY-V1.md) · [`O4O-STORE-OWNER-SERVICE-AGREEMENT-V1.0`](O4O-STORE-OWNER-SERVICE-AGREEMENT-V1.0.md) · [`O4O-ROLE-WORKSPACE-ARCHITECTURE-V1`](O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md)
> **코드 대응**: `apps/api-server/src/services/assistant/memory-ownership.ts` (레지스트리 · `LEGAL_DATA_PROCESSING_GATE='PENDING'`) — 이 문서가 ACTIVE 가 되면 레지스트리를 §4 판정에 맞춘다(§9).
> **성격**: 데이터 배치 정책. 법률 판단을 하지 않는다 — 법률 판단이 필요한 지점은 §8 에 선택지로만 둔다.

---

## 0. 한 문장

**Personal Assistant 는 "노드가 바뀌어도 같은 업무를 같은 방식으로 더 잘 하게 해 주는 최소 구조"만 Cloud 에 기억하고, 실행 흔적 · 원문 · 값 · 실행환경 상태는 기억하지 않는다.**

"여러 노드에서 연속성이 필요하다" 는 "모든 실행 흔적을 Cloud 에 저장한다" 가 아니다.

---

## 1. 판단 순서 (V2 §9-1)

모든 기억 종류는 아래 순서로 판정한다.

```text
① 무엇을 기억해야 하는가   — Assistant 가 다음 판단을 더 잘 하는 데 실제로 쓰이는가 (안 쓰이면 저장하지 않는다)
② 누구에게 귀속되는가      — organization · user · run · node (V2 §9-2)
③ 어디서 필요한가          — 여러 노드 · 채널에서 이어져야 하는가, 그 노드에서만 의미가 있는가
④ 어디에 두는가            — Cloud(소유 주체 전용) · Node · 저장 금지
⑤ 얼마나 두는가            — 구체 기간 또는 종료 사건 (무기한 금지 — 보유기간 정책 §1)
```

---

## 2. 원칙 (이 문서에서 확정 · 사용자 결정 불필요)

기존 정본으로 판정되는 것이다.

1. **최소화** — Cloud 로 이어지는 것은 다음 판단에 쓰이는 **파생 구조**(검증된 방법 · 업무 식별 · 재개 구조)뿐이다. 그것을 만든 원 기록(실행 단계 · 도움/교정 이벤트 · 실패 로그 · 시간 측정)은 노드에 남는다.
2. **구조만** — 원문 · 값 · 화면 글 · 캡처 · prompt 는 어느 위치에도 Assistant Memory 로 저장하지 않는다(V2 §6-2 · §9-3 · D3 · D4).
3. **소유 주체 전용** — Cloud 기억은 그 소유 주체(조직 또는 사용자) 안에서만 읽는다. 다른 사용자 · 조직의 기억을 내 기억으로 복사하지 않는다(P3 · V2 §10).
4. **Shared 는 별도** — 다른 사용자의 경험은 동의 · 익명화 · publish 를 거친 Shared Candidate 로만, 이 문서가 다루지 않는 별도 Gate 에서 다룬다.
5. **실행환경 상태는 기억이 아니다** — credential · 로그인 세션 · 쿠키 · 현재 화면 · 로컬 파일 경로 · PC 이름 · 계정 식별자는 Gate 와 무관하게 Cloud Memory 가 될 수 없다.
6. **사설 시스템은 보수적으로** — 공개 사이트가 아닌 대상(사내 · 사설 프로그램, EXP §16 internal target)의 화면 구조는 판정이 애매하므로 노드에 둔다(EXP §16 "애매하면 LOCAL_ONLY").
7. **조직 업무의 기억은 조직 것** — ORGANIZATION 소유 Task 에서 생긴 절차 기억은 조직에 귀속되고 직원이 떠나도 조직에 남는다. 개인 선호 · 개인 교정은 사용자를 따라간다(V2 §9-2 · ROLE-WORKSPACE "My Store 는 Store 소유").
8. **소유 범위 ≠ 절차** — 조직 기억이 조직 구성원에게 고정 절차를 강제하지 않는다. 조직 기억은 그 조직 Task 의 판단 근거다(P3 · V2 §0-1-6).

---

## 3. Assistant 가 실제로 기억해야 하는 것 (① 필요성)

| 기억 | Assistant 가 쓰는 곳 | 필요 |
|---|---|---|
| Task 기록(업무 인스턴스 · 상태 · 대상 · 업무 유형) | Task 이어받기 · 같은 업무 키 · 완료 판정 | 필요 |
| 업무 유형 식별(task type key) | 노드가 바뀌어도 같은 업무를 같은 키로 — 경험 조회 키 | 필요 |
| 검증된 방법(Preferred / Avoid · Task type × Target × Stage) | 같은 업무를 같은 방식으로 · 피할 방법 회피 — **연속성의 핵심** | 필요 |
| 검증된 절차(stage 경로 · semantic 대상 · slot 종류 · 성공 판정) | Skill 실행 · 결정적 재생 | 필요 (Skill 단계) |
| 재개 구조(run 의 task · stage · slot 종류 · 전략) | 다른 노드 · 채널에서 질문 뒤 이어가기 | 필요 (run 동안만) |
| 개인 선호(명시적 · 구조화) | 같은 사용자의 기본 선택 | 필요 (구조화 형태가 생기면) |
| 도움 · 교정 이벤트(구조화) | 검증된 방법을 **만드는 재료** — 판단 시점에는 파생된 방법만 쓴다 | 노드에서 충분 |
| 실행 단계 · locator trace · 실패 로그 · 시간 측정 | 실행 개선 · 장래 Shared 집계 재료 | 노드에서 충분 |
| 요청 원문 요약(goal_summary) | 판단에 쓰이지 않음(원문은 실행 본체로만 흐름) | **불필요** |
| slot 값 · 사용자 답변 원문 · 화면 글 · 캡처 | 그 run 의 실행에만 | **저장 불필요** |

---

## 4. 종류별 판정 (②~④)

| # | 기억 | 소유 | 배치 | Gate | 레지스트리(`memory-ownership.ts`) 대응 |
|---|---|---|---|---|---|
| M1 | Task 기록 `assistant_tasks` | 조직 또는 사용자 | **Cloud** (이미) | 저장은 Phase A 로 존재 · **보존기간 결정 필요(D2)** | assistant_task · allowed |
| M2 | 업무 유형 이력(Task 기록의 task_type_key) | 조직 또는 사용자 | **Cloud** (읽기) | 새 저장 없음 · 보존은 M1 을 따름 | task_type_history · allowed |
| M3 | 검증된 방법 Preferred / Avoid — **공개 사이트 대상** | 조직 또는 사용자 | **Cloud 후보** | **D1 승인 필요** | procedural_memory · gate_required |
| M4 | 검증된 절차(Procedure · Workflow Candidate 의 값 없는 단계) — 공개 사이트 대상 | 조직 또는 사용자 | **Cloud 후보** | **D1 승인 필요** | procedural_memory · gate_required |
| M5 | 재개 구조(run resume frame) | run | **Cloud 후보 · 단기** | **D1 승인 필요** · 보존 = run 종료 사건 | run_resume_frame · gate_required |
| M6 | 구조화된 개인 선호 | 사용자 | Cloud 후보(형태가 생길 때) | 그때 D1 범위에 포함 | (미구현 — 현재 분류 라벨뿐) |
| M7 | 도움 · 교정 이벤트(구조화) | 사용자 · 조직 | **Node** (최소화 §2-1) | Gate 대상 아님 — 이동하지 않음 | assistant_experience → **node 유지로 정렬** |
| M8 | 실행 단계 · trace · 실패 · 시간 측정 | 조직 또는 사용자 | **Node** (최소화) · 장래 Shared 집계는 별도 Gate | 이동하지 않음 | execution_experience → **node 유지로 정렬** |
| M9 | 사설 시스템 대상의 M3 · M4 | 조직 또는 사용자 | **Node** (§2-6) | 이동하지 않음 | procedural_memory 의 대상 조건으로 구현 |
| M10 | 요청 원문 요약 `goal_summary` | 사용자 | **Cloud 금지** · Node 에서도 축소 대상(D3 어긋남) | — | request_summary → **never 로 정렬** |
| M11 | slot 값 | run | run 동안만 · 종료 시 삭제 | — | slot_values · never |
| M12 | 실행환경 상태(credential · 세션 · 쿠키 · 현재 화면 · 로컬 경로 · PC 이름) | node | Node | — | node_environment · never |
| M13 | 원문(사용자 답변 · 교정 문장 · 화면 텍스트 · 캡처 · prompt · 비밀번호 · OTP · 환자/고객 정보) | — | **어디에도 저장 금지** | — | raw_content · never |
| — | 업무 데이터(재고 · 판매 · 가격 · 주문) | 조직 | 이 문서 범위 밖 — V2 §6-3 · §16 업무 데이터 영역 | — | — |
| — | Shared Candidate · Digest | (공유) | 이 문서 범위 밖 — 동의 · 익명화 · publish 별도 Gate | — | — |

정리하면 **Gate 로 새로 열 대상은 M3 · M4 · M5 (+ 장래 M6)** 뿐이다. 나머지는 이미 Cloud 이거나, 노드에 남거나, 저장하지 않는다.

---

## 5. 보존 · 삭제 원칙

### 5-1. 기본 원칙 (확정)

1. 무기한 금지 — 각 종류는 구체 기간 또는 종료 사건을 가진다(보유기간 정책 §1 · §16). 기간 값은 D2 에서 정한다.
2. **소유 주체가 사라지면 그 기억도 사라진다** — 사용자 삭제 → 사용자 소유 기억 삭제 · 조직 종료 → 조직 소유 기억 삭제(현재 `assistant_tasks` FK `ON DELETE CASCADE` 와 같은 방향).
3. **조직 이탈은 이동이 아니다** — 구성원이 조직을 떠나면 조직 기억은 조직에 남고, 그 사람의 개인 기억(USER 소유)은 그 사람에게 남는다. 조직 기억이 개인에게, 개인 기억이 조직에 옮겨지지 않는다.
4. **재개 구조는 run 과 함께 끝난다** — run 이 종결(completed · taken_over · expired)되면 삭제한다.
5. **쓰이지 않는 방법은 사라진다** — 검증된 방법 · 절차는 일정 기간 다시 쓰이지 않으면 만료한다(값은 D2).

### 5-2. 현재 코드 · 운영과의 대응 (사실)

| 사건 | 현재 동작 | 이 정책과의 관계 |
|---|---|---|
| 사용자 자체 탈퇴 | **경로 없음**(보유기간 정책 §9 · §15) | 탈퇴 시 삭제 원칙은 관리자 삭제 경로로만 집행된다 |
| 관리자 사용자 삭제 | hard delete 시도 → FK 막히면 `isActive=false` 로 fallback | hard delete 면 `assistant_tasks` CASCADE · fallback 이면 **행이 남는다** — 비활성 사용자 기억 처리 규칙 필요(구현 범위 §9) |
| 서비스 회원 탈퇴(`withdrawMembership`) | membership withdrawn · users 유지 | 사용자 기억은 사용자에 귀속 — 서비스 탈퇴만으로는 지우지 않는다(사용자가 남아 있으므로) |
| 조직 구성원 이탈 | `organization_members.left_at` (member 는 행 삭제) | 원칙 3 과 일치 — 조직 기억 유지 |
| 매장 경영자 해지 | case flow → 종료 +7일 purge · 조직 익명화 | 조직 소유 Assistant 기억은 **purge 대상 목록에 들어가야 한다**(구현 범위 §9) |
| Local `local.db` | 보존 · 삭제 없음 · `goal_summary` 원문 무기한 | M10 축소 · 노드 보존 규칙은 구현 범위(§9) |

---

## 6. 외부 처리(Processing) — 저장과 별개

V2 §13 원칙대로 저장 위치와 처리 위치는 다른 질문이다.

| 사실 (2026-10-04 코드) | 처리방침 대응 |
|---|---|
| Work Agent 의 화면 작업(`screen` modality)은 **OpenAI**(`gpt-6-astra`)로 간다. planner 호출마다 요청 원문 · 사용자 답변 · 입력한 값 · 화면 요소 이름/글 · 읽은 표(≤600자) · (시각 모드) 화면 캡처가 전송된다 | 처리방침 제4조 · 제5조 · 제6조에 **OpenAI 없음**(Gemini · Gmail 만) — V2 §17-3 `STILL_OPEN` |
| 그 밖의 AI 기능은 Gemini | 제5조 Gemini 고지와 일치 |

이 격차는 **Memory 배치와 무관하게 이미 존재**한다. Memory Gate 를 열어도 닫히지 않으므로 D5 로 따로 결정한다.

---

## 7. 현재 문서와의 Gap

| 문서 | Gap | 성격 |
|---|---|---|
| 개인정보처리방침 제2조 | Assistant 업무 기록(M1~M5)에 해당하는 수집 항목 · 목적 · 보유기간 없음 | Gate 통과 전 개정 필요(D3) |
| 개인정보처리방침 제4조 · 제5조 · 제6조 | OpenAI 미고지 | 기존 격차(D5) |
| 보유기간 정책 §15 · §16 | `assistant_tasks` 행 없음 — §16 "행 추가 전 무기한 보관 금지" 와 어긋남(Phase A 부터) | **M1 은 Gate 와 무관하게 이미 격차** — D2 로 기간을 정해 행을 추가해야 한다 |
| 매장 경영자 이용계약 별표 | 조직 소유 Assistant 기억이 반환 분류 A~F 어디에도 없음 · 제11조 ⑤⑥ "AI 학습 미사용" 과의 관계 미기재 | D4 |
| 처리방침 제15조 · 동의 기록 | 재동의가 필요하면 쓸 수단은 이미 있다(`user_policy_acceptances` 의 `acknowledgement` · `consent` · 428 재동의 게이트 선례) | 수단 있음 · 필요 여부는 법률 판단(D3) |

---

## 8. 사용자 결정 (Gate 를 열기 위해 필요한 것만)

### D1. Cloud 배치 승인 범위

| 선택지 | 내용 | 영향 |
|---|---|---|
| **A (권장)** | M3 · M4(공개 사이트 대상 검증된 방법 · 절차) + M5(재개 구조, run 동안만)를 소유 주체 전용 Cloud 에 둔다 | 노드 · 채널이 바뀌어도 검증된 방법과 진행 중 업무가 이어진다. 원 기록(M7 · M8)은 노드에 남아 Cloud 저장량 최소 |
| B | A 에서 M5 제외 | 진행 중 질문을 다른 노드에서 이어가지 못한다(GAP-CENSUS §I 잔존) |
| C | 승인하지 않음 | 연속성은 Phase C 의 업무 키 수준에 머문다 |

### D2. 보존기간 (무기한 금지 — 구체 값 필요)

| 대상 | 선택지 예시 | 비고 |
|---|---|---|
| M1 Task 기록 | ① 종결 후 1년 ② 종결 후 2년 ③ 소유 주체 존속 기간 | 보유기간 정책의 다른 운영 기록(접속 · AI 사용 1년)과 맞추면 ① |
| M3 · M4 방법 · 절차 | ① 소유 주체 존속 + **마지막 사용 후 1년 미사용 시 만료** ② 마지막 사용 후 2년 ③ 소유 주체 존속 기간 | 쓰이지 않는 방법이 쌓이지 않게 하려면 ① |
| M5 재개 구조 | ① run 종결 즉시 ② run 종결 후 24시간 | coordination 만료(30분 · 24h 정리)와 같은 축 |

### D3. 처리방침 개정 · 고지 방식

| 선택지 | 내용 |
|---|---|
| 개정 내용 (공통) | 제2조에 "업무 비서 기록(구조 정보 — 업무 유형 · 검증된 방법 · 진행 상태, 원문 · 입력값 미포함)" 항목 · 목적 · 보유기간 추가 / 제7조 파기 · 제15조 시행일 |
| 고지 ① | 개정 공지 후 시행(사전 고지 기간을 두고 게시) |
| 고지 ② | 개정 + 기존 사용자 확인(`acknowledgement`) 수집 |
| 고지 ③ | 개정 + 동의(`consent`) 수집 |

어느 것이 법적으로 필요한지는 **법률 판단**이다 — 이 문서는 정하지 않는다. 수단(재동의 게이트)은 이미 있다.

### D4. 매장 경영자 이용계약 — 조직 소유 기억의 분류

| 선택지 | 내용 |
|---|---|
| ① | "매장이 만든 자료" 류(반환 · 파기 대상)로 분류 — 해지 시 반환 요청 대상 + purge |
| ② | 운영기록 류(F, 반환 대상 아님)로 분류 + 해지 purge 대상 |

어느 쪽이든 **해지 purge 대상에는 포함**한다(§5-2). 제11조 ⑤⑥ 과의 관계("자체 AI 모델 학습에 이용하지 않음")는 이 기억이 모델 학습이 아니라 그 매장의 판단 근거라는 점을 기재할지 결정한다.

### D5. OpenAI 처리 (기존 STILL_OPEN · Memory 와 별개)

| 선택지 | 내용 |
|---|---|
| ① | 처리방침 제4조 · 제5조 · 제6조에 OpenAI(국외 이전 · 이전 항목 · 국가 · 거부 방법) 추가 |
| ② | 화면 작업 provider 를 Gemini 로 되돌려 고지 범위 안으로 |
| ③ | ① 이전까지 화면 작업 기능을 제한 |

---

## 9. Gate 통과 후 구현 범위 (재조사 불필요)

D1~D4 가 기록되면 한 WO 로 진행한다.

1. **Gate 기록** — 이 문서 ACTIVE · V2 §17 통과 기록 · `LEGAL_DATA_PROCESSING_GATE = 'PASSED'` · 레지스트리 정렬(assistant_experience · execution_experience = node 유지, request_summary = never, procedural_memory 의 사설 대상 제외 조건).
2. **Cloud 저장소(migration)** — 소유 주체 전용 검증 방법 · 절차 저장(organization_id 또는 requested_by_user_id 경계 · Task type × Target × Stage · strategy op · 검증 횟수 · 마지막 사용 시각) · 재개 구조(run_id · task · stage · slot 종류 · 전략 · 종결 시 삭제). 원문 · 값 칼럼 없음.
3. **채우는 경로** — 서버가 이미 만드는 구조화 도움 · 교정 이벤트(원문 없음)에서 검증된 방법을 Cloud 에 파생 저장. 노드 원장을 read-back · 복제하지 않는다.
4. **읽는 경로** — Assistant Memory(Phase C `recallAssistantMemory`)에 검증 방법 · 재개 구조 recall 추가 → ExecutionIntent → Execution 은 노드 원장과 합쳐 현재 화면으로 재검증(P3 · 강제 아님).
5. **보존 집행** — 보유기간 정책에 행 추가 · `privacy-retention.service` 에 대상 추가(D2 값) · 비활성 사용자 fallback 처리 · 매장 해지 purge 목록에 조직 기억 추가.
6. **노드 정리** — `goal_summary` 축소(D3 어긋남 해소) · Local 원장 보존 규칙.
7. **문서** — 처리방침 · 보유기간 정책 · 이용계약 개정(D3 · D4 결과) · 필요 시 재동의 게이트.

D5 는 위와 독립이다(먼저 · 나중 무관).

---

## 10. 계속 금지 (Gate 통과와 무관)

- 요청 원문 · 사용자 답변 · 교정 문장 · slot 값 · 화면 글 · 캡처 · prompt 의 Assistant Memory 저장
- credential · 로그인 세션 · 쿠키 · 현재 화면 · 로컬 파일 경로 · PC 이름의 Cloud 저장
- 다른 사용자 · 조직의 기억을 내 기억으로 복사 · 다수 성공 경로의 표준 Workflow 화(P3)
- 노드 원장 전체의 Cloud 복제 · 동기화
- 사설 시스템 대상의 화면 구조를 Cloud 기억으로(별도 결정 전)
