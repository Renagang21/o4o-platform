# O4O-AUTOMATION-AGENT-ARCHITECTURE-V1

> **상태**: ACTIVE — O4O 자동화 아키텍처 정본 (`CANONICAL-INDEX` §6)
> **작성일**: 2026-10-01 · **최종 갱신**: 2026-10-01 (사용자 검토 반영 · DRAFT → ACTIVE · §5-1 질의형 recall 명확화 · §10-2 갱신 · `WO-O4O-AI-AUTOMATION-PRINCIPLES-USER-CORRECTION-KNOWLEDGE-AND-MODEL-ROUTING-ALIGNMENT-V1`: §2-3 User Convenience First · §7-2-5 · §8 항목 6 RPA 관계 · §10-1 Correction · Knowledge Watch 위치)
> **근거 WO/IR**: [`IR-O4O-AUTOMATION-AGENT-ARCHITECTURE-REALIGNMENT-V1`](../investigations/IR-O4O-AUTOMATION-AGENT-ARCHITECTURE-REALIGNMENT-V1.md) (작성) · `WO-O4O-AUTOMATION-AGENT-ARCHITECTURE-ACTIVATION-V1` (사용자 검토 확정 · 활성화, 2026-10-01)
> **상위 정본**: [`O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1`](O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1.md) — 이 문서는 그 원칙을 **대체하지 않고**, 원칙이 요구하는 시스템을 **어떤 계층으로 만드는가**를 고정한다. EVOLUTION = 왜 그렇게 발전해야 하는가 · 이 문서 = 그것을 어떤 계층으로 구현하는가. 둘이 충돌하면 EVOLUTION-PRINCIPLES 가 우선한다.
> **적용 범위**: O4O 의 모든 반복 업무 자동화 — 약국 · 매장 · 공급자 · 운영자 · 그 밖의 참여 주체. 특정 사이트(health.kr 등)·특정 프로그램·특정 모델에 묶이지 않는다.

---

## 0. 한 문장

**O4O Automation Agent 는 "업무를 수행하면서 경험을 얻고, 그 경험으로 같은 업무를 점점 더 싸고 확실하게 수행하게 되는 시스템" 이다.** 실행 도구는 손이고, 경험이 자산이다.

---

## 1. Vision

1. 목표는 **사용자의 업무 시간 절감**이다. 완전 자동화는 목표가 아니다(EVOLUTION §3).
2. 처음 보는 업무도 받아서 끝까지 해 본다. 모르면 묻는다. 해낸 방법은 남긴다.
3. 같은 업무를 반복할수록 **성공률은 오르고, 비용·시간·사용자 개입은 내려간다.**
4. 한 사용자의 경험이 (허용된 범위 안에서) 다른 사용자의 첫 시도를 쉽게 만든다.
5. 이 구조는 업무 영역과 무관하다. 약국 의약품 검색, 공급자 제품 등록, 매장 콘텐츠 정리, 운영자 검수 모두 같은 계층을 지난다. **health.kr 검색은 이 아키텍처를 검증하는 사례 하나일 뿐이다.**

### 1-1. 6계층

```text
┌──────────────────────────────────────────────────────────────┐
│ 1 Request / Intent      무슨 업무인가 · 어디서 · 무엇을 입력하나   │
├──────────────────────────────────────────────────────────────┤
│ 2 Discovery / Reasoning 처음이거나 불확실하면 강하게 생각한다      │  ← 두뇌
│ 3 Assistance / Knowledge 모르면 사람·매뉴얼에서 배운다            │
├──────────────────────────────────────────────────────────────┤
│ 4 Experience / Learning 무엇이 일어났고 무엇이 통했는가를 남긴다  │  ← 자산
│ 5 Promotion / Cost      믿을 만해진 경험을 더 싼 수행자에게 넘긴다 │
├──────────────────────────────────────────────────────────────┤
│ 6 Execution             화면·API·파일을 실제로 조작한다           │  ← 손
└──────────────────────────────────────────────────────────────┘
```

계층 4 가 중심이다. 2·3 은 경험을 **만들고**, 5 는 경험을 **소비해** 비용을 낮추고, 6 은 어느 수준에서든 **같은 손**으로 실행한다.

### 1-2. 역할 이름 (model-agnostic)

