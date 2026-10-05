# O4O-ASSISTANT-MEMORY-PLACEMENT-POLICY-V1

> **상태**: DRAFT — **D1 · D2 · D4 결정됨 · D3 · D5 법률 확인 대기** (§8-1, 2026-10-04 사용자 결정). **Gate 의미 전환(2026-10-04 사용자 확정)**: V2 §17 은 개발 선행조건이 아니라 **실사용 확대 전 Compliance Gate** 다. §9 구현은 개발 단계에서 진행했고(Cloud Continuity), D3 · D5 의 법적 절차는 정식 운영 · 실사용 확대 전에 확인한다.
> **작성일**: 2026-10-04
> **근거 WO**: `WO-O4O-PERSONAL-ASSISTANT-MEMORY-LEGAL-DATA-PLACEMENT-GATE-V1`
> **상위 정본**: [`O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2`](O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md) §0-1 (P3) · §6 · §9 · §10 · §17 — 이 문서는 V2 §9 · §17 의 **세부 배치 · 보존 · 고지 정책**이다. 충돌하면 V2 가 우선한다.
> **관련 정본**: [`O4O-AUTOMATION-EXPERIENCE-MODEL-V1`](O4O-AUTOMATION-EXPERIENCE-MODEL-V1.md) §15 · §16 · [`O4O-PRIVACY-POLICY-V1.0`](O4O-PRIVACY-POLICY-V1.0.md) · [`O4O-PRIVACY-DATA-RETENTION-POLICY-V1`](O4O-PRIVACY-DATA-RETENTION-POLICY-V1.md) · [`O4O-STORE-OWNER-SERVICE-AGREEMENT-V1.0`](O4O-STORE-OWNER-SERVICE-AGREEMENT-V1.0.md) · [`O4O-ROLE-WORKSPACE-ARCHITECTURE-V1`](O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md)
> **코드 대응**: `apps/api-server/src/services/assistant/memory-ownership.ts` (레지스트리 — §4 판정과 정렬됨 · `COMPLIANCE_GATE='PENDING'` 은 점검 상태 기록일 뿐 배치 판정에 쓰지 않음) · `procedural-memory-store.ts` · `assistant-memory.ts`.
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
9. **Provider 독립** — 모든 기억 종류는 특정 AI Provider · 모델과 무관한 구조다. Provider 별 prompt · conversation · thread id 를 기억으로 두지 않고, Provider 교체가 기억을 무효화하지 않는다(V2 §8-1-a).

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

> **"Node 에 남는다" 의 뜻 (2026-10-05 · PC 독립 정렬)** — M7 · M8 · M9 를 노드에 두는 것은 **원 기록의 보관 위치**를 정한 것이지 기억의 경계를 정한 것이 아니다. 소유는 여전히 사용자 · 조직(Work Context)이고, Assistant 가 판단에 쓰는 경험은 그 원 기록에서 파생돼 소유 주체 전용 Cloud 에 있는 M3 · M5 다. 그래서 노드가 바뀌어도 "그 PC 의 자동화" 가 따로 생기지 않고 같은 Assistant 가 같은 경험으로 일한다. 노드별 원 기록은 실행할 때 그 노드의 현재 화면 재검증 재료로만 더해진다. **예외는 M9** — 사설 시스템 · Windows 앱 대상의 절차 기억(M3 · M4)은 §2-6 에 따라 노드에만 있으므로(Cloud 절차 기억은 공개 사이트 대상만) 다른 노드에서는 그 대상의 절차를 Discovery 로 다시 찾는다. 이때도 Assistant · Task · 업무 식별은 이어지며 "다른 Assistant" 가 되지 않는다. 경험을 가진 노드를 우선할지(node affinity)는 노드 선택 설계(V2 §18 단계 D)의 몫이다. 특정 PC 의 `local.db` 는 Assistant Experience 의 기준 원장이 아니다([V2](O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md) §3-1 · §9 · §11-1).

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

## 6. AI 처리 — 저장과 별개 · Provider 와 무관한 구조