| 역할 | 정의 | 고정하지 않는 것 |
|---|---|---|
| **Strong Discovery Agent** | 처음 보는 업무·대상, 불확실한 상황에서 관찰·추론·계획·질문을 가장 잘 하는 수행자 | 특정 모델명·공급사. 시점마다 가장 적합한 것을 쓴다 |
| **Lower-cost Reasoning Agent** | 검증된 절차를 따라가며 작은 판단(값 확인·분기 선택·이상 감지)만 하는 저비용 수행자 | 모델명 |
| **Deterministic Executor** | 판단 없이 확정된 절차를 수행하는 실행기 (DOM · UIA · API · WebMCP · RPA · Script) | 기술 종류 |

- 세 역할은 **호출 방식이 API/코드**다. O4O 가 외부 생성형 AI 서비스의 **사용자 화면을 조작해** Strong Agent 로 삼는 구조는 쓰지 않는다.
- 모델을 바꿔도 이 문서는 바뀌지 않는다. 모델 선택은 설정·운영의 문제다.

---

## 2. Strong-AI-First Discovery

1. **새 업무, 처음 보는 대상, 불확실한 상황은 Strong Discovery Agent 에서 시작한다.** 싼 수행자로 먼저 해 보고 실패하면 올리는 순서를 기본으로 하지 않는다 — 첫 시도의 실패는 비용이 아니라 잃어버린 경험이다.
2. "새로움"은 경험(계층 4)이 판정한다: 같은 업무 유형 × 같은 대상에 신뢰할 만한 경험이 없으면 새 업무다. 표현이 다르다고 새 업무가 되지 않고, 대상 UI 가 바뀌었으면 익숙한 업무라도 불확실 상황이다.
3. 첫 실행의 목표는 **결과 + 경험 획득**이다. 그래서 초기 비용(강한 모델·긴 관찰·질문)은 허용된다(EVOLUTION §12). 대신 그 비용으로 얻은 것은 반드시 계층 4 에 남아야 한다 — 남기지 않는 강한 실행은 낭비다.
4. **등재 목록은 발견의 문이 아니다.** 처음 보는 사이트·프로그램이라고 거절하지 않는다. 다만 "어디서 할 일인지" 가 불명확하면 묻고(계층 3), 안전 경계(§9-3)를 벗어나는 대상은 거부한다. 대상 등재는 "실행을 허락받은 범위" 와 "이미 경험이 있는 범위" 를 기록하는 장치이지, 업무를 미리 정의하는 장치가 아니다(EVOLUTION §14).
   - 이것은 처음 보는 PC·사이트를 **무제한으로 조작한다는 뜻이 아니다.** 안전 경계 안에서 관찰·추론하고, 필요하면 사용자에게 물어 가며 진행한다. 위험 행동 차단(§8-2)과 최종 확정 제외(§9-3)는 처음 보는 대상에도 그대로 적용된다.
5. Discovery 는 실행보다 넉넉한 관찰 수단·예산을 가질 수 있다. 예산 크기는 업무 위험과 사용자 시간 가치로 정하며 정책 문서가 정한다.

### 2-1. Discovery 비용은 투자다

> **새로운 업무에서 Strong Discovery Agent 사용 비용은 절감 대상이 아니라 Experience 를 획득하기 위한 투자 비용으로 본다. 비용 최적화는 경험이 축적된 이후에 시작한다.**

- 특정 모델·공급사에 묶이지 않는다. "Strong" 은 그 시점에 관찰·추론·질문을 가장 잘 하는 수행자를 뜻한다.
- 경험이 없는 업무에서 저가 수행자를 먼저 쓰는 것은 절감이 아니라 경험 손실이다(§7-2-1, §10-4).

### 2-2. Experience 없는 Discovery 는 미완성이다

> **Experience 가 저장되지 않는 Strong Discovery 실행은 원칙적으로 미완성 구현으로 본다.**

Strong Agent 를 호출했다는 것 자체는 진척이 아니다. 다음이 끊김 없이 이어져야 완성이다.

```text
Discovery → 실행 → 결과 → 사용자 도움/교정 → 성공/실패 → 시간/비용 → Experience
```

Experience 저장은 민감한 원문 데이터 저장을 뜻하지 않는다 — 구조화된 경험만 남긴다(§4-2-2, §5).

### 2-3. User Convenience First — 수행자 선택 기준 (2026-10-01 사용자 확정)

> **사용자 편의성과 업무 성공 가능성이 AI 비용보다 우선한다.**

1. Lower-cost Agent 로 충분하다는 **근거**(검증된 Skill · 신뢰할 만한 Experience)가 있으면 그것을 쓴다.
2. 다음 경우에는 Strong Discovery Agent 가 기본이다: 새 업무 · 처음 보는 상황 · 불확실성이 큼 · 기존 Experience 의 신뢰도가 낮음 · 기존 Skill 이 현재 화면과 맞지 않음.
3. **Strong 이 필요한지 Lower-cost 로 충분한지 판단하기 어려우면 Strong 을 쓴다.** "싼 수행자로 먼저 해 보고 실패하면 올린다" 는 기본 정책이 아니다(§2-1 과 같은 원칙).
4. 비용 절감을 위해 사용자 편의를 희생하지 않는다. 다음은 금지되는 방향이다:
   - 비용을 줄이려고 사용자에게 자세한 prompt 를 요구
   - 사용자에게 AI 모델 선택을 요구
   - 사용자에게 자동화 절차를 미리 구조화해 입력하도록 요구
   - 싼 수행자를 먼저 쓰려고 불필요한 실패를 허용
5. 수행자 선택은 사용자가 아니라 O4O 가 Experience 근거로 한다(§7). 모델 routing 의 구현은 이 원칙 아래 별도 WO 가 정한다.

---

## 3. Human-Assisted Discovery

1. 확실하지 않으면 **추측하지 말고 묻는다.** 질문은 실패가 아니다(QUESTION ≠ 실패 — 기존 협업 체계).
2. 물을 수 있는 것:
   - 값 · 대상 확인 ("어느 약을 찾을까요?")
   - **메뉴 위치 · 업무 순서** ("조회는 어느 메뉴에서 하시나요?")
   - **매뉴얼 · 사내 문서 · 화면 캡처** ("이 프로그램 사용설명서가 있으면 주세요")
   - 로그인 · 권한 상태 ("로그인한 뒤 알려 주세요" — 로그인 대행은 하지 않는다)
   - 성공 판정 ("이 화면이 원하신 결과인가요?")
3. **사용자의 답·교정·시연은 업무 경험 데이터 후보다.** 답을 받으면 run 이 이어지는 것과 별개로, 그 답이 어떤 막힘을 어떻게 풀었는지가 계층 4 에 남아야 한다. 사용자 도움이 들어간 성공은 "깨끗하지 않은 run" 이 아니라 **가장 값진 run** 이다.
4. 재개 시에는 원래 업무 목표와 지금까지의 진행이 이어져야 한다. 답 하나만 보고 새 업무처럼 다시 시작하지 않는다.
5. 같은 것을 두 번 묻지 않는 것이 Assistance 계층의 성숙 지표다.
6. 매뉴얼·문서는 Knowledge 로 들어온다. 화면만 보고 메뉴를 추측해 위험한 조작을 하지 않는다 — 특히 PC 업무 프로그램은 공식 매뉴얼을 Knowledge 로 갖는 것을 전제로 한다.

---

## 4. Experience as Asset

### 4-1. 경험의 구성 (개념 — schema 아님)

| 개념 | 담는 것 |
|---|---|
| **Task / Intent** | 업무 유형(표현이 달라도 같은 업무), 목적 |
| **Target** | 대상 사이트·프로그램·화면, 환경 특성(버전·해상도·브라우저) |
| **Run** | 한 번의 수행 — 요청, 입력값의 **형태**, 시작·종료, 결과 |
| **Step** | 관찰 · 판단 · 행동 · 실행 수단 · 결과 |
| **User Assistance** | 질문, 답, 교정, 시연, 어떤 막힘을 풀었는가 |
| **Knowledge / Manual** | 참조한 매뉴얼·문서·사용자 설명과 그 출처 |
| **Outcome** | 성공/부분/실패, 사용자 확인 여부, 최종 결과의 요약 |
| **Failure Pattern** | 어디서 · 왜 실패했고 어떻게 복구했는가, UI 변경 징후 |
| **Performance Metric** | 소요시간, AI 판단 횟수, 단계 수, 사용자 개입 수, 비용 |
| **Procedure / Skill** | 재사용 가능한 수행 방법(§6) |
| **Promotion State** | 이 업무×대상이 어느 수준(L1~L4)에서 수행되는가와 그 근거(§9) |
| **Experience** | 위를 Task × Target 단위로 모은 누적 관점 |