저장 위치(§4)와 처리는 다른 질문이고, 처리는 다시 세 축으로 나눈다(V2 §8-1-a-5).

| 축 | 질문 | 정하는 곳 |
|---|---|---|
| ① 전달 데이터 | AI 에 무엇을 보내는가 — 기능별 데이터 범주(요청 문장 · 입력값 · 화면 요소 글 · 읽은 표 · 화면 캡처 · 첨부 등) | 기능 설계 · 이 문서 |
| ② 처리자 | 어느 Provider · 운영 주체가 처리하는가(상용 AI · O4O 운영 오픈소스 · 자체 호스팅 · 사용자 노드 Local · AI 없음) | 설정 · 운영(교체 가능) |
| ③ 처리 위치 | 어디서 처리되는가 — 국내 Cloud · 국외 Cloud · O4O 자체 호스팅 · 사용자 노드 | 처리자 선택에 따라 결정 |

### 6-1. Provider-neutral 고지 원칙

1. 처리방침 · 고지는 **① 전달 데이터 범주와 ③ 처리 위치 유형을 기준**으로 쓰고, ② 현재 처리자는 교체 가능한 목록으로 둔다. 고지 구조가 특정 Provider 를 전제로 하지 않게 한다.
2. **처리자 · 처리 위치 · 전달 데이터 범주가 바뀌면 변경 점검을 한다** — 새 처리자인가(위탁) · 국외로 나가는가(국외 이전) · 전달 범주가 넓어지는가 · 사용자 노드 안에서 끝나는가(외부 전송 없음). 어떤 고지 · 동의 절차가 필요한지는 그때의 법적 판단이다(이 문서는 판단 구조만 둔다).
3. 사용자 노드의 Local / Private AI 나 Deterministic Executor 로 처리하면 ③ 이 노드이므로 외부 전송이 없다 — 같은 업무라도 처리자에 따라 고지 대상이 달라질 수 있다.
4. 처리자 교체는 Memory · Experience 의 배치(§4)를 바꾸지 않는다. 기억은 Provider 와 무관한 구조이므로 그대로 이어진다.

### 6-2. 현재 실제 처리자 (2026-10-04 코드 · 시점 기록)

| 사실 | 처리방침 대응 |
|---|---|
| Work Agent 의 화면 작업(`screen` modality)은 **OpenAI**(`gpt-6-astra`)로 간다. planner 호출마다 요청 원문 · 사용자 답변 · 입력한 값 · 화면 요소 이름/글 · 읽은 표(≤600자) · (시각 모드) 화면 캡처가 전송된다 | 처리방침 제4조 · 제5조 · 제6조에 **OpenAI 없음**(Gemini · Gmail 만) — V2 §17-3 `STILL_OPEN` |
| 그 밖의 AI 기능은 Gemini | 제5조 Gemini 고지와 일치 |

OpenAI 격차는 **Memory 배치와 무관하게 이미 존재**하는 현재 처리자의 미해결 항목이다. §6-1 원칙 아래에서 해소한다(D5). OpenAI 는 현재 처리자일 뿐 장기 구조의 전제가 아니다.

---

## 7. 현재 문서와의 Gap

| 문서 | Gap | 성격 |
|---|---|---|
| 개인정보처리방침 제2조 | Assistant 업무 기록(M1~M5)에 해당하는 수집 항목 · 목적 · 보유기간 없음 | Gate 통과 전 개정 필요(D3) |
| 개인정보처리방침 제4조 · 제5조 · 제6조 | 현재 실제 처리자 OpenAI 미고지 · 고지 구조가 특정 Provider(Gemini) 이름 중심 — §6-1 처리 위치 · 데이터 범주 기준이 아님 | 기존 격차(D5) |
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

### D5. AI Provider · 처리 위치 변경을 전제로 한 데이터 처리 · 고지 원칙 (Memory 와 별개)

| 항목 | 내용 |
|---|---|
| 원칙 | §6-1 Provider-neutral 고지 원칙을 채택한다 — 고지는 전달 데이터 범주 · 처리 위치 유형 기준, 현재 처리자는 교체 가능 목록, 변경 시 점검 |
| 현재 미해결 항목 | 현재 실제 처리자 **OpenAI** 를 처리방침 · 국외 처리 고지에 반영 — 실제 전송 항목 census → 현 처리방침 대조 → §6-1 구조로 고지 문안 → 법적 절차 판단 |
| 하지 않는 것 | 고지 격차를 모델 교체(Gemini 회귀)나 기능 제한으로 우회하는 것을 기본안으로 삼지 않는다 · 정본 · Memory 구조를 OpenAI 에 묶지 않는다 |

---

### 8-1. 결정 기록 (2026-10-04 사용자)

| # | 결정 | 상태 |
|---|---|---|
| **D1** | **A — M3 · M4 · M5** 를 소유 주체 전용 Cloud 에 둔다 | 결정 |
| **D2** | M1 Task 기록 = **종결 후 1년** · M3/M4 = **마지막 사용 · 검증 후 1년 미사용 시 만료**(먼저 신뢰 해제 — Assistant 가 더 이상 근거로 쓰지 않음 — 와 물리 삭제를 구분한다) · M5 재개 구조 = **Task/run 종결 시 삭제**(종결되지 않은 중단 상태는 유지) · 소유 주체 삭제 · 조직 해지 시 해당 기억 purge 유지 | 결정 |
| **D3** | **처리방침 개정은 필요하다(방향 확정).** 공지 · acknowledgement · consent 중 어느 절차가 필요한지는 실제 개정 내용과 현행 법적 요구를 확인한 뒤 정한다 | **법률 확인 대기 — Gate 조건** |
| **D4** | 조직 소유 Assistant Memory = **운영기록(반환 대상 아님)** · 단 조직 해지 시 purge 대상. "반환 대상 아님 ≠ O4O 가 계속 보유" | 결정 |
| **D5** | **AI Provider · 처리 위치 변경을 전제로 한 Provider-neutral 처리 · 고지 원칙(§6-1)을 채택**하고, 그 아래 현재 실제 처리자 OpenAI 의 고지 격차를 해소한다(2026-10-04 수정 — 종전 "OpenAI 고지 여부" 에서 재정의). Gemini 회귀 · 화면 작업 제한은 기본안이 아니다. 순서: 실제 전송 항목 census → 현 처리방침 대조 → §6-1 구조로 문안 → 법적 절차 판단 | **원칙 결정 · OpenAI 항목 법률 확인 대기** |

**Gate 상태**: Compliance Gate = PENDING(실사용 확대 전 점검). 개발 단계에서는 D1 · D2 · D4 를 **설계 기준**으로 적용해 구현하고(법적 확정값으로 다루지 않음), D3 · D5 의 법적 절차(고지 방식 · 재동의 · 보존 연수 확정 · Provider 고지 문구)는 실사용 확대 전에 그 시점의 실제 데이터 흐름으로 정한다. (2026-10-04 정정 — 종전 "Gate PENDING 동안 Cloud Memory 저장 구현 금지" 를 대체)

## 9. 구현 범위 (재조사 불필요)

개발 단계에서 한 WO 로 진행한다(Gate 의미 전환 후). 구현 상태(2026-10-04 · `WO-O4O-PERSONAL-ASSISTANT-MEMORY-CLOUD-CONTINUITY-V1`):