### 4-2. 원칙

1. 성공만 남기지 않는다. 실패·복구·질문이 다음 시도의 가장 큰 단축 경로다.
2. **내용이 아니라 구조를 남긴다**(EVOLUTION §7). 입력 원문·화면 데이터·환자/고객 정보는 경험의 재료가 아니다. 남기는 것은 "어떤 종류의 값이 어느 칸에 들어갔다", "어느 메뉴를 거쳤다", "몇 초 걸렸다" 이다.
3. 경험은 실행 수단과 무관하게 같은 형식으로 남는다 — 웹·PC 프로그램·API 모두.
4. 경험이 쌓이면 다음 질문에 답할 수 있어야 한다: 해본 적 있는가 · 누가 어떻게 성공했는가 · 평균 몇 초인가 · 어디서 자주 실패하는가 · 사용자가 무엇을 가르쳤는가 · 어떤 매뉴얼을 참고했는가 · 다른 사용자에게 쓸 수 있는가.

---

## 5. Local vs Shared Knowledge

| | Local Experience (개인 · PC) | Shared Experience (O4O 서버) |
|---|---|---|
| 담는 것 | 개인 업무 순서, 자주 쓰는 값의 형태, 개인 환경, 자기 run 의 상세, 사용자 교정·도움 기록 | 업무 유형 · 대상별 일반 절차, 메뉴 구조, 자주 실패하는 지점과 복구법, 매뉴얼에서 얻은 일반 지식, 성공률·평균시간 같은 집계 |
| 담지 않는 것 | — (단, 비밀번호·인증정보는 어디에도 저장하지 않는다) | 계정·비밀번호·인증정보, 개인정보, 고객·환자 정보, 업무 원문 데이터, 개인 식별 가능한 행동 기록 |
| 생성 | 실행 중 Local 이 직접 기록 | Local 이 **정제·익명화한 요약을 명시적으로 올린 것**만 (서버가 Local 원장을 읽어 가거나 동기화하지 않는다 — §5-1) |
| 승격 | — | 한 사용자의 한 번 성공으로 공유 절차가 되지 않는다. 여러 사용자·여러 run 의 근거와 검증을 거친다 |

- 공유 대상에는 **동의**가 전제된다. 동의 정책·익명화 기준·보존 기간은 별도 정책 문서가 정한다.
- 공유 경험은 다른 사용자의 첫 시도에 **참고**로 쓰인다 — 다른 사용자 PC 에서 검증 없이 바로 결정적으로 실행하지 않는다.

### 5-1. Local read-back 금지와 질의형 recall (2026-10-01 사용자 확정)

**Cloud 는 Local Experience 원장을 직접 read-back 하거나 동기화하지 않는다.** 단, 사용자의 **현재 업무 수행**을 위해 Task × Target 등 **제한된 조건**으로 Local Agent 에 질의하고, Local Agent 가 그 Run 에 필요한 **최소 구조화 Experience** 를 반환하는 **질의형 recall** 은 허용한다.

```text
Cloud ── "이 Task × Target 에 쓸 경험이 있나?" ──► Local Agent
                                                    ├─ Local Experience 검색
                                                    ├─ 필요한 구조만 선택
Cloud Run ◄── 이번 Run 에 필요한 최소 구조만 응답 ──┘
```

- 서버가 Local DB 를 임의 조회하거나, 전체 Experience 를 가져가거나, 원장을 복제하는 의미가 아니다.
- 반환 범위는 구조화된 경험(stage 경로 · semantic locator · reusable 도움 · 실패 층 등)이며 값 · 원문은 포함하지 않는다.
- recall 결과는 그 Run 에서만 쓰이고 서버에 축적되지 않는다. 축적 · 공유는 위 표의 명시적 publish 경로만 따른다.
- 현재 Workflow Candidate 대조(Local 이 대조 결과만 돌려줌)가 같은 형태의 선례다. 세부 계약: [`O4O-AUTOMATION-EXPERIENCE-MODEL-V1`](O4O-AUTOMATION-EXPERIENCE-MODEL-V1.md) §21 D1.

---

## 6. Experience → Skill