| # | 상태 |
|---|---|
| 1 | **DONE(정렬)** — 레지스트리 §4 정렬(assistant_experience · execution_experience = node · request_summary = never · 절차 기억은 공개 사이트 대상만 Cloud). Gate 는 Compliance Gate 로 재정의(`COMPLIANCE_GATE`) — 이 문서 ACTIVE 전환은 D3 · D5 확인 후 |
| 2 | **DONE** — `assistant_procedural_patterns`(M3 · 소유 주체 CHECK · 부분 unique · CASCADE) · `assistant_run_frames`(M5 · run · task · user CASCADE). 원문 · 값 · Provider 칼럼 없음 |
| 3 | **DONE** — 서버가 만든 구조화 도움 · 교정 이벤트에서 노드와 같은 규칙으로 파생(`deriveVerifiedPatterns`) · 노드 원장 read-back 없음 |
| 4 | **DONE** — `recallAssistantMemory` 가 검증 방법 · 재개 구조를 돌려주고 `ExecutionIntent.memory` 로 전달 · Execution 이 노드 원장과 합쳐 재검증(강제 아님). M4 의 결정적 재생 단계(Workflow Candidate)는 노드에 남음 — KNOWN GAP |
| 5 | **PARTIAL** — 1년 미사용 신뢰 해제는 recall 조건으로 집행 · 재개 구조는 종결 시 삭제 + coordination CASCADE · 소유 주체 삭제 CASCADE. `privacy-retention.service` · 보유기간 정책 행 · 비활성 사용자 fallback · 매장 해지 purge 목록은 Compliance Gate 항목으로 남김 |
| 6 · 7 | **OPEN** — 노드 정리 · 법정 문서 개정은 Compliance Gate 항목 |
| 8 | **DONE** — Provider 고유 칼럼 없음 · 수행자를 바꿔도 같은 기억이 recall 되는 테스트 |

원래 항목:

1. **Gate 기록** — 이 문서 ACTIVE · V2 §17 통과 기록 · `LEGAL_DATA_PROCESSING_GATE = 'PASSED'` · 레지스트리 정렬(assistant_experience · execution_experience = node 유지, request_summary = never, procedural_memory 의 사설 대상 제외 조건).
2. **Cloud 저장소(migration)** — 소유 주체 전용 검증 방법 · 절차 저장(organization_id 또는 requested_by_user_id 경계 · Task type × Target × Stage · strategy op · 검증 횟수 · 마지막 사용 시각) · 재개 구조(run_id · task · stage · slot 종류 · 전략 · 종결 시 삭제). 원문 · 값 칼럼 없음.
3. **채우는 경로** — 서버가 이미 만드는 구조화 도움 · 교정 이벤트(원문 없음)에서 검증된 방법을 Cloud 에 파생 저장. 노드 원장을 read-back · 복제하지 않는다.
4. **읽는 경로** — Assistant Memory(Phase C `recallAssistantMemory`)에 검증 방법 · 재개 구조 recall 추가 → ExecutionIntent → Execution 은 노드 원장과 합쳐 현재 화면으로 재검증(P3 · 강제 아님).
5. **보존 집행** — 보유기간 정책에 행 추가 · `privacy-retention.service` 에 대상 추가(D2 값) · 비활성 사용자 fallback 처리 · 매장 해지 purge 목록에 조직 기억 추가.
6. **노드 정리** — `goal_summary` 축소(D3 어긋남 해소) · Local 원장 보존 규칙.
7. **문서** — 처리방침 · 보유기간 정책 · 이용계약 개정(D3 · D4 결과) · AI 처리 고지를 §6-1 구조(데이터 범주 · 처리 위치 · 교체 가능 처리자 목록)로 정렬(D5) · 필요 시 재동의 게이트.
8. **Provider 독립 확인** — 새 저장소에 Provider · 모델 고유 칼럼(prompt · conversation · thread id) 없음 · Provider 를 바꿔도 같은 기억이 recall 되는 테스트.

D5 는 위와 독립이다(먼저 · 나중 무관).

---

## 10. 계속 금지 (Gate 통과와 무관)

- 요청 원문 · 사용자 답변 · 교정 문장 · slot 값 · 화면 글 · 캡처 · prompt 의 Assistant Memory 저장
- credential · 로그인 세션 · 쿠키 · 현재 화면 · 로컬 파일 경로 · PC 이름의 Cloud 저장
- 다른 사용자 · 조직의 기억을 내 기억으로 복사 · 다수 성공 경로의 표준 Workflow 화(P3)
- 노드 원장 전체의 Cloud 복제 · 동기화
- 사설 시스템 대상의 화면 구조를 Cloud 기억으로(별도 결정 전)
- 특정 AI Provider · 모델의 prompt · conversation · thread 를 Assistant Memory 로 저장 · Provider 별로 Memory · Skill 을 따로 만드는 것