1. 경험이 충분히 일관되면 **Procedure / Skill** 이 된다: "이 업무를 이 대상에서 하려면, 이런 입력을 받아, 이런 순서로, 이런 확인을 거친다."
2. Skill 은 화면 좌표·DOM 경로의 녹화가 아니다. **업무 단계 + 각 단계의 의미적 대상(역할·이름·문구) + 입력 슬롯 + 성공 판정 + 알려진 실패와 복구** 로 표현한다. 그래야 UI 가 조금 바뀌어도, 실행 수단이 바뀌어도 살아남는다.
3. Skill 은 사용자 도움·매뉴얼에서 얻은 단계도 포함한다. 사람에게 배운 단계를 빼면 다음에도 같은 곳에서 막힌다.
4. Skill 은 항상 현재 화면으로 재검증하며 실행하고, 어긋나면 더 강한 수준으로 되돌아간다(§7-3).

---

## 7. Strong → Cheap → Deterministic

### 7-1. 수준

| 수준 | 수행자 | 상태 |
|---|---|---|
| **L1 Discovery** | Strong Discovery Agent (+ 사용자) | 처음 · 불확실 — 결과와 경험을 함께 얻는다 |
| **L2 Assisted** | Strong 또는 Lower-cost Agent + 경험/Skill 참고 | 경험이 있으나 아직 판단이 많이 필요 |
| **L3 Learned Procedure** | Lower-cost Reasoning Agent 가 Skill 을 따라감 | 절차는 확정, 작은 판단만 |
| **L4 Deterministic** | Deterministic Executor (DOM · UIA · API · WebMCP · RPA · Script) | 판단 불필요 — 확인만 |

### 7-2. 원칙

1. 비용 최적화는 **목표가 아니라 결과**다. 순서는 ① 첫 업무를 성공시킨다 → ② 무엇을 남길지 정한다 → ③ 반복 경험으로 신뢰도를 평가한다 → ④ 신뢰할 만한 부분을 더 싼 수행자로 넘긴다.
2. 업무 전체가 한 수준에 있을 필요는 없다. 단계마다 수준이 다를 수 있다(로그인 확인 L4 · 검색어 판단 L3 · 낯선 팝업 L1).
3. **강등은 즉시, 승격은 신중히.** 결정적 실행이 어긋나면 그 run 안에서 바로 판단 가능한 수준으로 되돌아가고, 그 사건 자체가 경험으로 남는다.
4. 사용자 도움 빈도가 내려가는 것도 비용 절감이다 — 사용자 시간이 가장 비싼 자원이다.
5. **한 번 비싸게 해결한 문제를 같은 방식으로 계속 비싸게 해결하지 않는 것이 O4O 의 비용 최적화다.** 기본 경로:

   ```text
   처음 / 불확실     → Strong Agent
   Experience 축적   → 판단 감소
   검증된 Skill      → Lower-cost Agent
   판단 불필요       → Deterministic Executor
   ```

   비용은 이 이동으로 낮춘다 — 사용자 편의를 줄여서 낮추지 않는다(§2-3).

---

## 8. Execution Layer 의 역할

1. Local Agent · Chrome Extension · Browser DOM · Windows UIA · Computer Use · API · WebMCP · RPA · Script 는 **실행 계층**이다. **두뇌가 아니다.**
2. 실행 계층의 책임: 관찰 제공, 지시된 행동의 안전한 수행, 결과·실패를 정직하게 보고, 위험 행동 차단(최종 확정 클릭·결제·서명·비밀번호 입력 등).
3. 실행 계층은 **어느 수준(L1~L4)에서 오는 지시든 같은 방식으로** 수행한다. 수준별로 다른 손을 만들지 않는다.
4. 수단 선택은 결정론 우선(API → 구조적 DOM/UIA → 시각 fallback)이며, 선택 근거·fallback 사유는 경험으로 남는다.
5. 실행 계층의 안정화(연결 · 지연 · 탭/창 준비 · 재개)는 필요한 작업이다. 그러나 **실행 계층의 완성도를 Automation Agent 의 완성도로 보지 않는다.** 실행 계층 smoke PASS 수는 진척 지표가 아니다.
6. **RPA 는 O4O AI Automation 과 경쟁하는 별도 개념이 아니라, AI Automation 이 업무 수행을 위해 선택할 수 있는 실행 수단 중 하나다.** API · WebMCP · Browser DOM · Windows UIA · Computer Use · Script 도 같다. AI Automation 은 다음 전체 순환이며, 실행 수단은 그 안의 "실행" 칸만 맡는다:

   ```text
   사용자 요구 → 목적·맥락 이해 → 개인 Experience 확인 → Knowledge 확인 → 기존 Skill 확인
     → 필요한 판단 → 실행 방법 결정 → 실제 실행 → 결과 관찰 → Experience 생성 → 다음 업무 개선
   ```

---

## 9. Promotion Principles

### 9-1. 판단 신호

승격·강등은 **실행 횟수만으로 하지 않는다.** 함께 본다:

- 성공률 · 실패율 · **최근 실패**
- UI 안정성(최근 화면 변화 징후)
- 입력값 변화 폭(늘 같은 형태인가)
- 사용자 개입 빈도
- 평균 소요시간과 편차
- 환경 차이(사용자·PC·브라우저마다 결과가 같은가)
- 판단 필요성(단계에 아직 의미 판단이 남아 있는가)

### 9-2. 규칙

1. 한 번의 성공으로 승격하지 않는다(EVOLUTION §9).
2. 개인 범위 승격과 공유 범위 승격은 다르다. 공유 승격은 더 높은 근거와 검증을 요구한다.
3. 승격 상태와 그 근거는 기록된다 — 왜 이 업무가 L3 인지 설명할 수 있어야 한다.
4. 강등 조건(최근 연속 실패, UI 변경 감지, 사용자 교정 발생)은 승격 조건보다 민감하게 둔다.

### 9-3. 승격하지 않는 영역

조제 보고, 마약류, 청구, 결제, 전자서명, 계약·법적 확정, 개인정보 대량 처리 같은 **최종 확정·고위험 행위는 수준과 무관하게 사용자가 직접 확정한다.** 자동화는 그 직전까지를 준비한다. 목록은 도메인 정책 문서가 정하며 이 문서는 원칙만 고정한다.

---

## 10. 개발 우선순위 판단 원칙

새 작업을 고를 때 이 순서로 묻는다.

1. **이 작업은 어느 계층을 강화하는가?** 6계층 중 하나로 분류하지 못하면 범위가 불명확한 것이다.
2. **경험이 남는가?** 결과는 나오지만 아무것도 남지 않는 개선은 낮은 우선순위다. 특히 계층 2·3 의 개선은 계층 4 에 남는 경로와 함께 설계한다.
3. **실행 계층 작업은 "경험을 얻기 위해 필요한 만큼"** 한다. run 이 실 환경에서 안정적으로 끝나지 않으면 경험이 쌓이지 않으므로 안정화는 필요하다. 그러나 새 실행 수단·실행 최적화가 경험·승격 계층보다 앞서 쌓이면 **Workflow Player 로 기운 것**이다.
4. **비용 최적화를 먼저 하지 않는다.** 저가 모델 전환·결정적 실행 확대는 근거 데이터(계층 4)가 생긴 뒤에 한다.
5. **특정 사이트·업무 전용 코드는 사례로만 둔다.** 대상별 상수·어댑터가 늘어나는 것이 진척이 아니다. 같은 작업이 다른 영역(공급자·매장·운영자)에도 적용되는지 확인한다.
6. **개인정보·인증정보 경계를 먼저 정한다.** 공유 경험·매뉴얼 수집처럼 데이터가 PC 밖으로 나가는 작업은 경계 정책이 선행한다.
7. 완료 판단은 EVOLUTION §22 지표(시간 절감 · 개입 감소 · 성공률)로 한다.

### 10-1. 개발 순서 (고정 · 2026-10-01 사용자 확정)

```text
1. Experience Model
2. User Assistance (+ User Correction)
3. Strong Discovery
4. Manual / Knowledge (→ Knowledge Watch)
5. Promotion
6. Shared Experience
```

- 앞 번호가 뒤 번호의 근거 데이터를 만든다. 순서를 바꾸려면 이 절을 고치는 명시적 WO 가 필요하다.
- 2026-10-01 정렬(`WO-…-USER-CORRECTION-KNOWLEDGE-AND-MODEL-ROUTING-ALIGNMENT-V1`): 순서는 바뀌지 않았다. User Correction 은 2 에, Knowledge Watch 는 4 의 뒤에 붙는다. 구현 Phase 대응은 [EXPERIENCE-MODEL §20](O4O-AUTOMATION-EXPERIENCE-MODEL-V1.md). 실제 구현에서 선행관계가 달리 확인되면 보고 후 조정한다.
- **Execution Runtime 은 별도의 0번 트랙이다.**
  - 진행 중인 runtime 결함 → 필요한 만큼 마감한다.
  - 새로운 runtime 최적화 → Experience 계층보다 선행하지 않는다.
  - Runtime 의 목적은 **Experience 를 얻을 수 있을 정도의 안정성 확보**다.
- 다음 흐름으로 다시 빠지지 않는다:

  ```text
  site_not_ready → 새로운 runtime 기능 → 새로운 DOM 기능 → 새로운 browser 최적화 → 또 runtime 최적화
  ```

  runtime 결함을 고칠 때는 "이 수정이 어느 Experience 획득을 막고 있었는가" 를 WO 에 적는다. 적을 수 없으면 0번 트랙의 범위가 아니다.

### 10-2. 다음 작업

~~`WO-O4O-AUTOMATION-EXPERIENCE-MODEL-DESIGN-V1`~~ — **완료(2026-10-01)**: [`O4O-AUTOMATION-EXPERIENCE-MODEL-V1`](O4O-AUTOMATION-EXPERIENCE-MODEL-V1.md) ACTIVE (Experience 개념 모델 · 저장 계약 · D1~D8 확정).

다음 개발 작업은 **Phase 1 — Local Experience 최소 저장**(EXPERIENCE-MODEL §20 · §22) 이며 별도 WO 로 진행한다 — 성공이든 실패든 실제 Run 이 Local Experience 에 남는 것이 첫 구현이다.

- 2026-10-01 상태: Phase 1 **코드 완료 · 실 PC smoke PENDING**(배포 승인 대기) — [`CHECK-O4O-AUTOMATION-LOCAL-EXPERIENCE-MINIMUM-STORAGE-V1`](../checks/CHECK-O4O-AUTOMATION-LOCAL-EXPERIENCE-MINIMUM-STORAGE-V1.md). 새 설계보다 Phase 1 실환경 closure 가 먼저다. 그 다음이 Phase 2(User Assistance + User Correction).

---

## 부록 A. 현재 구현과의 대응 (2026-10-01 census 요약)

| 계층 | 현재 판정 | 상세 |
|---|---|---|
| 1 Request / Intent | PARTIAL | IR §3 |
| 2 Discovery / Reasoning | PARTIAL (처음 보는 대상 거절 = MISALIGNED) | IR §3 |
| 3 Assistance / Knowledge | PARTIAL | IR §3 |
| 4 Experience / Learning | MISALIGNED (사용자 도움 run 이 저장에서 제외) | IR §3 · §5 |
| 5 Promotion / Cost | MISSING | IR §3 |
| 6 Execution | IMPLEMENTED (runtime 안정화 진행 중) | IR §3 · §7 |

이 표는 시점 기록이다. 갱신 시 이 부록만 고치고 본문 원칙은 바꾸지 않는다.

**사용자 검토 확정 (2026-10-01)**: ① 처음 보는 대상 거절 = MISALIGNED 유지 ② 사용자 도움 run 의 Experience 제외 = MISALIGNED 유지(도움 run 은 오염이 아니라 핵심 학습 자산 — 원문이 아닌 구조화된 경험으로 저장) ③ §5 Local/Shared 경계 승인(서버의 Local read-back 없음 — 현재 Run 을 위한 질의형 recall 은 허용, §5-1) ④ §9-3 고위험 최종 확정 제외 승인.

## 부록 B. 관련 문서

- [`O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1`](O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1.md) — 상위 철학
- [`IR-O4O-AUTOMATION-AGENT-ARCHITECTURE-REALIGNMENT-V1`](../investigations/IR-O4O-AUTOMATION-AGENT-ARCHITECTURE-REALIGNMENT-V1.md) — 근거 census
- [`O4O-AUTOMATION-EXPERIENCE-MODEL-V1`](O4O-AUTOMATION-EXPERIENCE-MODEL-V1.md) — 하위 정본: Experience 개념 모델 · 저장 계약 (§4 · §5 · §9 의 상세)
- [`O4O-BUSINESS-PHILOSOPHY-V1`](O4O-BUSINESS-PHILOSOPHY-V1.md) — AI 역할 · 참여 주체
